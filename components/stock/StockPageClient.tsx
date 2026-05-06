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
  { id: 'overview',  label: 'Overview',      desc: 'Fundamentals & Consensus' },
  { id: 'technical', label: 'Technicals',    desc: 'Price Action & Indicators' },
  { id: 'wisdom',    label: 'Rishi Wisdom',  desc: 'All 20 Philosopher Scores' },
];

export function StockPageClient({ stock, consensus, detail }: Props) {
  const [activeTab, setActiveTab] = useState('overview');

  const scoreColor = (s: number) =>
    s >= 75 ? 'var(--accent-green)' : s >= 55 ? 'var(--accent-gold)' : 'var(--accent-red)';

  const scoreBg = (s: number) =>
    s >= 75 ? 'rgba(0,186,124,0.1)' : s >= 55 ? 'rgba(255,215,0,0.1)' : 'rgba(244,33,46,0.1)';

  return (
    <div className="page-container">

      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <h1 className="philosophy-heading" style={{ fontSize: 28, color: 'var(--accent-gold)', letterSpacing: 2 }}>
                  {stock.name}
                </h1>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  padding: '3px 8px',
                  background: 'rgba(255,215,0,0.1)',
                  border: '1px solid rgba(255,215,0,0.3)',
                  borderRadius: 4,
                  color: 'var(--accent-gold)',
                  letterSpacing: 1,
                }}>
                  {stock.symbol}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', letterSpacing: 1, fontFamily: 'monospace' }}>
                <span>{stock.sector}</span>
                <span style={{ color: 'var(--border-primary)' }}>|</span>
                <span>{stock.exchange}</span>
                <span style={{ color: 'var(--border-primary)' }}>|</span>
                <span style={{ color: scoreColor(consensus.consensus), fontWeight: 600 }}>
                  Consensus: {consensus.consensus}/100
                </span>
              </div>
            </div>
            <LivePriceWidget stock={stock} />
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div className="content-wrapper">
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '16px 32px',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--accent-gold)' : '2px solid transparent',
                  color: activeTab === tab.id ? 'var(--accent-gold)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  letterSpacing: activeTab === tab.id ? '1px' : '0.5px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 2,
                }}
              >
                <span>{tab.label}</span>
                <span style={{ fontSize: 9, letterSpacing: 0.5, opacity: 0.6, fontWeight: 400 }}>
                  {tab.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="content-wrapper" style={{ padding: '28px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

          {/* ── Main Column ── */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ══════════════════════════════════
                TAB 1: OVERVIEW
                Consensus + Metrics + Chart + Peers + Analyst
                ══════════════════════════════════ */}
            {activeTab === 'overview' && (
              <>
                {/* Consensus Score Hero */}
                <div className="wisdom-reveal">
                  <ConsensusHero consensus={consensus} />
                </div>

                {/* Key Fundamentals */}
                <div className="wisdom-reveal-delay-1">
                  <MetricsPanel stock={stock} />
                </div>

                {/* Price Chart */}
                <div className="wisdom-reveal-delay-1">
                  <PriceChart stock={stock} />
                </div>

                {/* Top 6 Rishi Snapshot */}
                <div className="wisdom-reveal-delay-2 card-sacred" style={{ padding: 24, position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)',
                    borderRadius: '12px 12px 0 0',
                  }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div className="philosophy-heading" style={{ fontSize: 13, color: 'var(--text-muted)', letterSpacing: 2 }}>
                      TOP RISHI SCORES
                    </div>
                    <button
                      onClick={() => setActiveTab('wisdom')}
                      style={{
                        background: 'none', border: 'none',
                        color: 'var(--accent-gold)', cursor: 'pointer',
                        fontSize: 11, fontFamily: 'monospace', letterSpacing: 1,
                      }}
                    >
                      VIEW ALL 20 →
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                    {consensus.scores.slice(0, 6).map(r => (
                      <div key={r.name} style={{
                        padding: '14px 12px',
                        background: scoreBg(r.score),
                        border: `1px solid ${scoreColor(r.score)}33`,
                        borderRadius: 8,
                        transition: 'all 0.2s ease',
                      }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'monospace' }}>
                          {r.full}
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace', color: scoreColor(r.score), lineHeight: 1 }}>
                          {r.score}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, letterSpacing: 0.5 }}>
                          {r.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Peer Comparison */}
                <div className="wisdom-reveal-delay-2">
                  <PeerComparison stock={stock} peers={detail.peers} />
                </div>

                {/* Analyst Recommendations */}
                <div className="wisdom-reveal-delay-3">
                  <AnalystRecommendations recommendations={detail.analystRecs} currentPrice={stock.price} />
                </div>
              </>
            )}

            {/* ══════════════════════════════════
                TAB 2: TECHNICALS
                Price + Indicators + Quarterly + Shareholding
                ══════════════════════════════════ */}
            {activeTab === 'technical' && (
              <>
                {/* Price Chart - full focus here */}
                <div className="wisdom-reveal">
                  <PriceChart stock={stock} />
                </div>

                {/* Technical Indicators */}
                <div className="wisdom-reveal-delay-1">
                  <TechnicalIndicators stock={stock} />
                </div>

                {/* Quarterly Results */}
                <div className="wisdom-reveal-delay-2">
                  <QuarterlyChart quarters={detail.quarterlyResults} />
                </div>

                {/* Shareholding Pattern */}
                <div className="wisdom-reveal-delay-2">
                  <ShareholdingChart history={detail.shareholdingHistory} />
                </div>
              </>
            )}

            {/* ══════════════════════════════════
                TAB 3: RISHI WISDOM
                Bull/Bear + Radar + All 20 Rishis
                ══════════════════════════════════ */}
            {activeTab === 'wisdom' && (
              <>
                {/* Bull vs Bear */}
                <div className="wisdom-reveal">
                  <BullBearBar
                    topBull={consensus.topBull}
                    topBear={consensus.topBear}
                    spread={consensus.tensionSpread}
                  />
                </div>

                {/* Consensus Tension Summary */}
                <div className="wisdom-reveal-delay-1 card-sacred" style={{ padding: 20, position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)',
                    borderRadius: '12px 12px 0 0',
                  }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 6 }}>CONSENSUS</div>
                      <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'monospace', color: scoreColor(consensus.consensus) }}>
                        {consensus.consensus}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{consensus.category}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 6 }}>TENSION</div>
                      <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'monospace', color: consensus.tensionSpread > 40 ? 'var(--accent-red)' : 'var(--accent-gold)' }}>
                        {consensus.tensionSpread}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{consensus.tension}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 6 }}>TOP BULL</div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-green)', marginTop: 6 }}>
                        {consensus.topBull?.score ?? '--'}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{consensus.topBull?.name ?? '--'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 6 }}>TOP BEAR</div>
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-red)', marginTop: 6 }}>
                        {consensus.topBear?.score ?? '--'}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{consensus.topBear?.name ?? '--'}</div>
                    </div>
                  </div>
                </div>

                {/* Philosophy Radar Chart */}
                <div className="wisdom-reveal-delay-1">
                  <PhilosophyRadar scores={consensus.scores} />
                </div>

                {/* All 20 Rishi Cards */}
                <div className="wisdom-reveal-delay-2">
                  <RishiGrid scores={consensus.scores} />
                </div>
              </>
            )}

          </div>

          {/* ── Sticky Wisdom Sidebar ── */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div className="wisdom-reveal-delay-2">
              <WisdomSidebar stock={stock} scores={consensus.scores} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}