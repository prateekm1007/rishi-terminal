'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { STOCKS } from '../../data/stocks';
import { buildConsensus } from '../../lib/consensus';
import { runAllScorers } from '../../lib/consensus/orchestrator';
import type { RishiScore } from '../../lib/consensus/types';

// RISHI_PORTFOLIO_RATINGS_AO_V2

// Matches the canonical "Rishis" used across the engine/chat.
// Used only for ordering + coverage messaging (we still score via runAllScorers).
const RISHI_ORDER = [
  'Buffett',
  'Graham',
  'Soros',
  'Lynch',
  'Damani',
  'Jhunjhunwala',
  'Munger',
  'Pabrai',
  'HowardMarks',
  'SethKlarman',
  'Kacholia',
  'Kedia',
  'Porinju',
  'Raamdeo',
  'Nemish',
  'Basant',
  'PhilipFisher',
  'Greenblatt',
  'Templeton',
  'Schloss',
] as const;

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function scoreToSignal(score: number) {
  if (score >= 80) return 'STRONG_BUY';
  if (score >= 65) return 'BUY';
  if (score >= 45) return 'HOLD';
  if (score >= 30) return 'SELL';
  return 'STRONG_SELL';
}

function signalColor(signal: string) {
  switch (signal) {
    case 'STRONG_BUY':
    case 'BUY':
      return 'var(--accent-green)';
    case 'HOLD':
      return 'var(--text-secondary)';
    case 'SELL':
    case 'STRONG_SELL':
      return 'var(--accent-red)';
    default:
      return 'var(--text-secondary)';
  }
}

function ScoreBar({ score }: { score: number }) {
  const s = clamp(score);
  return (
    <div style={{ width: 140 }}>
      <div
        style={{
          height: 6,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 999,
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            width: `${s}%`,
            height: '100%',
            background: 'var(--accent-gold)',
          }}
        />
      </div>
    </div>
  );
}

