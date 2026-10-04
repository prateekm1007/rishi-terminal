'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Stock, RishiScore } from '../../lib/types';
import type { SanitizedConsensus } from '../../lib/consensus/sanitize';
import type { ResolvedStockMetrics } from '@/lib/scoring';
import type { EliteKnowledgeGraph } from '../../lib/consensus/eliteGraph';
import { ConsensusHero }          from './ConsensusHero';
import { LivePriceWidget }        from './LivePriceWidget';
// A1: content rides the first byte — static imports (see the contract
// note above the dynamic surfaces).
import RishiScoreDual            from '../score/RishiScoreDual';
import { MetricsPanel }           from './MetricsPanel';
import { PeerComparison }         from './PeerComparison';
import { WisdomSidebar }          from './WisdomSidebar';
import SeedDataBanner             from '../shared/SeedDataBanner';
import { useLanguage } from '../../lib/language';
// A1: server-resolved historical parallel for the wisdom rail (the
// dataset/detector live in lib/wisdom/historicalParallels, server-side).
import type { HistoricalParallel } from '../../lib/wisdom/historicalParallels';
import type { ServedQuote } from '../../lib/quotePath'; // X3: type-only — erased at compile time, no runtime reachability into the server-only price path
import type { ObservationMarketState } from '../../lib/pricePresentation'; // Y3: type-only — same erasure rule
import type { InitialPriceEntry } from '../../lib/dashboardSnapshot'; // Y2: type-only — same erasure rule

// A1 (Round 14) contract, after measuring Next 16 behavior:
//   - CONTENT components are STATIC imports. Measured on this build:
//     next/dynamic WITHOUT ssr:false still renders only its `loading`
//     fallback into a STATIC prerender (the 430/600/280px skeletons were
//     baked into the HTML while the content stayed out) — so a lazy
//     boundary can never put content in the first byte. The content
//     therefore pays its bundle bytes and rides the first byte again
//     (MetricsPanel, PeerComparison, RishiScoreDual, WisdomSidebar).
//   - ssr:false remains ONLY for genuinely client-only interactive
//     surfaces (charts that fetch their own data, the graph modal) and
//     tab-gated bodies that cannot appear in the first paint anyway.
//   - fail-honest placeholders keep the layout calm while a chunk
//     streams in on the client.
const chartTabFallback = () => (
  <div style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>
    LOADING CHART…
  </div>
);
const PriceChart          = dynamic(() => import('./PriceChart').then(m => m.PriceChart), { ssr: false, loading: chartTabFallback });
const TechnicalIndicators = dynamic(() => import('./TechnicalIndicators').then(m => m.TechnicalIndicators), { ssr: false, loading: chartTabFallback });
const QuarterlyChart      = dynamic(() => import('./QuarterlyChart').then(m => m.QuarterlyChart), { ssr: false, loading: chartTabFallback });
const ShareholdingChart   = dynamic(() => import('./ShareholdingChart').then(m => m.ShareholdingChart), { ssr: false, loading: chartTabFallback });
const BullBearBar         = dynamic(() => import('./BullBearBar').then(m => m.BullBearBar), { ssr: false });
const PhilosophyRadar     = dynamic(() => import('./PhilosophyRadar').then(m => m.PhilosophyRadar), { ssr: false });
// A1: RishiGrid and BullBearBar are wisdom-TAB bodies (client tab state
// starts on 'overview', so they can never appear in the first paint) —
// they stay lazy with ssr:false. The server-rendered "Top Rishi Scores"
// card below IS the RishiGrid summary in the first byte (top five
// verdicts with names and scores).
const RishiGrid           = dynamic(() => import('./RishiGrid').then(m => m.RishiGrid), { ssr: false });
// A1: the knowledge-graph modal is a genuinely client-only interactive
// surface (opens on click) — it stays lazy and client-only.
const KnowledgeGraphView  = dynamic(() => import('./KnowledgeGraphView').then(m => m.KnowledgeGraphView), { ssr: false });

