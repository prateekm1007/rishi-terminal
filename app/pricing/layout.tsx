import { NamespaceProvider } from '@/components/shared/NamespaceProvider';
import { pricing } from '@/messages/en.json';
import { routeMetadata } from "@/lib/seo/routeMetadata";

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata = routeMetadata({
  path: "/pricing",
  title: "Pricing — Everything is free | Rishi Terminal",
  description: "Every feature on Rishi Terminal is free: all Rishis, AI chat, the screener, portfolio tools.",
});

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  // X4 (Round 11): this route's dictionary namespace arrives as an RSC
  // prop (streamed flight payload) instead of riding the client page's
  // first-load JS — see lib/languageShell.ts and app/page.tsx's note.
  return <NamespaceProvider ns={{ pricing }}>{children}</NamespaceProvider>;
}
