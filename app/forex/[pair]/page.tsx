import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { FOREX_PAIRS } from '../../../data/forex';
import { ForexDetailClient } from '../../../components/forex/ForexDetailClient';
import { NamespaceProvider } from '../../../components/shared/NamespaceProvider';
import { chart, kg } from '../../../messages/en.json';

// X4 (Round 11): the forex detail tree's namespaces (chart labels +
// knowledge-graph strings) arrive as RSC props — see the homepage's note
// in app/page.tsx.

const SITE = 'https://rishi-terminal.vercel.app';

// U5 (founder round 6): per-pair canonical + Open Graph (bonds had it;
// forex did not). The param is the compact pair symbol (USDINR).
export async function generateMetadata({ params }: { params: Promise<{ pair: string }> }): Promise<Metadata> {
  const { pair } = await params;
  const forexPair = FOREX_PAIRS.find((p) => p.symbol.toUpperCase() === pair.toUpperCase());
  if (!forexPair) {
    return { title: 'Forex pair not found | Rishi Terminal' };
  }
  const title = `${forexPair.name} (${forexPair.symbol}) — forex Rishi consensus | Rishi Terminal`;
  const description = `${forexPair.name} (${forexPair.symbol}) reference rate and currency guru scores — dated reference values, labelled per field.`;
  const url = `${SITE}/forex/${forexPair.symbol}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'article' },
  };
}

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

  return (
    <NamespaceProvider ns={{ chart, kg }}>
      <ForexDetailClient pair={forexPair} />
    </NamespaceProvider>
  );
}