import { NamespaceProvider } from '@/components/shared/NamespaceProvider';
import { forex } from '@/messages/en.json';
import { routeMetadata } from "@/lib/seo/routeMetadata";

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata = routeMetadata({
  path: "/forex",
  title: "Forex — USD/INR, majors and crosses | Rishi Terminal",
  description: "USD/INR spot, major pairs and crosses with per-row provenance chips and as-of times.",
});

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  // X4 (Round 11): this route's dictionary namespace arrives as an RSC
  // prop (streamed flight payload) instead of riding the client page's
  // first-load JS — see lib/languageShell.ts and app/page.tsx's note.
  return <NamespaceProvider ns={{ forex }}>{children}</NamespaceProvider>;
}
