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
import type { AiEvidenceFact, AiEvidenceItem } from './schemas';

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
    const priceFacts: AiEvidenceFact[] = [
      { field: "price", value: pricePoint.price, unit: FACT_UNIT_BY_FIELD.price, source: "live" },
    ];
    if (Number.isFinite(pricePoint.change)) {
      priceFacts.push({ field: "change", value: pricePoint.change, unit: FACT_UNIT_BY_FIELD.change, source: "live" });
    }
    items.push({
      id: `price:${sym}:${when}`,
      text:
        `Latest observed price: ${fmt(pricePoint.price)} ` +
        `(change ${fmt(pricePoint.change)}%). ` +
        `Source: ${pricePoint.source}; status: ${pricePoint.status ?? "LIVE"}; ` +
        `observation time: ${pricePoint.observedAt ?? "not disclosed by the upstream"}.` +
        factAnnotation(priceFacts),
      facts: priceFacts,
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
    // Typed fact (Q4 Commit A): value + unit + how the number came to be.
    // source "derived" is EXPLICIT — the model may cite it, never re-derive
    // other figures from it (any derived number it asserts must itself be
    // an emitted fact, else validation rejects it).
    const fact: AiEvidenceFact = {
      field,
      value: rf.value,
      unit: FACT_UNIT_BY_FIELD[field] ?? "value",
      source: rf.source,
    };
    items.push({
      id: `fundamental:${sym}:${field}:${asOf ?? "seed"}`,
      text: `${label}: ${fmt(rf.value)} | provenance: ${prov}.${factAnnotation([fact])}`,
      facts: [fact],
    });
  }

  // 3. THE canonical Rishi consensus — consumed, never recomputed by the AI.
  //    The id embeds the engine version so an audit can pin which engine
  //    produced the number the model cites.
  const consensus = getStockScore(resolved);
  const liveAsOfs = [...new Set(Object.values(resolved.fields).map(f => f.asOf).filter((a): a is string => !!a))];
  const scoreAsOf = liveAsOfs.length === 1 ? liveAsOfs[0] : "seed-derived";
  const scoreFacts: AiEvidenceFact[] =
    consensus.consensus === null
      ? [] // insufficient data → NO fact exists → any numeric score assertion fails closed
      : [{ field: "score", value: consensus.consensus, unit: FACT_UNIT_BY_FIELD.score, source: "derived" as const }];
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
      "This is the platform's only official score — do not recompute or second-guess it." +
      factAnnotation(scoreFacts),
    ...(scoreFacts.length > 0 ? { facts: scoreFacts } : {}),
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
   *  evidenceId exists in the package AND every numeric assertion matches a
   *  typed fact on the claim's OWN cited items (one fabricated id, one
   *  unsupported figure, or one field/unit/value mismatch fails them all). */
  validatedClaims: Array<{
    claim: string;
    evidenceIds: string[];
    assertions: Array<{ field: string; value: number; unit: string }>;
  }>;
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

/** Canonical numeric key shared by facts, assertions and extracted text —
 *  "12", "12.0", "12.000" all collapse to "12". Non-finite input is
 *  unmatchable by construction. */
export function canonicalNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(6)));
}

/** Canonical field key: lowercase, alphanumeric only ("P/E" → "pe",
 *  "return_on_equity" → "returnonequity"). */
