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
    // Audit 2026-10-02 P0: the id fragment must distinguish the three real
    // states — live WITH a disclosed observation time, live with NO
    // disclosed time, and seed. It previously collapsed live+no-time into
    // ":seed", which mislabelled live data as seed in the audit trail.
    const idFragment =
      rf.source === "live"
        ? (asOf ?? "no-disclosed-observation-time")
        : rf.source === "derived" && asOf
        ? asOf
        : "seed";
    const prov =
      rf.source === "live"
        ? asOf
          ? `live via vendor ${vendorName ?? "unknown"}, observed/as-of ${asOf}`
          : `live via vendor ${vendorName ?? "unknown"}, no disclosed observation time`
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
      id: `fundamental:${sym}:${field}:${idFragment}`,
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

// ── Audit 2026-10-02 (P0): claim-text semantic attribution ────────────────
// Field mentions a claim may use, mapped to canonical fact fields. Order is
// SPECIFICITY: composite names (price-to-earnings) must win over their
// substrings (price). Used ONLY to attribute a stated number to a field —
// "P/E = 12" must be backed by a pe assertion, not by a roe assertion that
// happens to carry the same value.
const FIELD_MENTIONS: Array<{ field: string; re: RegExp }> = [
  { field: "pe", re: /\bp\/?e\s*(?:ratio)?\b|\bprice[-\s]?to[-\s]?earnings\b|\bprice earnings\b/gi },
  { field: "pb", re: /\bp\/?b\s*(?:ratio)?\b|\bprice[-\s]?to[-\s]?book\b/gi },
  { field: "de", re: /\bd\/?e\s*(?:ratio)?\b|\bdebt[-\s]?to[-\s]?equity\b/gi },
  { field: "roe", re: /\broe\b|\breturn on equity\b/gi },
  { field: "roce", re: /\broce\b|\breturn on capital(?:\s+employed)?\b/gi },
  { field: "opm", re: /\bopm\b|\boperating margin\b/gi },
  { field: "promo", re: /\bpromoter(?:\s+holding)?\b/gi },
  { field: "revcagr", re: /\brevenue\s+(?:cagr|growth)\b/gi },
  { field: "epscagr", re: /\beps\s+(?:cagr|growth)\b/gi },
  { field: "mktcap", re: /\bmarket\s+cap(?:itali[sz]ation)?\b/gi },
  { field: "bvps", re: /\bbook\s+value(?:\s*(?:per\s+share|\/\s*share))?\b/gi },
  { field: "fcfmargin", re: /\bfcf\s+margin\b/gi },
  { field: "score", re: /\b(?:consensus|risi?shi?)\s+score\b|\bscore\b|\bconsensus\b/gi },
  { field: "price", re: /\bprice\b/gi },
  { field: "change", re: /\bchange(?:d|s)?\b/gi },
];

/** Unit tokens that may trail a stated number ("12%", "21x", "3.2 Cr"). */
const UNIT_TOKENS: Array<{ unit: string; re: RegExp }> = [
  { unit: "percent", re: /^(?:%|percent|pct)\b/i },
  { unit: "multiple", re: /^(?:x|times)\b/i },
  { unit: "inr_crore", re: /^(?:cr|crore)s?\b/i },
  { unit: "points", re: /^(?:pts?|points)\b/i },
  { unit: "inr", re: /^(?:rs\.?|rupees?)\b/i },
];

interface StatedNumber {
  key: string;
  /** Canonical field the claim text attributes the number to (if any). */
  field: string | null;
  /** Canonical unit token attached to the number (if any). */
  unit: string | null;
  /** The raw token as written ("fifty", "1.2 lakh crore") — quoted in
   * rejections so auditors can see WHICH stated number failed. */
  raw: string;
}

const ATTR_WINDOW_BEFORE = 40;
const ATTR_WINDOW_AFTER = 15;

// ── Round-5 audit (Q4 carried over): number WORDS and South-Asian scale ──
// forms are stated numbers too. "Return on equity is fifty percent" used to
// carry zero digits and sailed through untouched; "1.2 lakh crore" was read
// as the literal 1.2.
const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000, million: 1e6, billion: 1e9, trillion: 1e12,
};
const NUMBER_WORD_RE = new RegExp(
  "\\b(" + Object.keys(NUMBER_WORDS).join("|") + ")" +
  "(?:[\\s-]+(?:and\\s+)?(" + Object.keys(NUMBER_WORDS).join("|") + "))*\\b",
  "gi",
);

interface NumberSpan {
  raw: string;
  value: number;
  start: number;
  end: number;
  /** True when the span came from words, not digits. */
  isWord: boolean;
}

/** Evaluate a sequence of number words ("one hundred and twenty" -> 120). */
function evalWordSequence(words: string[]): number {
  let total = 0;
  let current = 0;
  for (const w of words) {
    const v = NUMBER_WORDS[w.toLowerCase()] ?? 0;
    if (v === 100) {
      current = (current || 1) * 100;
    } else if (v >= 1000) {
      total += (current || 1) * v;
      current = 0;
    } else {
      current += v;
    }
  }
  return total + current;
}

