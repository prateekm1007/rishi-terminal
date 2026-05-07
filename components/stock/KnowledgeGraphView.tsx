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

// ─── Glossary Tooltip ────────────────────────────────────────────────────────

function GlossaryTooltip({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) return null;
  const entry = INVESTMENT_GLOSSARY[tooltip.term.toLowerCase()];
  if (!entry) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: Math.min(tooltip.x, window.innerWidth - 420),
        top: tooltip.y + 8,
        maxWidth: 400,
        background: 'var(--bg-card)',
        border: '2px solid #FFD700',
        borderRadius: 12,
        padding: '16px 18px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
        zIndex: 99999,
        pointerEvents: 'none',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#FFD700',
        marginBottom: 6,
        fontFamily: 'Cinzel, serif',
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        {entry.term}
      </div>
      <div style={{
        fontSize: 12,
        color: 'var(--text-primary)',
        lineHeight: 1.65,
        marginBottom: entry.example ? 10 : 0,
      }}>
        {entry.definition}
      </div>
      {entry.example && (
        <div style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          fontStyle: 'italic',
          padding: '8px 10px',
          background: 'rgba(255,215,0,0.06)',
          borderRadius: 6,
          borderLeft: '2px solid #FFD700',
          lineHeight: 1.5,
        }}>
          💡 {entry.example}
        </div>
      )}
      {entry.relatedTerms && entry.relatedTerms.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {entry.relatedTerms.map(rt => (
            <span key={rt} style={{
              fontSize: 9,
              padding: '2px 7px',
              background: 'rgba(255,215,0,0.08)',
              border: '1px solid rgba(255,215,0,0.2)',
              borderRadius: 20,
              color: 'var(--text-muted)',
              letterSpacing: 0.5,
            }}>
              {rt}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Smart Text with Glossary Highlighting ───────────────────────────────────

function SmartText({
  text,
  onHover,
  onLeave,
}: {
  text: string;
  onHover: (term: string, x: number, y: number) => void;
  onLeave: () => void;
}) {
  const glossaryKeys = Object.keys(INVESTMENT_GLOSSARY).sort((a, b) => b.length - a.length);

  // Build segments by scanning the text for known terms
  const buildSegments = () => {
    const segments: Array<{ text: string; term?: string; isGlossary: boolean }> = [];
    let remaining = text;
    let cursor = 0;

    while (cursor < text.length) {
      let matched = false;
      for (const key of glossaryKeys) {
        const slice = text.slice(cursor);
        const lowerSlice = slice.toLowerCase();
        if (lowerSlice.startsWith(key.toLowerCase())) {
          // Check word boundary before
          const before = cursor > 0 ? text[cursor - 1] : ' ';
          const after = text[cursor + key.length] ?? ' ';
          const wordBefore = /\W/.test(before);
          const wordAfter = /\W/.test(after) || cursor + key.length >= text.length;
          if (wordBefore && wordAfter) {
            segments.push({
              text: text.slice(cursor, cursor + key.length),
              term: key,
              isGlossary: true,
            });
            cursor += key.length;
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        // Extend the last non-glossary segment or start a new one
        if (segments.length > 0 && !segments[segments.length - 1].isGlossary) {
          segments[segments.length - 1].text += text[cursor];
        } else {
          segments.push({ text: text[cursor], isGlossary: false });
        }
        cursor++;
      }
    }
    return segments;
  };

  const segments = buildSegments();

  return (
    <span>
      {segments.map((seg, i) =>
        seg.isGlossary && seg.term ? (
          <span
            key={i}
            onMouseEnter={e => {
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              onHover(seg.term!, rect.left, rect.bottom);
            }}
            onMouseLeave={onLeave}
            style={{
              color: '#FFD700',
              textDecoration: 'underline dotted',
              textUnderlineOffset: 3,
              cursor: 'help',
              fontWeight: 600,
              transition: 'opacity 0.1s',
            }}
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}

// ─── Score Color Helper ───────────────────────────────────────────────────────

const scoreColor = (s: number) =>
  s >= 75 ? '#00BA7C' : s >= 55 ? '#FFD700' : '#F4212E';

const verdictColor = (v: 'better' | 'worse' | 'similar') =>
  v === 'better' ? '#00BA7C' : v === 'worse' ? '#F4212E' : '#FFD700';

// ─── Category matching for stock plays ───────────────────────────────────────

function getRelevantPlays(stock: Stock): RishiPlay[] {
  const { sector, pe, roe, de, np, mktcap, epscagr } = stock;

  // Determine category from stock characteristics
  let categories: RishiPlay['category'][] = ['quality'];

  if (['FMCG', 'Consumer'].includes(sector) && roe > 20) {
    categories = ['quality', 'growth'];
  } else if (['Metals', 'Energy'].includes(sector) && pe < 10) {
    categories = ['value', 'distressed'];
  } else if (pe > 50 && np < 0) {
    categories = ['growth', 'momentum'];
  } else if (['IT', 'Pharma'].includes(sector) && roe > 18) {
    categories = ['quality', 'growth'];
  } else if (np < 0 && de > 1.5) {
    categories = ['turnaround', 'distressed'];
  } else if (mktcap < 50000 && epscagr > 20) {
    categories = ['growth', 'value'];
  }

  // Get plays matching categories, deduplicated by rishi
  const seenRishis = new Set<string>();
  const relevant: RishiPlay[] = [];

  for (const play of GLOBAL_RISHI_PLAYS) {
    if (categories.includes(play.category) && !seenRishis.has(play.rishi)) {
      seenRishis.add(play.rishi);
      relevant.push(play);
    }
  }

  // If not enough, fill with remaining
  for (const play of GLOBAL_RISHI_PLAYS) {
    if (!seenRishis.has(play.rishi)) {
      seenRishis.add(play.rishi);
      relevant.push(play);
    }
    if (relevant.length >= 12) break;
  }

  return relevant;
}

// ─── Rishi Avatar ────────────────────────────────────────────────────────────

function RishiAvatar({
  name,
  score,
  stance,
}: {
  name: string;
  score: number;
  stance: 'bull' | 'bear' | 'neutral';
}) {
  const color = stance === 'bull' ? '#00BA7C' : stance === 'bear' ? '#F4212E' : '#FFD700';
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: color + '18',
        border: '2px solid ' + color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 800,
        color,
        fontFamily: 'monospace',
        flexShrink: 0,
        boxShadow: '0 0 0 3px ' + color + '20',
      }}>
        {initials}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 60,
            height: 4,
            background: 'var(--bg-secondary)',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              width: score + '%',
              height: '100%',
              background: scoreColor(score),
              borderRadius: 2,
            }} />
          </div>
          <span style={{ fontSize: 11, color: scoreColor(score), fontFamily: 'monospace', fontWeight: 700 }}>
            {score}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Debate Card ──────────────────────────────────────────────────────────────

function DebateCard({
  rishi,
  stance,
  onHover,
  onLeave,
}: {
  rishi: { rishi: string; score: number; reasoning: string; philosophy: string; keyMetric: string };
  stance: 'bull' | 'bear' | 'neutral';
  onHover: (term: string, x: number, y: number) => void;
  onLeave: () => void;
}) {
  const color = stance === 'bull' ? '#00BA7C' : stance === 'bear' ? '#F4212E' : '#FFD700';
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: color + '08',
      border: '1px solid ' + color + '30',
      borderLeft: '3px solid ' + color,
      borderRadius: 10,
      padding: 16,
      transition: 'all 0.2s',
    }}>
      <RishiAvatar name={rishi.rishi} score={rishi.score} stance={stance} />

      {/* Key metric badge */}
      <div style={{
        display: 'inline-block',
        fontSize: 9,
        padding: '3px 9px',
        background: color + '15',
        border: '1px solid ' + color + '40',
        borderRadius: 20,
        color,
        letterSpacing: 1,
        textTransform: 'uppercase',
        fontWeight: 700,
        marginBottom: 10,
      }}>
        {rishi.keyMetric}
      </div>

      {/* Main reasoning */}
      <div style={{
        fontSize: 13,
        color: 'var(--text-secondary)',
        lineHeight: 1.75,
        marginBottom: 10,
      }}>
        <SmartText text={rishi.reasoning} onHover={onHover} onLeave={onLeave} />
      </div>

      {/* Philosophy toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: 'none',
          border: 'none',
          color: color,
          fontSize: 11,
          cursor: 'pointer',
          padding: 0,
          fontWeight: 600,
          letterSpacing: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {expanded ? '▲' : '▼'} {expanded ? 'Hide' : 'Show'} philosophy basis
      </button>

      {expanded && (
        <div style={{
          marginTop: 10,
          padding: '10px 14px',
          background: 'var(--bg-secondary)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--text-muted)',
          fontStyle: 'italic',
          lineHeight: 1.6,
          borderLeft: '2px solid ' + color + '50',
        }}>
          <SmartText text={rishi.philosophy} onHover={onHover} onLeave={onLeave} />
        </div>
      )}
    </div>
  );
}

// ─── Play Card ────────────────────────────────────────────────────────────────

function PlayCard({
  play,
  relevanceNote,
  onHover,
  onLeave,
}: {
  play: RishiPlay;
  relevanceNote: string;
  onHover: (term: string, x: number, y: number) => void;
  onLeave: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const outcomeColor =
    play.outcome === 'success' ? '#00BA7C' :
    play.outcome === 'failure' ? '#F4212E' : '#FFD700';
  const marketFlag =
    play.market === 'India' ? '🇮🇳' :
    play.market === 'US' ? '🇺🇸' : '🌐';

  return (
    <div className="card-sacred" style={{
      padding: 18,
      borderLeft: '3px solid ' + outcomeColor,
      transition: 'transform 0.2s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>{marketFlag}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {play.stock}
            </span>
            <span style={{
              fontSize: 9,
              padding: '2px 7px',
              background: 'rgba(255,215,0,0.1)',
              border: '1px solid rgba(255,215,0,0.25)',
              borderRadius: 20,
              color: '#FFD700',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}>
              {play.category}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{play.rishi}</span>
            <span>·</span>
            <span>{play.yearBought}{play.yearSold ? `–${play.yearSold}` : '–present'}</span>
            <span>·</span>
            <span>{play.market}</span>
          </div>
        </div>

        {play.return && (
          <div style={{
            background: outcomeColor + '15',
            border: '1px solid ' + outcomeColor + '40',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 800,
            fontFamily: 'monospace',
            color: outcomeColor,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {play.return}
          </div>
        )}
      </div>

      {/* Price info */}
      {play.buyPrice && (
        <div style={{
          display: 'flex',
          gap: 16,
          marginBottom: 10,
          fontSize: 11,
          fontFamily: 'monospace',
          color: 'var(--text-muted)',
        }}>
          <span>Buy: <strong style={{ color: 'var(--text-secondary)' }}>${play.buyPrice}</strong></span>
          {play.sellPrice && (
            <span>Sell: <strong style={{ color: outcomeColor }}>${play.sellPrice}</strong></span>
          )}
        </div>
      )}

      {/* Thesis */}
      <div style={{
        fontSize: 12,
        color: 'var(--text-secondary)',
        lineHeight: 1.7,
        padding: '10px 12px',
        background: 'var(--bg-secondary)',
        borderRadius: 8,
        marginBottom: 10,
      }}>
        <SmartText text={play.thesis} onHover={onHover} onLeave={onLeave} />
      </div>

      {/* Relevance note */}
      <div style={{
        fontSize: 11,
        color: '#FFD700',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
      }}>
        <span style={{ flexShrink: 0 }}>🔗</span>
        <span>{relevanceNote}</span>
      </div>
    </div>
  );
}

// ─── Timeline Event Card ──────────────────────────────────────────────────────

function TimelineCard({
  event,
  onHover,
  onLeave,
}: {
  event: { rishi: string; date: string; score: number; trigger: string; context: string; event: string };
  onHover: (term: string, x: number, y: number) => void;
  onLeave: () => void;
}) {
  const color = scoreColor(event.score);
  const icon =
    event.event === 'buy_signal' ? '🟢' :
    event.event === 'sell_signal' ? '🔴' :
    event.event === 'warning' ? '⚠️' : '🟡';

  return (
    <div style={{ position: 'relative', paddingLeft: 28, marginBottom: 20 }}>
      {/* Dot */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 10,
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: color,
        border: '2px solid var(--bg-primary)',
        boxShadow: '0 0 0 3px ' + color + '30',
        zIndex: 1,
      }} />

      <div className="card-sacred" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {event.rishi}
            </span>
          </div>
          <div style={{
            fontSize: 20,
            fontWeight: 900,
            fontFamily: 'monospace',
            color,
            lineHeight: 1,
          }}>
            {event.score}
          </div>
        </div>
        <div style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          fontFamily: 'monospace',
          letterSpacing: 0.5,
          marginBottom: 8,
        }}>
          {event.date} · {event.trigger}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
          <SmartText text={event.context} onHover={onHover} onLeave={onLeave} />
        </div>
      </div>
    </div>
  );
}

// ─── Technical Bar ────────────────────────────────────────────────────────────

function TechnicalBar({
  comp,
  stockName,
}: {
  comp: { metric: string; thisStock: number | string; sectorAvg: number | string; verdict: 'better' | 'worse' | 'similar'; insight: string };
  stockName: string;
}) {
  const color = verdictColor(comp.verdict);
  const thisVal = typeof comp.thisStock === 'number' ? comp.thisStock : parseFloat(comp.thisStock) || 0;
  const avgVal = typeof comp.sectorAvg === 'number' ? comp.sectorAvg : parseFloat(comp.sectorAvg) || 0;
  const maxVal = Math.max(thisVal, avgVal, 1);
  const thisWidth = Math.round((thisVal / maxVal) * 100);
  const avgWidth = Math.round((avgVal / maxVal) * 100);

  return (
    <div className="card-sacred" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
          {comp.metric}
        </div>
        <div style={{
          fontSize: 10,
          padding: '3px 10px',
          background: color + '15',
          border: '1px solid ' + color + '40',
          borderRadius: 20,
          color,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          {comp.verdict === 'better' ? '✓ Above Avg' : comp.verdict === 'worse' ? '✗ Below Avg' : '= At Par'}
        </div>
      </div>

      {/* Bar comparison */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {/* This stock */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: '#FFD700', fontWeight: 600 }}>{stockName}</span>
            <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: color }}>
              {comp.thisStock}
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: thisWidth + '%',
              height: '100%',
              background: color,
              borderRadius: 4,
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>

        {/* Sector average */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sector Average</span>
            <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-muted)' }}>
              {comp.sectorAvg}
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: avgWidth + '%',
              height: '100%',
              background: 'var(--text-muted)',
              borderRadius: 4,
              opacity: 0.4,
            }} />
          </div>
        </div>
      </div>

      {/* Insight */}
      <div style={{
        fontSize: 11,
        color: 'var(--text-muted)',
        fontStyle: 'italic',
        lineHeight: 1.5,
        padding: '8px 10px',
        background: 'var(--bg-secondary)',
        borderRadius: 6,
      }}>
        {comp.insight}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function KnowledgeGraphView({ stock, consensus }: Props) {
  const [graphData, setGraphData] = useState<EliteKnowledgeGraph | null>(null);
  const [activeView, setActiveView] = useState<'debate' | 'historical' | 'technical' | 'timeline'>('debate');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleHover = useCallback((term: string, x: number, y: number) => {
    setTooltip({ term, x, y });
  }, []);

  const handleLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  useEffect(() => {
    const data = buildEliteKnowledgeGraph(stock, consensus.scores);
    setGraphData(data);
  }, [stock, consensus]);

  if (!graphData) {
    return (
      <div style={{
        height: 500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: '3px solid rgba(255,215,0,0.2)',
          borderTop: '3px solid #FFD700',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: 2, fontSize: 12 }}>
          BUILDING ELITE ANALYSIS...
        </div>
      </div>
    );
  }

  const relevantPlays = getRelevantPlays(stock);

  // Generate relevance notes per play
  const getRelevanceNote = (play: RishiPlay): string => {
    const notes: Record<string, string> = {
      quality: `${play.rishi} applied the same quality-compounding lens to ${play.stock} that applies to ${stock.name} today.`,
      growth: `${play.rishi} saw similar growth trajectory in ${play.stock} — ${stock.name} mirrors that pattern.`,
      value: `${play.rishi} found deep value in ${play.stock}; ${stock.name} shows comparable valuation signals.`,
      turnaround: `${play.rishi} bet on ${play.stock}'s revival — ${stock.name} faces a similar inflection moment.`,
      momentum: `${play.rishi} rode macro tailwinds in ${play.stock}; ${stock.name} has analogous sector momentum.`,
      distressed: `${play.rishi} saw opportunity in distress — ${stock.name}'s metrics warrant similar scrutiny.`,
    };
    return notes[play.category] || `${play.rishi}'s experience with ${play.stock} is directly relevant here.`;
  };

  const tabs = [
    { id: 'debate',     label: '🎭 Rishi Debate',      sub: 'Bulls vs Bears' },
    { id: 'historical', label: '📊 Rishi Stock Plays',  sub: 'Global & India' },
    { id: 'technical',  label: '📈 Technical Edge',     sub: 'Metric Analysis' },
    { id: 'timeline',   label: '⏱ Signal Timeline',    sub: 'Buy/Sell Signals' },
  ] as const;

  return (
    <div style={{ position: 'relative', paddingBottom: 40 }}>
      {/* Glossary tooltip */}
      <GlossaryTooltip tooltip={tooltip} />

      {/* ── Consensus header ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 24,
      }}>
        {[
          { label: 'Bulls',     value: graphData.consensus.bullCount,    color: '#00BA7C', icon: '🐂' },
          { label: 'Bears',     value: graphData.consensus.bearCount,    color: '#F4212E', icon: '🐻' },
          { label: 'Neutral',   value: graphData.consensus.neutralCount, color: '#FFD700', icon: '⚖️' },
          { label: 'Consensus', value: graphData.consensus.overall + '%', color: scoreColor(graphData.consensus.overall), icon: '🎯' },
        ].map((stat, i) => (
          <div key={i} className="card-sacred" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{stat.icon}</div>
            <div style={{
              fontSize: 28,
              fontWeight: 900,
              fontFamily: 'monospace',
              color: stat.color,
              lineHeight: 1,
              marginBottom: 4,
            }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 24,
        borderBottom: '1px solid var(--border-primary)',
        overflowX: 'auto',
        paddingBottom: 0,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            style={{
              padding: '12px 18px',
              background: activeView === tab.id ? 'rgba(255,215,0,0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeView === tab.id ? '2px solid #FFD700' : '2px solid transparent',
              color: activeView === tab.id ? '#FFD700' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: activeView === tab.id ? 700 : 400,
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              whiteSpace: 'nowrap',
              gap: 2,
            }}
          >
            <span>{tab.label}</span>
            <span style={{ fontSize: 9, opacity: 0.6 }}>{tab.sub}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1 — RISHI DEBATE
      ══════════════════════════════════════════════════════════ */}
      {activeView === 'debate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Instruction hint */}
          <div style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            background: 'rgba(255,215,0,0.05)',
            border: '1px solid rgba(255,215,0,0.15)',
            borderRadius: 8,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span>💡</span>
            <span>
              Hover over <span style={{ color: '#FFD700', fontWeight: 700, textDecoration: 'underline dotted' }}>
                golden terms
              </span> for definitions. Click "Show philosophy" for deeper reasoning.
            </span>
          </div>

          {/* Bulls section */}
          <div>
            <div style={{
              fontSize: 11,
              color: '#00BA7C',
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>🐂</span>
              <span>Bullish Rishis ({graphData.debate.bulls.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {graphData.debate.bulls.map((bull, i) => (
                <DebateCard key={i} rishi={bull} stance="bull" onHover={handleHover} onLeave={handleLeave} />
              ))}
            </div>
          </div>

          {/* Bears section */}
          <div>
            <div style={{
              fontSize: 11,
              color: '#F4212E',
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 8,
            }}>
              <span>🐻</span>
              <span>Bearish Rishis ({graphData.debate.bears.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {graphData.debate.bears.map((bear, i) => (
                <DebateCard key={i} rishi={bear} stance="bear" onHover={handleHover} onLeave={handleLeave} />
              ))}
            </div>
          </div>

          {/* Neutrals */}
          {graphData.debate.neutrals && graphData.debate.neutrals.length > 0 && (
            <div>
              <div style={{
                fontSize: 11,
                color: '#FFD700',
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 8,
              }}>
                <span>⚖️</span>
                <span>Neutral / Watching ({graphData.debate.neutrals.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {graphData.debate.neutrals.map((n, i) => (
                  <DebateCard key={i} rishi={n} stance="neutral" onHover={handleHover} onLeave={handleLeave} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2 — RISHI STOCK PLAYS (Global + India)
      ══════════════════════════════════════════════════════════ */}
      {activeView === 'historical' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header */}
          <div style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            background: 'rgba(255,215,0,0.05)',
            border: '1px solid rgba(255,215,0,0.15)',
            borderRadius: 8,
            padding: '10px 14px',
            lineHeight: 1.6,
          }}>
            <strong style={{ color: '#FFD700' }}>How Rishis thought about similar situations.</strong>{' '}
            Every play below is a real historical investment by that Rishi in a stock with a similar profile to{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{stock.name}</strong> today.
            Their thesis then = a lens for you now.
          </div>

          {/* Market filter tabs */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['All', '🇮🇳 India', '🇺🇸 US', '🌐 Global'] as const).map(filter => (
              <span key={filter} style={{
                fontSize: 10,
                padding: '4px 12px',
                background: filter === 'All' ? 'rgba(255,215,0,0.15)' : 'var(--bg-secondary)',
                border: '1px solid rgba(255,215,0,0.3)',
                borderRadius: 20,
                color: filter === 'All' ? '#FFD700' : 'var(--text-muted)',
                cursor: 'default',
              }}>
                {filter}
              </span>
            ))}
          </div>

          {/* India plays first */}
          {relevantPlays.filter(p => p.market === 'India').length > 0 && (
            <div>
              <div style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                letterSpacing: 2,
                marginBottom: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                🇮🇳 INDIAN MARKET PLAYS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {relevantPlays.filter(p => p.market === 'India').map((play, i) => (
                  <PlayCard
                    key={i}
                    play={play}
                    relevanceNote={getRelevanceNote(play)}
                    onHover={handleHover}
                    onLeave={handleLeave}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Global plays */}
          {relevantPlays.filter(p => p.market !== 'India').length > 0 && (
            <div>
              <div style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                letterSpacing: 2,
                marginBottom: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                🌐 GLOBAL PLAYS — SAME PHILOSOPHY
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {relevantPlays.filter(p => p.market !== 'India').map((play, i) => (
                  <PlayCard
                    key={i}
                    play={play}
                    relevanceNote={getRelevanceNote(play)}
                    onHover={handleHover}
                    onLeave={handleLeave}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3 — TECHNICAL EDGE
      ══════════════════════════════════════════════════════════ */}
      {activeView === 'technical' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            marginBottom: 4,
            lineHeight: 1.6,
          }}>
            {stock.name} vs sector average on key Rishi metrics. Each bar shows where{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{stock.name}</strong> stands relative to peers.
          </div>
          {graphData.technicalEdge.map((comp, i) => (
            <TechnicalBar key={i} comp={comp} stockName={stock.name} />
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 4 — SIGNAL TIMELINE
      ══════════════════════════════════════════════════════════ */}
      {activeView === 'timeline' && (
        <div>
          <div style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            marginBottom: 20,
            lineHeight: 1.6,
          }}>
            When each Rishi's scoring model would have triggered based on{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{stock.name}</strong>'s evolving metrics.
            Higher scores = stronger conviction.
          </div>

          {/* Timeline track */}
          <div style={{ position: 'relative' }}>
            {/* Vertical line */}
            <div style={{
              position: 'absolute',
              left: 6,
              top: 0,
              bottom: 0,
              width: 2,
              background: 'linear-gradient(180deg, #FFD700, rgba(255,215,0,0.1))',
              borderRadius: 2,
            }} />

            {graphData.timeline.map((event, i) => (
              <TimelineCard
                key={i}
                event={event}
                onHover={handleHover}
                onLeave={handleLeave}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}