export default function MyReturnsPage() {
  const asOf = useMemo(() => new Date().toLocaleString('en-IN'), []);

  const [startYear, setStartYear] = useState(2020);
  const [endYear, setEndYear] = useState(2025);

  const [holdings, setHoldings] = useState<Array<{ symbol: string; shares: number; buyPrice: number }>>([
    { symbol: 'RELIANCE', shares: 10, buyPrice: 2200 },
    { symbol: 'TCS', shares: 5, buyPrice: 3400 },
  ]);

  const [newSymbol, setNewSymbol] = useState('');
  const [newShares, setNewShares] = useState(10);

  const addHolding = () => {
    if (!newSymbol || !STOCKS[newSymbol.toUpperCase()]) return;
    const stock = STOCKS[newSymbol.toUpperCase()];
    setHoldings([
      ...holdings,
      {
        symbol: newSymbol.toUpperCase(),
        shares: newShares,
        buyPrice: stock.price * 0.8,
      },
    ]);
    setNewSymbol('');
  };

  const removeHolding = (idx: number) => {
    setHoldings(holdings.filter((_, i) => i !== idx));
  };

  const totalInvested = holdings.reduce((sum, h) => {
    const stock = STOCKS[h.symbol];
    return sum + h.buyPrice * h.shares;
  }, 0);

  const totalCurrent = holdings.reduce((sum, h) => {
    const stock = STOCKS[h.symbol];
    return sum + stock.price * h.shares;
  }, 0);

  const totalReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;
  const years = endYear - startYear;
  const cagr =
    years > 0 && totalInvested > 0 ? (Math.pow(totalCurrent / totalInvested, 1 / years) - 1) * 100 : 0;

  const holdingAnalytics = useMemo(() => {
    return holdings.map((h) => {
      const stock = STOCKS[h.symbol];
      const ret = ((stock.price - h.buyPrice) / h.buyPrice) * 100;

      const consensusResult = buildConsensus(stock);
      const consensusScore = consensusResult.consensus;
      const consensusSignal = scoreToSignal(consensusScore);

      let rishiScores: RishiScore[] = [];
      try {
        rishiScores = runAllScorers(stock);
      } catch {
        rishiScores = [];
      }

      const scoresOnly = rishiScores.map((s) => s.score);
      const maxScore = scoresOnly.length ? Math.max(...scoresOnly) : consensusScore;
      const minScore = scoresOnly.length ? Math.min(...scoresOnly) : consensusScore;
      const spread = Math.round(maxScore - minScore);

      const top = [...rishiScores].sort((a, b) => b.score - a.score).slice(0, 2);
      const low = [...rishiScores].sort((a, b) => a.score - b.score).slice(0, 1);

      return {
        holding: h,
        stock,
        ret,
        consensusScore,
        consensusSignal,
        spread,
        top,
        low,
        currentValue: stock.price * h.shares,
      };
    });
  }, [holdings]);

  const portfolioRishiRatings = useMemo(() => {
    const total = holdingAnalytics.reduce((s, x) => s + x.currentValue, 0);
    if (!total) return [];

    type Agg = { weightedSum: number; weightSum: number; full?: string; name?: string; label?: string };

    const agg = new Map<string, Agg>();

    for (const ha of holdingAnalytics) {
      const w = ha.currentValue / total;
      let scores: RishiScore[] = [];
      try {
        scores = runAllScorers(ha.stock);
      } catch {
        scores = [];
      }

      for (const rs of scores) {
        const label = rs.label || rs.name;
        const cur = agg.get(label) ?? { weightedSum: 0, weightSum: 0 };
        cur.weightedSum += rs.score * w;
        cur.weightSum += w;

        // keep a stable display name from engine output
        cur.full = cur.full ?? rs.full;
        cur.name = cur.name ?? rs.name;
        cur.label = cur.label ?? rs.label;

        agg.set(label, cur);
      }
    }

    const out = Array.from(agg.entries()).map(([label, v]) => {
      const score = v.weightSum > 0 ? v.weightedSum / v.weightSum : 0;
      return {
        rishi: label,
        full: v.full || v.name || label,
        score,
        rounded: Math.round(score),
        signal: scoreToSignal(score),
      };
    });

    // order by canonical list, then by score desc
    const orderIndex = (r: string) => {
      const idx = (RISHI_ORDER as readonly string[]).indexOf(r);
      return idx === -1 ? 999 : idx;
    };

    out.sort((a, b) => {
      const ai = orderIndex(a.rishi);
      const bi = orderIndex(b.rishi);
      if (ai !== bi) return ai - bi;
      return b.score - a.score;
    });

    return out;
  }, [holdingAnalytics]);

  const rishiCoverage = `${portfolioRishiRatings.length}/${RISHI_ORDER.length}`;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="content-wrapper">
          <div
            style={{
              fontSize: 11,
              fontFamily: 'monospace',
              color: 'var(--text-muted)',
              marginBottom: 12,
              letterSpacing: 2,
            }}
          >
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>
              RISHI TERMINAL
            </Link>
            {' > MY RETURNS'}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <h1
              className="philosophy-heading"
              style={{ fontSize: 32, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 8 }}
            >
              My Returns Calculator
            </h1>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--accent-gold)',
                  fontFamily: 'monospace',
                }}
              >
                AO
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>As of {asOf}</span>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 900, lineHeight: 1.7, marginBottom: 10 }}>
            Track your actual portfolio performance. Add stocks you own, see returns, CAGR, and how Rishis rate them.
          </p>

          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              lineHeight: 1.7,
              maxWidth: 980,
              border: '1px solid var(--border-subtle)',
              background: 'rgba(255,255,255,0.02)',
              padding: 12,
              borderRadius: 10,
            }}
          >
            <div style={{ fontFamily: 'monospace', letterSpacing: 1.2, marginBottom: 6 }}>
              DISCLAIMER (AO = Algorithmic Opinion)
            </div>
            <div>
              Portfolio ΓÇ£Rishi RatingsΓÇ¥ are generated by a multi-philosophy scoring engine (20 Rishis) using the appΓÇÖs available dataset and heuristics.
              This is for education/research only ΓÇö not investment advice.
            </div>
            <div style={{ marginTop: 6 }}>
              Coverage: <span style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{rishiCoverage}</span>{' '}
              ┬╖ See philosopher profiles: <Link href="/rishis" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>/rishis</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '28px 24px', maxWidth: 1200 }}>
        {/* Period Selector */}
        <div className="card-sacred" style={{ padding: 20, marginBottom: 24 }}>
          <div className="philosophy-heading" style={{ fontSize: 14, marginBottom: 16, letterSpacing: 2, color: 'var(--text-muted)' }}>
            HOLDING PERIOD
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Start Year</label>
              <input
                type="number"
                value={startYear}
                onChange={(e) => setStartYear(parseInt(e.target.value))}
                min={2015}
                max={2025}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>End Year</label>
              <input
                type="number"
                value={endYear}
                onChange={(e) => setEndYear(parseInt(e.target.value))}
                min={2015}
                max={2025}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          </div>
        </div>

        {/* Holdings */}
        <div className="card-sacred" style={{ padding: 20, marginBottom: 24 }}>
          <div className="philosophy-heading" style={{ fontSize: 14, marginBottom: 16, letterSpacing: 2, color: 'var(--text-muted)' }}>
            MY HOLDINGS
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>STOCK</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>SHARES</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>BUY PRICE</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>CURRENT</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>RETURN</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>AO (CONSENSUS + SPREAD)</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {holdingAnalytics.map((ha, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 0' }}>
                    <div style={{ fontWeight: 600 }}>{ha.stock.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{ha.holding.symbol}</div>
                  </td>

                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{ha.holding.shares}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{ha.holding.buyPrice.toFixed(0)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{ha.stock.price.toFixed(0)}</td>

                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: ha.ret >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }}>
                    {ha.ret >= 0 ? '+' : ''}{ha.ret.toFixed(1)}%
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'monospace', color: 'var(--accent-gold)', fontWeight: 800 }}>
                          {ha.consensusScore}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            letterSpacing: 1,
                            padding: '2px 8px',
                            borderRadius: 999,
                            border: '1px solid var(--border-subtle)',
                            color: signalColor(ha.consensusSignal),
                            fontFamily: 'monospace',
                          }}
                        >
                          {ha.consensusSignal}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          ╬ö{ha.spread}
                        </span>
                      </div>

                      <ScoreBar score={ha.consensusScore} />

                      <div style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 320, textAlign: 'right' }}>
                        {ha.top.length > 0 ? (
                          <>
                            Top: {ha.top.map((x) => `${x.label || x.name} ${Math.round(x.score)}`).join(', ')}
                            {ha.low.length > 0 ? ` ┬╖ Low: ${ha.low[0].label || ha.low[0].name} ${Math.round(ha.low[0].score)}` : ''}
                          </>
                        ) : (
                          <>Rishi breakdown unavailable</>
                        )}
                      </div>
                    </div>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => removeHolding(idx)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 16 }}>├ù</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px', gap: 12 }}>
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="Symbol (e.g., INFY)"
              style={{
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: 13,
              }}
            />
            <input
              type="number"
              value={newShares}
              onChange={(e) => setNewShares(parseInt(e.target.value))}
              placeholder="Shares"
              style={{
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: 13,
              }}
            />
            <button
              onClick={addHolding}
              style={{
                padding: '8px 12px',
                background: 'var(--accent-gold)',
                color: '#000',
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Portfolio-level philosopher ratings */}
        <div className="card-sacred" style={{ padding: 20, marginBottom: 24 }}>
          <div className="philosophy-heading" style={{ fontSize: 14, marginBottom: 6, letterSpacing: 2, color: 'var(--text-muted)' }}>
            PORTFOLIO ΓÇö AO BY RISHI (WEIGHTED BY CURRENT VALUE)
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
            Each RishiΓÇÖs portfolio score is the weighted average of their stock scores across your holdings (weights = current holding value).
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>RISHI</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>FULL NAME</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>SCORE</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>SIGNAL</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>BAR</th>
                </tr>
              </thead>

              <tbody>
                {portfolioRishiRatings.map((r) => (
                  <tr key={r.rishi} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 0', fontWeight: 700 }}>{r.rishi}</td>
                    <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>{r.full}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--accent-gold)', fontWeight: 800 }}>{r.rounded}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: signalColor(r.signal), fontWeight: 700 }}>{r.signal}</td>
                    <td style={{ textAlign: 'right', padding: '10px 0' }}>
                      <div style={{ display: 'inline-flex', justifyContent: 'flex-end' }}>
                        <ScoreBar score={r.score} />
                      </div>
                    </td>
                  </tr>
                ))}

                {portfolioRishiRatings.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '12px 0', color: 'var(--text-muted)' }}>
                      Add holdings to see portfolio-level Rishi ratings.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="card-sacred" style={{ padding: 20 }}>
          <div className="philosophy-heading" style={{ fontSize: 14, marginBottom: 16, letterSpacing: 2, color: 'var(--text-muted)' }}>
            PORTFOLIO SUMMARY
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Invested</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                {totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Current Value</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                {totalCurrent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Return</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: totalReturn >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>CAGR</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-gold)' }}>
                {cagr.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}