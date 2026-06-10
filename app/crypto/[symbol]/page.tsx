import { notFound } from 'next/navigation';
import { CRYPTO_ASSETS } from '../../../data/crypto';
import { CryptoDetailClient } from '../../../components/crypto/CryptoDetailClient';

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateStaticParams() {
  return CRYPTO_ASSETS.map((a) => ({
    symbol: a.symbol,
  }));
}

export default async function CryptoPage({ params }: PageProps) {
  const { symbol } = await params;

  const asset = CRYPTO_ASSETS.find(
    (a) => a.symbol.toUpperCase() === symbol.toUpperCase()
  );

  if (!asset) {
    notFound();
  }

  return <CryptoDetailClient asset={asset} />;
}