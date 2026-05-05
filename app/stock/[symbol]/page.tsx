'use client';

import { useState, useEffect } from 'react';
import { STOCKS } from '../../../data/stocks';
import { getStockDetail } from '../../../data/stockDetails';
import { buildConsensus } from '../../../lib/consensus';
import { generateDialogueSets } from '../../../lib/wisdom/dialogue';
import { generateWisdomGraph } from '../../../lib/wisdom/graph';
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
import { RishiDialogue } from '../../../components/stock/RishiDialogue';
import { WisdomGraph } from '../../../components/stock/WisdomGraph';
import Link from 'next/link';

interface Props {
  params: Promise<{ symbol: string }>;
}

function StockContent({ symbol }: { symbol: string }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'technicals' | 'dialogue'>('overview');
  
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
  const dialogues = generateDialogueSets(stock, consensus.scores);
  const wisdomGraph = generateWisdomGraph(stock);

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

      {/* Tab Navigation */}
      <div className="border-b border-zinc-800 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { key: 'overview', label: '📊 Overview' },
              { key: 'technicals', label: '📈 Technicals' },
              { key: 'dialogue', label: '🧘 Rishi Dialogue' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: '14px 24px',
                  fontSize: 13,
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  color: activeTab === tab.key ? 'rgb(245, 158, 11)' : 'rgb(161, 161, 170)',
                  background: activeTab === tab.key ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.key ? '2px solid rgb(245, 158, 11)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: 0.5,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
          
          {/* Main Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {activeTab === 'overview' && (
              <>
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

                <PhilosophyRadar scores={consensus.scores} />

                <RishiGrid scores={consensus.scores} />
              </>
            )}

            {activeTab === 'technicals' && detail && (
              <>
                <PriceChart symbol={upper} currentPrice={stock.price} />
                <TechnicalIndicators technicals={detail.technicals} />
                <MetricsPanel stock={stock} />
              </>
            )}

            {activeTab === 'dialogue' && (
              <>
                <div style={{ 
                  padding: 32, 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-primary)', 
                  borderRadius: 12,
                }}>
                  <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>🧘</div>
                  <h2 style={{ 
                    fontFamily: 'Cinzel, serif', 
                    fontSize: 28, 
                    color: 'var(--accent-gold)', 
                    textAlign: 'center',
                    marginBottom: 12,
                    letterSpacing: 2,
                  }}>
                    Rishi Dialogue
                  </h2>
                  <p style={{ 
                    fontSize: 14, 
                    color: 'var(--text-muted)', 
                    textAlign: 'center',
                    maxWidth: 600,
                    margin: '0 auto',
                    lineHeight: 1.7,
                  }}>
                    Watch legendary investors debate {stock.name} based on their actual scoring logic.
                  </p>
                </div>

                <RishiDialogue dialogues={dialogues} />
              </>
            )}
          </div>

          {/* Sidebar: Wisdom Graph (always visible) */}
          <div style={{ position: 'sticky', top: 24, alignSelf: 'flex-start' }}>
            <WisdomGraph graph={wisdomGraph} />
          </div>

        </div>
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