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
//   score:<symbol>:<engine-version>:<observation-state>  (closed vocabulary:
//                              <asOf> | seed-derived | live-undated |
//                              live-mixed-observation | mixed-provenance)
//   news:<stable-id>          (class supported; per-symbol wiring pending —
//                              the honest unavailable note is emitted instead)
//
// `null` is a real state (constitution art. 3/16): an upstream that disclosed
// no observation time yields an id fragment saying so — never a fabricated
// timestamp; an unavailable price yields an explicit unavailable item, never
// a made-up number.

import 'server-only';

import { resolveStockMetrics, getStockScore, SCORE_ENGINE_VERSION } from '@/lib/scoring';
import type { ResolvedStockMetrics } from '@/lib/scoring';
import type { FullFundamentals } from '@/lib/liveFundamentals';
import { fetchFullFundamentals } from '@/lib/liveFundamentals';
import { fetchLivePrice } from '@/lib/livePrice';
import type { PricePoint } from '@/lib/livePrice';
import {
  COINGECKO_IDS,
  isBondSymbol,
  YAHOO_COMMODITY_SYMBOLS,
  YAHOO_INDEX_SYMBOLS,
  YAHOO_SPECIAL,
} from '@/lib/livePrice';
import { COMMODITIES } from '@/data/markets';
import { CRYPTO_ASSETS } from '@/data/crypto';
import { INDIAN_INDEXES } from '@/data/indexes';
import { FOREX_PAIRS } from '@/data/forex';
import { isValidSymbolInput, PRICE_REGISTRY_TOKENS, SLASHED } from '@/lib/registry/validateInput';
import type { AiEvidenceFact, AiEvidenceItem, AiSourceState } from './schemas';

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

/** Budget for the live fundamentals fetch — the chat path must stay bounded. */
const FUNDAMENTALS_TIMEOUT_MS = 10_000;

/** §11 latency attribution for one request's observation state: per-symbol
 *  FIRST-fetch durations plus memo-hit counts. The state is the request's
 *  coalescing layer, so `memoHits` IS the cache/coalescing-hit count for
 *  the AI loop (a second tool asking for the same symbol's price is a hit,
 *  not a second upstream fetch). */
export interface CanonicalStockStateTimings {
  priceFetches: Array<{ symbol: string; ms: number }>;
  fundamentalsFetches: Array<{ symbol: string; ms: number }>;
  memoHits: { price: number; fundamentals: number };
}

/**
 * Commit M7 — THE per-request canonical observation state.
 *
 * One symbol → ONE bounded live-fundamentals fetch + ONE price observation,
 * memoized and shared by the initial evidence package AND every tool call
 * in the same AI loop. This is the structural fix for the L1 defect: the
 * package and getFinancials resolved through the live overlay while
 * getStock/getScore re-resolved from the seed baseline, so two tools in
 * one loop could answer from different data states for the same symbol.
 *
 * The state REUSES the canonical resolver and the evidence builders —
 * no duplicated scoring logic, no second source of truth. It exists for
 * exactly one request's lifetime (a fresh one is created per chat
 * request); within that lifetime, the same symbol always yields the same
 * observation, so the initial evidence score and getScore's score fact
 * are byte-identical by construction.
 */
export interface CanonicalStockState {
  /** Bounded live-fundamentals fetch, memoized per symbol. */
  fundamentals(symbol: string): Promise<FullFundamentals | null>;
  /** Live price observation, memoized per symbol. */
  price(symbol: string): Promise<PricePoint | null>;
  /** The canonical resolver applied to the memoized overlay (null for an
   *  unknown symbol). Same inputs → same ResolvedStockMetrics, always. */
  resolve(symbol: string): Promise<ResolvedStockMetrics | null>;
  /** §11 attribution (measurement only — never changes behavior). */
  timings(): CanonicalStockStateTimings;
}

export function createCanonicalStockState(deps: EvidenceDeps = {}): CanonicalStockState {
  const getFundamentals = deps.getFundamentals ?? fetchFullFundamentals;
  const getPrice = deps.getPrice ?? fetchLivePrice;
  const fundamentalsCache = new Map<string, Promise<FullFundamentals | null>>();
  const priceCache = new Map<string, Promise<PricePoint | null>>();
  const resolveCache = new Map<string, ResolvedStockMetrics | null>();
  const timings: CanonicalStockStateTimings = {
    priceFetches: [],
    fundamentalsFetches: [],
    memoHits: { price: 0, fundamentals: 0 },
  };

  const fundamentals = (symbol: string): Promise<FullFundamentals | null> => {
    const key = symbol.trim().toUpperCase();
    let p = fundamentalsCache.get(key);
    if (!p) {
      const t0 = Date.now();
      p = fetchFundamentalsBounded(key, getFundamentals).finally(() => {
        timings.fundamentalsFetches.push({ symbol: key, ms: Date.now() - t0 });
      });
      fundamentalsCache.set(key, p);
    } else {
      timings.memoHits.fundamentals += 1;
    }
    return p;
  };

  const price = (symbol: string): Promise<PricePoint | null> => {
    const key = symbol.trim().toUpperCase();
    let p = priceCache.get(key);
    if (!p) {
      const t0 = Date.now();
      // The RAW promise is memoized: a throw propagates to consumers that
      // await without catching (getPrices → explicit `failed` state), while
      // the evidence package catches it and renders the honest unavailable
      // price item. One observation, two consumption contracts.
      p = Promise.resolve(getPrice(key)).finally(() => {
        timings.priceFetches.push({ symbol: key, ms: Date.now() - t0 });
      });
      priceCache.set(key, p);
    } else {
      timings.memoHits.price += 1;
    }
    return p;
  };

  const resolve = async (symbol: string): Promise<ResolvedStockMetrics | null> => {
    const key = symbol.trim().toUpperCase();
    if (resolveCache.has(key)) return resolveCache.get(key)!;
    const live = await fundamentals(key);
    const resolved = resolveStockMetrics(key, live ? toResolverFundamentals(live) : null);
    resolveCache.set(key, resolved);
    return resolved;
  };

  return { fundamentals, price, resolve, timings: () => timings };
}

/**
 * One bounded live-fundamentals fetch, shared by the evidence assembler and
 * the AI tool layer (Commit L1) so both paths enforce the SAME budget and
 * the SAME null-on-failure semantics (one source of truth — no second
 * copy of the fetch contract that can drift).
 */
