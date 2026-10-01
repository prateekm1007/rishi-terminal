// lib/cache/storageRights.ts
// Phase 6 storage policy — the SINGLE source of truth for which provider
// sources are entitled to have their observed values persisted.
//
// Corrective gate (deep-audit finding 4): the write path checked this list,
// but the read path trusted whatever provider_id was already stored in the
// database. A malformed, historical, or manually inserted cache row could
// have become an entitlement bypass. Both layers now resolve the policy
// from THIS module — there is exactly one allow-list (constitution rule 14),
// and the read path re-validates independently (defense in depth).
//
// Evidence for each entitlement: docs/FREE_OPEN_DATA_RESEARCH.md
// §2.6/§2.7/§2.9 and docs/DATA_PROVIDER_MATRIX.md "Phase 6 storage policy".
// Scraped / terms-unverified sources (NSE, BSE, Yahoo, CoinGecko, screener,
// yahoo-etf-proxy) are NEVER entitled: an outage on those resolves to
// honest UNAVAILABLE, not to a stored copy.

/** Sources whose terms permit storing observed values. */
export const PERSISTABLE_SOURCES: ReadonlySet<string> = new Set([
  "fred-csv",         // FRED data terms: attribution "FRED, Federal Reserve Bank of St. Louis"
  "exchangerate-api", // free tier permits app use with attribution
  "ecb-fx",           // ECB reuse policy: attribution "European Central Bank"
]);

/** Entitlement check — used by the write path AND re-checked on every read. */
export function isPersistableSource(source: string | undefined | null): boolean {
  return !!source && PERSISTABLE_SOURCES.has(source);
}
