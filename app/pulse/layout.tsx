import { Metadata } from 'next';
import { NamespaceProvider } from '@/components/shared/NamespaceProvider';
import { pulse } from '@/messages/en.json';

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata: Metadata = {
  title: "Market Pulse — India macro dashboard | Rishi Terminal",
  description: "CPI, WPI, repo rate, G-Sec yields, GDP and money supply with regime analysis. Macro data is reference-labelled with per-row as-of dates.",
  // Audit M6/B.3: one canonical URL per route (metadataBase resolves it).
  alternates: { canonical: "/pulse" },
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  // X4 (Round 11): this route's dictionary namespace arrives as an RSC
  // prop (streamed flight payload) instead of riding the client page's
  // first-load JS — see lib/languageShell.ts and app/page.tsx's note.
  return <NamespaceProvider ns={{ pulse }}>{children}</NamespaceProvider>;
}
