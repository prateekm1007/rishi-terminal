'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { STOCKS } from '@/data/stocks/index';
import { buildConsensus } from '@/lib/consensus';
import { loadPortfolio, type PortfolioHolding } from '@/lib/portfolio/index';
import { useLivePrices } from '@/hooks/useLivePrices';

function formatCurrency(n: number): string {
  if (!Number.isFinite(n)) return 'Rs 0';
  if (n >= 10000000) return 'Rs ' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000)   return 'Rs ' + (n / 100000).toFixed(2) + ' L';
  return 'Rs ' + Math.round(n).toLocaleString('en-IN');
}

function plColor(n: number): string {
  return n > 0 ? '#22C55E' : n < 0 ? '#EF4444' : '#64748B';
}

function scoreColor(s: number): string {
  return s >= 75 ? '#22C55E' : s >= 55 ? '#D4AF37' : '#EF4444';
}

function scoreLabel(s: number): string {
  return s >= 75 ? 'High Conviction' : s >= 55 ? 'Balanced' : s >= 35 ? 'Philosophical Conflict' : 'Avoid';
}

export default function OverviewTab() {
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
      const invested = h.shares * h.avgPrice;
      const current = h.shares * livePrice;
      const pl = current - invested;
      const plPct = invested > 0 ? (pl / invested) * 100 : 0;
      const consensus = stock ? buildConsensus(stock) : null;
      const score = consensus?.consensus ?? 0;
      const sector = stock?.sector ?? 'Unknown';
      const topBull = consensus?.topBull?.full ?? '—';
      const topBear = consensus?.topBear?.full ?? '—';
      const tensionSpread = consensus?.tensionSpread ?? 0;
      const tension = consensus?.tension ?? '—';
      return { ...h, stock, livePrice, invested, current, pl, plPct, score, sector, topBull, topBear, tensionSpread, tension };
    });
  }, [holdings, prices]);

  const totals = useMemo(() => {
    const totalInvested = enriched.reduce((s, h) => s + h.invested, 0);
    const totalCurrent  = enriched.reduce((s, h) => s + h.current, 0);
    const totalPL = totalCurrent - totalInvested;
    const totalPLPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
    const weightedScore = enriched.length > 0
      ? enriched.reduce((s, h) => s + (h.score * h.current), 0) / Math.max(1, totalCurrent)
      : 0;
    const avgScore = Math.round(weightedScore);
    return { totalInvested, totalCurrent, totalPL, totalPLPct, avgScore };
  }, [enriched]);

  const sectorAlloc = useMemo(() => {
    const map: Record<string, number> = {};
    for (const h of enriched) {
      map[h.sector] = (map[h.sector] ?? 0) + h.current;
    }
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .map(([sector, val]) => ({ sector, val, pct: total > 0 ? (val / total) * 100 : 0 }))
      .sort((a, b) => b.val - a.val);
  }, [enriched]);

  const rishiCouncil = useMemo(() => {
    if (enriched.length === 0) return null;

    const bullCount: Record<string, number> = {};
    const bearCount: Record<string, number> = {};
    let totalSpread = 0;

    for (const h of enriched) {
      if (h.topBull !== '—') bullCount[h.topBull] = (bullCount[h.topBull] ?? 0) + 1;
      if (h.topBear !== '—') bearCount[h.topBear] = (bearCount[h.topBear] ?? 0) + 1;
      totalSpread += h.tensionSpread;
    }

    const portfolioBull = Object.entries(bullCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    const portfolioBear = Object.entries(bearCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    const avgSpread = enriched.length > 0 ? totalSpread / enriched.length : 0;

    const spreadLabel = avgSpread < 15 ? 'Strong Consensus'
      : avgSpread < 30 ? 'Moderate Divergence'
      : avgSpread < 50 ? 'Philosophical Tension'
      : 'Deep Conflict';

    return { portfolioBull, portfolioBear, avgSpread: Math.round(avgSpread), spreadLabel };
  }, [enriched]);

  const topHoldings = useMemo(() => {
    return [...enriched]
      .sort((a, b) => b.current - a.current)
      .slice(0, 5);
  }, [enriched]);

  const concentration = useMemo(() => {
    const total = totals.totalCurrent;
    if (total <= 0) return 0;
    return topHoldings.reduce((s, h) => s + h.current, 0) / total * 100;
  }, [topHoldings, totals.totalCurrent]);

  const card: React.CSSProperties = {
    padding: 20,
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(30,41,59,0.8)',
    borderRadius: 10,
  };

  const label: React.CSSProperties = {
    fontSize: 10,
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
  };

  // Empty state
  if (!loading && holdings.length === 0) {
    return (
      <div style={{ padding: 64, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>◉</div>
        <h2 style={{ color: '#D4AF37', fontFamily: 'monospace', fontSize: 20, marginBottom: 12 }}>
          Your Portfolio is Empty
        </h2>
        <p style={{ color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
          Add your first holding to see your portfolio overview, Rishi scores, and risk analysis.
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
          + Add First Holding
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Row 1: 4 summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <div style={card}>
          <div style={label}>Invested</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 20, color: '#E2E8F0' }}>
            {loading ? '—' : formatCurrency(totals.totalInvested)}
          </div>
        </div>

        <div style={card}>
          <div style={label}>Current Value</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 20, color: '#E2E8F0' }}>
            {loading ? '—' : formatCurrency(totals.totalCurrent)}
          </div>
        </div>

        <div style={card}>
          <div style={label}>Total P&L</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 20, color: plColor(totals.totalPL) }}>
            {loading ? '—' : formatCurrency(totals.totalPL)}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: plColor(totals.totalPLPct), marginTop: 4 }}>
            {loading ? '' : (totals.totalPLPct >= 0 ? '+' : '') + totals.totalPLPct.toFixed(2) + '%'}
          </div>
        </div>

        <div style={card}>
          <div style={label}>Portfolio Rishi Score</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 28, color: scoreColor(totals.avgScore) }}>
            {totals.avgScore}
          </div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{scoreLabel(totals.avgScore)}</div>
        </div>
      </div>

      {/* Row 2: Rishi Council + Risk */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Rishi Council */}
        <div style={{ ...card, borderLeft: '3px solid #D4AF37' }}>
          <div style={label}>Rishi Council Verdict</div>

          {rishiCouncil ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ padding: 12, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 6 }}>PORTFOLIO BULL</div>
                  <div style={{ color: '#22C55E', fontWeight: 800, fontSize: 13 }}>{rishiCouncil.portfolioBull}</div>
                </div>
                <div style={{ padding: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 6 }}>PORTFOLIO BEAR</div>
                  <div style={{ color: '#EF4444', fontWeight: 800, fontSize: 13 }}>{rishiCouncil.portfolioBear}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>
                  Disagreement Index: <span style={{ fontFamily: 'monospace', color: '#E2E8F0', fontWeight: 700 }}>{rishiCouncil.avgSpread}</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748B' }}>{rishiCouncil.spreadLabel}</div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748B' }}>Add holdings to see Rishi Council verdict</div>
          )}
        </div>

        {/* Risk Summary */}
        <div style={{ ...card, borderLeft: '3px solid rgba(212,175,55,0.4)' }}>
          <div style={label}>Risk Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#94A3B8' }}>Holdings</span>
              <span style={{ fontFamily: 'monospace', color: '#E2E8F0', fontWeight: 700 }}>{holdings.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#94A3B8' }}>Top 5 Concentration</span>
              <span style={{ fontFamily: 'monospace', color: concentration > 70 ? '#EF4444' : concentration > 50 ? '#D4AF37' : '#22C55E', fontWeight: 700 }}>
                {concentration.toFixed(1)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#94A3B8' }}>Sectors</span>
              <span style={{ fontFamily: 'monospace', color: '#E2E8F0', fontWeight: 700 }}>{sectorAlloc.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#94A3B8' }}>Avg Rishi Score</span>
              <span style={{ fontFamily: 'monospace', color: scoreColor(totals.avgScore), fontWeight: 700 }}>{totals.avgScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Sector Allocation + Top Holdings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Sector Allocation */}
        <div style={card}>
          <div style={label}>Sector Allocation</div>
          {sectorAlloc.length === 0 ? (
            <div style={{ color: '#64748B', fontSize: 13 }}>No data</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sectorAlloc.slice(0, 8).map(s => (
                <div key={s.sector}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>{s.sector}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#E2E8F0' }}>{s.pct.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(30,41,59,0.8)', borderRadius: 2 }}>
                    <div style={{
                      height: 4,
                      width: s.pct + '%',
                      background: 'linear-gradient(90deg, #D4AF37, rgba(212,175,55,0.5))',
                      borderRadius: 2,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 5 Holdings */}
        <div style={card}>
          <div style={label}>Top Holdings by Value</div>
          {topHoldings.length === 0 ? (
            <div style={{ color: '#64748B', fontSize: 13 }}>No holdings yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topHoldings.map(h => (
                <div key={h.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Link href={`/stock/${h.symbol}`} style={{ color: '#D4AF37', fontFamily: 'monospace', fontWeight: 800, textDecoration: 'none', fontSize: 13 }}>
                      {h.symbol}
                    </Link>
                    <span style={{ fontSize: 10, color: '#64748B', marginLeft: 8 }}>{h.sector}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#E2E8F0' }}>{formatCurrency(h.current)}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: plColor(h.plPct) }}>
                      {h.plPct >= 0 ? '+' : ''}{h.plPct.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: All holdings mini-table */}
      {enriched.length > 0 && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={label}>All Positions</div>
            <Link href="/lab?tab=holdings" style={{ fontSize: 11, color: '#D4AF37', textDecoration: 'none', fontFamily: 'monospace' }}>
              Manage Holdings →
            </Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(30,41,59,0.8)' }}>
                  {['Symbol','Sector','Score','LTP','Invested','Current','P&L%'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enriched.map(h => (
                  <tr key={h.symbol} style={{ borderBottom: '1px solid rgba(30,41,59,0.3)' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <Link href={`/stock/${h.symbol}`} style={{ color: '#D4AF37', fontFamily: 'monospace', fontWeight: 800, textDecoration: 'none' }}>{h.symbol}</Link>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#64748B', fontSize: 11 }}>{h.sector}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 800, color: scoreColor(h.score) }}>{h.score}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#94A3B8' }}>{h.livePrice.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#64748B' }}>{formatCurrency(h.invested)}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#E2E8F0' }}>{formatCurrency(h.current)}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 800, color: plColor(h.plPct) }}>
                      {h.plPct >= 0 ? '+' : ''}{h.plPct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}