/** Digit spans AND word spans, position-sorted. Single-token word numbers
 * count only when a unit token follows ("one must be careful" is prose,
 * "fifty percent" is a stated number); multi-token sequences always count. */
function numberSpans(text: string): NumberSpan[] {
  const spans: NumberSpan[] = [];
  for (const m of text.matchAll(/-?\d[\d,]*(?:\.\d+)?/g)) {
    const value = Number(m[0].replace(/,/g, ""));
    if (Number.isFinite(value)) {
      spans.push({ raw: m[0], value, start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, isWord: false });
    }
  }
  for (const m of text.matchAll(NUMBER_WORD_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const words = m[0].split(/[\s-]+/).filter(w => w && w.toLowerCase() !== "and");
    if (words.length === 0) continue;
    const after = text.slice(end, end + 16).trimStart().toLowerCase();
    const unitFollows = /^(?:%|percent|pct|x|times|crores?|crs?|lakhs?|lacs?|pts?|points|rs\.?|rupees?)\b/.test(after);
    if (words.length === 1 && !unitFollows) continue; // prose "one", "a couple"
    const value = evalWordSequence(words);
    if (Number.isFinite(value)) {
      spans.push({ raw: m[0], value, start, end, isWord: true });
    }
  }
  return spans.sort((a, b) => a.start - b.start);
}

/** Parse every stated number with its attribution + attached unit token. */
function statedNumbers(text: string): StatedNumber[] {
  const collapsed = text.replace(/(-?\d[\d,]*(?:\.\d+)?)\s*\/\s*100\b/g, "$1");
  const out: StatedNumber[] = [];
  for (const span of numberSpans(collapsed)) {
    const { start, end, value } = span;
    // nearest field mention within the window (distance, then specificity)
    let field: string | null = null;
    let bestDist = Infinity;
    let bestPrio = Infinity;
    for (let prio = 0; prio < FIELD_MENTIONS.length; prio += 1) {
      const fm = FIELD_MENTIONS[prio];
      for (const mm of collapsed.matchAll(fm.re)) {
        const ms = mm.index ?? 0;
        const me = ms + mm[0].length;
        if (me <= start && start - me <= ATTR_WINDOW_BEFORE) {
          const dist = start - me;
          if (dist < bestDist || (dist === bestDist && prio < bestPrio)) {
            bestDist = dist; bestPrio = prio; field = fm.field;
          }
        } else if (ms >= end && ms - end <= ATTR_WINDOW_AFTER) {
          const dist = ms - end;
          if (dist < bestDist || (dist === bestDist && prio < bestPrio)) {
            bestDist = dist; bestPrio = prio; field = fm.field;
          }
        }
      }
    }
    // Scale + unit tokens after the number. Round-5: South-Asian scale
    // words are part of the number — "1.2 lakh crore" is 120000 crore,
    // not 1.2; "5 lakh" is 500000 rupees.
    const after = collapsed.slice(end, end + 16);
    let scaled = value;
    let unit: string | null = null;
    const lakhCr = after.match(/^\s*(?:lakh|lac)\s+(?:crore|cr)s?\b/i);
    const lakhOnly = after.match(/^\s*(?:lakhs?|lacs?)\b/i);
    if (lakhCr) {
      scaled = value * 100000;
      unit = "inr_crore";
    } else if (lakhOnly) {
      scaled = value * 100000;
      unit = "inr";
    } else {
      for (const ut of UNIT_TOKENS) {
        if (ut.re.test(after)) { unit = ut.unit; break; }
      }
    }
    out.push({ key: canonicalNumber(scaled), field, unit, raw: collapsed.slice(Math.max(0, start), end + (lakhCr ? 16 : (lakhOnly ? 8 : 0))).trim() });
  }
  return out;
}

/**
 * Validate model-produced claims against the evidence items that were
 * actually supplied in THIS request. Fail closed, THREE layers (roadmap
 * R4-02; audit 2026-10-02 P0 removed the text-number escape hatch):
 *   1. unknown evidence id → the claim is unverifiable;
 *   2. PER-CLAIM semantic check: every numeric claim must carry assertions
 *      {field, value, unit}, and each assertion must EXACTLY match a typed
 *      fact (field, value, unit — all canonicalized) on one of THIS claim's
 *      own cited items. Numbers are pooled per claim, never across claims.
 *      Every number STATED in the claim text must be a matched assertion
 *      value — arbitrary prose-number presence (dates, ids, a figure that
 *      merely occurs in the cited text) is NO LONGER support (the escape
 *      hatch: "As of 2026-09-30 the ROE is 12%" used to pass because 2026
 *      existed in the citation). A number the claim text attributes to a
 *      field ("P/E = 12") requires an assertion FOR THAT FIELD, and a unit
 *      token attached to the number ("ROE = 12x") must match the
 *      assertion's unit.
 *   3. the answer's numbers must trace to the union of the validated
 *      claims' MATCHED ASSERTION VALUES — prose cannot mint figures, and
 *      cited-text numbers (dates) cannot launder them.
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
    /** Canonical field -> matched assertion (for attribution checks). */
    matchedByField: Map<string, { value: string; unit: string }>;
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
    const assertions = Array.isArray(c.assertions) ? c.assertions : [];

    // (a) every assertion must exactly match a fact in THIS claim's pool
    const matchedValues = new Set<string>();
    const matchedByField = new Map<string, { value: string; unit: string }>();
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
      if (!matchedByField.has(af)) matchedByField.set(af, { value: av, unit: au });
    }
    if (assertionFailure) continue;

    // (b) every number the claim STATES must be a matched assertion value —
    //     attributed numbers additionally need an assertion for THAT field
    //     with THAT value (and unit token, when attached). The old
    //     cited-text presence route is GONE (audit 2026-10-02 P0).
    //     Round-5: number words and lakh/crore forms are stated numbers.
    const stated = statedNumbers(c.claim);
    if (stated.length > 0 && assertions.length === 0) {
      rejections.push(
        `claim ${i + 1}: states numbers (${stated.map(s => JSON.stringify(s.raw)).join(", ")}) but asserts no field/value/unit — semantic grounding unavailable, rejected (R4-02; copy the fact annotation into assertions)`,
      );
      continue;
    }
    let numberFailure = false;
    for (const sn of stated) {
      if (sn.field !== null) {
        const m = matchedByField.get(sn.field);
        if (!m) {
          rejections.push(
            `claim ${i + 1}: number ${JSON.stringify(sn.raw)} is attributed to ${sn.field} in the claim text but no ${sn.field} assertion was provided — rejected (audit 2026-10-02)`,
          );
          numberFailure = true;
          continue;
        }
        if (m.value !== sn.key) {
          rejections.push(
            `claim ${i + 1}: claims ${sn.field}=${JSON.stringify(sn.raw)} but the matched ${sn.field} assertion is ${m.value} — rejected (audit 2026-10-02)`,
          );
          numberFailure = true;
          continue;
        }
        if (sn.unit !== null && sn.unit !== m.unit) {
          rejections.push(
            `claim ${i + 1}: states ${sn.field}=${JSON.stringify(sn.raw)} ${sn.unit} but the matched assertion's unit is ${m.unit} — rejected (audit 2026-10-02)`,
          );
          numberFailure = true;
          continue;
        }
      } else if (!matchedValues.has(sn.key)) {
        rejections.push(
          `claim ${i + 1}: number ${JSON.stringify(sn.raw)} is not a matched assertion value — unsupported figure (dates and incidental prose numbers are not evidence), rejected (audit 2026-10-02)`,
        );
        numberFailure = true;
      }
    }
    if (numberFailure) continue;

    // (b2) Round-5 audit (Q4 B4): a claim that NAMES a specific metric
    //     field without stating a number must still cite an item that
    //     actually carries that field — "debt to equity is alarming"
    //     citing only a news item is a digitless fabrication free-ride.
    //     Generic words (price/change/score) are exempt: they appear in
    //     ordinary prose too often to gate on.
    const SPECIFIC_FIELDS = new Set([
      "pe", "pb", "de", "roe", "roce", "opm", "promo", "revcagr",
      "epscagr", "mktcap", "bvps", "fcfmargin",
    ]);
    const mentionedFields = new Set<string>();
    for (const fm of FIELD_MENTIONS) {
      if (!SPECIFIC_FIELDS.has(fm.field)) continue;
      // matchAll is stateless on the source regex (it iterates a clone),
      // so probing for a mention here cannot disturb the attribution pass.
      for (const _m of c.claim.matchAll(fm.re)) {
        mentionedFields.add(fm.field);
      }
    }
    let fieldCiteFailure = false;
    for (const f of mentionedFields) {
      if (!citedFacts.some(fact => canonicalFactField(fact.field) === f)) {
        rejections.push(
          `claim ${i + 1}: mentions ${f} but none of the claim's own cited items carry a ${f} fact — cite the item that has it or drop the claim (round-5 B4)`,
        );
        fieldCiteFailure = true;
      }
    }
    if (fieldCiteFailure) continue;

    surviving.push({
      claim: c.claim,
      evidenceIds: [...c.evidenceIds],
      assertions: assertions.map(a => ({ field: a.field, value: a.value, unit: a.unit })),
      citedItems,
      matchedValues,
      matchedByField,
    });
  }

  // (c) answer floor (batch level): numbers in the answer must trace to the
  // surviving claims' MATCHED ASSERTION VALUES only — cited-text numbers
  // (dates, ids) cannot launder a figure into the answer (audit 2026-10-02).
  // Round-5: word numbers and lakh/crore forms count here too.
  if (rejections.length === 0) {
    const pool = new Set<string>();
    for (const s of surviving) {
      for (const v of s.matchedValues) pool.add(v);
    }
    for (const sn of statedNumbers(answer)) {
      if (!pool.has(sn.key)) {
        rejections.push(`answer: number ${JSON.stringify(sn.raw)} is not a matched assertion value — unsupported figure, rejected (audit 2026-10-02)`);
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