export async function fetchFundamentalsBounded(
  symbol: string,
  get: (symbol: string) => Promise<FullFundamentals | null>,
): Promise<FullFundamentals | null> {
  try {
    return await Promise.race([
      get(symbol),
      new Promise<null>(r => setTimeout(() => r(null), FUNDAMENTALS_TIMEOUT_MS)),
    ]);
  } catch {
    return null;
  }
}

export interface AiEvidencePackage {
  symbol: string;
  items: AiEvidenceItem[];
  /** True when live fundamentals were available at assembly time. */
  hasLiveFundamentals: boolean;
  engineVersion: string;
}

function fmt(n: number): string {
  return Number.isFinite(n) ? String(Number(n.toFixed(4))) : String(n);
}

// ── Evidence item builders (Commit L1) ────────────────────────────────────
// ONE set of constructors for every evidence item class. The package
// assembler below AND the AI tool layer (lib/ai/tools.ts) both consume
// them, so a tool can never mint an item whose id contract, fact
// annotations or provenance wording drifts from the canonical assembler's
// (rule 14: one source of truth per concept).

/** Registry profile (name/sector are registry facts, not market data). */
export function buildProfileItem(resolved: ResolvedStockMetrics): AiEvidenceItem {
  return {
    id: `stock:${resolved.symbol}:profile`,
    text: `${resolved.name} (${resolved.symbol}), sector: ${resolved.sector}. Seed dataset status: ${resolved.seedStatus}.`,
  };
}

/** R11 (directive 9, Rule 3): the price fact's unit must describe what the
 * number IS. The field table below hardcodes price -> "inr" for every
 * instrument, which mislabels non-equity observations: a WTI or BTC quote
 * is USD, an MCX contract is rupee-quoted, a bond observation is a YIELD
 * in percent, and an index level is points. The derivation reads the SAME
 * registry data files and price-layer tables that serve the number (one
 * source of truth, Rule 14 — no hand-enumerated symbol lists):
 *   - FX pairs: the pair's own quoteCurrency field;
 *   - bond yield symbols: isBondSymbol (the price layer's own tables —
 *     those numbers are percentages, never currencies);
 *   - commodities: the data file's unit field discriminates $-quoted
 *     global contracts from rupee-quoted MCX contracts; Yahoo futures
 *     symbols are the $-quoted global set;
 *   - crypto: USD-quoted (CoinGecko + the data file);
 *   - index levels: points (Yahoo '^' tickers are index quotes);
 *   - equities and everything unclassified: the platform default (inr).
 */
function priceFactUnit(symbol: string): string {
  const sym = symbol.trim().toUpperCase();
  const fx = FOREX_PAIRS.find(
    (f) => (f.pair ?? f.symbol).toUpperCase() === sym || f.symbol.toUpperCase() === sym,
  );
  if (fx) return fx.quoteCurrency.toLowerCase();
  if (isBondSymbol(sym)) return "percent";
  const commodity = COMMODITIES.find((c) => c.symbol.toUpperCase() === sym);
  if (commodity) return commodity.unit.includes("$") ? "usd" : "inr";
  if (YAHOO_COMMODITY_SYMBOLS[sym]) return "usd";
  if (CRYPTO_ASSETS.some((c) => c.symbol.toUpperCase() === sym) || COINGECKO_IDS[sym]) return "usd";
  if (
    INDIAN_INDEXES.some((i) => i.symbol === sym) ||
    YAHOO_INDEX_SYMBOLS[sym] ||
    (YAHOO_SPECIAL[sym] ?? "").startsWith("^")
  ) {
    return "points";
  }
  return FACT_UNIT_BY_FIELD.price;
}

/**
 * Price observation with provenance (single canonical path; the observation
 * time is the upstream's own — null stays null). A null/non-positive price
 * yields the explicit UNAVAILABLE item — never a fabricated number.
 * Commit L2 (provenance closure): the typed fact's `source` now honors the
 * upstream's own PricePoint status — a STATIC fallback is a seed/reference
 * value and a DERIVED proxy is derived; neither may be typed (or claimed)
 * as a live observation. LIVE/CACHED (a real observation, replayed or not)
 * stay live, carrying the upstream's own observation time.
 */
export function buildPriceItem(symbol: string, pricePoint: PricePoint | null): AiEvidenceItem {
  if (pricePoint && Number.isFinite(pricePoint.price) && pricePoint.price > 0) {
    const when = pricePoint.observedAt ?? "no-disclosed-observation-time";
    const status = pricePoint.status ?? "LIVE";
    const priceSource: AiEvidenceFact["source"] =
      status === "STATIC" ? "seed" : status === "DERIVED" ? "derived" : "live";
    const observedAt = priceSource === "live" ? pricePoint.observedAt ?? null : null;
    const priceFacts: AiEvidenceFact[] = [
      { field: "price", value: pricePoint.price, unit: priceFactUnit(symbol), source: priceSource, observedAt },
    ];
    // Commit O (Rule 16): change === null means the upstream disclosed no
    // change — the item then carries NO change fact and its text says so.
    // A fabricated "0 percent" would verify a flat day that never happened.
    const hasChange = pricePoint.change != null && Number.isFinite(pricePoint.change);
    if (hasChange) {
      priceFacts.push({ field: "change", value: pricePoint.change as number, unit: FACT_UNIT_BY_FIELD.change, source: priceSource, observedAt });
    }
    return {
      id: `price:${symbol}:${when}`,
      text:
        `Latest observed price: ${fmt(pricePoint.price)} ` +
        (hasChange
          ? `(change ${fmt(pricePoint.change as number)}%). `
          : "(24h change: not disclosed by the source). ") +
        `Source: ${pricePoint.source}; status: ${status}; ` +
        `observation time: ${pricePoint.observedAt ?? "not disclosed by the upstream"}.` +
        factAnnotation(priceFacts),
      facts: priceFacts,
    };
  }
  return {
    id: `price:${symbol}:unavailable`,
    text: "Price: UNAVAILABLE at assembly time. No observation exists — do not state or imply a price.",
  };
}

