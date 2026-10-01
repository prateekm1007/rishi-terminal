import { Metadata } from 'next';

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata: Metadata = {
  title: "Bonds — G-Secs, SDLs, corporates, US Treasuries | Rishi Terminal",
  description: "Sovereign and corporate debt reference yields across G-Secs, SDLs, T-Bills, corporates and US Treasuries.",
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
