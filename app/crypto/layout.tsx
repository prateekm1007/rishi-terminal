import { Metadata } from 'next';
import { NamespaceProvider } from '@/components/shared/NamespaceProvider';
import { crypto } from '@/messages/en.json';

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata: Metadata = {
  title: "Crypto Markets — BTC, ETH and top assets | Rishi Terminal",
  description: "Crypto assets through the Rishi lenses with live CoinGecko prices where available and labelled reference analytics.",
  // Audit M6/B.3: one canonical URL per route (metadataBase resolves it).
  alternates: { canonical: "/crypto" },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  // X4 (Round 11): this route's dictionary namespace arrives as an RSC
  // prop (streamed flight payload) instead of riding the client page's
  // first-load JS — see lib/languageShell.ts and app/page.tsx's note.
  return <NamespaceProvider ns={{ crypto }}>{children}</NamespaceProvider>;
}
