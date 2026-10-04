import { Metadata } from 'next';
import { NamespaceProvider } from '@/components/shared/NamespaceProvider';
import { bonds } from '@/messages/en.json';

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata: Metadata = {
  title: "Bonds — G-Secs, SDLs, corporates, US Treasuries | Rishi Terminal",
  description: "Sovereign and corporate debt reference yields across G-Secs, SDLs, T-Bills, corporates and US Treasuries.",
  // Audit M6/B.3: one canonical URL per route (metadataBase resolves it).
  alternates: { canonical: "/bonds" },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  // X4 (Round 11): this route's dictionary namespace arrives as an RSC
  // prop (streamed flight payload) instead of riding the client page's
  // first-load JS — see lib/languageShell.ts and app/page.tsx's note.
  return <NamespaceProvider ns={{ bonds }}>{children}</NamespaceProvider>;
}
