import { notFound, permanentRedirect } from 'next/navigation';
import { STOCKS } from '../../../data/stocks';
import { getStockScore } from '@/lib/scoring'; // T10: single scoring surface
import { resolveTickerSymbol } from '@/lib/registry/tickerRegistry'; // T12: ticker aliases
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
  const stockDetail = generateStockDetail(stock);

  return (
    <StockPageClient
      stock={stock}
      consensus={consensus}
      detail={stockDetail}
    />
  );
}