import { notFound } from 'next/navigation';
import { CRYPTO_ASSETS } from '../../../data/crypto';
import { CryptoDetailClient } from '../../../components/crypto/CryptoDetailClient';

interface Props {
  params: Promise<{ symbol: string }>;
}

export async function generateStaticParams() {
  return CRYPTO_ASSETS.map(asset => ({ symbol: asset.symbol }));
}

export default async function CryptoDetailPage({ params }: Props) {
  const { symbol } = await params;
  const asset = CRYPTO_ASSETS.find(a => a.symbol === symbol);
  if (!asset) notFound();
  return <CryptoDetailClient asset={asset} />;
}