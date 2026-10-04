import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CRYPTO_ASSETS } from '../../../data/crypto';
import { CryptoDetailClient } from '../../../components/crypto/CryptoDetailClient';
import { NamespaceProvider } from '../../../components/shared/NamespaceProvider';
import { chart, kg } from '../../../messages/en.json';

// X4 (Round 11): the crypto detail tree's namespaces (chart labels +
// knowledge-graph strings) arrive as RSC props — see the homepage's note
// in app/page.tsx.

const SITE = 'https://rishi-terminal.vercel.app';

// U5 (founder round 6): per-asset canonical + Open Graph — /crypto/BTC was
// canonicalised to /crypto and its og:url was the site root. Each asset now
// names itself exactly once for search and unfurls.
export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  const asset = CRYPTO_ASSETS.find((a) => a.symbol.toUpperCase() === symbol.toUpperCase());
  if (!asset) {
    return { title: 'Crypto asset not found | Rishi Terminal' };
  }
  const title = `${asset.name} (${asset.symbol}) — 3 crypto Rishi consensus | Rishi Terminal`;
  const description = `${asset.name} (${asset.symbol}) through three crypto Rishi lenses — heuristic reference scores, reference price and on-chain analytics, labelled per field.`;
  const url = `${SITE}/crypto/${asset.symbol}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'article' },
  };
}

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

  return (
    <NamespaceProvider ns={{ chart, kg }}>
      <CryptoDetailClient asset={asset} />
    </NamespaceProvider>
  );
}