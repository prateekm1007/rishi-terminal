import { notFound } from 'next/navigation';
import { CRYPTO_ASSETS } from '../../../data/crypto';
import { adaptCrypto } from '../../../lib/adapters/cryptoAdapter';
import { buildUniversalConsensus } from '../../../lib/consensus/universalConsensus';
import { AssetTerminal } from '../../../components/terminal/AssetTerminal';

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateStaticParams() {
  return CRYPTO_ASSETS.map((asset) => ({
    symbol: asset.symbol,
  }));
}

export default async function CryptoDetailPage({ params }: PageProps) {
  const { symbol } = await params;

  const crypto = CRYPTO_ASSETS.find(
    (a) => a.symbol.toUpperCase() === symbol.toUpperCase()
  );

  if (!crypto) {
    notFound();
  }

  const asset = adaptCrypto(crypto);
  const consensus = buildUniversalConsensus(asset);

  return (
    <AssetTerminal
      asset={asset}
      consensus={consensus as any}
      detail={{
        description: `${crypto.name} (${crypto.symbol}) is a ${crypto.sector} cryptocurrency with a market cap of $${(crypto.marketCap / 1e9).toFixed(1)}B.`,
        metadata: {},
      }}
    />
  );
}