/** Resolved fundamentals — one item per field, provenance preserved. */
export function buildFundamentalItems(
  resolved: ResolvedStockMetrics,
  vendorName?: string,
): AiEvidenceItem[] {
  const FIELD_LABELS: Record<string, string> = {
    pe: "P/E", roe: "ROE %", roce: "ROCE %", opm: "Operating margin %",
    de: "Debt/Equity", promo: "Promoter holding %", revcagr: "Revenue CAGR 3Y %",
    epscagr: "EPS CAGR 3Y %", mktcap: "Market cap (Cr)", bvps: "Book value/share",
    pb: "P/B", fcfMargin: "FCF margin %",
  };
  const out: AiEvidenceItem[] = [];
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
    // Commit L2: live facts carry the upstream's own observation time
    // (null = live with NO disclosed time) so the closed source-state
    // vocabulary and the verified surface can distinguish
    // live / live-undated / derived / seed — and reject upgrades.
    const fact: AiEvidenceFact = {
      field,
      value: rf.value,
      unit: FACT_UNIT_BY_FIELD[field] ?? "value",
      source: rf.source,
      observedAt: rf.source === "live" ? rf.asOf ?? null : null,
    };
    out.push({
      id: `fundamental:${resolved.symbol}:${field}:${idFragment}`,
      text: `${label}: ${fmt(rf.value)} | provenance: ${prov}.${factAnnotation([fact])}`,
      facts: [fact],
    });
  }
  return out;
}

/** THE canonical Rishi consensus — consumed, never recomputed by the AI.
 *  The id embeds the engine version AND an observation-state fragment from
 *  a CLOSED vocabulary that describes the ACTUAL score inputs (founder §21:
 *  the id and the statement must describe the inputs — never collapse a
 *  live/mixed observation into a seed claim):
 *
 *    "seed-derived"           — no live inputs at all (seed/derived-from-seed)
 *    "<asOf>"                 — every direct field live, ONE shared asOf,
 *                               none undated (a coherent live snapshot)
 *    "live-undated"           — every direct field live, NO disclosed asOf
 *    "live-mixed-observation" — every direct field live, ≥2 distinct asOfs
 *    "mixed-provenance"       — some direct fields live, others seed
 *
 *  (pb is structurally derived and fcfMargin structurally seed — the
 *  fragment is driven by the DIRECT observations, which is what the score
 *  actually consumes.)
 *
 *  Insufficient data emits NO fact — any numeric score assertion then
 *  fails closed. */
/** The resolver's direct observation fields (everything except the two
 *  structural derivations pb/fcfMargin). */
const DIRECT_SCORE_FIELDS = [
  "pe", "roe", "roce", "opm", "de", "promo", "revcagr", "epscagr", "mktcap", "bvps",
] as const;

interface ResolvedFieldShim {
  value: number;
  source: "seed" | "live" | "derived";
  asOf: string | null;
}

export function scoreObservationFragment(fields: Record<string, ResolvedFieldShim>): string {
  const direct = DIRECT_SCORE_FIELDS
    .map(f => fields[f])
    .filter((f): f is ResolvedFieldShim => Boolean(f));
  const live = direct.filter(f => f.source === "live");
  if (live.length === 0) return "seed-derived";
  if (live.length < direct.length) return "mixed-provenance"; // some direct fields still seed
  const liveAsOfs = [...new Set(live.map(f => f.asOf).filter((a): a is string => !!a))];
  const hasUndated = live.some(f => !f.asOf);
  if (liveAsOfs.length === 0) return "live-undated"; // every direct field live, none disclosed a time
  if (liveAsOfs.length === 1 && !hasUndated) return liveAsOfs[0]; // one coherent live snapshot
  return "live-mixed-observation"; // ≥2 distinct times, or some undated + some dated
}

export function buildScoreItem(resolved: ResolvedStockMetrics): AiEvidenceItem {
  const consensus = getStockScore(resolved);
  const fragment = scoreObservationFragment(resolved.fields as Record<string, ResolvedFieldShim>);
  const fragmentWording: Record<string, string> = {
    "seed-derived": "inputs: seed/derived-from-seed data (no live observations)",
    "live-undated": "inputs: live observations (no disclosed observation time)",
    "live-mixed-observation": "inputs: live observations with mixed or missing observation times",
    "mixed-provenance": "inputs: mixed freshness — some live observations, some seed values",
  };
  const inputsNote = fragmentWording[fragment] ?? `inputs: live observations as-of ${fragment}`;
  const scoreFacts: AiEvidenceFact[] =
    consensus.consensus === null
      ? [] // insufficient data → NO fact exists → any numeric score assertion fails closed
      : [{ field: "score", value: consensus.consensus, unit: FACT_UNIT_BY_FIELD.score, source: "derived" as const, observedAt: null }];
  return {
    id: `score:${resolved.symbol}:${SCORE_ENGINE_VERSION}:${fragment}`,
    text:
      `Rishi consensus score (${SCORE_ENGINE_VERSION}): ` +
      (consensus.consensus === null
        ? "Insufficient Data (fewer than the minimum valid scorers produced finite scores) — display/quote it as unavailable, never as a number."
        : `${consensus.consensus}/100`) +
      ` | category: ${consensus.category} | data quality: ${consensus.dataQuality}` +
      ` | tension: ${consensus.tension}` +
      ` | top bull: ${consensus.topBull.name} ${consensus.topBull.score}, top bear: ${consensus.topBear.name} ${consensus.topBear.score}. ` +
      `This is the platform's only official score — do not recompute or second-guess it. ${inputsNote}.` +
      factAnnotation(scoreFacts),
    ...(scoreFacts.length > 0 ? { facts: scoreFacts } : {}),
  };
}

/** News — provenance-carrying items where a surface exists; otherwise an
 *  explicit unavailable note (never invented headlines). */
export function buildNewsItems(
  symbol: string,
  news?: EvidenceDeps["news"],
): AiEvidenceItem[] {
  if (news && news.length > 0) {
    return news.map(n => ({
      id: `news:${n.id}`,
      text: `News: "${n.headline}" — ${n.summary} (source: ${n.source}, published: ${n.pubDate}).`,
    }));
  }
  return [{
    id: `news:${symbol}:unavailable`,
    text: "Per-symbol news: not available in the evidence pipeline (market-level feeds are not yet mapped to symbols). Do not cite specific news.",
  }];
}

