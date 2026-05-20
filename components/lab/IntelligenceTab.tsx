'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { STOCKS } from '@/data/stocks/index';
import { buildConsensus } from '@/lib/consensus';
import { loadPortfolio, type PortfolioHolding } from '@/lib/portfolio/index';
import { useLivePrices } from '@/hooks/useLivePrices';
import InfoTip from '@/components/lab/InfoTip';

function scoreColor(s: number): string {
  return s >= 75 ? '#22C55E' : s >= 55 ? '#D4AF37' : '#EF4444';
}

function scoreLabel(s: number): string {
  return s >= 75 ? 'High Conviction' : s >= 55 ? 'Balanced' : s >= 35 ? 'Conflict' : 'Avoid';
}

function spreadLabel(spread: number): string {
  return spread < 15 ? 'Strong Consensus'
    : spread < 30 ? 'Moderate Divergence'
    : spread < 50 ? 'Philosophical Tension'
    : 'Deep Conflict';
}

function spreadColor(spread: number): string {
  return spread < 15 ? '#22C55E' : spread < 30 ? '#D4AF37' : spread < 50 ? '#F97316' : '#EF4444';
}

export default function IntelligenceTab() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);

  useEffect(() => {
    setHoldings(loadPortfolio().holdings);
  }, []);

  const symbols = useMemo(() => holdings.map(h => h.symbol), [holdings]);
  const { prices, loading } = useLivePrices(symbols);

  const enriched = useMemo(() => {
    return holdings.map(h => {
      const stock = STOCKS[h.symbol];
      const livePrice = prices[h.symbol]?.price ?? stock?.price ?? h.avgPrice;
      const current = h.shares * livePrice;
      const consensus = stock ? buildConsensus(stock) : null;
      return {
        ...h,
        stock,
        current,
        consensus,
        score: consensus?.consensus ?? 0,
        scores: consensus?.scores ?? [],
        topBull: consensus?.topBull,
        topBear: consensus?.topBear,
        tensionSpread: consensus?.tensionSpread ?? 0,
        tension: consensus?.tension ?? '—',
        category: consensus?.category ?? '—',
      };
    });
  }, [holdings, prices]);

  // Per-Rishi average score across entire portfolio
  const rishiAverages = useMemo(() => {
    if (enriched.length === 0) return [];
    const map: Record<string, { total: number; count: number; full: string; origin: string }> = {};

    for (const h of enriched) {
      for (const rs of h.scores) {
        if (!map[rs.name]) map[rs.name] = { total: 0, count: 0, full: rs.full, origin: rs.origin };
        map[rs.name].total += rs.score;
        map[rs.name].count++;
      }
    }

    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        full: d.full,
        origin: d.origin,
        avg: Math.round(d.total / d.count),
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [enriched]);

  const portfolioBull = rishiAverages[0];
  const portfolioBear = rishiAverages[rishiAverages.length - 1];

  // Portfolio-wide disagreement
  const avgSpread = useMemo(() => {
    if (enriched.length === 0) return 0;
    return Math.round(enriched.reduce((s, h) => s + h.tensionSpread, 0) / enriched.length);
  }, [enriched]);

  // Knowledge gaps: holdings where ANY metric flags an issue
  const knowledgeGaps = useMemo(() => {
    return enriched.filter(h => h.score < 55 || h.tensionSpread > 40).map(h => ({
      symbol: h.symbol,
      name: h.stock?.name ?? h.symbol,
      score: h.score,
      spread: h.tensionSpread,
      issue: h.score < 55 && h.tensionSpread > 40
        ? 'Low score + High conflict'
        : h.score < 55
        ? 'Low Rishi conviction'
        : 'High philosophical conflict',
    }));
  }, [enriched]);

  // Conviction heatmap: top 6 Rishis vs all holdings
  const heatmapRishis = useMemo(() => rishiAverages.slice(0, 6).map(r => r.name), [rishiAverages]);
  // Top Conflict Pairs: holdings where Rishis disagree most
  const topConflicts = useMemo(() => {
    const conflicts: Array<{ symbol: string; name: string; bullRishi: string; bullScore: number; bearRishi: string; bearScore: number; spread: number }> = [];
    for (const h of enriched) {
      if (h.scores.length < 2) continue;
      const sorted = [...h.scores].sort((a, b) => b.score - a.score);
      const bull = sorted[0];
      const bear = sorted[sorted.length - 1];
      const spread = bull.score - bear.score;
      if (spread >= 25) {
        conflicts.push({
          symbol: h.symbol,
          name: h.stock?.name ?? h.symbol,
          bullRishi: bull.full,
          bullScore: bull.score,
          bearRishi: bear.full,
          bearScore: bear.score,
          spread,
        });
      }
    }
    return conflicts.sort((a, b) => b.spread - a.spread).slice(0, 6);
  }, [enriched]);

  // Knowledge Coverage %: % of portfolio where score >= 55 AND spread < 40
  const knowledgeCoverage = useMemo(() => {
    const total = enriched.reduce((s, h) => s + h.current, 0);
    if (total <= 0) return 0;
    const covered = enriched.filter(h => h.score >= 55 && h.tensionSpread < 40).reduce((s, h) => s + h.current, 0);
    return Math.round((covered / total) * 100);
  }, [enriched]);

  // Macro Regime Fit: cyclical vs defensive positioning
  const macroRegimeFit = useMemo(() => {
    const total = enriched.reduce((s, h) => s + h.current, 0);
    if (total <= 0) return { cyclical: 0, defensive: 0, label: 'Neutral', color: '#94A3B8' };

    const cyclicalSectors = new Set(['Energy', 'Infra', 'Metals', 'Auto', 'Realty', 'Banking', 'Capital Goods', 'Industrials']);
    const defensiveSectors = new Set(['Pharma', 'IT', 'FMCG', 'Utilities', 'Healthcare', 'Staples']);

    let cyclical = 0, defensive = 0;
    for (const h of enriched) {
      const sector = h.stock?.sector ?? 'Unknown';
      const w = h.current / total;
      if (cyclicalSectors.has(sector)) cyclical += w;
      else if (defensiveSectors.has(sector)) defensive += w;
    }

    const cyclicalPct = Math.round(cyclical * 100);
    const defensivePct = Math.round(defensive * 100);

    let label = 'Balanced';
    let color = '#D4AF37';
    if (cyclicalPct > 55) { label = 'Pro-Cyclical (Rising rates risk)'; color = '#F97316'; }
    else if (defensivePct > 55) { label = 'Defensive (Growth slowdown hedge)'; color = '#22C55E'; }
    else if (Math.abs(cyclicalPct - defensivePct) < 15) { label = 'Balanced Macro Exposure'; color = '#38BDF8'; }

    return { cyclical: cyclicalPct, defensive: defensivePct, label, color };
  }, [enriched]);

  // Rishi Affinity: Portfolio's philosophical DNA
  const rishiAffinity = useMemo(() => {
    if (!portfolioBull) return null;
    const philosophies: Record<string, string> = {
      'Buffett': 'Moat-driven quality compounder',
      'Munger': 'Anti-fragile, rational allocation',
      'Graham': 'Deep value, margin of safety',
      'Lynch': 'Growth at reasonable price',
      'Fisher': 'Innovation & secular tailwinds',
      'Damani': 'Capital-light retail dominance',
      'Jhunjhunwala': 'High-conviction asymmetric bets',
      'Klarman': 'Absolute return, risk-first',
      'Marks': 'Second-level contrarian thinking',
      'Greenblatt': 'Quality cheap stocks (Magic Formula)',
    };
    const philosophy = philosophies[portfolioBull.name] ?? 'Eclectic multi-philosophy blend';
    return { rishi: portfolioBull.full, philosophy, score: portfolioBull.avg };
  }, [portfolioBull]);


  const card: React.CSSProperties = {
    padding: 20,
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(30,41,59,0.8)',
    borderRadius: 10,
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
  };

  // Empty state
  if (!loading && holdings.length === 0) {
    return (
      <div style={{ padding: 64, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>◌</div>
        <h2 style={{ color: '#D4AF37', fontFamily: 'monospace', fontSize: 20, marginBottom: 12 }}>
          No Portfolio to Analyse
        </h2>
        <p style={{ color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
          Add holdings to get portfolio-level Rishi debate, disagreement index, and philosophy alignment.
        </p>
        <Link
          href="/lab?tab=holdings"
          style={{
            padding: '10px 24px',
            background: 'rgba(212,175,55,0.15)',
            border: '1px solid rgba(212,175,55,0.4)',
            borderRadius: 6,
            color: '#D4AF37',
            textDecoration: 'none',
            fontFamily: 'monospace',
            fontSize: 13,
            letterSpacing: 1,
          }}
        >
          + Add Holdings
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Row 1: Portfolio Debate Summary */}
      <div style={{ ...card, borderLeft: '3px solid #D4AF37' }}>
        <div style={sectionLabel}>Portfolio Rishi Debate</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16 }}>
          <div style={{ padding: 16, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 8 }}>MOST BULLISH ON PORTFOLIO</div>
            <div style={{ color: '#22C55E', fontWeight: 900, fontSize: 15 }}>{portfolioBull?.full ?? '—'}</div>
            <div style={{ fontFamily: 'monospace', color: '#22C55E', marginTop: 6 }}>Avg: {portfolioBull?.avg ?? 0}</div>
            <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>{portfolioBull?.origin ?? ''}</div>
          </div>

          <div style={{ padding: 16, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 8 }}><InfoTip term="Disagreement Index" icon={true}>DISAGREEMENT INDEX</InfoTip></div>
            <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 28, color: spreadColor(avgSpread) }}>{avgSpread}</div>
            <div style={{ fontSize: 12, color: spreadColor(avgSpread), marginTop: 6 }}>{spreadLabel(avgSpread)}</div>
            <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>Avg spread across {enriched.length} holding{enriched.length !== 1 ? 's' : ''}</div>
          </div>

          <div style={{ padding: 16, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 8 }}>MOST BEARISH ON PORTFOLIO</div>
            <div style={{ color: '#EF4444', fontWeight: 900, fontSize: 15 }}>{portfolioBear?.full ?? '—'}</div>
            <div style={{ fontFamily: 'monospace', color: '#EF4444', marginTop: 6 }}>Avg: {portfolioBear?.avg ?? 0}</div>
            <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>{portfolioBear?.origin ?? ''}</div>
          </div>
        </div>
      </div>

      {/* Row 2: Philosophy Alignment Table */}
      <div style={card}>
        <div style={sectionLabel}>Philosophy Alignment — All {rishiAverages.length} Rishis</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
          {rishiAverages.map((r, idx) => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(30,41,59,0.4)' }}>
              <div style={{ width: 24, fontFamily: 'monospace', fontSize: 11, color: '#64748B', textAlign: 'right' }}>
                #{idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 700 }}>{r.full}</div>
                <div style={{ fontSize: 10, color: '#64748B' }}>{r.origin}</div>
              </div>
              <div style={{ width: 100 }}>
                <div style={{ height: 4, background: 'rgba(30,41,59,0.8)', borderRadius: 2, marginBottom: 4 }}>
                  <div style={{ height: 4, width: r.avg + '%', background: scoreColor(r.avg), borderRadius: 2 }} />
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 900, color: scoreColor(r.avg), textAlign: 'right' }}>{r.avg}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Conviction Heatmap */}
      {enriched.length > 0 && heatmapRishis.length > 0 && (
        <div style={card}>
          <div style={sectionLabel}>Conviction Heatmap — Top 6 Rishis × Holdings</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748B', fontWeight: 600 }}>Symbol</th>
                  {heatmapRishis.map(r => (
                    <th key={r} style={{ padding: '8px 6px', textAlign: 'center', fontSize: 9, color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {r.slice(0, 8)}
                    </th>
                  ))}
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, color: '#64748B', fontWeight: 600 }}>Spread</th>
                </tr>
              </thead>
              <tbody>
                {enriched.map(h => {
                  const scoreByName: Record<string, number> = {};
                  for (const rs of h.scores) scoreByName[rs.name] = rs.score;
                  return (
                    <tr key={h.symbol} style={{ borderTop: '1px solid rgba(30,41,59,0.4)' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <Link href={`/stock/${h.symbol}`} style={{ color: '#D4AF37', fontFamily: 'monospace', fontWeight: 800, textDecoration: 'none' }}>
                          {h.symbol}
                        </Link>
                      </td>
                      {heatmapRishis.map(rName => {
                        const s = scoreByName[rName] ?? 0;
                        return (
                          <td key={rName} style={{ padding: '8px 6px', textAlign: 'center' }}>
                            <div style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: 4,
                              background: s >= 75 ? 'rgba(34,197,94,0.15)' : s >= 55 ? 'rgba(212,175,55,0.15)' : 'rgba(239,68,68,0.1)',
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: 11,
                              color: scoreColor(s),
                            }}>
                              {s}
                            </div>
                          </td>
                        );
                      })}
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: spreadColor(h.tensionSpread) }}>
                        {h.tensionSpread}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 4: Knowledge Gaps */}
      <div style={card}>
        <div style={sectionLabel}>Knowledge Gaps & Blind Spots</div>
        {knowledgeGaps.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#22C55E', fontSize: 13 }}>
            ✅ All holdings have strong Rishi conviction and low philosophical conflict
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {knowledgeGaps.map(g => (
              <div key={g.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
                <div>
                  <Link href={`/stock/${g.symbol}`} style={{ color: '#D4AF37', fontFamily: 'monospace', fontWeight: 800, textDecoration: 'none' }}>
                    {g.symbol}
                  </Link>
                  <span style={{ marginLeft: 10, fontSize: 12, color: '#94A3B8' }}>{g.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#EF4444' }}>{g.issue}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    Score: {g.score} | Spread: {g.spread}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Row 5: Per-holding debate */}
      <div style={card}>
        <div style={sectionLabel}>Per-Holding Rishi Verdict</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
          {enriched.map(h => (
            <div key={h.symbol} style={{ padding: 14, border: '1px solid rgba(30,41,59,0.8)', borderRadius: 8, background: 'rgba(15,23,42,0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <Link href={`/stock/${h.symbol}`} style={{ color: '#D4AF37', fontFamily: 'monospace', fontWeight: 900, textDecoration: 'none' }}>
                  {h.symbol}
                </Link>
                <span style={{ fontFamily: 'monospace', fontWeight: 900, color: scoreColor(h.score) }}>{h.score}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>{h.category}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ fontSize: 11 }}>
                  <span style={{ color: '#64748B' }}>Bull: </span>
                  <span style={{ color: '#22C55E', fontWeight: 700 }}>{h.topBull?.full ?? '—'}</span>
                </div>
                <div style={{ fontSize: 11 }}>
                  <span style={{ color: '#64748B' }}>Bear: </span>
                  <span style={{ color: '#EF4444', fontWeight: 700 }}>{h.topBear?.full ?? '—'}</span>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: spreadColor(h.tensionSpread) }}>
                {h.tension} (spread: {h.tensionSpread})
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Knowledge Coverage */}
      <div style={{ ...card, borderLeft: '3px solid #38BDF8' }}>
        <div style={sectionLabel}>Knowledge Coverage</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 48, fontWeight: 900, fontFamily: 'monospace', color: knowledgeCoverage >= 75 ? '#22C55E' : knowledgeCoverage >= 50 ? '#D4AF37' : '#EF4444' }}>
              {knowledgeCoverage}%
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
              of portfolio value has adequate conviction (score ≥ 55 + low conflict)
            </div>
          </div>
          <div style={{ width: 200, height: 10, background: 'rgba(30,41,59,0.8)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ width: knowledgeCoverage + '%', height: '100%', background: knowledgeCoverage >= 75 ? '#22C55E' : knowledgeCoverage >= 50 ? '#D4AF37' : '#EF4444', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      </div>

      {/* Top Conflict Pairs */}
      {topConflicts.length > 0 && (
        <div style={card}>
          <div style={sectionLabel}>Top Conflict Pairs — Sharpest Rishi Clashes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topConflicts.map(c => (
              <div key={c.symbol} style={{ padding: 14, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <Link href={`/stock/${c.symbol}`} style={{ color: '#D4AF37', fontFamily: 'monospace', fontWeight: 900, fontSize: 14, textDecoration: 'none' }}>
                    {c.symbol}
                  </Link>
                  <span style={{ fontSize: 11, color: '#64748B' }}>{c.name}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 11, color: '#22C55E', fontWeight: 700 }}>{c.bullRishi}</div>
                    <div style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 900, color: '#22C55E' }}>{c.bullScore}</div>
                  </div>
                  <div style={{ fontSize: 20, color: '#EF4444', fontWeight: 900 }}>⚔</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 700 }}>{c.bearRishi}</div>
                    <div style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 900, color: '#EF4444' }}>{c.bearScore}</div>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 10, color: '#F97316', textAlign: 'center' }}>
                  Spread: {c.spread} points — deep philosophical divide
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Macro Regime Fit */}
      <div style={card}>
        <div style={sectionLabel}>Macro Regime Fit</div>
        <div style={{ padding: 16, background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: macroRegimeFit.color, marginBottom: 12 }}>
            {macroRegimeFit.label}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6 }}>CYCLICAL EXPOSURE</div>
              <div style={{ fontSize: 24, fontFamily: 'monospace', fontWeight: 900, color: '#F97316' }}>
                {macroRegimeFit.cyclical}%
              </div>
              <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>
                Energy, Banking, Infra, Metals, Auto, Realty
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6 }}>DEFENSIVE EXPOSURE</div>
              <div style={{ fontSize: 24, fontFamily: 'monospace', fontWeight: 900, color: '#22C55E' }}>
                {macroRegimeFit.defensive}%
              </div>
              <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>
                IT, Pharma, FMCG, Healthcare, Staples
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rishi Affinity */}
      {rishiAffinity && (
        <div style={{ ...card, background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(15,23,42,0.6))' }}>
          <div style={sectionLabel}>◌ Your Portfolio's Rishi Affinity</div>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 6 }}>THIS PORTFOLIO MATCHES:</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#D4AF37', marginBottom: 10 }}>
              {rishiAffinity.rishi}
            </div>
            <div style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.7, marginBottom: 12 }}>
              Philosophy: <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{rishiAffinity.philosophy}</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748B' }}>
              Alignment Score: <span style={{ fontFamily: 'monospace', fontWeight: 900, color: scoreColor(rishiAffinity.score) }}>{rishiAffinity.score}/100</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
