// lib/registry/validateInput.ts
// R5 (round 2): the single symbol-input gate for every API route.
//
// Before this, only /api/fundamentals and /api/ingest/financials validated
// symbols; the price/history/technical proxies accepted ARBITRARY strings
// and forwarded them to Yahoo/NSE — open, unauthenticated, unlimited data
// proxies that could burn upstream quota or get the deployment rate-banned.
//
// A symbol is accepted only if it resolves through the ticker registry
// (seed + aliases) or is on the allow-list of asset tickers THE APP ITSELF
// uses. The allow-list is DERIVED from the data files and live-price maps —
// nothing is hand-enumerated here, so it stays in sync with the product.
//
// Every route that reads `symbol`/`symbols` must import this module
// (enforced by test/routes.validateInput.test.ts, which fails when a new
// route reads those params without the gate).

import { STOCKS } from '@/data/stocks';
import { resolveTickerSymbol } from './registryAudit'; // N1: seed-validated server path
import { INDIAN_INDEXES } from '@/data/indexes';
import { COMMODITIES } from '@/data/markets';
import { CRYPTO_ASSETS } from '@/data/crypto';
import { FOREX_PAIRS } from '@/data/forex';
import { BONDS } from '@/data/bonds';
import {
  YAHOO_INDEX_SYMBOLS,
  YAHOO_COMMODITY_SYMBOLS,
  COINGECKO_IDS,
  YAHOO_SPECIAL,
} from '@/lib/livePrice';

/** Batch cap for `symbols` lists (spec R5: 50). */
export const MAX_SYMBOLS_BATCH = 50;

// ── The allow-list, derived from the app's own data ─────────────────────
const ALLOWED = new Set<string>([
  ...Object.keys(STOCKS),
  ...Object.keys(YAHOO_INDEX_SYMBOLS),
  ...Object.keys(YAHOO_COMMODITY_SYMBOLS),
  ...Object.keys(COINGECKO_IDS),
  ...Object.keys(YAHOO_SPECIAL),
  ...INDIAN_INDEXES.map((i) => i.symbol),
  ...COMMODITIES.map((c) => c.symbol),
  ...CRYPTO_ASSETS.map((c) => c.symbol),
  ...FOREX_PAIRS.map((f) => f.symbol),
  ...FOREX_PAIRS.map((f) => (f.pair ?? f.symbol).toUpperCase()), // slashed BASE/QUOTE spelling
  ...BONDS.map((b) => b.symbol),
]);

/** R9-9 (Rule 14: one source of truth): the price-registry token set —
 * every index/commodity/crypto/forex/bond ticker the price layer itself
 * serves, DERIVED from the same data files as ALLOWED above (never
 * hand-enumerated). Exported for the AI financial-intent backstop so its
 * Signal 1 covers the full canonical price registry, not just the stock
 * master. Deliberately EXCLUDES the stock master: the two registries
 * compose at the consumer (STOCKS ∪ PRICE_REGISTRY_TOKENS), each stays
 * single-concept. */
export const PRICE_REGISTRY_TOKENS: ReadonlySet<string> = new Set(
  [
    ...Object.keys(YAHOO_INDEX_SYMBOLS),
    ...Object.keys(YAHOO_COMMODITY_SYMBOLS),
    ...Object.keys(COINGECKO_IDS),
    ...Object.keys(YAHOO_SPECIAL),
    ...INDIAN_INDEXES.map((i) => i.symbol),
    ...COMMODITIES.map((c) => c.symbol),
    ...CRYPTO_ASSETS.map((c) => c.symbol),
    ...FOREX_PAIRS.map((f) => f.symbol.toUpperCase()),
    ...BONDS.map((b) => b.symbol),
  ].filter((s) => s.length >= 2),
);

/** R9-9: the slashed "BASE/QUOTE" spellings the price layer expects for
 * forex (data/forex.ts stores pairs unslashed). Exported so the intent
 * detector can match "USD/INR" even though its tokenizer splits on '/'. */