/** One same-sector peer row for getPeers (Commit L1). All figures are seed
 *  registry values and are typed as `source: "seed"` so the grounding
 *  validator applies the full provenance discipline to them — a peer price
 *  can never be claimed as a live observation. */
export interface AiPeerRow {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  mktcap: number;
  pe: number;
  roe: number;
}

export function buildPeerItems(symbol: string, peers: readonly AiPeerRow[]): AiEvidenceItem[] {
  return peers.map(p => {
    const facts: AiEvidenceFact[] = [
      { field: "price", value: p.price, unit: FACT_UNIT_BY_FIELD.price, source: "seed", observedAt: null },
      { field: "mktcap", value: p.mktcap, unit: FACT_UNIT_BY_FIELD.mktcap, source: "seed", observedAt: null },
      { field: "pe", value: p.pe, unit: FACT_UNIT_BY_FIELD.pe, source: "seed", observedAt: null },
      { field: "roe", value: p.roe, unit: FACT_UNIT_BY_FIELD.roe, source: "seed", observedAt: null },
    ];
    return {
      id: `peer:${symbol}:${p.symbol}:seed`,
      text:
        `Peer (SEED REGISTRY — may be stale): ${p.name} (${p.symbol}), sector ${p.sector}; ` +
        `seed price ${fmt(p.price)}, seed market cap ${fmt(p.mktcap)} Cr, seed P/E ${fmt(p.pe)}, seed ROE ${fmt(p.roe)}%.` +
        factAnnotation(facts),
      facts,
    };
  });
}

/**
 * Build the canonical evidence package for one symbol, or null when the
 * symbol is unknown to the registry (callers decide 400 vs empty state).
 *
 * Commit M7: an optional shared CanonicalStockState threads ONE
 * observation per symbol through the package AND the tool loop (the chat
 * route passes the same state to generateEvidenceGroundedAnswer). Without
 * one, a fresh state is created — identical behavior for every other
 * caller, and the package itself remains internally consistent.
 */
/** R11 (directive 9): non-equity registry instruments (WTI, USD/INR, BTC,
 * IN10YS…) carry this explicit context item INSTEAD of equity
 * fundamentals/score/peers — the honest "not applicable" state. It names
 * what the instrument is and what the package does (and does not) carry,
 * so the model never invents equity metrics for a commodity or a pair. */
export function buildNonEquityInstrumentItem(symbol: string): AiEvidenceItem {
  return {
    id: `instrument:${symbol}:non-equity`,
    text:
      `${symbol} is a canonical price-registry instrument (not an equity security-master entry): ` +
      `no fundamentals, Rishi score, or peer set exists for it. Its observed price, when available, ` +
      `is the price item in this package — do not state or imply any equity metric for it.`,
  };
}

export async function buildAiEvidencePackage(
  symbol: string,
  deps: EvidenceDeps = {},
  state?: CanonicalStockState,
): Promise<AiEvidencePackage | null> {
  const sym = symbol?.trim().toUpperCase();
  if (!sym) return null;

  const shared = state ?? createCanonicalStockState(deps);

  // R11 (directive 9) fast path: an EXPLICIT non-equity registry token
  // (WTI, USDINR, USD/INR, BTC, IN10YS…) needs no equity resolution and
  // no fundamentals fetch at all — the price observation is the package's
  // datum. Membership in PRICE_REGISTRY_TOKENS/SLASHED is registry truth
  // (stocks and legacy aliases are absent by construction), so this can
  // never misclassify a stock or an alias.
  if (PRICE_REGISTRY_TOKENS.has(sym) || SLASHED.has(sym)) {
    const instrumentPrice = await shared.price(sym).catch(() => null);
    return {
      symbol: sym,
      items: [buildPriceItem(sym, instrumentPrice), buildNonEquityInstrumentItem(sym)],
      hasLiveFundamentals: false,
      engineVersion: SCORE_ENGINE_VERSION,
    };
  }

  // Live surfaces, in parallel, each individually non-fatal: a failed fetch
  // degrades to seed-labelled provenance, never to a fabricated value.
  // Through the shared state both fetches are memoized per symbol, so the
  // tool loop reuses the SAME observations. The price observation's raw
  // promise may reject (a throwing surface) — caught HERE for the package
  // (unavailable item), propagated for the getPrices tool (failed state).
  const [live, pricePoint] = await Promise.all([
    shared.fundamentals(sym),
    shared.price(sym).catch(() => null),
  ]);

  const resolved = await shared.resolve(sym);
  if (!resolved) {
    // R11 (directive 9): a canonical NON-EQUITY price instrument
    // previously collapsed to null here, so the chat route's symbol
    // context silently behaved as "no symbol" even though the price
    // layer serves the instrument (and getPrices returned it inside the
    // same loop). Build the honest instrument package instead: the
    // canonical price observation — built by the SAME builder the
    // getPrices tool uses, so ids and facts are byte-identical — plus an
    // explicit non-equity note. Fundamentals/score/peers items are
    // absent because they require an equity security-master record; null
    // is a real value (Constitution art. 16), never a fabricated metric.
    // A symbol outside the canonical registry entirely still returns
    // null (the caller's own gate decides what reaches this function).
    if (!isValidSymbolInput(sym)) return null;
    const instrumentPrice = await shared.price(sym).catch(() => null);
    return {
      symbol: sym,
      items: [buildPriceItem(sym, instrumentPrice), buildNonEquityInstrumentItem(sym)],
      hasLiveFundamentals: false,
      engineVersion: SCORE_ENGINE_VERSION,
    };
  }

  const vendorName = live?.source && live.source !== "static" ? live.source : undefined;

  const items: AiEvidenceItem[] = [
    buildProfileItem(resolved),
    buildPriceItem(sym, pricePoint),
    ...buildFundamentalItems(resolved, vendorName),
    buildScoreItem(resolved),
    ...buildNewsItems(sym, deps.news),
  ];

  return {
    symbol: sym,
    items,
    hasLiveFundamentals: !!live,
    engineVersion: SCORE_ENGINE_VERSION,
  };
}

// ── Grounding validation (fail closed) ──────────────────────────────────

/** Commit L2: a SERVER-GENERATED verified fact — the matched typed fact
 *  plus its closed source state and the user-visible verified statement
 *  `[field] = [value] [unit] — [source state]`. This — never the model's
 *  prose — is the authoritative grounded surface. */
