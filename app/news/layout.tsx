import { Metadata } from 'next';

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata: Metadata = {
  title: "Market Intelligence — live news | Rishi Terminal",
  description: "Latest India and global market headlines with region and category filters.",
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