interface Props {
  stock: Stock;
  /** Server-sanitized consensus — carries the FULL verdict set (free
   *  access: every visitor receives every verdict in the RSC payload). */
  consensus: SanitizedConsensus;
  detail: any;
  /** N1: server-computed seed-baseline resolution (live overlay happens in
   *  MetricsPanel via overlaySourced — the engine itself never ships). */
  resolved: ResolvedStockMetrics | null;
  /** N1: both QVPS modes precomputed on the server. */
  qvpsDual: { long: import('../../lib/scorers/types').RishiScoreResult; short: import('../../lib/scorers/types').RishiScoreResult } | null;
  /** N1: knowledge graph for the full verdict set. */
  eliteGraph: EliteKnowledgeGraph;
  /** X3 (Round 11): the SSR price — a read-only peek at the shared quote
   *  cache taken on the server for THIS symbol. Null when nothing is
   *  cached (the tile then renders the honest "price unavailable" state
   *  and the client hook fills it on mount). */
  initialQuote: ServedQuote | null;
  /** Y3: the server-disclosed NSE market state at regeneration (frozen
   *  into the ISR HTML until the next regen). Null never renders a state
   *  claim — the observation line then shows the stamp alone. */
  initialMarket: ObservationMarketState | null;
  /** Y2 (Round 12): the regen-time cache peek for the PEER table — the
   *  mapped entries (dashboardSnapshot.toPriceData) for every peer the
   *  shared quote cache held, keyed by symbol. Empty when nothing is
   *  cached: the peer prices render the honest "—" and the client hook
   *  fills them on mount. */
  initialPeerPrices: Record<string, InitialPriceEntry>;
  /** A1 (Round 14): the server-resolved historical parallel for the
   *  wisdom rail (null = honest "no parallels detected"). The dataset
   *  and detector live server-side — the client bundle carries neither. */
  parallel: HistoricalParallel | null;
}