export interface AiVerifiedFact {
  field: string;
  value: number;
  unit: string;
  sourceState: AiSourceState;
  observedAt: string | null;
  statement: string;
}

export interface GroundingResult {
  /** The claims that survived validation — empty unless EVERY claim's every
   *  evidenceId exists in the package AND every numeric assertion matches a
   *  typed fact on the claim's OWN cited items (one fabricated id, one
   *  unsupported figure, or one field/unit/value mismatch fails them all).
   *  Each surviving claim carries its server-generated verifiedFacts. */
  validatedClaims: Array<{
    claim: string;
    evidenceIds: string[];
    assertions: Array<{ field: string; value: number; unit: string }>;
    verifiedFacts: AiVerifiedFact[];
  }>;
  grounded: boolean;
  /** Coder Directions G3 (audit 2026-10-02) — TWO explicit states plus the
   *  pre-existing no-claims state:
   *   "structured-claims" → grounded=true, every number assertion-backed;
   *   "context-only"      → claims existed but made NO numeric statement
   *                         (qualitative) — a claim can be qualitative
   *                         without being numerically grounded, and
   *                         evidenceIds alone are never grounding;
   *   "evidence-context"  → nothing validated (fail-closed rejections or
   *                         no claims at all). */
  mode: "structured-claims" | "context-only" | "evidence-context";
  /** Machine-readable rejection notes for the audit trail / UI. */
  rejections: string[];
  /** Commit L2 — the SERVER-GENERATED grounded answer surface, built ONLY
   *  from validated typed facts (one verified statement per matched fact,
   *  each carrying its source state). The model's prose never enters this
   *  surface, so an answer can never be labelled grounded while containing
   *  unvalidated claims. Empty unless grounded=true. */
  verifiedAnswer: string;
  /** Commit L2 — model prose that carries NO validation state (qualitative
   *  context-only claims and rejected claims). Disclosed separately; the
   *  router renders it (if at all) as explicitly-unverified commentary,
   *  never inside the grounded surface. */
  unvalidatedProse: string[];
}

/** Derive the closed source state from a matched fact's source + observedAt
 *  (no fuzzy NLP — the vocabulary is structural). */
function sourceStateOf(fact: AiEvidenceFact): AiSourceState {
  if (fact.source === "derived") return "derived";
  if (fact.source === "seed") return "seed";
  if (fact.source === "live") return fact.observedAt ? "live" : "live-undated";
  return "unavailable";
}

/** The user-visible verified statement for one matched fact. The source
 *  state wording comes from the closed vocabulary above — the model cannot
 *  influence it, so it can never upgrade seed/derived data by phrasing. */
function verifiedStatement(fact: Omit<AiVerifiedFact, "statement">): string {
  const stateText =
    fact.sourceState === "live"
      ? `live (observed/as-of ${fact.observedAt})`
      : fact.sourceState === "live-undated"
        ? "live (no disclosed observation time)"
        : fact.sourceState === "derived"
          ? "derived by the platform engine"
          : fact.sourceState === "seed"
            ? "seed/reference (may be stale)"
            : "unavailable";
  return `${fact.field} = ${canonicalNumber(fact.value)} ${fact.unit} — ${stateText}`;
}

/** Commit L2 — provenance anti-upgrade vocabulary: CLOSED and conservative
 *  (word-boundary matches, no NLP). If a claim or the answer uses any of
 *  these terms while the underlying matched fact is seed/derived, the
 *  wording upgrades the provenance and fails closed. Live-dated facts may
 *  legitimately be described with them; live-undated facts may be called
 *  live (they ARE live) but an inserted observation DATE already fails the
 *  number floor. */
/** G7 driver 1 (2026-10-07): the DETERMINISTIC verified surface for a
 *  fully-determined tool outcome. Same statement builder
 *  (`verifiedStatement`) and the same dedup rule the grounding validator's
 *  server-generated surface uses — one source of truth for verified
 *  wording (rule 14). Returns null when the evidence carries NO typed
 *  facts (an unavailable observation is never rendered as data). */
export function buildDeterministicVerifiedSurface(
  evidence: readonly AiEvidenceItem[],
): { answer: string; claims: Array<{ claim: string; evidenceIds: string[]; assertions: Array<{ field: string; value: number; unit: string }>; verifiedFacts: AiVerifiedFact[] }>; uncertainties: string[] } | null {
  type Built = {
    claim: string;
    evidenceIds: string[];
    assertions: Array<{ field: string; value: number; unit: string }>;
    verifiedFacts: AiVerifiedFact[];
  };
  const claims: Built[] = [];
  const seenStatements = new Set<string>();
  const lines: string[] = [];
  let liveUndated = false;
  for (const item of evidence) {
    for (const fact of item.facts ?? []) {
      const sourceState = sourceStateOf(fact);
      if (sourceState === "live-undated") liveUndated = true;
      const observedAt = typeof fact.observedAt === "string" ? fact.observedAt : null;
      const vf: AiVerifiedFact = {
        field: fact.field,
        value: fact.value,
        unit: canonicalFactUnit(fact.unit),
        sourceState,
        observedAt,
        statement: "",
      };
      vf.statement = verifiedStatement(vf);
      if (!seenStatements.has(vf.statement)) {
        seenStatements.add(vf.statement);
        lines.push(vf.statement);
      }
      claims.push({
        // The claim text IS the verified statement: the server authored it,
        // from its own typed fact — nothing model-made rides inside.
        claim: vf.statement,
        evidenceIds: [item.id],
        assertions: [{ field: vf.field, value: vf.value, unit: vf.unit }],
        verifiedFacts: [vf],
      });
    }
  }
  if (claims.length === 0) return null;
  return {
    answer: lines.join("\n"),
    claims,
    uncertainties: liveUndated
      ? ["no disclosed observation time for at least one served fact"]
      : [],
  };
}

const PROVENANCE_UPGRADE_RE =
  /\b(?:live|current|currently|latest|right\s+now|as\s+of\s+now|today|real[-\s]?time)\b/i;

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
  // R11 (directive 9): commodity and crypto observations are USD-quoted —
  // aliases so a model asserting "$"/"dollars" grounds against the fact.
  usd: "usd",
  $: "usd",
  dollar: "usd",
  dollars: "usd",
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

