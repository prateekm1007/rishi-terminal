import { notFound } from 'next/navigation';
import { STOCKS } from '../../../data/stocks';
import { buildConsensus } from '../../../lib/consensus';
import { generateStockDetail } from '../../../data/stockDetails';
import { adaptStock } from '../../../lib/adapters/stockAdapter';
import { AssetTerminal } from '../../../components/terminal/AssetTerminal';

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

  if (!stock) {
    stock = Object.values(STOCKS).find(
      s => (s.symbol || '').toUpperCase() === key
    ) as any;
  }

  if (!stock) notFound();

  const consensus = buildConsensus(stock);
  const asset = adaptStock(stock);
  const stockDetail = generateStockDetail(stock);

  return (
    <AssetTerminal
      asset={asset}
      consensus={consensus as any}
      detail={{ stockDetail }}
    />
  );
}