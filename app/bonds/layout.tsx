import { NamespaceProvider } from '@/components/shared/NamespaceProvider';
import { bonds } from '@/messages/en.json';
import { routeMetadata } from "@/lib/seo/routeMetadata";

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata = routeMetadata({
  path: "/bonds",
  title: "Bonds — G-Secs, SDLs, corporates, US Treasuries | Rishi Terminal",
  description: "Sovereign and corporate debt yields, labelled live where a live quote exists.",
});

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  // X4 (Round 11): this route's dictionary namespace arrives as an RSC
  // prop (streamed flight payload) instead of riding the client page's
  // first-load JS — see lib/languageShell.ts and app/page.tsx's note.
  return <NamespaceProvider ns={{ bonds }}>{children}</NamespaceProvider>;
}
