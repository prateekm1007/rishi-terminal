// N1 (round 3): the screener page is a SERVER component. It builds the
// slim index (free fields only — consensus number/category, topBull and
// topBear summaries, and the pe/roe/mktcap/de display-and-filter fields)
// and hands it to the client table via RSC props. The 944-record seed
// dataset and the scoring engine never enter the client bundle; the
// preset filters and stat pills run on the slim rows instead.
import { getSlimIndex } from '@/lib/scoring/slimIndex';
import { ScreenerClient } from '@/components/screener/ScreenerClient';
import { NamespaceProvider } from '@/components/shared/NamespaceProvider';
import { screener } from '@/messages/en.json';

// X4 (Round 11): the screener's namespace arrives from the server (see the
// homepage's note) — the page carries only its own strings.

// Round-5 audit (finding 18): per-page title/description.
export const metadata = {
  title: "Stock Screener — India equities | Rishi Terminal",
  description: "Screen India equities by consensus score, valuation, quality and leverage. Free tier shows the top-5 Rishi verdicts.",
  // Audit M6/B.3: one canonical URL per route (metadataBase resolves it).
  alternates: { canonical: "/screener" },
};

export default function ScreenerPage() {
  const rows = getSlimIndex();
  return (
    <NamespaceProvider ns={{ screener }}>
      <ScreenerClient rows={rows} />
    </NamespaceProvider>
  );
}
