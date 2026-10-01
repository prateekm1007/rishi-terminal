import { Metadata } from 'next';

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata: Metadata = {
  title: "Pricing — Tiers of Wisdom | Rishi Terminal",
  description: "Seeker, Student and Disciple tiers. Only features that actually exist are listed.",
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