export function StockPageClient({ stock, consensus, detail, resolved, qvpsDual, eliteGraph, initialQuote, initialPeerPrices, initialMarket, parallel }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showGraph, setShowGraph] = useState(false);
  const { t } = useLanguage();

  // Commit M3 (free access): the server embeds the FULL verdict set and the
  // full-set knowledge graph for every visitor — there is no client-side
  // upgrade path and no tier left to key one on. What is rendered here is
  // exactly what the server sent.
  const verdicts: RishiScore[] = consensus.verdicts;
  const graph: EliteKnowledgeGraph | null = eliteGraph;

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

      {/* N3 (round 3): every number on this page (consensus, QVPS, metrics,
          verdicts, graph) is seed-derived while SEED_STATUS === 'placeholder'. */}
      <div className="content-wrapper" style={{ paddingTop: 16 }}>
        <SeedDataBanner suffix="consensus, QVPS, metrics and verdicts on this page are illustrative placeholders" />
      </div>

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
                <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>
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
              <KnowledgeGraphView stock={stock} graph={graph ?? eliteGraph} verdicts={verdicts} topBull={consensus.topBull} topBear={consensus.topBear} />
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
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', letterSpacing: 1, fontFamily: 'monospace' }}>
                <span>{stock.sector}</span>
                <span style={{ color: 'rgba(30,41,59,0.8)' }}>|</span>
                <span>{stock.exchange}</span>
                <span style={{ color: 'rgba(30,41,59,0.8)' }}>|</span>
                <span style={{ color: consensus.consensus === null ? 'var(--text-muted)' : scoreColor(consensus.consensus), fontWeight: 600 }}>
                  {t('stock.consensus')}: {consensus.consensus === null ? '\u2014' : consensus.consensus + '/100'}
                </span>
              </div>
            </div>
            {/* Z5 CLS reservation: a fixed 380px right-aligned footprint so
                the widget's own text changes (the mount refetch rewriting the
                Y3 observation line) can never re-flow or re-wrap the header
                row — the pre-fix reflow measured +0.08 CLS on throttled CI. */}
            <div style={{ width: 380, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
            <LivePriceWidget stock={stock} initialMarket={initialMarket} initialEntry={initialQuote ? {
              price: initialQuote.price,
              change: initialQuote.change ?? undefined,
              changePercent24h: initialQuote.change ?? undefined,
              source: initialQuote.source,
              status: initialQuote.status,
              observedAt: initialQuote.observedAt,
              lastUpdated: initialQuote.lastUpdated,
            } : null} />
            </div>
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
                  color: activeTab === tab.id ? '#D4AF37' : 'var(--text-muted)',
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
                  {qvpsDual ? <RishiScoreDual dual={qvpsDual} sector={stock.sector} /> : null}
                </div>

                <div className="wisdom-reveal-delay-1">
                  {resolved ? <MetricsPanel resolved={resolved} /> : null}
                </div>

                <div className="wisdom-reveal-delay-2 card-sacred" style={{ padding: 24, position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
                    borderRadius: '12px 12px 0 0',
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <div className="philosophy-heading" style={{ fontSize: 13, color: 'var(--text-muted)', letterSpacing: 2 }}>
                        {t('stock.topRishiScores')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, opacity: 0.7 }}>
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
                    {verdicts.slice(0, 5).map((r, i) => (
                      <div key={r.name} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '14px 16px',
                        background: r.score === null ? 'rgba(100,116,139,0.08)' : scoreBg(r.score),
                        border: '1px solid ' + (r.score === null ? '#64748B' : scoreColor(r.score)) + '22',
                        borderRadius: 10,
                        transition: 'all 0.2s ease',
                      }}>
                        <div style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
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
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                            {r.label}
                          </div>
                        </div>

                        <div style={{ width: 100, flexShrink: 0 }}>
                          <div style={{ height: 4, background: 'rgba(30,41,59,0.8)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              width: (r.score === null ? 0 : r.score) + '%',
                              height: '100%',
                              background: r.score === null ? '#64748B' : scoreColor(r.score),
                              borderRadius: 3,
                              transition: 'width 0.8s ease',
                            }} />
                          </div>
                        </div>

                        <div style={{
                          fontSize: 22,
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          color: r.score === null ? 'var(--text-muted)' : scoreColor(r.score),
                          width: 40,
                          textAlign: 'right',
                          flexShrink: 0,
                        }}>
                          {r.score === null ? '\u2014' : r.score}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="wisdom-reveal-delay-2">
                  <PeerComparison stock={stock} peers={detail.peers} initialPrices={initialPeerPrices} />
                </div>
</>
            )}

            {activeTab === 'technical' && (
              <>
                <div className="wisdom-reveal">
                  <PriceChart stock={stock} />
                </div>

                <div className="wisdom-reveal-delay-1">
                  <TechnicalIndicators symbol={stock.symbol} />
                </div>

                <div className="wisdom-reveal-delay-2">
                  <QuarterlyChart symbol={stock.symbol} />
                </div>

                <div className="wisdom-reveal-delay-2">
                  <ShareholdingChart symbol={stock.symbol} />
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
                  <PhilosophyRadar scores={verdicts} />
                </div>

                <div className="wisdom-reveal-delay-2">
                  <RishiGrid
                    symbol={stock.symbol}
                    verdicts={verdicts}
                    totalRishis={consensus.scoresCount}
                  />
                </div>
              </>
            )}

          </div>

          <div style={{ position: 'sticky', top: 80 }}>
            <div className="wisdom-reveal-delay-2">
              <WisdomSidebar stock={stock} scores={verdicts} parallel={parallel} />
            </div>
          </div>

        </div>
      </div>

      {/* A5 (Round 14): the methodology page was unreachable from the
          product (FD-15) — every stock page carries a footer link so the
          scoring methods behind the numbers above are one click away. */}
      <div className="content-wrapper" style={{ paddingBottom: 40 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12, paddingTop: 16,
          borderTop: '1px solid rgba(30,41,59,0.8)',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 0.5 }}>
            {stock.name} · {stock.symbol} · {t('stock.topRishiScores')}: {consensus.scoresCount} Rishis
          </span>
          <Link
            href="/methodology"
            style={{
              fontSize: 11, fontFamily: 'monospace', letterSpacing: 1,
              color: '#D4AF37', textDecoration: 'none',
              border: '1px solid rgba(255,215,0,0.25)', borderRadius: 6,
              padding: '5px 12px', background: 'rgba(255,215,0,0.06)',
            }}
          >
            {t('nav.methodology')} →
          </Link>
        </div>
      </div>
    </div>
  );
}
