import { notFound } from 'next/navigation';
import { FOREX_PAIRS } from '../../../data/forex';
import { ForexDetailClient } from '../../../components/forex/ForexDetailClient';

export async function generateStaticParams() {
  return FOREX_PAIRS.map(pair => ({
    pair: pair.symbol,
  }));
}

interface PageProps {
  params: Promise<{ pair: string }>;
}

export default async function ForexDetailPage({ params }: PageProps) {
  const { pair } = await params;

  const forexPair = FOREX_PAIRS.find(
    p => p.symbol.toUpperCase() === pair.toUpperCase()
  );

  if (!forexPair) {
    notFound();
  }

  return <ForexDetailClient pair={forexPair} />;
}