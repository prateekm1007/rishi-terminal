// lib/ai/evidence.ts — the canonical AI evidence assembler (end-to-end loop).
//
// ONE builder turns the platform's authoritative data surfaces into a
// provenance-aware evidence package with deterministic ids. Application code
// never assembles AI context ad hoc (no second fundamentals merger, no seed-
// only context, no AI-side score recomputation — the canonical Rishi
// consensus is consumed as-is, engine version and all).
//
// Inputs (existing surfaces only — no new external data sources):
//   resolveStockMetrics(symbol, live)   → fundamentals + per-field provenance
//   getStockScore(resolved)             → THE Rishi consensus (rishi-merit-v1)
//   fetchLivePrice(symbol)              → price observation + provenance
//   injected news items                 → news:<stable-id> (see below)
//
// Id contract (deterministic — same inputs, same ids):
//   stock:<symbol>:profile
//   price:<symbol>:<observedAt | "no-disclosed-observation-time" | "unavailable">
//   fundamental:<symbol>:<field>:<asOf | "seed">
//   score:<symbol>:<engine-version>:<asOf | "seed-derived">
//   news:<stable-id>          (class supported; per-symbol wiring pending —
//                              the honest unavailable note is emitted instead)
//
// `null` is a real state (constitution art. 3/16): an upstream that disclosed
// no observation time yields an id fragment saying so — never a fabricated
// timestamp; an unavailable price yields an explicit unavailable item, never
// a made-up number.

import 'server-only';

import { resolveStockMetrics, getStockScore, SCORE_ENGINE_VERSION } from '@/lib/scoring';
import type { FullFundamentals } from '@/lib/liveFundamentals';
import { fetchFullFundamentals } from '@/lib/liveFundamentals';
import { fetchLivePrice } from '@/lib/livePrice';
import type { AiEvidenceItem } from './schemas';

/**
 * resolveStockMetrics (the canonical resolver) types its live input via the
 * UI contract (hooks/useFundamentals), whose only extra field is `isLive`.
 * The server surface (lib/liveFundamentals) carries the same data with a
 * stricter source union — this adapter bridges them without re-deriving
 * anything: static fallback = not live, anything else = live.
 */
function toResolverFundamentals(ff: FullFundamentals): Parameters<typeof resolveStockMetrics>[1] {
  return { ...ff, isLive: ff.source !== "static" };
}

/** Injectable surfaces (tests); production uses the canonical defaults. */
export interface EvidenceDeps {
  getFundamentals?: (symbol: string) => Promise<FullFundamentals | null>;
  getPrice?: (symbol: string) => ReturnType<typeof fetchLivePrice>;
  /** News items where a per-symbol surface already exists. None does today
   *  (the /api/news RSS pipeline is market-level), so production omits this
   *  and the package carries an explicit unavailable note — auditable, not
   *  silent. */
  news?: Array<{ id: string; headline: string; summary: string; source: string; pubDate: string }>;
}

export interface AiEvidencePackage {
  symbol: string;
  items: AiEvidenceItem[];
  /** True when live fundamentals were available at assembly time. */
  hasLiveFundamentals: boolean;
  engineVersion: string;
}

/** Budget for the live fundamentals fetch — the chat path must stay bounded. */
const FUNDAMENTALS_TIMEOUT_MS = 10_000;

function fmt(n: number): string {
  return Number.isFinite(n) ? String(Number(n.toFixed(4))) : String(n);
}

/**
 * Build the canonical evidence package for one symbol, or null when the
 * symbol is unknown to the registry (callers decide 400 vs empty state).
 */
