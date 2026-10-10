import { NamespaceProvider } from '@/components/shared/NamespaceProvider';
import { commodities } from '@/messages/en.json';
import { routeMetadata } from "@/lib/seo/routeMetadata";

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata = routeMetadata({
  path: "/commodities",
  title: "Commodities — gold, silver, crude, base metals | Rishi Terminal",
  description: "Precious metals, energy and base metals with per-row provenance chips and as-of times.",
});

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  // X4 (Round 11): this route's dictionary namespace arrives as an RSC
  // prop (streamed flight payload) instead of riding the client page's
  // first-load JS — see lib/languageShell.ts and app/page.tsx's note.
  return <NamespaceProvider ns={{ commodities }}>{children}</NamespaceProvider>;
}
