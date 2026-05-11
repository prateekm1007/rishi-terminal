import { notFound } from 'next/navigation';
import { STOCKS } from '../../../data/stocks';
import { buildConsensus } from '../../../lib/consensus';
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
  let stock = STOCKS[key];

  // Fallback: if object keys differ from stock.symbol, try finding by value
  if (!stock) {
    stock = Object.values(STOCKS).find(s => (s.symbol || "").toUpperCase() === key) as any;
  }

  if (!stock) notFound();

  const consensus = buildConsensus(stock);
  const detail = generateStockDetail(stock);

  return <StockPageClient stock={stock} consensus={consensus} detail={detail} />;
}