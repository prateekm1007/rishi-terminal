import type { Metadata } from "next";

import { SITE_NAME } from "./site";

/**
 * WP1 (founder round 2026-10-10): the ONE builder for section-route
 * metadata. Every public page names itself — a route-specific title,
 * canonical, og:title/og:url and twitter:title — instead of inheriting the
 * site-root defaults from app/layout.tsx (the defect the 2026-10-10 route
 * crawl pinned: 16 routes rendered the generic og:title and a root og:url).
 *
 * `path` stays RELATIVE on the returned object on purpose: metadataBase in
 * app/layout.tsx anchors it to the production origin at render time, so
 * the rendered <link rel="canonical"> and og:url are absolute. Detail
 * routes that must echo the exact asset URL (the U5 pinned form) pass an
 * absolute path themselves — the helper never rewrites a path it is given.
 *
 * One source of truth (Constitution 14): the per-route pins in
 * test/wp1.routeMetadata.test.ts enforce that every public page actually
 * uses this builder — a page that regresses to root defaults fails CI even
 * before the production route-crawl runs.
 */
export interface RouteMetaInput {
  /** The route path, e.g. "/pulse" or "/forex/USDINR". */
  path: string;
  /** The full public title, already suffixed for the site. */
  title: string;
  /** One-to-three-line public description. */
  description: string;
  /** Open Graph type; "website" for sections, "article" for documents. */
  type?: "website" | "article";
}

export function routeMetadata({
  path,
  title,
  description,
  type = "website",
}: RouteMetaInput): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type,
      siteName: SITE_NAME,
      title,
      description,
      url: path,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
