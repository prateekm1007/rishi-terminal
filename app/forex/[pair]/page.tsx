import { notFound } from 'next/navigation';
import { FOREX_PAIRS } from '../../../data/forex';
import { ForexDetailClient } from '../../../components/forex/ForexDetailClient';

interface Props {
  params: Promise<{ pair: string }>;
}

export async function generateStaticParams() {
  return FOREX_PAIRS.map(p => ({ pair: p.symbol }));
}

export default async function ForexDetailPage({ params }: Props) {
  const { pair } = await params;
  const pairData = FOREX_PAIRS.find(p => p.symbol === pair);
  if (!pairData) notFound();
  return <ForexDetailClient pair={pairData} />;
}
