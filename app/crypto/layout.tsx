import { NamespaceProvider } from '@/components/shared/NamespaceProvider';
import { crypto } from '@/messages/en.json';
import { routeMetadata } from "@/lib/seo/routeMetadata";

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata = routeMetadata({
  path: "/crypto",
  title: "Crypto Markets — BTC, ETH and top assets | Rishi Terminal",
  description: "Live crypto quotes and static reference analytics, labelled per field.",
});

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  // X4 (Round 11): this route's dictionary namespace arrives as an RSC
  // prop (streamed flight payload) instead of riding the client page's
  // first-load JS — see lib/languageShell.ts and app/page.tsx's note.
  return <NamespaceProvider ns={{ crypto }}>{children}</NamespaceProvider>;
}