export async function buildAiEvidencePackage(
  symbol: string,
  deps: EvidenceDeps = {},
): Promise<AiEvidencePackage | null> {
  const sym = symbol?.trim().toUpperCase();
  if (!sym) return null;

  // Live surfaces, in parallel, each individually non-fatal: a failed fetch
  // degrades to seed-labelled provenance, never to a fabricated value.
  const [live, pricePoint] = await Promise.all([
    (async () => {
      try {
        const get = deps.getFundamentals ?? fetchFullFundamentals;
        return await Promise.race([
          get(sym),
          new Promise<null>(r => setTimeout(() => r(null), FUNDAMENTALS_TIMEOUT_MS)),
        ]);
      } catch {
        return null;
      }
    })(),
    (async () => {
      try {
        const get = deps.getPrice ?? fetchLivePrice;
        return await get(sym);
      } catch {
        return null;
      }
    })(),
  ]);

  const resolved = resolveStockMetrics(sym, live ? toResolverFundamentals(live) : null);
  if (!resolved) return null;

  const items: AiEvidenceItem[] = [];
  const vendorName = live?.source && live.source !== "static" ? live.source : undefined;

  // 0. Registry profile (name/sector are registry facts, not market data).
  items.push({
    id: `stock:${sym}:profile`,
    text: `${resolved.name} (${sym}), sector: ${resolved.sector}. Seed dataset status: ${resolved.seedStatus}.`,
  });

  // 1. Price observation with provenance (single canonical path; the
  //    observation time is the upstream's own — null stays null).
  if (pricePoint && Number.isFinite(pricePoint.price) && pricePoint.price > 0) {
    const when = pricePoint.observedAt ?? "no-disclosed-observation-time";
    items.push({
      id: `price:${sym}:${when}`,
      text:
        `Latest observed price: ${fmt(pricePoint.price)} ` +
        `(change ${fmt(pricePoint.change)}%). ` +
        `Source: ${pricePoint.source}; status: ${pricePoint.status ?? "LIVE"}; ` +
        `observation time: ${pricePoint.observedAt ?? "not disclosed by the upstream"}.`,
    });
  } else {
    items.push({
      id: `price:${sym}:unavailable`,
      text: "Price: UNAVAILABLE at assembly time. No observation exists — do not state or imply a price.",
    });
  }

  // 2. Resolved fundamentals — one item per field, provenance preserved.
  const FIELD_LABELS: Record<string, string> = {
    pe: "P/E", roe: "ROE %", roce: "ROCE %", opm: "Operating margin %",
    de: "Debt/Equity", promo: "Promoter holding %", revcagr: "Revenue CAGR 3Y %",
    epscagr: "EPS CAGR 3Y %", mktcap: "Market cap (Cr)", bvps: "Book value/share",
    pb: "P/B", fcfMargin: "FCF margin %",
  };
  for (const [field, rf] of Object.entries(resolved.fields)) {
    const label = FIELD_LABELS[field] ?? field;
    const asOf = rf.source === "live" && rf.asOf ? rf.asOf : null;
    const prov =
      rf.source === "live"
        ? `live via vendor ${vendorName ?? "unknown"}, observed/as-of ${asOf}`
        : rf.source === "derived"
        ? `derived${asOf ? ` from live inputs (as-of ${asOf})` : " from seed inputs (no observation time claimed)"}`
        : "SEED DATA (capture date not provable — indicative only, may be stale)";
    items.push({
      id: `fundamental:${sym}:${field}:${asOf ?? "seed"}`,
      text: `${label}: ${fmt(rf.value)} | provenance: ${prov}.`,
    });
  }

  // 3. THE canonical Rishi consensus — consumed, never recomputed by the AI.
  //    The id embeds the engine version so an audit can pin which engine
  //    produced the number the model cites.
  const consensus = getStockScore(resolved);
  const liveAsOfs = [...new Set(Object.values(resolved.fields).map(f => f.asOf).filter((a): a is string => !!a))];
  const scoreAsOf = liveAsOfs.length === 1 ? liveAsOfs[0] : "seed-derived";
  items.push({
    id: `score:${sym}:${SCORE_ENGINE_VERSION}:${scoreAsOf}`,
    text:
      `Rishi consensus score (${SCORE_ENGINE_VERSION}): ` +
      (consensus.consensus === null
        ? "Insufficient Data (fewer than the minimum valid scorers produced finite scores) — display/quote it as unavailable, never as a number."
        : `${consensus.consensus}/100`) +
      ` | category: ${consensus.category} | data quality: ${consensus.dataQuality}` +
      ` | tension: ${consensus.tension}` +
      ` | top bull: ${consensus.topBull.name} ${consensus.topBull.score}, top bear: ${consensus.topBear.name} ${consensus.topBear.score}. ` +
      "This is the platform's only official score — do not recompute or second-guess it.",
  });

  // 4. News — provenance-carrying items where a surface exists; otherwise an
  //    explicit unavailable note (never invented headlines).
  if (deps.news && deps.news.length > 0) {
    for (const n of deps.news) {
      items.push({
        id: `news:${n.id}`,
        text: `News: "${n.headline}" — ${n.summary} (source: ${n.source}, published: ${n.pubDate}).`,
      });
    }
  } else {
    items.push({
      id: `news:${sym}:unavailable`,
      text: "Per-symbol news: not available in the evidence pipeline (market-level feeds are not yet mapped to symbols). Do not cite specific news.",
    });
  }

  return {
    symbol: sym,
    items,
    hasLiveFundamentals: !!live,
    engineVersion: SCORE_ENGINE_VERSION,
  };
}

