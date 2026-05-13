import { notFound } from 'next/navigation';
import { FOREX_PAIRS } from '../../../data/forex';
import { adaptForex } from '../../../lib/adapters/forexAdapter';
import { buildUniversalConsensus } from '../../../lib/consensus/universalConsensus';
import { AssetTerminal } from '../../../components/terminal/AssetTerminal';

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

  const asset = adaptForex(forexPair);
  const consensus = buildUniversalConsensus(asset);

  return (
    <AssetTerminal
      asset={asset}
      consensus={consensus as any}
      detail={{
        description: `${forexPair.name} is trading at ${forexPair.spotRate.toFixed(4)} with a 24h change of ${forexPair.change24h >= 0 ? '+' : ''}${forexPair.change24h.toFixed(2)}%.`,
        metadata: {},
      }}
    />
  );
}