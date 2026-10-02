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

/** Registry symbol tokens (security master — the one registry). */
const SYMBOL_TOKENS: ReadonlySet<string> = new Set(
  Object.keys(STOCKS).filter((s) => s.length >= 2),
);

/**
 * The closed financial-data vocabulary. Adding a term here is a reviewed
 * decision: every term must name a datum the canonical tools can serve
 * (getStock/getFinancials/getPrices/getScore/getPeers) or an explicit
 * data/advice ask that requires such data. Keep it conservative.
 */
const DATA_TERM_RE =
  /\b(prices?|share price|stock price|current price|latest price|cmp|quote|scores?|rishi scores?|consensus|verdicts?|fundamentals?|financials?|financial data|p\/e|p\.e\.|p-e|pe ratio|price[- ]to[- ]earnings|roe|return on equity|roce|debt[- ]?to[- ]?equity|d\/e|market ?caps?|market capitalization|peers?|competitors?|revenues?|profits?|earnings|eps|dividends?|book value|valuation|margins?|growth rates?|recommendations?|ratings?|buy or sell|bullish or bearish|target price)\b/i;

export interface FinancialDataIntent {
  /** True when the request clearly asks for symbol-specific financial data. */
  financial: boolean;
  /** The matched registry symbol (when financial). */
  symbol?: string;
  /** The matched data term (when financial). */
  matchedTerm?: string;
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
  if (!termMatch) return { financial: false };

  // Standalone tokens: split on everything that is not part of a symbol
  // (letters, digits, '&' for M&M-style symbols).
  const tokens = text
    .toUpperCase()
    .split(/[^A-Z0-9&]+/)
    .filter((t) => t.length >= 2);

  for (const token of tokens) {
    if (SYMBOL_TOKENS.has(token)) {
      return { financial: true, symbol: token, matchedTerm: termMatch[0] };
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
  for (const { re, tool } of SEED_TERM_RES) {
    if (re.test(message)) return { tool, args: { symbol: intent.symbol } };
  }
  return null;
}
