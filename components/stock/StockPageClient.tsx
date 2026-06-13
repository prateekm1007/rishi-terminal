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
import { QuarterlyChart }         from './QuarterlyChart';
import { ShareholdingChart }      from './ShareholdingChart';
import { WisdomSidebar }          from './WisdomSidebar';
import { KnowledgeGraphView }     from './KnowledgeGraphView';
import { useLanguage } from '../../lib/language';
import RishiScoreDual             from '../score/RishiScoreDual';
import { calculateDualScore }     from '../../lib/scorers/rishiScoreV2';
import type { StockMetrics }      from '../../lib/scorers/types';
import { useFundamentals } from '../../hooks/useFundamentals';

interface Props {
  stock: Stock;
  consensus: ConsensusResult;
  detail: any;
}

export function StockPageClient({ stock, consensus, detail }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showGraph, setShowGraph] = useState(false);
  const { t } = useLanguage();
  const { fundamentals: liveFundamentals } = useFundamentals(stock.symbol);

  const TABS = [
    { id: 'overview',  label: t('stock.overview'),   desc: t('stock.overviewDesc')   },
    { id: 'technical', label: t('stock.technicals'),  desc: t('stock.technicalsDesc') },
    { id: 'wisdom',    label: t('stock.rishiWisdom'), desc: t('stock.wisdomDesc')     },
  ];

  const scoreColor = (s: number) =>
    s >= 75 ? '#22C55E' : s >= 55 ? '#D4AF37' : s >= 35 ? '#f59e0b' : '#EF4444';

  const scoreBg = (s: number) =>
    s >= 75 ? 'rgba(0,186,124,0.1)' : s >= 55 ? 'rgba(255,215,0,0.1)' : s >= 35 ? 'rgba(245,158,11,0.1)' : 'rgba(244,33,46,0.1)';

  return (
    <div className="rishi-page">

      {/* Knowledge Graph Floating Button */}
      <button
        onClick={() => setShowGraph(true)}
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #D4AF37, #FFA500)',
          border: 'none',
          boxShadow: '0 8px 24px rgba(255,215,0,0.4)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(255,215,0,0.6)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(255,215,0,0.4)';
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
          <line x1="9" y1="7" x2="9.5" y2="10" />
          <line x1="15" y1="7" x2="14.5" y2="10" />
          <line x1="9" y1="17" x2="9.5" y2="14" />
          <line x1="15" y1="17" x2="14.5" y2="14" />
        </svg>
        <span style={{ fontSize: 8, fontWeight: 700, color: '#000', marginTop: 2, letterSpacing: 0.5 }}>
          {t('stock.graph')}
        </span>
      </button>

      {/* Knowledge Graph Modal */}
      {showGraph && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            width: '100%',
            maxWidth: 1400,
            maxHeight: '90vh',
            background: '#0A0F1C',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 28px',
              borderBottom: '1px solid rgba(30,41,59,0.8)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-secondary)',
            }}>
              <div>
                <h2 className="philosophy-heading" style={{ fontSize: 20, color: '#D4AF37', marginBottom: 4 }}>
                  {t('stock.knowledgeGraph')}
                </h2>
                <p style={{ fontSize: 11, color: '#64748B', letterSpacing: 1 }}>
                  {stock.name}  —  {t('stock.graphSubtitle')}
                </p>
              </div>
              <button
                onClick={() => setShowGraph(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(30,41,59,0.8)',
                  color: '#F8FAFC',
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = '#EF4444';
                  (e.currentTarget as HTMLElement).style.borderColor = '#EF4444';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(30,41,59,0.8)';
                }}
              >
                x
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 28, overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>
              <KnowledgeGraphView stock={stock} consensus={consensus} />
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <h1 className="philosophy-heading" style={{ fontSize: 28, color: '#D4AF37', letterSpacing: 2 }}>
                  {stock.name}
                </h1>
                <span style={{
                  fontFamily: 'monospace', fontSize: 11,
                  padding: '3px 8px',
                  background: 'rgba(255,215,0,0.1)',
                  border: '1px solid rgba(255,215,0,0.3)',
                  borderRadius: 4,
                  color: '#D4AF37',
                  letterSpacing: 1,
                }}>
                  {stock.symbol}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748B', letterSpacing: 1, fontFamily: 'monospace' }}>
                <span>{stock.sector}</span>
                <span style={{ color: 'rgba(30,41,59,0.8)' }}>|</span>
                <span>{stock.exchange}</span>
                <span style={{ color: 'rgba(30,41,59,0.8)' }}>|</span>
                <span style={{ color: scoreColor(consensus.consensus), fontWeight: 600 }}>
                  {t('stock.consensus')}: {consensus.consensus}/100
                </span>
              </div>
            </div>
            <LivePriceWidget stock={stock} />
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{
        borderBottom: '1px solid rgba(30,41,59,0.8)',
        background: 'var(--bg-secondary)',
        position: 'sticky', top: 0, zIndex: 30,
      }}>
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
                  borderBottom: activeTab === tab.id ? '2px solid #D4AF37' : '2px solid transparent',
                  color: activeTab === tab.id ? '#D4AF37' : '#64748B',
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

      {/* Tab Content */}
      <div className="content-wrapper" style={{ padding: '28px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

          {/* Main Column */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {activeTab === 'overview' && (
              <>
                <div className="wisdom-reveal">
                  <ConsensusHero consensus={consensus} />
                </div>

                <div className="wisdom-reveal-delay-1">
                  {(() => {
                    const metrics: StockMetrics = {
                      symbol: stock.symbol, name: stock.name, sector: stock.sector,
                      pe: liveFundamentals?.pe ?? stock.pe, pb: stock.price / (liveFundamentals?.bookValue ?? stock.bvps),
                      roe: liveFundamentals?.roe ?? stock.roe, roce: liveFundamentals?.roce ?? stock.roce, opm: stock.opm,
                      debtToEquity: stock.de, revenueCAGR3Y: stock.revcagr,
                      epsCAGR3Y: stock.epscagr, promoterHolding: stock.promo,
                      marketCap: liveFundamentals?.marketCap ? liveFundamentals.marketCap / 10000000 : stock.mktcap, fcfMargin: (stock.fcf / stock.rev) * 100,
                    };
                    return <RishiScoreDual metrics={metrics} />;
                  })()}
                </div>

                <div className="wisdom-reveal-delay-1">
                  <MetricsPanel stock={stock} />
                </div>

                <div className="wisdom-reveal-delay-2 card-sacred" style={{ padding: 24, position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
                    borderRadius: '12px 12px 0 0',
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <div className="philosophy-heading" style={{ fontSize: 13, color: '#64748B', letterSpacing: 2 }}>
                        {t('stock.topRishiScores')}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, opacity: 0.7 }}>
                        {t('stock.topRishiSubtitle')}
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('wisdom')}
                      style={{
                        background: 'rgba(255,215,0,0.08)',
                        border: '1px solid rgba(255,215,0,0.25)',
                        color: '#D4AF37',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontFamily: 'monospace',
                        letterSpacing: 1,
                        padding: '6px 14px',
                        borderRadius: 6,
                      }}
                    >
                      {t('stock.viewAll20')}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {consensus.scores.slice(0, 6).map((r, i) => (
                      <div key={r.name} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '14px 16px',
                        background: scoreBg(r.score),
                        border: '1px solid ' + scoreColor(r.score) + '22',
                        borderRadius: 10,
                        transition: 'all 0.2s ease',
                      }}>
                        <div style={{
                          fontSize: 11,
                          color: '#64748B',
                          fontFamily: 'monospace',
                          width: 20,
                          flexShrink: 0,
                        }}>
                          #{i + 1}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                            {r.full}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                            {r.label}
                          </div>
                        </div>

                        <div style={{ width: 100, flexShrink: 0 }}>
                          <div style={{ height: 4, background: 'rgba(30,41,59,0.8)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              width: r.score + '%',
                              height: '100%',
                              background: scoreColor(r.score),
                              borderRadius: 3,
                              transition: 'width 0.8s ease',
                            }} />
                          </div>
                        </div>

                        <div style={{
                          fontSize: 22,
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          color: scoreColor(r.score),
                          width: 40,
                          textAlign: 'right',
                          flexShrink: 0,
                        }}>
                          {r.score}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="wisdom-reveal-delay-2">
                  <PeerComparison stock={stock} peers={detail.peers} />
                </div>
</>
            )}

            {activeTab === 'technical' && (
              <>
                <div className="wisdom-reveal">
                  <PriceChart stock={stock} />
                </div>

                <div className="wisdom-reveal-delay-1">
                  <TechnicalIndicators stock={stock} />
                </div>

                <div className="wisdom-reveal-delay-2">
                  <QuarterlyChart quarters={detail.quarterlyResults} />
                </div>

                <div className="wisdom-reveal-delay-2">
                  <ShareholdingChart history={detail.shareholdingHistory} />
                </div>
              </>
            )}

            {activeTab === 'wisdom' && (
              <>
                <div className="wisdom-reveal">
                  <BullBearBar
                    topBull={consensus.topBull}
                    topBear={consensus.topBear}
                    spread={consensus.tensionSpread}
                  />
                </div>

                <div className="wisdom-reveal-delay-1">
                  <PhilosophyRadar scores={consensus.scores} />
                </div>

                <div className="wisdom-reveal-delay-2">
                  <RishiGrid scores={consensus.scores} />
                </div>
              </>
            )}

          </div>

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
