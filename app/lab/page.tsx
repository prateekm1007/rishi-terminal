// N1 (round 3): server component. The lab tabs receive the slim index
// via RSC props — the seed dataset and the scoring engine stay on the
// server. Tab routing/search-params handling moved to LabContent.
import { Suspense } from 'react';
import { getSlimIndex } from '@/lib/scoring/slimIndex';
import { LabContent } from '@/components/lab/LabContent';

// Round-5 audit (finding 18): per-page title/description.
export const metadata = {
  title: "Portfolio Lab — compare, watchlist, journal | Rishi Terminal",
  description: "Compare stocks side by side, track a watchlist and keep notes.",
};

export default function PortfolioLabPage() {
  const rows = getSlimIndex();
  return (
    <Suspense
      fallback={
        <div className="page-bg" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ color: '#D4AF37' }}>Loading Lab...</p>
        </div>
      }
    >
      <LabContent rows={rows} />
    </Suspense>
  );
}
