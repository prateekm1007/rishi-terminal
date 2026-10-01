import { notFound, permanentRedirect } from 'next/navigation';
import { STOCKS } from '../../../data/stocks';
import { getStockScore, resolveStockMetrics, calculateQvpsDual } from '@/lib/scoring'; // T10: single scoring surface
import { sanitizeConsensus } from '@/lib/consensus/sanitize';
import { buildEliteKnowledgeGraph } from '@/lib/consensus/eliteGraph';
import { TIER_CONFIG } from '@/lib/premium';
import { resolveTickerSymbol } from '@/lib/registry/registryAudit'; // T12: ticker aliases (seed-validated server path)
import { generateStockDetail } from '../../../data/stockDetails';
import { StockPageClient } from '../../../components/stock/StockPageClient';

export async function generateStaticParams() {
  return Object.keys(STOCKS).map((symbol) => ({ symbol }));
}

interface StockPageProps {
  params: Promise<{ symbol: string }>;
}

export default async function StockPage({ params }: StockPageProps) {
  const { symbol } = await params;
  const key = symbol.toUpperCase();

  // T12: renamed/legacy symbols get a permanent (308) redirect to the
  // canonical NSE symbol so saved links and share URLs keep working.
  const canonical = resolveTickerSymbol(key);
  if (canonical && canonical !== key) {
    permanentRedirect(`/stock/${encodeURIComponent(canonical)}`);
  }

  const stock = STOCKS[key];

  if (!stock) notFound();

  const consensus = getStockScore(stock);
  // R3: the RSC payload carries ONLY the free (seeker) verdict set. Paid
  // tiers upgrade via GET /api/rishis/[symbol], enforced by getSessionUser.
  // This page is statically prerendered, so the embedded set is the public
  // free set for every visitor — never the full 20.
  const sanitized = sanitizeConsensus(consensus, TIER_CONFIG.seeker.rishisVisible);
  const stockDetail = generateStockDetail(stock);

  // N1 (round 3): every engine call happens here, on the server. The
  // client components below receive RESULTS — the resolved seed-baseline
  // metrics (MetricsPanel overlays live fundamentals with overlaySourced),
  // both QVPS modes, and the knowledge graph for the free verdict set
  // (paid tiers get the tier-aware graph from /api/rishis/[symbol]).
  const resolved = resolveStockMetrics(key);
  const qvpsDual = resolved ? calculateQvpsDual(resolved.metrics) : null;
  const eliteGraph = buildEliteKnowledgeGraph(stock, sanitized.verdicts);

  return (
    <StockPageClient
      stock={stock}
      consensus={sanitized}
      detail={stockDetail}
      resolved={resolved}
      qvpsDual={qvpsDual}
      eliteGraph={eliteGraph}
    />
  );
}
