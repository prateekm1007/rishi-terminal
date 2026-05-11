'use client';

import { useEffect, useState, useCallback } from 'react';
import { Stock } from '../../lib/types';
import { ConsensusResult } from '../../lib/consensus/types';
import { buildEliteKnowledgeGraph, EliteKnowledgeGraph } from '../../lib/consensus/eliteGraph';
import { INVESTMENT_GLOSSARY } from '../../data/glossary';
import { GLOBAL_RISHI_PLAYS, RishiPlay } from '../../data/rishi-portfolios/global-plays';

interface Props {
  stock: Stock;
  consensus: ConsensusResult;
}

interface TooltipState {
  term: string;
  x: number;
  y: number;
}

/* -- Glossary Tooltip ----------------------------------------- */
function GlossaryTooltip({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) return null;
  const entry = INVESTMENT_GLOSSARY[tooltip.term.toLowerCase()];
  if (!entry) return null;

  return (
    <div style={{
      position: 'fixed',
      left: Math.min(tooltip.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 420),
      top: tooltip.y + 8,
      maxWidth: 400,
      background: '#0A0F1C',
      border: '2px solid #D4AF37',
      borderRadius: 12,
      padding: '16px 18px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
      zIndex: 99999,
      pointerEvents: 'none',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: '#D4AF37',
        marginBottom: 6, fontFamily: 'Cinzel, serif',
        letterSpacing: 1, textTransform: 'uppercase' as const,
      }}>
        {entry.term}
      </div>
      <div style={{ fontSize: 12, color: '#F8FAFC', lineHeight: 1.65, marginBottom: entry.example ? 10 : 0 }}>
        {entry.definition}
      </div>
      {entry.example && (
        <div style={{
          fontSize: 11, color: '#64748B', fontStyle: 'italic',
          padding: '8px 10px', background: 'rgba(212,175,55,0.06)',
          borderRadius: 6, borderLeft: '2px solid #D4AF37', lineHeight: 1.5,
        }}>
          {entry.example}
        </div>
      )}
      {entry.relatedTerms && entry.relatedTerms.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {entry.relatedTerms.map((rt: string) => (
            <span key={rt} style={{
              fontSize: 10, padding: '2px 8px',
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: 4, color: '#D4AF37',
            }}>{rt}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* -- Debate Card ----------------------------------------------- */
function DebateCard({
  side, rishi, argument, score, color,
}: {
  side: 'bull' | 'bear';
  rishi: string;
  argument: string;
  score: number;
  color: string;
}) {
  const icon = side === 'bull' ? '🐂' : '🐻';
  const label = side === 'bull' ? 'BULL CASE' : 'BEAR CASE';

  return (
    <div style={{
      background: side === 'bull'
        ? 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(17,24,39,0.8))'
        : 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(17,24,39,0.8))',
      border: `1px solid ${color}33`,
      borderRadius: 14,
      padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.1em' }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC', marginTop: 2 }}>{rishi}</div>
          </div>
        </div>
        <div style={{
          fontSize: 22, fontWeight: 900, color,
          fontFamily: 'JetBrains Mono, monospace',
        }}>{score}</div>
      </div>
      <div style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.7, fontStyle: 'italic' }}>
        "{argument}"
      </div>
    </div>
  );
}

/* -- Play Card ------------------------------------------------- */
function PlayCard({ play, relevanceNote }: {
  play: RishiPlay;
  relevanceNote: string;
}) {
  const up = (play.return?.includes?.('+') ?? false);
  return (
    <div style={{
      background: 'rgba(17,24,39,0.7)',
      border: '1px solid rgba(51,65,85,0.5)',
      borderRadius: 12,
      padding: '14px 16px',
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,175,55,0.4)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(51,65,85,0.5)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
            {play.rishi} – {play.stock}
          </div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
            {play.yearBought} · {play.market}
          </div>
        </div>
        {play.return && (
          <div style={{
            fontSize: 15, fontWeight: 800,
            color: up ? '#22C55E' : '#EF4444',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {play.return}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6, marginBottom: 8 }}>
        {play.thesis}
      </div>
      <div style={{
        fontSize: 11, color: '#D4AF37',
        padding: '6px 10px',
        background: 'rgba(212,175,55,0.06)',
        borderRadius: 6,
        borderLeft: '2px solid rgba(212,175,55,0.4)',
      }}>
        {relevanceNote}
      </div>
    </div>
  );
}

/* -- Technical Bar --------------------------------------------- */
function TechnicalBar({ comp, stockName }: { comp: any; stockName: string }) {
  const stockVal = Number(comp.stockValue ?? 0);
  const sectorVal = Number(comp.sectorAvg ?? 0);
  const maxVal = Math.max(stockVal, sectorVal, 0.001);
  const better = comp.higherIsBetter ? stockVal >= sectorVal : stockVal <= sectorVal;

  return (
    <div style={{
      background: 'rgba(17,24,39,0.6)',
      border: '1px solid rgba(51,65,85,0.4)',
      borderRadius: 12,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>{comp.metric}</div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
          <span style={{ color: better ? '#22C55E' : '#EF4444', fontWeight: 700 }}>
            {stockName}: {stockVal.toFixed(1)}{comp.unit ?? ''}
          </span>
          <span style={{ color: '#64748B' }}>
            Sector: {sectorVal.toFixed(1)}{comp.unit ?? ''}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1, height: 6, background: 'rgba(51,65,85,0.5)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: Math.min(100, (stockVal / maxVal) * 100) + '%',
            background: better ? '#22C55E' : '#EF4444',
            borderRadius: 3,
            transition: 'width 0.8s ease',
          }} />
        </div>
        <div style={{ flex: 1, height: 6, background: 'rgba(51,65,85,0.5)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: Math.min(100, (sectorVal / maxVal) * 100) + '%',
            background: '#64748B',
            borderRadius: 3,
          }} />
        </div>
      </div>
      {comp.insight && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#D4AF37', fontStyle: 'italic' }}>
          {comp.insight}
        </div>
      )}
    </div>
  );
}

/* -- Timeline Card --------------------------------------------- */
function TimelineCard({ event }: { event: any }) {
  const scoreColor = event.score >= 75 ? '#22C55E' : event.score >= 55 ? '#D4AF37' : '#EF4444';
  return (
    <div style={{
      display: 'flex', gap: 16, marginBottom: 16,
      paddingLeft: 20, position: 'relative',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 6,
        width: 14, height: 14, borderRadius: '50%',
        background: scoreColor,
        boxShadow: `0 0 8px ${scoreColor}88`,
        border: '2px solid #0A0F1C',
        flexShrink: 0,
      }} />
      <div style={{
        background: 'rgba(17,24,39,0.6)',
        border: '1px solid rgba(51,65,85,0.4)',
        borderRadius: 10, padding: '10px 14px', flex: 1,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC' }}>{event.rishi}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748B' }}>{event.year}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor, fontFamily: 'JetBrains Mono, monospace' }}>
              {event.score}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>{event.signal}</div>
      </div>
    </div>
  );
}

// Smart matching algorithm for historical plays
function getRelevantPlays(stock: Stock): RishiPlay[] {
  const SECTOR_KEYWORDS: Record<string, string[]> = {
    IT: ['technology', 'software', 'tech', 'digital', 'cloud', 'apple', 'ibm'],
    Banking: ['bank', 'finance', 'financial', 'credit', 'amex', 'america'],
    Pharma: ['pharma', 'health', 'drug', 'medical', 'bio'],
    Auto: ['auto', 'motor', 'car', 'vehicle'],
    Energy: ['oil', 'gas', 'energy', 'power', 'coal'],
    FMCG: ['consumer', 'fmcg', 'coca', 'colgate', 'unilever', 'candies'],
    Retail: ['retail', 'ecommerce', 'store', 'supermart'],
    Cement: ['cement', 'construction', 'building'],
    Metals: ['steel', 'metal', 'alumin'],
  };

  const stockSectorLower = stock.sector.toLowerCase();
  const keywords = SECTOR_KEYWORDS[stock.sector] || [stockSectorLower];

  // Score each play by relevance
  const scored = GLOBAL_RISHI_PLAYS.map(play => {
    let score = 0;
    const playStockLower = play.stock.toLowerCase();
    const playThesisLower = play.thesis.toLowerCase();

    // Exact sector keyword match in stock name or thesis
    keywords.forEach(kw => {
      if (playStockLower.includes(kw)) score += 10;
      if (playThesisLower.includes(kw)) score += 5;
    });

    // Market preference (India plays get bonus for Indian stocks)
    if (play.market === 'India' && stock.exchange === 'NSE') score += 3;

    // Category match (quality stocks → quality plays)
    if (stock.roe >= 20 && play.category === 'quality') score += 4;
    if (stock.pe < 15 && play.category === 'value') score += 4;
    if (stock.revcagr >= 20 && play.category === 'growth') score += 4;

    // Famous plays get slight bonus
    if (['Warren Buffett', 'Rakesh Jhunjhunwala'].includes(play.rishi)) score += 2;

    return { play, score };
  });

  // Sort by score descending, take top 8
  const sorted = scored.sort((a, b) => b.score - a.score);

  // If top match has score >= 5, show top 8 with score >= 3
  // Otherwise show any top 8 plays (fallback to famous plays)
  const topScore = sorted[0]?.score ?? 0;
  const relevant = topScore >= 5
    ? sorted.filter(s => s.score >= 3).slice(0, 8)
    : sorted.slice(0, 8);

  return relevant.map(r => r.play);
}

function getRelevanceNote(play: RishiPlay, stock: Stock): string {
  const playLower = play.stock.toLowerCase();
  const sectorLower = stock.sector.toLowerCase();

  if (playLower.includes(sectorLower) || play.thesis.toLowerCase().includes(sectorLower)) {
    return `${stock.sector} sector parallel - study ${play.rishi}'s approach`;
  }

  if (play.market === 'India' && stock.exchange === 'NSE') {
    return `Indian market success story by ${play.rishi}`;
  }

  if (play.category === 'quality' && stock.roe >= 20) {
    return `Quality business playbook - similar ROE profile to ${stock.symbol}`;
  }

  if (play.category === 'value' && stock.pe < 15) {
    return `Value investing case study - similar valuation approach`;
  }

  if (play.category === 'growth' && stock.revcagr >= 20) {
    return `High-growth opportunity - similar to ${stock.symbol}'s trajectory`;
  }

  return `Legendary ${play.rishi} play - timeless investment wisdom`;
}

/* -- Main KnowledgeGraphView ------------------------------------ */
export function KnowledgeGraphView({ stock, consensus }: Props) {
  const [activeView, setActiveView] = useState<'debate' | 'historical' | 'technical' | 'timeline'>('debate');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [graphData, setGraphData] = useState<EliteKnowledgeGraph | null>(null);

  useEffect(() => {
    if (!consensus?.scores || !Array.isArray(consensus.scores)) return;
    try {
      const data = buildEliteKnowledgeGraph(stock, consensus.scores);
      setGraphData(data);
    } catch (e) {
      console.error('KnowledgeGraph build error:', e);
    }
  }, [stock, consensus]);

  const handleHover = useCallback((term: string, e: React.MouseEvent) => {
    setTooltip({ term, x: e.clientX, y: e.clientY });
  }, []);

  const handleLeave = useCallback(() => setTooltip(null), []);

  if (!graphData) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
        Building knowledge graph...
      </div>
    );
  }

  const relevantPlays = getRelevantPlays(stock);

  const VIEWS = [
    { id: 'debate',     label: 'Bulls vs Bears' },
    { id: 'historical', label: 'Historical Plays' },
    { id: 'technical',  label: 'Technical Edge' },
    { id: 'timeline',   label: 'Signal Timeline' },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <GlossaryTooltip tooltip={tooltip} />

      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: 6,
        padding: '12px 16px',
        borderBottom: '1px solid rgba(51,65,85,0.5)',
        flexShrink: 0,
      }}>
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            style={{
              padding: '7px 16px', borderRadius: 8,
              fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: activeView === v.id
                ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(139,92,246,0.1))'
                : 'transparent',
              color: activeView === v.id ? '#D4AF37' : '#64748B',
              borderBottom: activeView === v.id ? '2px solid #D4AF37' : '2px solid transparent',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '20px 16px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>

        {/* DEBATE TAB */}
        {activeView === 'debate' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <DebateCard
                side="bull"
                rishi={consensus.topBull?.rishi ?? 'Buffett'}
                argument={consensus.topBull?.argument ?? 'Strong fundamentals support long-term value.'}
                score={consensus.topBull?.score ?? 80}
                color="#22C55E"
              />
              <DebateCard
                side="bear"
                rishi={consensus.topBear?.rishi ?? 'Chanos'}
                argument={consensus.topBear?.argument ?? 'Elevated valuation creates downside risk.'}
                score={consensus.topBear?.score ?? 35}
                color="#EF4444"
              />
            </div>

            {graphData.debate && (graphData.debate.bulls.length + graphData.debate.bears.length + graphData.debate.neutrals.length) > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* BULLS */}
                {graphData.debate.bulls.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#22C55E", letterSpacing: "0.1em", marginBottom: 12 }}>
                      🐂 BULL ARGUMENTS ({graphData.debate.bulls.length})
                    </div>
                    {graphData.debate.bulls.map((debate: any, i: number) => (
                      <div key={`bull-${i}`} style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC" }}>{debate.rishi}</span>
                          <span style={{ fontSize: 14, color: "#22C55E", fontWeight: 700, fontFamily: "monospace" }}>{debate.score}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.65, marginBottom: 8 }}>{debate.reasoning}</div>
                        <div style={{ fontSize: 11, color: "#64748B", fontStyle: "italic", borderLeft: "2px solid #22C55E", paddingLeft: 10 }}>{debate.philosophy}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* BEARS */}
                {graphData.debate.bears.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", letterSpacing: "0.1em", marginBottom: 12 }}>
                      🐻 BEAR ARGUMENTS ({graphData.debate.bears.length})
                    </div>
                    {graphData.debate.bears.map((debate: any, i: number) => (
                      <div key={`bear-${i}`} style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC" }}>{debate.rishi}</span>
                          <span style={{ fontSize: 14, color: "#EF4444", fontWeight: 700, fontFamily: "monospace" }}>{debate.score}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.65, marginBottom: 8 }}>{debate.reasoning}</div>
                        <div style={{ fontSize: 11, color: "#64748B", fontStyle: "italic", borderLeft: "2px solid #EF4444", paddingLeft: 10 }}>{debate.philosophy}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* NEUTRALS */}
                {graphData.debate.neutrals.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#D4AF37", letterSpacing: "0.1em", marginBottom: 12 }}>
                      ⚖️ NEUTRAL POSITIONS ({graphData.debate.neutrals.length})
                    </div>
                    {graphData.debate.neutrals.map((debate: any, i: number) => (
                      <div key={`neutral-${i}`} style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC" }}>{debate.rishi}</span>
                          <span style={{ fontSize: 14, color: "#D4AF37", fontWeight: 700, fontFamily: "monospace" }}>{debate.score}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.65, marginBottom: 8 }}>{debate.reasoning}</div>
                        <div style={{ fontSize: 11, color: "#64748B", fontStyle: "italic", borderLeft: "2px solid #D4AF37", paddingLeft: 10 }}>{debate.philosophy}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* HISTORICAL TAB */}
        {activeView === 'historical' && (
          <div>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 16, lineHeight: 1.6 }}>
              Historical plays by legendary investors relevant to{' '}
              <strong style={{ color: '#F8FAFC' }}>{stock.name}</strong>.
              Study these to understand how the Rishis think.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {relevantPlays.map((play, i) => (
                <PlayCard
                  key={i}
                  play={play}
                  relevanceNote={getRelevanceNote(play, stock)}
                />
              ))}
            </div>
          </div>
        )}

        {/* TECHNICAL TAB */}
        {activeView === 'technical' && (
          <div>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 16, lineHeight: 1.6 }}>
              {stock.name} vs sector average on key Rishi metrics.
            </div>
            {graphData.technicalEdge && graphData.technicalEdge.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {graphData.technicalEdge.map((comp: any, i: number) => (
                  <TechnicalBar key={i} comp={comp} stockName={stock.name} />
                ))}
              </div>
            ) : (
              <div style={{ color: '#64748B', textAlign: 'center', padding: 40 }}>
                Technical comparison data unavailable for this stock.
              </div>
            )}
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeView === 'timeline' && (
          <div>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
              When each Rishi's scoring model would have triggered based on{' '}
              <strong style={{ color: '#F8FAFC' }}>{stock.name}</strong>'s evolving metrics.
            </div>
            <div style={{ position: 'relative', paddingLeft: 4 }}>
              <div style={{
                position: 'absolute', left: 6, top: 0, bottom: 0, width: 2,
                background: 'linear-gradient(180deg, #D4AF37, rgba(212,175,55,0.1))',
                borderRadius: 2,
              }} />
              {graphData.timeline && graphData.timeline.length > 0 ? (
                graphData.timeline.map((event: any, i: number) => (
                  <TimelineCard key={i} event={event} />
                ))
              ) : (
                <div style={{ color: '#64748B', textAlign: 'center', padding: 40, paddingLeft: 20 }}>
                  Signal timeline data unavailable.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
