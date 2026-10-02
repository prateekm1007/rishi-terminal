import { Metadata } from 'next';

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata: Metadata = {
  title: "Crypto Markets — BTC, ETH and top assets | Rishi Terminal",
  description: "Crypto assets through the Rishi lenses with live CoinGecko prices where available and labelled reference analytics.",
  // Audit M6/B.3: one canonical URL per route (metadataBase resolves it).
  alternates: { canonical: "/crypto" },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
