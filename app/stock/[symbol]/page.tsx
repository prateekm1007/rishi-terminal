import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { STOCKS } from '../../../data/stocks';
import { getStockScore, resolveStockMetrics, calculateQvpsDual } from '@/lib/scoring'; // T10: single scoring surface
import { sanitizeConsensus } from '@/lib/consensus/sanitize';
import { buildEliteKnowledgeGraph } from '@/lib/consensus/eliteGraph';
import { resolveTickerSymbol } from '@/lib/registry/registryAudit'; // T12: ticker aliases (seed-validated server path)
import { generateStockDetail } from '../../../data/stockDetails';
import { serveCachedQuotes } from '@/lib/quotePath'; // X3+Y1+Y2: SSR peek — the last cached quotes, read-only
import { marketState } from '@/lib/marketHours'; // Y3: server-disclosed NSE state for the observation label
import { isBuildPhase, toPriceData, type InitialPriceEntry } from '@/lib/dashboardSnapshot'; // Y1: builds fetch nothing, hermetically; Y2: peer entries
import { StockPageClient } from '../../../components/stock/StockPageClient';
import { InsufficientDataRecord } from '../../../components/stock/InsufficientDataRecord';

// Y1 (Round 12): stock pages are ISR again (revalidate 60 s). The X3
// force-dynamic render answered the W5 stale-bake defect by making every
// first byte pay a server render — the measured cost on production was
// warm page TTFB p95 ~0.36 s (above the 300 ms acceptance), with
// cache-control: no-store on every response. The Y1 contract:
//   - the 916-page universe pre-renders at build (generateStaticParams);
//   - the build phase fetches NOTHING (CI has no database) — the bake
//     carries the honest "price unavailable" state;
//   - every ISR regeneration (at most 60 s apart, under traffic) re-peeks
//     the shared quote cache for this symbol AND its peers (Y2: ONE
//     batch read, never a vendor fetch) so the served HTML carries the
//     last cached observations with their own "as of" labels;
//   - the client hook still refreshes on mount (its /api/prices call is
//     what warms the cache).
// A stale or missing observation is LABELLED as such by the tile (X3
// states; Y3 honest labels) — never presented as fresh (Rule 3).


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

export const revalidate = 60;

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

  // Round-5 audit (findings 1, 8): an internally inconsistent record
  // (impossible P/E-0-with-profit etc.) renders NO scored surface — no
  // verdicts, no QVPS, no debate graph, no technical-edge signals.
  // Rankings were gated in this same round; this gates the page itself.
  if (consensus.dataQuality === 'INCOMPLETE') {
    return <InsufficientDataRecord stock={stock} />;
  }

  // Commit M3 (free access): the RSC payload carries the FULL verdict set
  // for every visitor — the seeker slice and the paid upgrade path are
  // gone. The embedded set is the complete council, publicly, for everyone.
  const sanitized = sanitizeConsensus(consensus);
  const stockDetail = generateStockDetail(stock);

  // N1 (round 3): every engine call happens here, on the server. The
  // client components below receive RESULTS — the resolved seed-baseline
  // metrics (MetricsPanel overlays live fundamentals with overlaySourced),
  // both QVPS modes, and the knowledge graph for the FULL verdict set.
  const resolved = resolveStockMetrics(key);
  const qvpsDual = resolved ? calculateQvpsDual(resolved.metrics) : null;
  const eliteGraph = buildEliteKnowledgeGraph(stock, sanitized.verdicts);

  // X3+Y1+Y2: the SSR price peek — ONE read-only batch read of the shared
  // quote cache at ISR REGENERATION (skipped in the build phase: builds
  // fetch nothing, hermetically) covering the symbol AND its comparison
  // peers, so the peer table prices exist in the first byte instead of
  // “—” (the founder's Y2 defect list). Misses are omitted and the client
  // hook fills them (its /api/prices call also warms the cache).
  const peerSymbols = stockDetail.peers.map((p) => p.symbol);
  const peeked = isBuildPhase() ? {} : await serveCachedQuotes([key, ...peerSymbols]);
  const initialQuote = peeked[key] ?? null;
  // Y2 follow-up: the SELF symbol stays in the mapped peer prices too — the
  // peer table's highlighted self row renders the same cached observation
  // the hero shows, instead of "—" until client hydration. One peek, one
  // mapping, no second read; misses are still omitted (honest "—").
  const initialPeerPrices: Record<string, InitialPriceEntry> = {};
  for (const [sym, q] of Object.entries(peeked)) {
    const mapped = toPriceData(q);
    if (mapped) initialPeerPrices[sym] = mapped;
  }

  // Y3: the NSE session state at regeneration, frozen into the ISR HTML
  // and refreshed on the next regen (same lifecycle as the quote peek).
  // Pure computation (no I/O) — safe in the build phase, where it bakes
  // the build-time state until the first regeneration replaces it.
  const initialMarket = marketState();

  return (
    <StockPageClient
      stock={stock}
      consensus={sanitized}
      detail={stockDetail}
      resolved={resolved}
      qvpsDual={qvpsDual}
      eliteGraph={eliteGraph}
      initialQuote={initialQuote}
      initialPeerPrices={initialPeerPrices}
      initialMarket={initialMarket}
    />
  );
}
