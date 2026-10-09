// lib/intelligence/newsEvidence.ts (INT-B1, roadmap item B1) — the ONE
// deps pass that feeds the evidence assembler's EXISTING
// `EvidenceDeps.news` slot from the matched per-symbol news items.
//
// Pre-registration: docs/intelligence/newsEvidence.md (committed BEFORE
// any evaluation). One deps pass — no second pipeline:
//   1. the company name comes from the ONE canonical stock registry
//      (data/stocks STOCKS — no second name list);
//   2. the items come from /api/news — the ONE fetcher, consumed over
//      its existing HTTP surface; this module never re-fetches RSS and
//      never invents an item;
//   3. the match is THE deterministic matcher (lib/intelligence/newsMatch);
//   4. the projection carries the STABLE content-derived id (the
//      assembler emits news:<stable-id>) and the feed's OWN impact
//      label verbatim (FEED-provided — never recomputed; A4 materiality
//      is a different, exclusive engine).
//
// Fail-closed (the pre-registration's table): a failed fetch, a non-OK
// response, non-JSON or a schema-mismatched payload arrives as an EMPTY
// deps array — the caller's evidence package then carries the honest
// unavailable note, byte-identical to today's. A malformed ITEM is
// refused individually — never a half-attributed citation.

import "server-only";

import { z } from "zod";

import type { EvidenceDeps } from "@/lib/ai/evidence";
import { STOCKS } from "@/data/stocks";
import {
  matchNewsForSymbol,
  stableNewsIdOf,
  type MatchableNewsItem,
} from "@/lib/intelligence/newsMatch";

/** Bounded: the chat/intelligence paths stay latency-capped. The feed
 *  route is CDN-cached (s-maxage=120); on a miss the timeout refuses
 *  into the honest unavailable state instead of stalling the loop. */
const NEWS_FETCH_TIMEOUT_MS = 5_000;

/** The /api/news item shape the match layer consumes — validated at the
 *  boundary (rule 9); an item failing the schema is dropped, never
 *  half-trusted. */
const NEWS_ITEM_SCHEMA = z.object({
  id: z.string(),
  headline: z.string(),
  summary: z.string(),
  source: z.string(),
  url: z.string(),
  pubDate: z.string(),
  impact: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]),
  tags: z.array(z.string()),
});

const NEWS_PAYLOAD_SCHEMA = z.object({ news: z.array(z.unknown()) });

export type NewsEvidenceDeps = NonNullable<EvidenceDeps["news"]>;

/** The canonical public-origin derivation (the alerts-evaluate
 *  precedent): the deployment's configured origin first, else the
 *  request URL's origin. Neither parses (or the request carries no URL
 *  — some route tests post bare request objects) → null: the caller
 *  fail-closes to the honest unavailable note. */
export function newsFeedOriginFrom(requestUrl: string | null | undefined): string | null {
  const env = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  if (env && /^https?:\/\//.test(env)) return env.replace(/\/$/, "");
  if (!requestUrl) return null;
  try {
    return new URL(requestUrl).origin;
  } catch {
    return null;
  }
}

export async function buildNewsEvidenceDeps(
  subject: string,
  requestUrl: string | null | undefined,
): Promise<NewsEvidenceDeps> {
  // 0. The fetch origin — fail-closed: no parseable origin, no fetch.
  const origin = newsFeedOriginFrom(requestUrl);
  if (!origin) return [];

  // 1. The ONE registry is the only name source (an empty name — e.g. a
  //    non-equity price token — simply disables the name rule).
  const company = STOCKS[subject]?.name ?? "";

  // 2. The ONE fetcher — fail-closed to [] on ANY failure.
  let wireItems: MatchableNewsItem[] = [];
  try {
    const res = await fetch(`${origin}/api/news`, {
      cache: "no-store",
      signal: AbortSignal.timeout(NEWS_FETCH_TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
    if (!res.ok) return [];
    const json: unknown = await res.json();
    const payload = NEWS_PAYLOAD_SCHEMA.safeParse(json);
    if (!payload.success) return [];
    const items: MatchableNewsItem[] = [];
    for (const raw of payload.data.news) {
      const parsed = NEWS_ITEM_SCHEMA.safeParse(raw);
      if (parsed.success) items.push(parsed.data as MatchableNewsItem);
    }
    wireItems = items;
  } catch {
    return [];
  }

  // 3. THE deterministic match (caps, ordering, dedupe inside).
  const matched = matchNewsForSymbol(subject, company, wireItems);

  // 4. Project to the deps shape: the stable id IS the deps id.
  return matched.map((item) => ({
    id: stableNewsIdOf(item),
    headline: item.headline,
    summary: item.summary,
    source: item.source,
    pubDate: item.pubDate,
    impact: item.impact,
  }));
}
