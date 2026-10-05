// N1 (round 3): server component. The lab tabs receive the slim index
// via RSC props — the seed dataset and the scoring engine stay on the
// server. Tab routing/search-params handling moved to LabContent.
import { Suspense } from 'react';
import { getSlimIndex } from '@/lib/scoring/slimIndex';
import { encodeSlimIndex } from '@/lib/transport/slimWire';
import { LabContent } from '@/components/lab/LabContent';
import { NamespaceProvider } from '@/components/shared/NamespaceProvider';
import { compare, holdings, intel, overview } from '@/messages/en.json';

// X4 (Round 11): the lab tab namespaces arrive from the server as RSC
// props (flight payload) instead of riding the client bundle — see the
// homepage's note in app/page.tsx. (`lab.*` keys used by WatchlistTab have
// never existed in en.json — they render via the humanize fallback today;
// recorded in test/bundleBoundary.language.test.ts's known-missing list.)

// Round-5 audit (finding 18): per-page title/description.
export const metadata = {
  title: "Portfolio Lab — compare, watchlist, journal | Rishi Terminal",
  description: "Compare stocks side by side, track a watchlist and keep notes.",
};

export default function PortfolioLabPage() {
  // R16 C5: the lab tabs DO read verdict summaries (topBull.full,
  // summaryScores) — the wire codec dedupes the verdict metadata into a
  // legend instead of re-serializing it for every stock (6,412 `full`
  // strings became 39 legend entries). LabContent decodes on arrival.
  const wire = encodeSlimIndex(getSlimIndex());
  return (
    <NamespaceProvider ns={{ compare, holdings, intel, overview }}>
      <Suspense
        fallback={
          <div className="page-bg" style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ color: '#D4AF37' }}>Loading Lab...</p>
          </div>
        }
      >
        <LabContent wire={wire} />
      </Suspense>
    </NamespaceProvider>
  );
}
