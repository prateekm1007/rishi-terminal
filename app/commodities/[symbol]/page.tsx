import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { COMMODITIES } from '../../../data/markets';
import { CommodityDetailClient } from '../../../components/commodities/CommodityDetailClient';

const SITE = 'https://rishi-terminal.vercel.app';

// U5 (founder round 6): per-asset canonical + Open Graph (bonds had it;
// commodities did not).
export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  const commodity = COMMODITIES.find((c) => c.symbol.toUpperCase() === symbol.toUpperCase());
  if (!commodity) {
    return { title: 'Commodity not found | Rishi Terminal' };
  }
  const title = `${commodity.name} (${commodity.symbol}) — commodity Rishi consensus | Rishi Terminal`;
  const description = `${commodity.name} (${commodity.symbol}) reference price and commodity guru scores — dated reference values, labelled per field.`;
  const url = `${SITE}/commodities/${commodity.symbol}`;
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

  return <CommodityDetailClient commodity={commodity} />;
}