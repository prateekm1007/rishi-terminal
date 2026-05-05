'use client';

import { useState, useEffect } from 'react';
import { STOCKS } from '../../../data/stocks';
import { getStockDetail } from '../../../data/stockDetails';
import { buildConsensus } from '../../../lib/consensus';
import { ConsensusHero } from '../../../components/stock/ConsensusHero';
import { MetricsPanel } from '../../../components/stock/MetricsPanel';
import { RishiGrid } from '../../../components/stock/RishiGrid';
import { BullBearBar } from '../../../components/stock/BullBearBar';
import { PhilosophyRadar } from '../../../components/stock/PhilosophyRadar';
import { LivePriceWidget } from '../../../components/stock/LivePriceWidget';
import { PriceChart } from '../../../components/stock/PriceChart';
import { QuarterlyChart } from '../../../components/stock/QuarterlyChart';
import { ShareholdingChart } from '../../../components/stock/ShareholdingChart';
import { PeerComparison } from '../../../components/stock/PeerComparison';
import { AnalystRecommendations } from '../../../components/stock/AnalystRecommendations';
import { TechnicalIndicators } from '../../../components/stock/TechnicalIndicators';
import Link from 'next/link';

interface Props {
  params: Promise<{ symbol: string }>;
}

function StockContent({ symbol }: { symbol: string }) {
  const upper = symbol.toUpperCase();
  const stock = STOCKS[upper as keyof typeof STOCKS];

  if (!stock) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h1 className="text-2xl text-zinc-100 mb-2">Stock Not Found</h1>
          <Link href="/screener" className="text-amber-500 hover:underline">← Back to Screener</Link>
        </div>
      </div>
    );
  }

  const consensus = buildConsensus(stock);
  const detail = getStockDetail(upper);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link href="/screener" className="text-sm text-zinc-500 hover:text-amber-400">← Screener</Link>
                <span className="text-zinc-700">•</span>
                <span className="text-xs px-3 py-1 bg-zinc-800 rounded font-mono">{stock.sector}</span>
              </div>
              <h1 className="text-4xl font-semibold tracking-tight">{stock.name}</h1>
              <div className="text-zinc-500 mt-1 font-mono text-sm">{upper} • {stock.exchange}</div>
            </div>
            <LivePriceWidget symbol={upper} staticPrice={stock.price} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">

        <ConsensusHero 
          consensus={consensus.consensus}
          category={consensus.category}
          tension={consensus.tension}
          tensionSpread={consensus.tensionSpread}
          totalRishis={consensus.scores.length}
          weightedBy={consensus.weightedBy}
        />

        <PriceChart symbol={upper} currentPrice={stock.price} />

        <MetricsPanel stock={stock} />

        <BullBearBar topBull={consensus.topBull} topBear={consensus.topBear} />

        {detail && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuarterlyChart quarterlyResults={detail.quarterlyResults} />
            <ShareholdingChart shareholdingHistory={detail.shareholdingHistory} />
          </div>
        )}

        {detail && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PeerComparison peers={detail.peers} currentStock={stock} />
            <AnalystRecommendations analystRecs={detail.analystRecs} currentPrice={stock.price} />
          </div>
        )}

        {detail && <TechnicalIndicators technicals={detail.technicals} />}

        <PhilosophyRadar scores={consensus.scores} />

        <RishiGrid scores={consensus.scores} />

      </div>
    </main>
  );
}

export default function StockPage({ params }: Props) {
  const [symbol, setSymbol] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setSymbol(p.symbol));
  }, [params]);

  if (!symbol) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 font-mono">Loading...</div>
      </div>
    );
  }

  return <StockContent symbol={symbol} />;
}