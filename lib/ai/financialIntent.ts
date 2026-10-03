// lib/ai/financialIntent.ts — Commit N (Coder Directions §8).
//
// A DETERMINISTIC financial-data intent detector for the no-initial-
// evidence chat path — deliberately NOT an NLP classifier.
//
// Why it exists: lib/ai/router.ts sends every request through the same
// bounded tool loop, and the no-evidence contract TELLS the model to
// request a canonical tool for market-data questions — but a model
// instruction is not a gate. The model can still elect to answer a
// data question with clean claims-free prose, and that reply was
// accepted as context-only. This module is the small, closed, server-side
// backstop: when a request CLEARLY asks for symbol-specific financial
// data, a context-only reply is acceptable only if the model actually
// engaged the tool loop (see the router's guard).
//
// Design rules (Coder Directions §8):
//   - closed, explicit signals only — no fuzzy scoring, no probabilities;
//   - conservative: a false trigger blocks a philosophical answer, so the
//     detector requires the CONJUNCTION of two independent signals;
//   - fail closed downstream: a detected data intent with no tool
//     engagement yields an honest BLOCKED state, never a silent
//     downgrade into philosophical context.
//
// Signal 1 — a registry symbol appears as a standalone token. The token
// must be at least 2 characters (1-letter noise like "a"/"I" is never a
// signal). Case-insensitive: users type "reliance" and "RELIANCE".
//
// Signal 2 — a financial-data term from the closed vocabulary below.
// This is what makes symbol-like English words (IDEA, TITAN, STAR… are
// all listed symbols AND common words) safe: "your idea about patience"
// carries no data term, so it is prose, not a market-data request.

import 'server-only';

import { STOCKS } from '@/data/stocks';
import {
  PRICE_REGISTRY_TOKENS,
  SLASHED,
  canonicalPriceRegistrySymbol,
} from '@/lib/registry/validateInput';

/** Registry symbol tokens (R9-9, Rule 14): the security master UNION the
 * canonical price registry (indexes/commodities/crypto/forex/bonds — the
 * tickers the price layer itself serves). Both sets are imported, never
 * re-enumerated here, so the detector cannot drift from the registry. */
const SYMBOL_TOKENS: ReadonlySet<string> = new Set([
  ...Object.keys(STOCKS).filter((s) => s.length >= 2),
  ...PRICE_REGISTRY_TOKENS,
]);

/** R9-9: slashed "BASE/QUOTE" pairs are invisible to the tokenizer (it
 * splits on '/'), so they are matched against the RAW text instead. Built
 * once from validateInput's SLASHED set — one registry, no re-listing. */
const SLASHED_PAIR_RE: RegExp | null =
  SLASHED.size > 0
    ? new RegExp(
        `\\b(${Array.from(SLASHED)
          .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|')})\\b`,
        'i',
      )
    : null;

/**
 * The closed financial-data vocabulary. Adding a term here is a reviewed
 * decision: every term must name a datum the canonical tools can serve
 * (getStock/getFinancials/getPrices/getScore/getPeers) or an explicit
 * data/advice ask that requires such data. Keep it conservative.
 */
// R9-9 adds the conservative terms the Direction-9 production battery
// showed were dodging the backstop: "What is WTI trading at?", "USD/INR
// exchange rate?", "10Y yield level?". Each names a datum the canonical
// price layer serves; the Signal-1 conjunction still gates every trigger.
// R11 (directive 8) REMOVES the R10-03 standalone "rate(s)" term: it
// matched ordinary prose on stock symbols ("rate my TCS research") and
// shadowed the fundamentals seed for metric compounds ("growth rate").
// The rate/yield datum is still reachable through the instrument-anchored
// branch below: a NON-EQUITY price-registry instrument (FX pair, commodity,
// crypto, index, bond) plus the bare word IS a price ask ("USD/INR rate",
// "gold rate", "IN10YS yield") — the registry membership is the
// discriminator, so stock-symbol prose can never reach the price backstop
// through the bare word.
const DATA_TERM_RE =
  /\b(prices?|share price|stock price|current price|latest price|cmp|quote|scores?|rishi scores?|consensus|verdicts?|fundamentals?|financials?|financial data|p\/e|p\.e\.|p-e|pe ratio|price[- ]to[- ]earnings|roe|return on equity|roce|debt[- ]?to[- ]?equity|d\/e|market ?caps?|market capitalization|peers?|competitors?|revenues?|profits?|earnings|eps|dividends?|book value|valuation|margins?|growth rates?|recommendations?|ratings?|buy or sell|bullish or bearish|target price|trading|levels?|yields?|exchange rates?)\b/i;

/** R11 (directive 8): the bare rate/yield word. NOT a data term on its
 * own — it only qualifies when anchored to a non-equity price-registry
 * instrument (see detectFinancialDataIntent). */
