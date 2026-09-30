import { STOCKS } from '@/data/stocks';
import { resolveTickerSymbol } from '@/lib/registry/tickerRegistry';
import { isSafeSymbolToken } from '@/lib/security';
import { INDIAN_INDEXES, GLOBAL_INDEXES } from '@/data/indexes';
import { FOREX_PAIRS } from '@/data/forex';
import { CRYPTO_ASSETS } from '@/data/crypto';
import { COMMODITIES_DATA } from '@/data/commodities';
import { BONDS } from '@/data/bonds';

/**
 * R5: one shared input validator for every route that reads `symbol` or
 * `symbols` from the request.
 *
 * A symbol is accepted when EITHER
 *   - it resolves through the ticker registry/aliases to a seed stock
 *     (resolveTickerSymbol handles the 46 legacy aliases), OR
 *   - it is on an explicit multi-asset allow-list DERIVED FROM the app's own
 *     data modules (data/indexes.ts, data/forex.ts, data/crypto.ts,
 *     data/commodities.ts, data/bonds.ts) — the same tickers the UI itself
 *     renders. Nothing outside these two sets reaches an upstream provider.
 *
 * Every accepted symbol has already passed isSafeSymbolToken (charset,
 * length, no traversal/metacharacters), so `../../etc/passwd`-style inputs
 * are rejected before any upstream call.
 */

const COMMODITY_EXTRA = ['BRENTCRUDE'] as const;

function buildAllowList(): Set<string> {
  const list = new Set<string>();
  // Seed stocks (canonical + alias targets) come from the registry.
  for (const sym of Object.keys(STOCKS)) list.add(sym);

  // Multi-asset tickers the app itself uses — derived from the data modules.
  for (const row of [
    ...INDIAN_INDEXES,
    ...GLOBAL_INDEXES,
    ...FOREX_PAIRS,
    ...CRYPTO_ASSETS,
    ...COMMODITIES_DATA,
    ...BONDS,
  ] as Array<{ symbol?: string }>) {
    if (row && typeof row.symbol === 'string' && row.symbol) {
      list.add(row.symbol.toUpperCase());
    }
  }

  // Well-known index shorthand used by the dashboard ticker + batch route.
  for (const s of [
    'NIFTY50', 'SENSEX', 'BANK_NIFTY', 'SPX', 'DJI', 'IXIC', 'DAX', 'FTSE',
    'HSI', 'N225', 'VIX',
    // bond tenor shorthands used by the UI
    'IN2YS', 'IN6YS', 'IN10YS', 'IN15YS', 'IN91DTB', 'IN182DTB',
    ...COMMODITY_EXTRA,
  ]) {
    list.add(s);
  }
  return list;
}

let ALLOW_LIST: Set<string> | null = null;
function allowList(): Set<string> {
  if (!ALLOW_LIST) ALLOW_LIST = buildAllowList();
  return ALLOW_LIST;
}

/** True when this symbol may be forwarded to an upstream provider. */
export function isValidSymbol(symbol: string): boolean {
  const raw = (symbol ?? '').trim();
  if (!raw) return false;
  const upper = raw.toUpperCase();
  // Charset/traversal gate first (cheap, rejects injection vectors).
  if (!isSafeSymbolToken(upper)) return false;
  if (allowList().has(upper)) return true;
  // Registry/alias resolution (J&KBANK-style aliases, renamed tickers).
  const canonical = resolveTickerSymbol(upper);
  return !!canonical && allowList().has(canonical);
}

export type SymbolsValidation =
  | { ok: true; symbols: string[] }
  | { ok: false; reason: string };

/**
 * Validate a `symbols` query value (single or comma-separated).
 * Caps the batch (default 50) so one request cannot fan out into
 * hundreds of upstream calls.
 */
export function validateSymbolsInput(
  raw: string | string[] | null | undefined,
  opts: { max?: number } = {},
): SymbolsValidation {
  const max = opts.max ?? 50;
  if (raw === null || raw === undefined) {
    return { ok: false, reason: 'symbols required' };
  }
  const parts = (Array.isArray(raw) ? raw.join(',') : raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return { ok: false, reason: 'symbols required' };
  if (parts.length > max) {
    return { ok: false, reason: `too many symbols (max ${max})` };
  }
  const invalid = parts.filter((s) => !isValidSymbol(s));
  if (invalid.length > 0) {
    return { ok: false, reason: `unknown symbol(s): ${invalid.slice(0, 5).join(', ')}` };
  }
  return { ok: true, symbols: parts.map((s) => s.toUpperCase()) };
}

export type SymbolValidation =
  | { ok: true; symbol: string }
  | { ok: false; reason: string };

/** Validate a single `symbol` query value. */
export function validateSymbolInput(
  raw: string | null | undefined,
): SymbolValidation {
  if (!raw || !raw.trim()) return { ok: false, reason: 'symbol required' };
  const upper = raw.trim().toUpperCase();
  if (!isValidSymbol(upper)) return { ok: false, reason: 'unknown symbol' };
  return { ok: true, symbol: upper };
}