/** Unit tokens that may trail a stated number ("12%", "21x", "3.2 Cr").
 *  R15: "%" is a NON-word character, so "%\b" never matches ("%." — two
 *  non-word chars, no boundary) and a percent-suffixed number silently
 *  carried unit=null; the lookahead form matches "%" before punctuation,
 *  whitespace or end-of-string. Word tokens keep \b. E5-FVM (Round 18):
 *  the fact annotations write the unit token as "inr" verbatim
 *  (factAnnotation), and the #208 output contract tells the model to copy
 *  annotations digit-for-digit — so the parser must recognize the literal
 *  "inr" too, not just rs/rupees. */
const UNIT_TOKENS: Array<{ unit: string; re: RegExp }> = [
  { unit: "percent", re: /^(?:%(?![0-9A-Za-z])|percent\b|pct\b)/i },
  { unit: "multiple", re: /^(?:x|times)\b/i },
  { unit: "inr_crore", re: /^(?:cr|crore)s?\b/i },
  { unit: "points", re: /^(?:pts?|points)\b/i },
  { unit: "inr", re: /^(?:rs\.?|rupees?|inr)\b/i },
];

// ── E5-FVM (Round 18, 2026-10-06): index names contain digits — "Nifty 50",
// "S&P 500", "FTSE 100" — and those digits are NAME components, never
// stated figures. The r18 authenticated battery measured a row rejected as
// an unsupported figure because "50" in the claim "Nifty 50 trades at
// 22697.4 points" was parsed as a stated number. Closed vocabulary of
// (name, digits) pairs that must appear as ONE name token (only whitespace
// may sit between); "Nifty at 22697" does not match ("at" breaks the
// name), so no figure can launder through the exemption.
const INDEX_NAME_NUMBER_RE = /\b(?:nifty\s*50|s&p\s*500|ftse\s*100)$/i;

// ── E5-FVM: a change verb + to/at immediately before a number introduces
// the resulting LEVEL ("SBIN changed to 2091", "changes at 2091"), never
// the change metric. Distinct from "changed by <value>" (the metric).
const CHANGE_LEVEL_INTRO_RE = /\bchang(?:e|ed|es)\s+(?:to|at)\s*$/i;

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

// ── R15: movement language — words that frame a number as the session's
// CHANGE (up/down moves), not as a static metric value. Used with the
// percent/points-unit guard inside statedNumbers() (see the attribution
// correction there). A closed vocabulary, like FIELD_MENTIONS.
const MOVEMENT_LANGUAGE_RE =
  /\b(?:up|down|rose|fell|gained|lost|dropped|declined|advanced|slipped|jumped|rallied|soared|surged)\b/i;

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

/** U6 (founder round 6): a year in DATE CONTEXT is not a market number —
 *  "In 2025 ROE was 12%" must ground. The exemption is deliberately narrow:
 *  only bare 4-digit 19xx/20xx tokens immediately preceded by a date marker
 *  (in|by|since|during|as of|FY|fiscal). A genuine value that happens to be
 *  4 digits without a date marker (a price of 2500) is NOT exempt. */
const YEAR_TOKEN_RE = /^(?:19|20)\d{2}$/;
const DATE_CONTEXT_RE = /(?:\bin|\bby|\bsince|\bduring|\bas of|\bfy|\bfiscal year|\bfiscal)[\s:]*$/i;

/** U6 (founder round 6): forecast / advice-superlative language — a CLOSED
 *  vocabulary (no NLP). Platform facts are typed numbers with provenance; no
 *  fact can ever back a prediction, so a numeric claim or a grounded answer
 *  carrying this language is rejected wholesale (atomic claims). Deliberately
 *  conservative: qualitative forecast prose without numbers is still the
 *  disclosed context-only state, not a batch-killing failure. */