const RATE_OR_YIELD_WORD_RE = /\b(rates?|yields?)\b/i;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * R12-03 (founder directive 9, round 12): a bare rate/yield word names the
 * instrument's observed price datum only when it is ATTACHED to it — the
 * noun compound "<instrument> rate/yield" ("USD/INR rate", "gold rate",
 * "10Y yield", "GOLD's rate") or the inverted compound "rate/yield
 * of|for|on [the] <instrument>" ("yield on the 10Y", "rate for USDINR").
 *
 * Co-occurrence was the old rule and it over-triggered exactly where the
 * directive draws the line: "How does a Fed rate cut affect GOLD?" and
 * "Rate my GOLD investment strategy." forced a price lookup on a
 * non-equity instrument because the word appeared anywhere in the
 * sentence. Macro compounds ("rate cut", "rate decision", "interest
 * rates") and verb usage are never anchors here. This narrows ONLY the
 * bare-word branch; DATA_TERM_RE asks ("exchange rate", "yield" as a
 * listed term) keep their own conjunction with a symbol.
 */
function rateAnchorsInstrument(text: string, instrument: string): boolean {
  const inst = escapeRegExp(instrument);
  // Pattern A — the noun compound, including the possessive spelling.
  if (new RegExp(`\\b${inst}'?s?\\s+(?:rates?|yields?)\\b`, "i").test(text)) return true;
  // Pattern B — the inverted compound; an optional article is allowed.
  if (new RegExp(`\\b(?:rates?|yields?)\\s+(?:of|for|on)\\s+(?:the\\s+)?${inst}\\b`, "i").test(text)) return true;
  return false;
}

export interface FinancialDataIntent {
  /** True when the request clearly asks for symbol-specific financial data. */
  financial: boolean;
  /** The matched registry symbol (when financial). */
  symbol?: string;
  /** The matched data term (when financial). */
  matchedTerm?: string;
  /** R12-03: the raw text that named the instrument (the slashed pair or
   * the typed token, e.g. "USD/INR", "10Y", "GOLD") — lets the seed
   * re-verify the rate/yield adjacency on the ORIGINAL message even when
   * `symbol` was canonicalised (10Y -> IN10YS). */
  instrumentText?: string;
}

/**
 * Detect a clear symbol-specific financial-data request. Pure and
 * synchronous: no I/O, no environment, no model calls — the same input
 * always yields the same verdict, in tests and in production.
 */
export function detectFinancialDataIntent(message: string): FinancialDataIntent {
  const text = message ?? '';
  if (text.length === 0) return { financial: false };

  const termMatch = DATA_TERM_RE.exec(text);
  // R11 (directive 8): the bare rate/yield word is tracked separately —
  // it is not a standalone data term ("rate my TCS research" is prose;
  // "growth rate" is a fundamentals compound already covered above). It
  // names a datum only when anchored to a non-equity price instrument.
  const rateWord = RATE_OR_YIELD_WORD_RE.exec(text);

  // Standalone tokens: split on everything that is not part of a symbol
  // (letters, digits, '&' for M&M-style symbols).
  const tokens = text
    .toUpperCase()
    .split(/[^A-Z0-9&]+/)
    .filter((t) => t.length >= 2);

  // R9-9: slashed FX pairs first — tokenization would split "USD/INR"
  // into USD + INR and lose the pair. The slashed spelling is exactly
  // what the price layer consumes, so it is the symbol we report.
  // R11: a pair plus the bare rate/yield word is a price ask ("What is
  // the current USD/INR rate?") — the pair itself anchors the instrument,
  // so no generic data term is required for it.
  if (SLASHED_PAIR_RE) {
    const pair = SLASHED_PAIR_RE.exec(text);
    // R12-03: a bare rate/yield word qualifies only when ADJACENT to the
    // pair ("USD/INR rate") — "How does a Fed rate cut affect USD/INR?"
    // is prose, not a price ask. A listed DATA_TERM keeps its own path.
    if (pair && (termMatch || (rateWord && rateAnchorsInstrument(text, pair[0].toUpperCase())))) {
      return {
        financial: true,
        symbol: pair[0].toUpperCase(),
        matchedTerm: (termMatch ?? rateWord)![0],
        instrumentText: pair[0].toUpperCase(),
      };
    }
  }

  if (termMatch) {
    for (const token of tokens) {
      if (SYMBOL_TOKENS.has(token)) {
        // R11-05 (directive 15): report the CANONICAL registry symbol —
        // the derived tenor alias "10Y" reports as IN10YS; stock symbols
        // and plain registry members pass through unchanged.
        return {
          financial: true,
          symbol: canonicalPriceRegistrySymbol(token) ?? token,
          matchedTerm: termMatch[0],
          instrumentText: token,
        };
      }
    }
    return { financial: false };
  }

  // R11 (directive 8): no generic data term — the only remaining
  // qualifier is the rate/yield word anchored to a NON-EQUITY
  // price-registry instrument. For FX, commodities, crypto, indexes and
  // bonds the word names the observed price datum ("USDINR rate", "gold
  // rate", "IN10YS yield"); PRICE_REGISTRY_TOKENS deliberately excludes
  // the stock master, so stock-symbol prose ("rate my TCS research") can
  // never qualify through this branch. R11-05 (directive 15): the token
  // resolves through the registry's ONE canonicaliser, so the derived
  // bare-tenor alias ("10Y" -> IN10YS) reaches this path too — the symbol
  // reported here is always the CANONICAL registry symbol.
  if (rateWord) {
    for (const token of tokens) {
      const canonicalInstrument = canonicalPriceRegistrySymbol(token);
      // R12-03: adjacency required — the word prices the instrument only
      // as "<instrument> rate/yield" or "rate/yield of|for|on <instrument>".
      // Macro compounds and verb usage never anchor ("rate my GOLD picks",
      // "Fed rate cut affecting GOLD", "rates are rising — does GOLD hedge?").
      if (canonicalInstrument && rateAnchorsInstrument(text, token)) {
        return {
          financial: true,
          symbol: canonicalInstrument,
          matchedTerm: rateWord[0],
          instrumentText: token,
        };
      }
    }
  }
  return { financial: false };
}

/**
 * Coder Directions §5 (2026-10-02 round 3) — the closed OBSERVABLE-data
 * term→tool seed map. When a request matches BOTH a registry symbol and
 * one of these terms, the router may seed the canonical tool exactly like
 * the deterministic probe does (server-enforced engagement; the model
 * stays responsible for the final structured answer).
 *
 * Deliberately NARROW: only data the canonical tools can observe and
 * serve. Advice-shaped asks (buy or sell, target price, bullish or
 * bearish, recommendations, ratings) and general valuation wording are
 * NOT seeded — a tool result must never auto-materialize to answer an
 * advice question (Rule 4: nothing fabricated; advice stays a discussion).
 */
const SEED_TERM_RES: ReadonlyArray<{ re: RegExp; tool: "getPrices" | "getFinancials" | "getScore" | "getPeers" }> = [
  // R11 (directive 8): the standalone "rate(s)" entry is GONE from this
  // map — it seeded getPrices for fundamentals compounds ("growth rate")
  // and verb usage ("rate my research") on stock symbols. Rate/yield
  // asks seed getPrices ONLY through the instrument-anchored branch in
  // intentSeedTool below (non-equity registry instruments and slashed
  // pairs, where the rate IS the observed price datum).
  { re: /\b(prices?|share price|stock price|current price|latest price|cmp|quote)\b/i, tool: "getPrices" },
  {
    re: /\b(fundamentals?|financials?|financial data|p\/e|p\.e\.|p-e|pe ratio|price[- ]to[- ]earnings|roe|return on equity|roce|debt[- ]?to[- ]?equity|d\/e|market ?caps?|market capitalization|revenues?|profits?|earnings|eps|dividends?|book value|margins?|growth rates?)\b/i,
    tool: "getFinancials",
  },
  { re: /\b(scores?|rishi scores?|consensus|verdicts?)\b/i, tool: "getScore" },
  { re: /\b(peers?|competitors?)\b/i, tool: "getPeers" },
];

/**
 * The canonical tool the server should seed for this message, or null.
 * Pure like the detector; null means "no server-side engagement" (the
 * model keeps full tool choice and the existing intent backstop still
 * applies).
 */
export function intentSeedTool(message: string): { tool: string; args: { symbol: string } } | null {
  const intent = detectFinancialDataIntent(message);
  if (!intent.financial || !intent.symbol) return null;
  // R11 (directive 8): a rate/yield ask anchored to a NON-EQUITY price
  // instrument seeds getPrices — for FX, commodities, crypto, indexes and
  // bonds the rate IS the observed price datum ("USD/INR rate", "gold
  // rate", "IN10YS yield"). Slashed pairs are recognized by shape (the
  // token set stores the unslashed spelling). Stock symbols never reach
  // this branch: the detector already rejected bare-rate prose there, so
  // "growth rate" falls through to the fundamentals seed below.
  // R12-03: the bare rate/yield word seeds the price tool only when it is
  // ADJACENT to the instrument on the ORIGINAL message (the detector's
  // anchor, re-verified against the raw spelling — "10Y" stays "10Y" here
  // even though `symbol` was canonicalised to IN10YS), or when the matched
  // DATA TERM itself names a pair's rate datum ("exchange rate" — a listed
  // DATA_TERM_RE term, restricted to non-equity symbols so "exchange rate
  // impact on TCS" never prices a stock, exactly as before this change).
  const rateAnchored =
    !!intent.instrumentText && rateAnchorsInstrument(message, intent.instrumentText);
  const pairRateTerm =
    /\bexchange rates?\b/i.test(message) &&
    (intent.symbol.includes('/') || PRICE_REGISTRY_TOKENS.has(intent.symbol));
  if (
    (rateAnchored || pairRateTerm) &&
    (intent.symbol.includes('/') || PRICE_REGISTRY_TOKENS.has(intent.symbol))
  ) {
    return { tool: 'getPrices', args: { symbol: intent.symbol } };
  }
  for (const { re, tool } of SEED_TERM_RES) {
    if (re.test(message)) return { tool, args: { symbol: intent.symbol } };
  }
  return null;
}
