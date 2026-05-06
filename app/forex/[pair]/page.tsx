import { notFound } from 'next/navigation';
import { FOREX_PAIRS } from '../../../data/forex';
import { ForexDetailClient } from '../../../components/forex/ForexDetailClient';

interface Props {
  params: Promise<{ pair: string }>;
}

export async function generateStaticParams() {
  return Object.keys(FOREX_PAIRS).map(pair => ({ pair }));
}

export default async function ForexDetailPage({ params }: Props) {
  const { pair } = await params;
  const pairData = FOREX_PAIRS[pair as keyof typeof FOREX_PAIRS];
  if (!pairData) notFound();
  return <ForexDetailClient pair={pairData} />;
}