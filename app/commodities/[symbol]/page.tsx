import { notFound } from 'next/navigation';
import { COMMODITIES } from '../../../data/markets';
import { CommodityDetailClient } from '../../../components/commodities/CommodityDetailClient';

interface Props {
  params: Promise<{ symbol: string }>;
}

export async function generateStaticParams() {
  return COMMODITIES.map(c => ({ symbol: c.symbol }));
}

export default async function CommodityDetailPage({ params }: Props) {
  const { symbol } = await params;
  const commodity = COMMODITIES.find(c => c.symbol === symbol);
  if (!commodity) notFound();
  return <CommodityDetailClient commodity={commodity} />;
}