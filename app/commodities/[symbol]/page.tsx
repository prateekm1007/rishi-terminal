import { notFound } from 'next/navigation';
import { COMMODITIES } from '../../../data/markets';
import { CommodityDetailClient } from '../../../components/commodities/CommodityDetailClient';

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateStaticParams() {
  return COMMODITIES.map((c) => ({
    symbol: c.symbol,
  }));
}

export default async function CommodityPage({ params }: PageProps) {
  const { symbol } = await params;

  const commodity = COMMODITIES.find(
    (c) => c.symbol.toUpperCase() === symbol.toUpperCase()
  );

  if (!commodity) {
    notFound();
  }

  return <CommodityDetailClient commodity={commodity} />;
}