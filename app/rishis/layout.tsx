import { Metadata } from 'next';

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata: Metadata = {
  title: "Chat with Rishis — AI simulation | Rishi Terminal",
  description: "AI-simulated investment personas for education — fictional interpretations, not the real persons. Not investment advice.",
  // Audit M6/B.3: one canonical URL per route (metadataBase resolves it).
  alternates: { canonical: "/rishis" },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
