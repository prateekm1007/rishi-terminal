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
//   fundamental:<symbol>:<field>:<asOf | "seed" | "seed-derived" |
//                 "no-disclosed-observation-time">
//     The fragments never collide: source=seed ends ":seed"; a live/derived
//     field with a disclosed observation time carries that time; a live
//     field whose upstream disclosed NO time ends
//     ":no-disclosed-observation-time" (never ":seed" — Commit D §3); a
//     derivation from pure seed inputs ends ":seed-derived"; a mixed-source
//     derivation (seed + live inputs) ends ":no-disclosed-observation-time"
//     and its text says so explicitly.
//   score:<symbol>:<engine-version>:<asOf | "seed-derived" |
//                 "no-disclosed-observation-time">
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
  //    Commit D §3: a live field whose upstream disclosed no observation
  //    time keeps source=live but claims NO as-of — the id fragment says
  //    no-disclosed-observation-time and the text says so; a fabricated
  //    fetch/serve timestamp never appears (it never exists to appear).
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
        ? asOf
          ? `live via vendor ${vendorName ?? "unknown"}, observed/as-of ${asOf}`
          : `live via vendor ${vendorName ?? "unknown"} — no observation time disclosed by the upstream`
        : rf.source === "derived"
        ? rf.note ?? `derived${asOf ? ` from live inputs (as-of ${asOf})` : " from seed inputs (no observation time claimed)"}`
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
    // Id fragment: the collision Commit D §3 forbids is live-without-a-
    // timestamp reading as ":seed". seed → :seed; disclosed time → the time;
    // live without a disclosed time or a mixed-source derivation →
    // :no-disclosed-observation-time; a pure-seed derivation → :seed-derived.
    const idFragment =
      rf.source === "seed"
        ? "seed"
        : asOf
        ? asOf
        : rf.source === "live" || rf.note
        ? "no-disclosed-observation-time"
        : "seed-derived";
    items.push({
      id: `fundamental:${sym}:${field}:${idFragment}`,
      text: `${label}: ${fmt(rf.value)} | provenance: ${prov}.${factAnnotation([fact])}`,
      facts: [fact],
    });
  }

  // 3. THE canonical Rishi consensus — consumed, never recomputed by the AI.
  //    The id embeds the engine version so an audit can pin which engine
  //    produced the number the model cites.
  const consensus = getStockScore(resolved);
  // Score as-of (Commit D §3 semantics): no live inputs → seed-derived; one
  // single disclosed observation time across the live fields → that time;
  // otherwise (live inputs with no/multiple disclosed times) the score
  // claims NO observation time instead of pretending one exists.
  const liveFields = Object.values(resolved.fields).filter(f => f.source === "live");
  const liveAsOfs = [...new Set(liveFields.map(f => f.asOf).filter((a): a is string => !!a))];
  const scoreAsOf =
    liveFields.length === 0 ? "seed-derived" : liveAsOfs.length === 1 ? liveAsOfs[0] : "no-disclosed-observation-time";
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
   *  typed fact on the claim's OWN cited items AND the claim text is
   *  semantically consistent with its assertions (one fabricated id, one
   *  unsupported figure, one field/unit/value mismatch, or one prose number
   *  that is not a validated assertion fails them all).
   *  Commit D §2A: for a numeric claim the `claim` string is
   *  SERVER-GENERATED from the validated assertions ("roe = 12 percent —
   *  verified against <id> (source)") — the model's free-form prose is
   *  never the verified surface. Number-free (qualitative) claims keep the
   *  model's text; only their evidence ids are verified there. */
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

// ── Prose scanners (Commit D §2A — deterministic, closed tables) ──────

/** Unit markers that may be attached to a number in prose, mapped into the
 *  canonical unit taxonomy. Closed set, longest-prefix-first: anything not
 *  listed is simply not a marker (the value checks still bind). */
const TEXT_UNIT_MARKERS: ReadonlyArray<readonly [string, string]> = [
  ["percent", "percent"], ["pct", "percent"], ["%", "percent"],
  ["times", "multiple"], ["\u00d7", "multiple"], ["x", "multiple"],
  ["points", "points"], ["point", "points"], ["pts", "points"],
  ["crores", "inr_crore"], ["crore", "inr_crore"], ["cr", "inr_crore"],
  ["ratio", "ratio"],
  ["rupees", "inr"], ["rupee", "inr"], ["inr", "inr"], ["rs", "inr"],
];

function unitMarkerAfter(text: string, end: number): string | null {
  let i = end;
  if (text[i] === " ") i += 1;
  const rest = text.slice(i).toLowerCase();
  for (const [marker, unit] of TEXT_UNIT_MARKERS) {
    if (!rest.startsWith(marker)) continue;
    const next = rest[marker.length];
    if (next === undefined || !/[a-z0-9]/.test(next)) return unit;
  }
  return null;
}

function currencyMarkerBefore(text: string, index: number): string | null {
  let i = index;
  if (i > 0 && text[i - 1] === " ") i -= 1;
  const before = text.slice(0, i).toLowerCase();
  if (before.endsWith("\u20b9")) return "inr";
  return /(?:^|[^a-z0-9])(rs\.?|inr|rupees|rupee)$/.test(before) ? "inr" : null;
}

export interface ProseNumber {
  /** Canonical numeric key (same canonicalization as facts/assertions). */
  canonical: string;
  /** Canonical unit of an adjacent marker (%/x/₹/Cr/…), or null when the
   *  number carries no unit marker in the text. */
  unit: string | null;
}

/** Every number a piece of prose states, with the unit marker attached to
 *  it (if any). Uses the SAME number regex as extractNormalizedNumbers so
 *  the value set is identical by construction. */
export function scanProseNumbers(text: string): ProseNumber[] {
  const out: ProseNumber[] = [];
  for (const m of text.matchAll(/-?\d[\d,]*(?:\.\d+)?/g)) {
    const n = Number(m[0].replace(/,/g, ""));
    if (!Number.isFinite(n)) continue;
    const idx = m.index ?? 0;
    const unit =
      unitMarkerAfter(text, idx + m[0].length) ?? currencyMarkerBefore(text, idx);
    out.push({ canonical: canonicalNumber(n), unit });
  }
  return out;
}

/** Closed surface-form table for the metric names the model may write in
 *  prose (Commit D §2A). Deliberately conservative and deterministic: a
 *  phrasing not listed is simply not detected (the value/unit checks still
 *  bind); a LISTED metric named inside a numeric claim must be one the
 *  claim asserts, else the claim is rejected. Bare "de" is intentionally
 *  absent ("de facto" false positives) — D/E is matched via "d/e" and the
 *  spelled-out forms. */
const FIELD_TEXT_PATTERNS: Readonly<Record<string, readonly string[]>> = {
  pe: ["p/e", "pe ratio", "price to earnings", "price-to-earnings", "pe"],
  pb: ["p/b", "pb", "price to book", "price-to-book"],
  roe: ["roe", "return on equity"],
  roce: ["roce", "return on capital employed"],
  opm: ["opm", "operating margin"],
  de: ["d/e", "debt to equity", "debt-to-equity", "debt equity"],
  promo: ["promoter holding", "promoter stake", "promoters", "promoter"],
  revcagr: ["revenue cagr", "rev cagr", "sales cagr", "revenue growth"],
  epscagr: ["eps cagr", "earnings cagr", "profit cagr", "profit growth"],
  mktcap: ["market cap", "market capitalization", "mktcap", "mkt cap"],
  bvps: ["book value", "bvps"],
  fcfmargin: ["fcf margin", "free cash flow margin"],
  price: ["price", "trades at", "trading at", "cmp"],
  change: ["change"],
  score: ["score", "rishi consensus"],
};

/** Metrics named in a piece of prose (word-boundary matched, closed table). */
export function detectEvidenceFields(text: string): Set<string> {
  const t = text.toLowerCase();
  const found = new Set<string>();
  for (const [field, patterns] of Object.entries(FIELD_TEXT_PATTERNS)) {
    for (const p of patterns) {
      const esc = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
      if (new RegExp(`(?<![a-z0-9])${esc}(?![a-z0-9])`).test(t)) {
        found.add(field);
        break;
      }
    }
  }
  return found;
}

/**
 * Validate model-produced claims against the evidence items that were
 * actually supplied in THIS request. Fail closed, FOUR layers (roadmap
 * R4-02, Commit D semantic correction):
 *   1. unknown evidence id → the claim is unverifiable;
 *   2. PER-CLAIM semantic check: every numeric claim must carry assertions
 *      {field, value, unit}, and each assertion must EXACTLY match a typed
 *      fact (field, value, unit — all canonicalized) on one of THIS claim's
 *      own cited items. Numbers are pooled per claim, never across claims:
 *      a figure real in claim 1's citation cannot support claim 2. Citing a
 *      real id for a figure it does not carry is still fabrication; citing
 *      a real id for a DIFFERENT field's number (ROE=99% citing a text
 *      carrying P/E=99) is fabrication too.
 *   3. CLAIM-TEXT SEMANTICS (Commit D §2A): the model's prose is not
 *      authoritative. Every number a numeric claim states must be one of
 *      its VALIDATED ASSERTION values — presence in the cited evidence's
 *      prose (a date, an id, another metric) proves nothing and the old
 *      citedTextNumbers escape is gone. A unit marker attached to a number
 *      in the prose must match the asserted unit ("12x" is not "12
 *      percent"), and a metric named in a numeric claim's prose must be one
 *      the claim asserts ("P/E is 12" is not saved by an roe assertion).
 *      The SERVED verified claim is then GENERATED by the server from the
 *      validated assertions and the evidence ids that carry them — model
 *      prose is never published as semantically verified for numeric
 *      claims. Number-free claims keep the model's text (ids verified).
 *   4. ANSWER FLOOR (Commit D): numbers in the answer must trace to the
 *      validated assertions or to TYPED FACTS of the surviving claims' own
 *      cited items — never to evidence prose; a unit marker on an answer
 *      number must match a typed fact's unit for that value, and a metric
 *      named in a numeric answer must be typed by the cited items.
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
    // Commit D §2A: the cited TEXT numbers are deliberately NOT a pool —
    // a number appearing in evidence prose (a date, an id, another metric)
    // is not evidence that it is the asserted financial fact.
    const assertions = Array.isArray(c.assertions) ? c.assertions : [];

    // (a) every assertion must exactly match a fact in THIS claim's pool
    const matchedValues = new Set<string>();
    const matchedAssertions: Array<{
      field: string;
      value: string;
      unit: string;
      itemId: string;
      source?: string;
    }> = [];
    let assertionFailure = false;
    for (const a of assertions) {
      const af = canonicalFactField(a.field);
      const av = canonicalNumber(a.value);
      const au = canonicalFactUnit(a.unit);
      let hitItem: AiEvidenceItem | undefined;
      let hitSource: string | undefined;
      for (const it of citedItems) {
        const f = (it.facts ?? []).find(
          x =>
            canonicalFactField(x.field) === af &&
            canonicalNumber(x.value) === av &&
            canonicalFactUnit(x.unit) === au,
        );
        if (f) {
          hitItem = it;
          hitSource = f.source;
          break;
        }
      }
      if (!hitItem) {
        rejections.push(
          `claim ${i + 1}: assertion ${normalizeFactField(a.field)}=${canonicalNumber(a.value)} ${canonicalFactUnit(a.unit)} has no matching field/value/unit fact among the claim's own cited evidence — rejected (R4-02)`,
        );
        assertionFailure = true;
        continue;
      }
      matchedValues.add(av);
      matchedAssertions.push({ field: af, value: av, unit: au, itemId: hitItem.id, source: hitSource });
    }
    if (assertionFailure) continue;

    // (b) CLAIM-TEXT SEMANTICS (Commit D §2A): every number the claim
    //     STATES must be a validated assertion value — never merely a
    //     number that appears in the cited prose. A unit marker attached
    //     to a prose number must match the asserted unit, and a metric
    //     named in a numeric claim must be one the claim asserts.
    const proseNumbers = scanProseNumbers(c.claim);
    if (proseNumbers.length > 0 && assertions.length === 0) {
      rejections.push(
        `claim ${i + 1}: contains numbers but asserts no field/value/unit — semantic grounding unavailable, rejected (R4-02; copy the fact annotation into assertions)`,
      );
      continue;
    }
    const assertedFields = new Set(matchedAssertions.map(a => a.field));
    let textFailure = false;
    for (const pn of proseNumbers) {
      if (!matchedValues.has(pn.canonical)) {
        rejections.push(
          `claim ${i + 1}: number ${pn.canonical} is not a validated assertion value — numbers in the cited evidence's prose are not evidence (Commit D) — rejected (R4-02)`,
        );
        textFailure = true;
        continue;
      }
      if (pn.unit && !matchedAssertions.some(a => a.value === pn.canonical && a.unit === pn.unit)) {
        rejections.push(
          `claim ${i + 1}: number ${pn.canonical} is written as a ${pn.unit} but no asserted fact carries ${pn.canonical} ${pn.unit} — unit semantics mismatch, rejected (Commit D)`,
        );
        textFailure = true;
      }
    }
    if (textFailure) continue;
    if (proseNumbers.length > 0) {
      const unnamed = [...detectEvidenceFields(c.claim)].filter(f => !assertedFields.has(f));
      if (unnamed.length > 0) {
        rejections.push(
          `claim ${i + 1}: names metric(s) ${unnamed.join(", ")} without asserting them — a numeric claim may only name metrics it asserts, rejected (Commit D)`,
        );
        continue;
      }
    }

    // (c) SERVER-GENERATED GROUNDED CLAIM (Commit D §2A, the preferred
    //     architecture): the verified surface is derived from the VALIDATED
    //     assertions and the evidence items that carry them. The model's
    //     free-form claim text is never published as semantically verified
    //     for numeric claims; number-free claims keep the model's text.
    const servedClaim =
      matchedAssertions.length > 0
        ? matchedAssertions
            .map(
              a =>
                `${a.field} = ${a.value} ${a.unit} — verified against ${a.itemId}${a.source ? ` (${a.source})` : ""}`,
            )
            .join("; ")
        : c.claim;

    surviving.push({
      claim: servedClaim,
      evidenceIds: [...c.evidenceIds],
      assertions: assertions.map(a => ({ field: a.field, value: a.value, unit: a.unit })),
      citedItems,
      matchedValues,
    });
  }

  // (d) answer floor (batch level): every number in the answer must trace
  // to the validated assertions or to TYPED FACTS of the surviving claims'
  // own cited items — never to the cited TEXT (Commit D: prose cannot mint
  // figures). A unit marker on an answer number must match a typed fact's
  // unit for that value, and a metric named in a numeric answer must be
  // typed by the cited items.
  if (rejections.length === 0) {
    const valuePool = new Set<string>();
    const typedValueUnits = new Set<string>();
    const typedFields = new Set<string>();
    for (const s of surviving) {
      for (const v of s.matchedValues) valuePool.add(v);
      for (const a of s.assertions) {
        const cv = canonicalNumber(a.value);
        valuePool.add(cv);
        typedValueUnits.add(`${cv}|${canonicalFactUnit(a.unit)}`);
        typedFields.add(canonicalFactField(a.field));
      }
      for (const it of s.citedItems) {
        for (const f of it.facts ?? []) {
          const cv = canonicalNumber(f.value);
          valuePool.add(cv);
          typedValueUnits.add(`${cv}|${canonicalFactUnit(f.unit)}`);
          typedFields.add(canonicalFactField(f.field));
        }
      }
    }
    const answerNumbers = scanProseNumbers(answer);
    for (const pn of answerNumbers) {
      if (!valuePool.has(pn.canonical)) {
        rejections.push(
          `answer: number ${pn.canonical} does not trace to a validated assertion or a typed fact of the cited evidence — unsupported figure, rejected (R4-02)`,
        );
        continue;
      }
      if (pn.unit && !typedValueUnits.has(`${pn.canonical}|${pn.unit}`)) {
        rejections.push(
          `answer: number ${pn.canonical} is written as a ${pn.unit} but no cited typed fact carries ${pn.canonical} ${pn.unit} — unit semantics mismatch, rejected (Commit D)`,
        );
      }
    }
    if (rejections.length === 0 && answerNumbers.length > 0) {
      const named = [...detectEvidenceFields(answer)].filter(f => !typedFields.has(f));
      if (named.length > 0) {
        rejections.push(
          `answer: names metric(s) ${named.join(", ")} that no cited typed fact carries — unsupported field reference, rejected (Commit D)`,
        );
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
