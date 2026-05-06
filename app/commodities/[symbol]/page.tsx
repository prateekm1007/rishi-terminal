import { notFound } from 'next/navigation';
import { COMMODITIES } from '../../../data/markets';
import { CommodityDetailClient } from '../../../components/commodities/CommodityDetailClient';

interface Props {
  params: { symbol: string };
}

export async function generateStaticParams() {
  return COMMODITIES.map(c => ({ symbol: c.symbol }));
}

export default function CommodityDetailPage({ params }: Props) {
  const commodity = COMMODITIES.find(c => c.symbol === params.symbol);
  if (!commodity) notFound();

  return <CommodityDetailClient commodity={commodity} />;
}