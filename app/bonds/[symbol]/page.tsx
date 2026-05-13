import { notFound } from 'next/navigation';
import type { ConsensusResult } from '@/lib/consensus/types';
import { BONDS, getBondBySymbol } from '@/data/bonds';
import { AssetTerminal } from '@/components/terminal/AssetTerminal';
import { adaptBond } from '@/lib/adapters/bondAdapter';

export async function generateStaticParams() {
  return BONDS
    .filter(b => b?.symbol)
    .slice(0, 20)
    .map(b => ({ symbol: b.symbol }));
}

export default function BondDetailPage({ params }: { params: { symbol: string } }) {
  if (!params?.symbol) notFound();

  const bond = getBondBySymbol(params.symbol);
  if (!bond) notFound();

  const asset = adaptBond(bond);

  const consensus: ConsensusResult = {
    asset: bond as any,
    scores: [],
    consensus: 0,
    category: 'Bond',
    tension: '0%',
    tensionSpread: 0,
    weightedBy: 'equal',
    topBull: {
      name: 'N/A', full: 'N/A', label: 'N/A',
      score: 0, origin: 'Global', comps: [], insight: ''
    },
    topBear: {
      name: 'N/A', full: 'N/A', label: 'N/A',
      score: 0, origin: 'Global', comps: [], insight: ''
    },
  };

  return (
    <AssetTerminal
      asset={asset}
      consensus={consensus}
      detail={{
        description: `${bond.name} bond`,
        metadata: {},
      }}
    />
  );
}