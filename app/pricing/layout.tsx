import { Metadata } from 'next';

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata: Metadata = {
  title: "Pricing — Everything Is Free | Rishi Terminal",
  description: "Every feature on Rishi Terminal is free: all Rishis, AI chat, the screener, portfolio tools and live prices. No tiers, no subscriptions.",
  // Audit M6/B.3: one canonical URL per route (metadataBase resolves it).
  alternates: { canonical: "/pricing" },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
