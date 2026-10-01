import { Metadata } from 'next';

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata: Metadata = {
  title: "Commodities — gold, silver, crude, base metals | Rishi Terminal",
  description: "MCX and global commodity reference data analysed through commodity Rishi frameworks.",
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
