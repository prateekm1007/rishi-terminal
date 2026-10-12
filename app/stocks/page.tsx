// N1 (round 3): the stocks page (renamed from /screener, SR 2026-10-06)
// is a SERVER component. It builds the slim index (free fields only —
// consensus number/category, topBull and topBear summaries, and the
// pe/roe/mktcap/de display-and-filter fields) and hands it to the client
// table via RSC props. The 944-record seed dataset and the scoring engine
// never enter the client bundle; the preset filters and stat pills run on
// the slim rows instead. The screening/query FUNCTION is unchanged — only
// the product surface name changed (founder directive 6, 2026-10-06).
import { getSlimIndex } from '@/lib/scoring/slimIndex';
import { toScreenerRows } from '@/lib/transport/slimWire';
import { seedResidualMarks } from '@/lib/seedResiduals';
import { STOCKS } from '@/data/stocks';
import { ScreenerClient } from '@/components/screener/ScreenerClient';
import { NamespaceProvider } from '@/components/shared/NamespaceProvider';
import { screener } from '@/messages/en.json';
import { routeMetadata } from "@/lib/seo/routeMetadata";

// X4 (Round 11): the stocks namespace arrives from the server (see the
// homepage's note) — the page carries only its own strings. The message
// namespace key stays `screener` (internal transport; renaming it would
// churn 8 locale files for zero user-visible value — the VALUES carry the
// product name now).

// Round-5 audit (finding 18): per-page title/description.
export const metadata = routeMetadata({
  path: "/stocks",
  title: "Stocks — India equities | Rishi Terminal",
  description: "Browse and screen India equities by consensus score, valuation, quality and leverage. Free tier shows the top-5 Rishi verdicts.",
});

export default function StocksPage() {
  // R16 C5: the stocks surface renders/filters FLAT fields only (table
  // columns, stat pills, presets, search) — verdict summaries, tension and
  // fcf never ship to this page's flight payload. The custom-query results
  // from /api/screener/query arrive as on-demand JSON (a superset of this
  // shape) and remain assignable (API routes keep their paths — internal
  // transport, not the product surface).
  const rows = toScreenerRows(getSlimIndex());
  // FD-13 (founder directive 2026-10-11: "label or hide the boilerplate
  // rows and market-cap artifacts"): the residual marks are computed
  // SERVER-side over the full dataset and handed to the table as ONE
  // compact prop — the wire contract is untouched, and the labels keep
  // the data visible (the reversible choice the directive allows).
  const residuals = seedResidualMarks(Object.values(STOCKS));
  return (
    <NamespaceProvider ns={{ screener }}>
      <ScreenerClient rows={rows} residuals={residuals} />
    </NamespaceProvider>
  );
}