const FORECAST_LANGUAGE_RE =
  /\b(?:will|going to|expects? to|expected to|forecast(?:s|ed|ing)?|predict(?:s|ed|ing|ions?)?|doubl(?:e|es|ing)|tripl(?:e|es|ing)|quadrupl(?:e|es|ing)|multibagger(?:s)?|guarantee(?:d|s)?|sure[- ]shot|risk[- ]free|certain to|can(?:no|')t miss|skyrocket(?:s|ing)?|10x|100x)\b/i;

/** Parse every stated number with its attribution + attached unit token. */
function statedNumbers(text: string): StatedNumber[] {
  const collapsed = text.replace(/(-?\d[\d,]*(?:\.\d+)?)\s*\/\s*100\b/g, "$1");
  const out: StatedNumber[] = [];
  for (const span of numberSpans(collapsed)) {
    const { start, end, value } = span;
    // U6: date-context year tokens never reach the unsupported-number gate.
    if (!span.isWord && YEAR_TOKEN_RE.test(span.raw) && DATE_CONTEXT_RE.test(collapsed.slice(Math.max(0, start - 16), start))) {
      continue;
    }
    // E5-FVM: index-name digits are name components, not stated figures
    // (INDEX_NAME_NUMBER_RE above — the YEAR_TOKEN_RE skip pattern applied
    // to index names).
    if (!span.isWord && INDEX_NAME_NUMBER_RE.test(collapsed.slice(Math.max(0, start - 12), end))) {
      continue;
    }
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
      // E5-FVM: trim the leading whitespace before unit matching — the
      // number-WORD path above and the lakh/crore matchers both tolerate
      // the space ("12 percent", "5 lakh"), but the digit path silently
      // dropped every space-separated unit ("1006.35 inr" carried
      // unit=null), so the unit consistency gate never ran for them and
      // the E5-FVM currency re-attribution below could not see the unit.
      const afterTrim = after.replace(/^\s+/, "");
      for (const ut of UNIT_TOKENS) {
        if (ut.re.test(afterTrim)) { unit = ut.unit; break; }
      }
    }
    // ── R15 (Coder Directions 2026-10-04, §4): movement-language
    // attribution correction. "The price is 1167.7 inr, up 1.2%" used to
    // attribute 1.2 to PRICE (the only field mention in the window — "up"
    // was not one), so the validator compared 1.2 against the price fact
    // and rejected a reply whose change assertion was correct. The R15
    // baseline battery measured this mis-attribution as the dominant
    // financial repair cause (field-value-mismatch, 7 of 22 rows). A
    // percent- or points-suffixed number inside movement language is the
    // day's CHANGE, never the price: re-attribute to change when a
    // movement word sits within the attribution window. Surgical by
    // design — numbers without percent/points units ("PE of 12, up versus
    // peers") keep their original attribution, and every grounded-value
    // gate is untouched (a mis-attribution still fails closed).
    if (
      field !== null && field !== "change" &&
      (unit === "percent" || unit === "points")
    ) {
      const windowText = collapsed.slice(Math.max(0, start - ATTR_WINDOW_BEFORE), end + ATTR_WINDOW_AFTER);
      if (MOVEMENT_LANGUAGE_RE.test(windowText)) field = "change";
    }
    // ── E5-FVM (Round 18, 2026-10-06): change is ALWAYS percent in the
    // fact model (FACT_UNIT_BY_FIELD.change; live prices compute
    // (price-prev)/prev*100). A number attributed to `change` that is
    // denominated in CURRENCY (inr / inr_crore — including the literal
    // "inr" token the fact annotations write) is therefore never the
    // change metric: it is a PRICE LEVEL the change language introduces.
    // The r18 authenticated battery measured this as the dominant
    // field-value-mismatch shape (11 of 14 rows): "changed to 1006.35 inr",
    // "changed by -1.386 percent to 1006.35 inr", "1006.35 inr with a
    // change of -1.386 percent" — in each, the model's assertions were
    // exactly right and the PROSE attribution mis-assigned the price to
    // `change`, hard-failing a correct batch. Re-attribute to price; gate
    // (b) still requires the digit-exact price assertion match, so a
    // wrong level ("changed to 999 inr") still fails closed. The R15
    // movement-language correction above is the mirror image (percent
    // numbers in movement language are the change); both are attribution
    // repairs, and neither touches a grounded-value gate.
    if (field === "change" && (unit === "inr" || unit === "inr_crore")) {
      field = "price";
    }
    // The unitless twin: "changed to 2091" (sentence end, no unit token).
    // A change verb + to/at immediately before the number introduces the
    // resulting level, never the change metric.
    if (field === "change" && CHANGE_LEVEL_INTRO_RE.test(collapsed.slice(Math.max(0, start - 24), start))) {
      field = "price";
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
      verifiedAnswer: "",
      unvalidatedProse: [],
    };
  }
  const rejections: string[] = [];
  /** G3: claims classified context-only (qualitative — no numeric statement). */
  const qualitative: string[] = [];
  /** Commit L2: claims rejected WITHOUT a hard failure (e.g. the metric-name
   *  cite gate) — their text is disclosed as unvalidated prose and can never
   *  enter the server-generated grounded surface. */
  const rejectedProse: string[] = [];
  /** G3: a HARD failure (unknown id, assertion mismatch, unsupported figure,
   *  provenance upgrade) fails the whole batch; a qualitative classification
   *  does NOT. */
  let hardFailure = false;
  const surviving: Array<{
    claim: string;
    evidenceIds: string[];
    assertions: Array<{ field: string; value: number; unit: string }>;
    citedItems: AiEvidenceItem[];
    matchedValues: Set<string>;
    /** Canonical field -> matched fact (for attribution + provenance). */
    matchedByField: Map<string, AiEvidenceFact>;
  }> = [];

  for (let i = 0; i < claims.length; i += 1) {
    const c = claims[i];
    if (!c.claim || !Array.isArray(c.evidenceIds) || c.evidenceIds.length === 0) {
      rejections.push(`claim ${i + 1}: no evidence ids — unverifiable, rejected`);
      hardFailure = true;
      continue;
    }
    const unknown = c.evidenceIds.filter(id => !validIds.has(id));
    if (unknown.length > 0) {
      rejections.push(`claim ${i + 1}: unknown evidence id(s) ${unknown.map(u => JSON.stringify(u)).join(", ")} — rejected`);
      hardFailure = true;
      continue;
    }

    // ── G3 (audit 2026-10-02): qualitative claims are context-only ──
    // A claim that states NO number cannot be numerically grounded — not by
    // assertions, and never by evidenceIds alone. It is CLASSIFIED as
    // context-only (disclosed below) and removed from the grounded set; it
    // does NOT poison the batch the way a failed assertion does (it is not
    // false — it is unverifiable-numerically). Assertions attached to a
    // qualitative claim are unused and disclosed as such.
    const statedAll = statedNumbers(c.claim);
    if (statedAll.length === 0) {
      const hasUnusedAssertions = Array.isArray(c.assertions) && c.assertions.length > 0;
      rejections.push(
        `claim ${i + 1}: qualitative claim (no numeric statement) — classified context-only, NOT grounded (evidenceIds alone are never grounding${hasUnusedAssertions ? "; its unused assertions are ignored" : ""}) (G3)`,
      );
      qualitative.push(c.claim);
      continue;
    }

    // ── U6: atomic claims. A numeric claim that ALSO carries forecast or
    // advice-superlative language is rejected: the verified number would
    // otherwise lend the model's prediction a grounding it never had.
    if (FORECAST_LANGUAGE_RE.test(c.claim)) {
      rejections.push(
        `claim ${i + 1}: forecast/advice-superlative language (${JSON.stringify((FORECAST_LANGUAGE_RE.exec(c.claim) ?? [""])[0])}) — no platform fact can back a prediction; the claim is rejected wholesale (U6 atomic claims)`,
      );
      hardFailure = true;
      continue;
    }

    // ── per-claim semantic pool: ONLY this claim's own citations ──
    const citedItems = c.evidenceIds.map(id => itemById.get(id)!);
    const citedFacts = citedItems.flatMap(it => it.facts ?? []);
    const assertions = Array.isArray(c.assertions) ? c.assertions : [];

    // (a) every assertion must exactly match a fact in THIS claim's pool
    const matchedValues = new Set<string>();
    const matchedByField = new Map<string, AiEvidenceFact>();
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
      if (!matchedByField.has(af)) matchedByField.set(af, hit);
    }
    if (assertionFailure) {
      hardFailure = true;
      continue;
    }

    // (a2) Commit L2 — provenance anti-upgrade (claim level): if ANY matched
    // fact is seed/derived and the claim text words it as live/current, the
    // wording upgrades the provenance — a semantic lie, hard failure.
    const matchedStates = [...matchedByField.values()].map(sourceStateOf);
    const hasNonLive = matchedStates.some(s => s === "seed" || s === "derived");
    if (hasNonLive && PROVENANCE_UPGRADE_RE.test(c.claim)) {
      rejections.push(
        `claim ${i + 1}: provenance upgrade — the matched fact(s) are ${[...new Set(matchedStates)].join("/")} but the claim words them as live/current — rejected (Commit L2; seed/derived data can never be relabelled live)`,
      );
      hardFailure = true;
      continue;
    }

    // (b) every number the claim STATES must be a matched assertion value —
    //     attributed numbers additionally need an assertion for THAT field
    //     with THAT value (and unit token, when attached). The old
    //     cited-text presence route is GONE (audit 2026-10-02 P0).
    //     Round-5: number words and lakh/crore forms are stated numbers
    //     (statedAll was captured at the G3 qualitative gate above).
    const stated = statedAll;
    if (stated.length > 0 && assertions.length === 0) {
      rejections.push(
        `claim ${i + 1}: states numbers (${stated.map(s => JSON.stringify(s.raw)).join(", ")}) but asserts no field/value/unit — semantic grounding unavailable, rejected (R4-02; copy the fact annotation into assertions)`,
      );
      hardFailure = true;
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
        if (canonicalNumber(m.value) !== sn.key) {
          rejections.push(
            `claim ${i + 1}: claims ${sn.field}=${JSON.stringify(sn.raw)} but the matched ${sn.field} assertion is ${canonicalNumber(m.value)} — rejected (audit 2026-10-02)`,
          );
          numberFailure = true;
          continue;
        }
        if (sn.unit !== null && sn.unit !== canonicalFactUnit(m.unit)) {
          rejections.push(
            `claim ${i + 1}: states ${sn.field}=${JSON.stringify(sn.raw)} ${sn.unit} but the matched assertion's unit is ${canonicalFactUnit(m.unit)} — rejected (audit 2026-10-02)`,
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
    if (numberFailure) {
      hardFailure = true;
      continue;
    }

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
      for (const mm of c.claim.matchAll(fm.re)) {
        if (mm.length > 0) mentionedFields.add(fm.field);
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
    if (fieldCiteFailure) {
      // Commit L2: the rejected claim's text is disclosed as UNVALIDATED
      // prose — it can never enter the server-generated grounded surface.
      rejectedProse.push(c.claim);
      continue;
    }

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
  // G3: a purely-qualitative classification is not a hard failure, so the
  // floor still runs whenever no HARD failure has occurred.
  // Commit L2: the answer may also not UPGRADE provenance — when any
  // surviving matched fact is seed/derived, wording the answer as
  // live/current/latest is a provenance lie (closed vocabulary, no NLP).
  if (!hardFailure) {
    const pool = new Set<string>();
    for (const s of surviving) {
      for (const v of s.matchedValues) pool.add(v);
    }
    for (const sn of statedNumbers(answer)) {
      if (!pool.has(sn.key)) {
        rejections.push(`answer: number ${JSON.stringify(sn.raw)} is not a matched assertion value — unsupported figure, rejected (audit 2026-10-02)`);
        hardFailure = true;
      }
    }
    // U6: a grounded answer may not carry forecast language either — the
    // verified facts would otherwise dress a prediction as verified.
    if (FORECAST_LANGUAGE_RE.test(answer)) {
      rejections.push(`answer: forecast/advice-superlative language (${JSON.stringify((FORECAST_LANGUAGE_RE.exec(answer) ?? [""])[0])}) — no platform fact can back a prediction (U6 atomic claims)`);
      hardFailure = true;
    }
    const batchStates = surviving.flatMap(s => [...s.matchedByField.values()]).map(sourceStateOf);
    if (batchStates.some(s => s === "seed" || s === "derived") && answer && PROVENANCE_UPGRADE_RE.test(answer)) {
      rejections.push("answer: labels seed/derived data as live/current/latest — provenance upgrade rejected (Commit L2)");
      hardFailure = true;
    }
  }

  // ── G3: classification outcome ──
  // A HARD failure (unknown id, assertion mismatch, answer-floor violation,
  // provenance upgrade) fails the whole batch → evidence-context. A batch
  // whose claims are ALL qualitative (no hard failure) is the explicit
  // "context-only" state: grounded=false, zero validated claims, disclosed —
  // never silently presented as verified.
  if (rejections.length > 0 && hardFailure) {
    return {
      validatedClaims: [],
      grounded: false,
      mode: "evidence-context",
      rejections,
      verifiedAnswer: "",
      unvalidatedProse: [],
    };
  }
  if (surviving.length === 0) {
    return {
      validatedClaims: [],
      grounded: false,
      mode: "context-only",
      rejections: qualitative.length > 0
        ? rejections
        : [...rejections, "no numeric claim survived validation — context-only"],
      verifiedAnswer: "",
      unvalidatedProse: [...qualitative, ...rejectedProse],
    };
  }
  // ── Commit L2: build the SERVER-GENERATED grounded surface ──
  // One verified statement per matched fact (deduped across claims), each
  // carrying its closed source state. The model's claim text and answer
  // prose NEVER appear here — structural guarantee that a grounded answer
  // contains no unvalidated text.
  const verifiedFactsByClaim = surviving.map(s =>
    [...s.matchedByField.entries()].map(([field, fact]) => {
      const sourceState = sourceStateOf(fact);
      const observedAt = typeof fact.observedAt === "string" ? fact.observedAt : null;
      const vf = { field, value: fact.value, unit: canonicalFactUnit(fact.unit), sourceState, observedAt };
      return { ...vf, statement: verifiedStatement(vf) };
    }),
  );
  const seenStatements = new Set<string>();
  const verifiedLines: string[] = [];
  for (const vfs of verifiedFactsByClaim) {
    for (const vf of vfs) {
      if (!seenStatements.has(vf.statement)) {
        seenStatements.add(vf.statement);
        verifiedLines.push(vf.statement);
      }
    }
  }
  return {
    validatedClaims: surviving.map(({ claim, evidenceIds, assertions }, idx) => ({
      claim,
      evidenceIds,
      assertions,
      verifiedFacts: verifiedFactsByClaim[idx],
    })),
    grounded: true,
    mode: "structured-claims",
    rejections: [],
    verifiedAnswer: verifiedLines.join("\n"),
    unvalidatedProse: [...qualitative, ...rejectedProse],
  };
}
