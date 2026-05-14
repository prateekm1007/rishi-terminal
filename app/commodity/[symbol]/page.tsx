import { notFound } from 'next/navigation';
import { COMMODITIES } from '../../../data/markets';
import { adaptCommodity } from '../../../lib/adapters/commodityAdapter';
import { buildUniversalConsensus } from '../../../lib/consensus/universalConsensus';
import { AssetTerminal } from '../../../components/terminal/AssetTerminal';

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

  const asset = adaptCommodity(commodity);
  const consensus = buildUniversalConsensus(asset);

  return (
    <AssetTerminal
      asset={asset}
      consensus={consensus as any}
      detail={{
        description: `${commodity.name} is a ${commodity.category} commodity trading at ${commodity.price}${commodity.unit}.`,
        metadata: {},
      }}
    />
  );
}