import { Metadata } from 'next';

// Round-5 audit (finding 18): client pages cannot export metadata —
// this server layout carries the per-route title/description.
export const metadata: Metadata = {
  title: "Market Pulse — India macro dashboard | Rishi Terminal",
  description: "CPI, WPI, repo rate, G-Sec yields, GDP and money supply with regime analysis. Macro data is reference-labelled with per-row as-of dates.",
};

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
