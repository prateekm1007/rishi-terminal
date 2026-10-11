import { NamespaceProvider } from '@/components/shared/NamespaceProvider';
import { news } from '@/messages/en.json';
import { routeMetadata } from "@/lib/seo/routeMetadata";

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata = routeMetadata({
  path: "/news",
  // P0-8 (round 47, founder order 2026-10-11): the title claimed "live
  // news" — the page aggregates RSS feeds (revalidated, delayed), not a
  // live wire. Honest title names the aggregation.
  title: "Market Intelligence — aggregated headlines | Rishi Terminal",
  description: "Latest India and global market headlines with region and category filters.",
});

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  // X4 (Round 11): this route's dictionary namespace arrives as an RSC
  // prop (streamed flight payload) instead of riding the client page's
  // first-load JS — see lib/languageShell.ts and app/page.tsx's note.
  return <NamespaceProvider ns={{ news }}>{children}</NamespaceProvider>;
}