export function normalizeFactField(field: string): string {
  return field.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Field aliases the model may plausibly use, mapped to the canonical keys
 *  the evidence builder emits. Anything unknown maps to itself — an
 *  unknown field simply never matches a fact, which fails closed. */
const FIELD_ALIASES: Record<string, string> = {
  pe: "pe",
  peratio: "pe",
  priceearnings: "pe",
  priceearningsratio: "pe",
  pb: "pb",
  pricebook: "pb",
  pricetobook: "pb",
  roe: "roe",
  returnonequity: "roe",
  roce: "roce",
  opm: "opm",
  operatingmargin: "opm",
  de: "de",
  debtequity: "de",
  debttoequity: "de",
  promo: "promo",
  promoterholding: "promo",
  revcagr: "revcagr",
  revenuecagr: "revcagr",
  epscagr: "epscagr",
  mktcap: "mktcap",
  marketcap: "mktcap",
  bvps: "bvps",
  bookvalue: "bvps",
  bookvaluepershare: "bvps",
  fcfmargin: "fcfmargin",
  price: "price",
  change: "change",
  changepercent: "change",
  score: "score",
  consensus: "score",
  rishiscore: "score",
};

export function canonicalFactField(field: string): string {
  const k = normalizeFactField(field);
  return FIELD_ALIASES[k] ?? k;
}

/** Canonical unit key from a small closed taxonomy. Unknown units map to
 *  themselves — they can never match a builder-emitted unit (fail closed). */
const UNIT_ALIASES: Record<string, string> = {
  percent: "percent",
  pct: "percent",
  "%": "percent",
  multiple: "multiple",
  x: "multiple",
  times: "multiple",
  ratio: "ratio",
  inr: "inr",
  rupees: "inr",
  rupee: "inr",
  rs: "inr",
  "₹": "inr",
  inr_crore: "inr_crore",
  crore: "inr_crore",
  cr: "inr_crore",
  points: "points",
  point: "points",
  score: "points",
  value: "value",
  number: "value",
  count: "value",
};

export function canonicalFactUnit(unit: string): string {
  return UNIT_ALIASES[unit.trim().toLowerCase()] ?? unit.trim().toLowerCase();
}

/** Units for every field the canonical builder emits. A field without an
 *  entry falls back to "value" — explicit, not guessed. */
const FACT_UNIT_BY_FIELD: Record<string, string> = {
  pe: "multiple",
  pb: "multiple",
  de: "ratio",
  roe: "percent",
  roce: "percent",
  opm: "percent",
  promo: "percent",
  revcagr: "percent",
  epscagr: "percent",
  fcfMargin: "percent",
  mktcap: "inr_crore",
  bvps: "inr",
  price: "inr",
  change: "percent",
  score: "points",
};

/** Render a fact block appended to the item text so the model can copy
 *  field/value/unit verbatim — validation still runs on the STRUCTURED
 *  facts, never on this text (text is convenience, facts are authority). */
export function factAnnotation(facts: readonly AiEvidenceFact[]): string {
  if (facts.length === 0) return "";
  const parts = facts.map(
    f => `${f.field}=${canonicalNumber(f.value)} ${f.unit}${f.source ? ` (${f.source})` : ""}`,
  );
  return ` | fact: ${parts.join("; ")}`;
}

/**
 * Validate model-produced claims against the evidence items that were
 * actually supplied in THIS request. Fail closed, THREE layers (roadmap
 * R4-02, semantic correction):
 *   1. unknown evidence id → the claim is unverifiable;
 *   2. PER-CLAIM semantic check: every numeric claim must carry assertions
 *      {field, value, unit}, and each assertion must EXACTLY match a typed
 *      fact (field, value, unit — all canonicalized) on one of THIS claim's
 *      own cited items. Numbers are pooled per claim, never across claims:
 *      a figure real in claim 1's citation cannot support claim 2. Citing a
 *      real id for a figure it does not carry is still fabrication; citing
 *      a real id for a DIFFERENT field's number (ROE=99% citing a text
 *      carrying P/E=99) is fabrication too.
 *   3. the answer's numbers must trace to the union of the validated
 *      claims' own cited facts/text (presence floor for prose).
 * Any failure → grounded=false, no claim is served as verified, and the
 * rejections explain why.
 */
export function validateGrounding(
  evidence: readonly AiEvidenceItem[],
  claims: Array<{
    claim: string;
    evidenceIds: string[];
    assertions?: Array<{ field: string; value: number; unit: string }>;
  }>,
  answer = "",
): GroundingResult {
  const validIds = new Set(evidence.map(e => e.id));
  const itemById = new Map(evidence.map(e => [e.id, e]));
  if (claims.length === 0) {
    return {
      validatedClaims: [],
      grounded: false,
      mode: "evidence-context",
      rejections: ["model produced no claims — context injection only"],
    };
  }
  const rejections: string[] = [];
  const surviving: Array<{
    claim: string;
    evidenceIds: string[];
    assertions: Array<{ field: string; value: number; unit: string }>;
    citedItems: AiEvidenceItem[];
    matchedValues: Set<string>;
  }> = [];

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

    // ── per-claim semantic pool: ONLY this claim's own citations ──
    const citedItems = c.evidenceIds.map(id => itemById.get(id)!);
    const citedFacts = citedItems.flatMap(it => it.facts ?? []);
    const citedTextNumbers = new Set<string>();
    for (const it of citedItems) {
      for (const n of extractNormalizedNumbers(it.text)) citedTextNumbers.add(n);
    }
    const assertions = Array.isArray(c.assertions) ? c.assertions : [];

    // (a) every assertion must exactly match a fact in THIS claim's pool
    const matchedValues = new Set<string>();
    let assertionFailure = false;
    for (const a of assertions) {
      const af = canonicalFactField(a.field);
      const av = canonicalNumber(a.value);
      const au = canonicalFactUnit(a.unit);
      const hit = citedFacts.find(
        f =>
          canonicalFactField(f.field) === af &&
          canonicalNumber(f.value) === av &&
          canonicalFactUnit(f.unit) === au,
      );
      if (!hit) {
        rejections.push(
          `claim ${i + 1}: assertion ${normalizeFactField(a.field)}=${canonicalNumber(a.value)} ${canonicalFactUnit(a.unit)} has no matching field/value/unit fact among the claim's own cited evidence — rejected (R4-02)`,
        );
        assertionFailure = true;
        continue;
      }
      matchedValues.add(av);
    }
    if (assertionFailure) continue;

    // (b) every number the claim STATES must be either a matched assertion
    //     value or an incidental number of the cited text (dates, ids) —
    //     never a bare text match for an asserted metric
    const claimNumbers = extractNormalizedNumbers(c.claim);
    if (claimNumbers.size > 0 && assertions.length === 0) {
      rejections.push(
        `claim ${i + 1}: contains numbers but asserts no field/value/unit — semantic grounding unavailable, rejected (R4-02; copy the fact annotation into assertions)`,
      );
      continue;
    }
    let numberFailure = false;
    for (const n of claimNumbers) {
      if (matchedValues.has(n) || citedTextNumbers.has(n)) continue;
      rejections.push(
        `claim ${i + 1}: number ${n} is neither a matched assertion nor an incidental figure of the cited evidence — unsupported figure, rejected (R4-02)`,
      );
      numberFailure = true;
    }
    if (numberFailure) continue;

    surviving.push({
      claim: c.claim,
      evidenceIds: [...c.evidenceIds],
      assertions: assertions.map(a => ({ field: a.field, value: a.value, unit: a.unit })),
      citedItems,
      matchedValues,
    });
  }

  // (c) answer floor (batch level): numbers in the answer must trace to the
  // surviving claims' own cited facts/text — prose cannot mint figures.
  if (rejections.length === 0) {
    const pool = new Set<string>();
    for (const s of surviving) {
      for (const v of s.matchedValues) pool.add(v);
      for (const it of s.citedItems) {
        for (const f of it.facts ?? []) pool.add(canonicalNumber(f.value));
        for (const n of extractNormalizedNumbers(it.text)) pool.add(n);
      }
    }
    for (const n of extractNormalizedNumbers(answer)) {
      if (!pool.has(n)) {
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
    validatedClaims: surviving.map(({ claim, evidenceIds, assertions }) => ({ claim, evidenceIds, assertions })),
    grounded: true,
    mode: "structured-claims",
    rejections: [],
  };
}
