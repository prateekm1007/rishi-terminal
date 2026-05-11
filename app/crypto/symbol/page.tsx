import { notFound } from 'next/navigation';
import { CRYPTO_ASSETS } from '../../../data/crypto';
import { CryptoDetailClient } from '../../../components/crypto/CryptoDetailClient';

export async function generateStaticParams() {
  return CRYPTO_ASSETS.map(a => ({ symbol: a.symbol }));
}

export default function CryptoSymbolPage({ params }: { params: { symbol: string } }) {
  const asset = CRYPTO_ASSETS.find(a => a.symbol === params.symbol.toUpperCase());
  if (!asset) notFound();
  return <CryptoDetailClient asset={asset} />;
}