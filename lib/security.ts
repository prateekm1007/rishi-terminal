// lib/security.ts
// Symbol validation (remediation T8).
//
// The old regex (^[A-Z]{1,10}$) rejected real NSE symbols like J&KBANK,
// M&M, BAJAJ-AUTO and 3MINDIA. Validation is now registry-based: the seed
// stock dataset is the source of truth for what counts as a known stock
// symbol. Multi-asset endpoints (prices/history handle indices, forex and
// crypto too) use the charset validator below, which blocks injection
// vectors while allowing BTC, USD/INR, ^NSEI and friends.

import { STOCKS } from '@/data/stocks';

/** Known stock symbol (registry-based). Accepts the seed's exact symbols. */
export function isKnownSymbol(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') return false;
  return Object.prototype.hasOwnProperty.call(STOCKS, symbol.trim().toUpperCase());
}

/** Alias kept for callers of the old name; registry-based. */
export function validateSymbol(symbol: string): boolean {
  return isKnownSymbol(symbol);
}

/**
 * Charset+length validation for multi-asset symbol inputs (stocks, indices,
 * forex pairs, crypto). Rejects path traversal, control characters, URL
 * metacharacters and absurd lengths; does NOT check the registry.
 */
export function isSafeSymbolToken(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') return false;
  const s = symbol.trim().toUpperCase();
  if (s.length === 0 || s.length > 20) return false;
  if (s.includes('..') || s.includes('//')) return false;
  return /^[A-Z0-9&_^\/\.\-= ]{1,20}$/.test(s);
}

/** Normalize a validated symbol token; returns null when unsafe. */
export function sanitizeSymbol(symbol: string): string | null {
  if (!isSafeSymbolToken(symbol)) return null;
  return symbol.trim().toUpperCase();
}

export function validateExchange(exchange: string): boolean {
  const VALID_EXCHANGES = ['NSE', 'BSE', 'NYSE', 'NASDAQ'];
  return !!exchange && VALID_EXCHANGES.includes(exchange.toUpperCase());
}
