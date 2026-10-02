import { Metadata } from 'next';

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata: Metadata = {
  title: "Forex — USD/INR, majors and crosses | Rishi Terminal",
  description: "FX rates with forward points, PPP context and carry analysis. Reference-labelled; live where a quote exists.",
  // Audit M6/B.3: one canonical URL per route (metadataBase resolves it).
  alternates: { canonical: "/forex" },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
