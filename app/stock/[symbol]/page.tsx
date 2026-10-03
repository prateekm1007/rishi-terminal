import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { STOCKS } from '../../../data/stocks';
import { getStockScore, resolveStockMetrics, calculateQvpsDual } from '@/lib/scoring'; // T10: single scoring surface
import { sanitizeConsensus } from '@/lib/consensus/sanitize';
import { buildEliteKnowledgeGraph } from '@/lib/consensus/eliteGraph';
import { resolveTickerSymbol } from '@/lib/registry/registryAudit'; // T12: ticker aliases (seed-validated server path)
import { peekCachedQuote } from '@/lib/quoteCache'; // X3: read-only cache peek
import { cachedQuoteToEntry } from '@/lib/dashboardSnapshot'; // X3: cache row → wire entry
import { generateStockDetail } from '../../../data/stockDetails';
import { StockPageClient } from '../../../components/stock/StockPageClient';
import { InsufficientDataRecord } from '../../../components/stock/InsufficientDataRecord';


// Round-5 audit (finding 18): every stock page shared the site-default
// <title> — 916 pages of duplicated metadata. Each page now names its
// stock, sector and headline scores. Follow-up: INCOMPLETE records get a
// title/description that matches the insufficient-data page they render —
// the metadata must not promise scores the page no longer shows.
// Audit M6/B.3 (retest 2026-10-02): per-symbol canonical + Open Graph —
// aliases 308 to the canonical symbol, and the canonical link makes each
// company exactly one indexable URL; og gives WhatsApp/X/LinkedIn unfurls.
export async function generateMetadata({ params }: StockPageProps): Promise<Metadata> {
  const { symbol } = await params;
  const key = symbol.toUpperCase();
  const canonicalSym = resolveTickerSymbol(key) ?? key;
  const stock = STOCKS[canonicalSym];
  if (!stock) {
    return { title: `Stock not found | Rishi Terminal` };
  }
  // Percent-encode: J&KBANK/M&M/M&MFIN carry & — the encoded canonical
  // matches the sitemap URL form exactly (both forms serve the same page).
  const ogUrl = `/stock/${encodeURIComponent(canonicalSym)}`;
  if (getStockScore(stock).dataQuality === "INCOMPLETE") {
    const title = `${stock.name} (${canonicalSym}) — insufficient data | Rishi Terminal`;
    const description = `${stock.name} (${canonicalSym}, ${stock.sector}) has internally inconsistent fundamentals — no scores or verdicts are produced for this record. Listed for universe completeness.`;
    return {
      title,
      description,
      alternates: { canonical: ogUrl },
      openGraph: { title, description, url: ogUrl, type: "article" },
    };
  }
  const title = `${stock.name} (${canonicalSym}) — Rishi scores & fundamentals | Rishi Terminal`;
  const description = `${stock.name} (${canonicalSym}, ${stock.sector}) analysed through 20 Rishi frameworks — consensus score, QVPS pillars, valuation and quality metrics. Illustrative seed data, labelled per field.`;
  return {
    title,
    description,
    alternates: { canonical: ogUrl },
    openGraph: { title, description, url: ogUrl, type: "article" },
  };
}

interface StockPageProps {
  params: Promise<{ symbol: string }>;
}

// X3 (founder round 11): the stock page renders PER REQUEST so the first
// byte carries the last cached quote from the shared quote_cache — a cheap
// read-only peek (no refresh claim, no upstream fetch). Previously the page
// was statically prerendered and the price tile baked "⟳ FETCHING —" into
// every one of the 916 first bytes; the price only appeared after the
// client's fetch round-trip. Cache infrastructure failure or a cold row
// renders the honest unavailable state — never a placeholder, never a
// fabricated number (Rules 3/16). The build stays hermetic: dynamic pages
// render nothing at build time.
export const dynamic = 'force-dynamic';

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

  // Round-5 audit (findings 1, 8): an internally inconsistent record
  // (impossible P/E-0-with-profit etc.) renders NO scored surface — no
  // verdicts, no QVPS, no debate graph, no technical-edge signals.
  // Rankings were gated in this same round; this gates the page itself.
  if (consensus.dataQuality === 'INCOMPLETE') {
    return <InsufficientDataRecord stock={stock} />;
  }

  // Commit M3 (free access): the RSC payload carries the FULL verdict set
  // for every visitor — the seeker slice and the paid upgrade path are
  // gone. The page is statically prerendered; the embedded set is the
  // complete council, publicly, for everyone.
  const sanitized = sanitizeConsensus(consensus);
  const stockDetail = generateStockDetail(stock);

  // N1 (round 3): every engine call happens here, on the server. The
  // client components below receive RESULTS — the resolved seed-baseline
  // metrics (MetricsPanel overlays live fundamentals with overlaySourced),
  // both QVPS modes, and the knowledge graph for the FULL verdict set.
  const resolved = resolveStockMetrics(key);
  const qvpsDual = resolved ? calculateQvpsDual(resolved.metrics) : null;
  const eliteGraph = buildEliteKnowledgeGraph(stock, sanitized.verdicts);

  // X3: the last cached quote (read-only peek) rides into the RSC payload so
  // the price tile's FIRST BYTE shows a real observation with its honest
  // CACHED/DELAYED label — or nothing at all when the cache cannot serve
  // one (the tile then renders the honest unavailable state, never
  // "FETCHING"). The client still revalidates on mount through the normal
  // API path.
  const initialEntry = cachedQuoteToEntry(await peekCachedQuote(key));

  return (
    <StockPageClient
      stock={stock}
      consensus={sanitized}
      detail={stockDetail}
      resolved={resolved}
      qvpsDual={qvpsDual}
      eliteGraph={eliteGraph}
      initialPrice={initialEntry}
    />
  );
}