export const SLASHED: ReadonlySet<string> = new Set(
  FOREX_PAIRS.map((f) => (f.pair ?? f.symbol).toUpperCase()),
);

/** The price layer (lib/livePrice) and history expect forex pairs in the
 * slashed "BASE/QUOTE" spelling; data/forex.ts stores them unslashed. Map
 * every accepted spelling to the slashed canonical form. */
const FOREX_CANONICAL = new Map<string, string>(
  FOREX_PAIRS.map((f) => [f.symbol.toUpperCase(), (f.pair ?? f.symbol).toUpperCase()]),
);

/** Normalise the alternate spellings the app has always accepted. */
function canonicalise(raw: string): string {
  const s = raw.trim().toUpperCase();
  // "USD/INR" / "USDINR" / "USDINR=X" -> "USD/INR"
  const noSuffix = s.endsWith('=X') ? s.slice(0, -2) : s;
  const noSlash = noSuffix.includes('/') ? noSlashReplace(noSuffix) : noSuffix;
  const forex = FOREX_CANONICAL.get(noSlash);
  if (forex) return forex;
  return s;
}

function noSlashReplace(s: string): string {
  return s.replace('/', '');
}

/**
 * True when the symbol resolves via the ticker registry (including the
 * T12 alias map) or is one of the app's own index/forex/crypto/commodity/
 * bond tickers. Anything else is rejected with 400 by the caller.
 */
export function isValidSymbolInput(raw: string): boolean {
  if (!raw || typeof raw !== 'string') return false;
  const s = raw.trim();
  if (s.length === 0 || s.length > 20) return false;
  const canonical = canonicalise(s);
  if (ALLOWED.has(canonical)) return true;
  // Registry + alias resolution (legacy symbols map to canonical NSE ones).
  const resolved = resolveTickerSymbol(canonical);
  return resolved !== null && Object.prototype.hasOwnProperty.call(STOCKS, resolved);
}

/** Normalised, validated symbol — or null when the input is not allowed. */
export function normalizeSymbolInput(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!isValidSymbolInput(s)) return null;
  const canonical = canonicalise(s);
  const resolved = resolveTickerSymbol(canonical);
  return resolved ?? canonical;
}

export type SymbolsResult =
  | { ok: true; symbols: string[] }
  | { ok: false; status: 400; error: string };

/** Parse and validate a comma-separated `symbols=a,b,c` query param. */
export function parseSymbolsList(raw: string | null | undefined): SymbolsResult {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, status: 400, error: 'symbols parameter required' };
  }
  const requested = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return validateBatch(requested);
}

/** Parse and validate a JSON body of the shape { symbols: string[] }. */
export function parseSymbolsBody(value: unknown): SymbolsResult {
  if (typeof value !== 'object' || value === null || !Array.isArray((value as { symbols?: unknown }).symbols)) {
    return { ok: false, status: 400, error: 'symbols array required' };
  }
  const requested = (value as { symbols: unknown[] }).symbols;
  if (requested.some((s) => typeof s !== 'string')) {
    return { ok: false, status: 400, error: 'symbols must be strings' };
  }
  return validateBatch(requested as string[]);
}

function validateBatch(requested: string[]): SymbolsResult {
  if (requested.length === 0) {
    return { ok: false, status: 400, error: 'symbols parameter required' };
  }
  if (requested.length > MAX_SYMBOLS_BATCH) {
    return { ok: false, status: 400, error: `Too many symbols (max ${MAX_SYMBOLS_BATCH})` };
  }
  const normalised: string[] = [];
  for (const raw of requested) {
    const n = normalizeSymbolInput(raw);
    if (n === null) {
      return { ok: false, status: 400, error: `Unknown symbol: ${raw.slice(0, 20)}` };
    }
    normalised.push(n);
  }
  // de-duplicate, preserve order
  return { ok: true, symbols: Array.from(new Set(normalised)) };
}
