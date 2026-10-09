// lib/intelligence/newsMatch.ts (INT-B1, roadmap item B1) — THE
// deterministic per-symbol news match.
//
// Pre-registration: docs/intelligence/newsEvidence.md (committed BEFORE
// any evaluation). A market-level /api/news item is evidence for a
// symbol iff its headline, summary or tags (lowercased) contain
//   (a) the registry symbol token on a word boundary, or
//   (b) the registry company name (exact, case-insensitive).
// No stemming, no synonyms, no partial tokens, no invented semantics:
// zero matches is an empty list — the honest unavailable note stays,
// never a guessed attribution.
//
// The pipeline's own `id` is time-seeded (an epoch-milliseconds suffix
// stamped at item build time) and is NOT identity-bearing: the stable
// evidence id is derived from CONTENT —
// sha256 over `source|url|pubDate|headline` (a `#` link still yields a
// stable identity because the headline carries it). Same content, same
// id — deterministic.
//
// This module is PURE: no fetch, no clock, no randomness, no provider
// and no router imports (pinned by a static source scan in the suite).

import { createHash } from "node:crypto";

/** The minimal structural shape the match consumes (the /api/news item
 *  output shape — lib/newsApi.ts `LiveNewsItem`; no import coupling: the
 *  match layer consumes the shape, never the fetcher). */
export interface MatchableNewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  pubDate: string;
  /** The feed's OWN label — carried verbatim through the match (never
   *  recomputed here; Rishi materiality is A4's exclusive engine). */
  impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  tags: string[];
}

/** Pre-registered cap: at most 8 items per symbol. */
export const MAX_MATCHED_NEWS_ITEMS = 8;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary matcher for a registry token: not immediately preceded
 *  or followed by another alphanumeric (robust for tokens containing
 *  non-word characters, e.g. M&M). Empty/whitespace tokens match
 *  nothing. */
function tokenMatcher(token: string): RegExp | null {
  const t = token.trim().toLowerCase();
  if (!t) return null;
  return new RegExp(`(?<![a-z0-9])${escapeRegExp(t)}(?![a-z0-9])`);
}

/** The content-derived stable evidence id (the deps entry `id`; the
 *  assembler emits `news:<stable-id>`). */
export function stableNewsIdOf(
  item: Pick<MatchableNewsItem, "source" | "url" | "pubDate" | "headline">,
): string {
  return createHash("sha256")
    .update(`${item.source}|${item.url}|${item.pubDate}|${item.headline}`, "utf8")
    .digest("hex");
}

/** Unparseable pubDate sorts OLDEST (0) — deterministic, never invented. */
function safeTimeMs(pubDate: string): number {
  const t = Date.parse(pubDate);
  return Number.isNaN(t) ? 0 : t;
}

export function matchNewsForSymbol(
  symbol: string,
  company: string,
  items: readonly MatchableNewsItem[],
): MatchableNewsItem[] {
  const tokenRe = tokenMatcher(symbol);
  if (!tokenRe) return [];
  const name = company.trim().toLowerCase();

  const matched: Array<{ item: MatchableNewsItem; id: string }> = [];
  for (const item of items) {
    // Fail-closed refusals (the pre-registration's table): an item
    // without a source or headline is never half-attributed.
    if (!item.source || !item.headline) continue;
    // One haystack per field group; fields never bleed across the
    // separator (a company name split across headline and summary is
    // not a match).
    const haystack = [
      item.headline.toLowerCase(),
      item.summary.toLowerCase(),
      ...item.tags.map((t) => t.toLowerCase()),
    ].join("\n");
    const byToken = tokenRe.test(haystack);
    const byName = name.length > 0 && haystack.includes(name);
    if (!byToken && !byName) continue;
    matched.push({ item, id: stableNewsIdOf(item) });
  }

  // Deterministic order: pubDate desc (recency; unparseable sorts
  // oldest), tie-break stable-id asc. Same content → same id → one item
  // (the /api/news dedupe is headline-prefix based; two feeds can still
  // carry the same article).
  const ordered = matched
    .map((m) => ({ ...m, t: safeTimeMs(m.item.pubDate) }))
    .sort((a, b) => b.t - a.t || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const seen = new Set<string>();
  const out: MatchableNewsItem[] = [];
  for (const m of ordered) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m.item);
    if (out.length >= MAX_MATCHED_NEWS_ITEMS) break;
  }
  return out;
}
