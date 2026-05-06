'use client';

import { useState } from 'react';
import { Stock } from '../../lib/types';
import { ConsensusResult } from '../../lib/consensus/types';
import { ConsensusHero }          from './ConsensusHero';
import { RishiGrid }              from './RishiGrid';
import { BullBearBar }            from './BullBearBar';
import { PhilosophyRadar }        from './PhilosophyRadar';
import { MetricsPanel }           from './MetricsPanel';
import { LivePriceWidget }        from './LivePriceWidget';
import { PriceChart }             from './PriceChart';
import { TechnicalIndicators }    from './TechnicalIndicators';
import { PeerComparison }         from './PeerComparison';
import { AnalystRecommendations } from './AnalystRecommendations';
import { QuarterlyChart }         from './QuarterlyChart';
import { ShareholdingChart }      from './ShareholdingChart';
import { WisdomSidebar }          from './WisdomSidebar';

interface Props {
  stock: Stock;
  consensus: ConsensusResult;
  detail: any;
}

const TABS = [
  { id: 'overview',   label: 'Overview',         icon: '📊' },
  { id: 'technical',  label: 'Technical Analysis', icon: '📈' },
  { id: 'rishi',      label: 'Rishi Wisdom',      icon: '🧘' },
];

export function StockPageClient({ stock, consensus, detail }: Props) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '24px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* ── Header ────────────────────────────────────────── */}
        <div className="wisdom-reveal" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {stock.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span style={{ fontFamily: 'monospace', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', padding: '2px 8px', borderRadius: '4px', color: 'var(--accent-gold)' }}>
                  {stock.symbol}
                </span>
                <span>•</span>
                <span>{stock.sector}</span>
                <span>•</span>
                <span>{stock.exchange}</span>
              </div>
            </div>
            <LivePriceWidget stock={stock} />
          </div>

          {/* Consensus Hero */}
          <ConsensusHero consensus={consensus} />
        </div>

        {/* ── Tab Bar ───────────────────────────────────────── */}
        <div className="wisdom-reveal-delay-1" style={{ borderBottom: '1px solid var(--border-primary)', marginBottom: '24px', display: 'flex', gap: '0' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                fontSize: '13px',
                fontWeight: 500,
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-gold)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--accent-gold)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab Content ───────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>

          {/* Main Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <>
                <div className="wisdom-reveal"><MetricsPanel stock={stock} /></div>
                <div className="wisdom-reveal-delay-1"><PriceChart stock={stock} /></div>
                <div className="wisdom-reveal-delay-2"><PeerComparison stock={stock} peers={detail.peers} /></div>
                <div className="wisdom-reveal-delay-2"><QuarterlyChart quarters={detail.quarterlyResults} /></div>
                <div className="wisdom-reveal-delay-3"><ShareholdingChart history={detail.shareholdingHistory} /></div>
                <div className="wisdom-reveal-delay-3"><AnalystRecommendations recommendations={detail.analystRecs} currentPrice={stock.price} /></div>
              </>
            )}

            {/* TECHNICAL TAB */}
            {activeTab === 'technical' && (
              <>
                <div className="wisdom-reveal"><PriceChart stock={stock} /></div>
                <div className="wisdom-reveal-delay-1"><TechnicalIndicators stock={stock} /></div>
              </>
            )}

            {/* RISHI WISDOM TAB */}
            {activeTab === 'rishi' && (
              <>
                <div className="wisdom-reveal"><BullBearBar topBull={consensus.topBull} topBear={consensus.topBear} spread={consensus.tensionSpread} /></div>
                <div className="wisdom-reveal-delay-1"><PhilosophyRadar scores={consensus.scores} /></div>
                <div className="wisdom-reveal-delay-2"><RishiGrid scores={consensus.scores} /></div>
              </>
            )}

          </div>

          {/* Sidebar Column — always visible */}
          <div>
            <div className="wisdom-reveal-delay-2" style={{ position: 'sticky', top: '24px' }}>
              <WisdomSidebar stock={stock} scores={consensus.scores} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}