// ── Grounding validation (fail closed) ──────────────────────────────────

export interface GroundingResult {
  /** The claims that survived validation — empty unless EVERY claim's every
   *  evidenceId exists in the package AND every number in the claims and the
   *  answer traces to the cited evidence (one fabricated id or one
   *  unsupported figure fails them all: a model that invents a citation or a
   *  number cannot be trusted partially). */
  validatedClaims: Array<{ claim: string; evidenceIds: string[] }>;
  grounded: boolean;
  mode: "structured-claims" | "evidence-context";
  /** Machine-readable rejection notes for the audit trail / UI. */
  rejections: string[];
}

/**
 * Extract every number from text, normalized: thousands separators and
 * currency/percent markers stripped, so "1,200", "12%", "12.0" and "1200"
 * compare correctly against evidence numbers (roadmap R4-02 numeric
 * verification). Returns canonical string keys (e.g. "12", "1420.5").
 */
export function extractNormalizedNumbers(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.match(/-?\d[\d,]*(?:\.\d+)?/g) ?? []) {
    const n = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(n)) continue;
    out.add(Number.isInteger(n) ? String(n) : String(Number(n.toFixed(6))));
  }
  return out;
}

/**
 * Validate model-produced claims against the evidence items that were
 * actually supplied in THIS request. Fail closed, twice (roadmap R4-02):
 *   1. unknown evidence id → the claim is unverifiable;
 *   2. every number in the claims and the answer must appear in the CITED
 *      evidence text (units/percent normalized) — citing a real id for a
 *      figure it does not contain is still fabrication.
 * Any failure → grounded=false, no claim is served as verified, and the
 * rejections explain why. Numbers are checked against CITED items only: a
 * claim must cite the item that actually carries each number it states.
 */
export function validateGrounding(
  evidence: readonly AiEvidenceItem[],
  claims: Array<{ claim: string; evidenceIds: string[] }>,
  answer = "",
): GroundingResult {
  const validIds = new Set(evidence.map(e => e.id));
  const textById = new Map(evidence.map(e => [e.id, e.text]));
  if (claims.length === 0) {
    return {
      validatedClaims: [],
      grounded: false,
      mode: "evidence-context",
      rejections: ["model produced no claims — context injection only"],
    };
  }
  const rejections: string[] = [];
  const citedNumbers = new Set<string>();
  for (let i = 0; i < claims.length; i += 1) {
    const c = claims[i];
    if (!c.claim || !Array.isArray(c.evidenceIds) || c.evidenceIds.length === 0) {
      rejections.push(`claim ${i + 1}: no evidence ids — unverifiable, rejected`);
      continue;
    }
    const unknown = c.evidenceIds.filter(id => !validIds.has(id));
    if (unknown.length > 0) {
      rejections.push(`claim ${i + 1}: unknown evidence id(s) ${unknown.map(u => JSON.stringify(u)).join(", ")} — rejected`);
      continue;
    }
    for (const id of c.evidenceIds) {
      for (const n of extractNormalizedNumbers(textById.get(id) ?? "")) citedNumbers.add(n);
    }
  }
  // Numeric verification only matters when the id checks passed for every
  // claim — the batch already fails closed otherwise.
  if (rejections.length === 0) {
    for (let i = 0; i < claims.length; i += 1) {
      for (const n of extractNormalizedNumbers(claims[i].claim)) {
        if (!citedNumbers.has(n)) {
          rejections.push(`claim ${i + 1}: number ${n} does not appear in the cited evidence — unsupported figure, rejected (R4-02)`);
        }
      }
    }
    for (const n of extractNormalizedNumbers(answer)) {
      if (!citedNumbers.has(n)) {
        rejections.push(`answer: number ${n} does not appear in the cited evidence — unsupported figure, rejected (R4-02)`);
      }
    }
  }
  if (rejections.length > 0) {
    return {
      validatedClaims: [],
      grounded: false,
      mode: "evidence-context",
      rejections,
    };
  }
  return {
    validatedClaims: claims.map(c => ({ claim: c.claim, evidenceIds: [...c.evidenceIds] })),
    grounded: true,
    mode: "structured-claims",
    rejections: [],
  };
}
