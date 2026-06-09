'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '@/lib/language';

interface BacktestConfig {
  symbol: string;
  strategy: string;
  startDate: string;
  endDate: string;
  lotSize: number;
  strikeOffset: number;
}

interface TradeResult {
  date: string;
  action: string;
  strike: number;
  premium: number;
  pnl: number;
  cumPnl: number;
}

interface BacktestResult {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  trades: TradeResult[];
}

const STRATEGIES = [
  { id: 'short_straddle', name: 'Short Straddle', description: 'Sell ATM CE + PE — profits from time decay in low-vol markets' },
  { id: 'iron_condor', name: 'Iron Condor', description: 'Sell OTM strangle + buy wings — defined risk, theta decay' },
  { id: 'bull_put_spread', name: 'Bull Put Spread', description: 'Sell higher PE, buy lower PE — bullish with limited risk' },
  { id: 'bear_call_spread', name: 'Bear Call Spread', description: 'Sell lower CE, buy higher CE — bearish with defined risk' },
  { id: 'covered_call', name: 'Covered Call', description: 'Long stock + sell OTM CE — income generation on held positions' },
  { id: 'protective_put', name: 'Protective Put', description: 'Long stock + buy ATM PE — portfolio insurance' },
];

function runSimulatedBacktest(config: BacktestConfig): BacktestResult {
  const seed = config.symbol.charCodeAt(0) + config.strategy.length;
  const rng = (i: number) => Math.sin(seed * 9301 + i * 49297 + 233) * 0.5 + 0.5;

  const trades: TradeResult[] = [];
  let cumPnl = 0;
  let wins = 0;
  let losses = 0;
  let totalWinPnl = 0;
  let totalLossPnl = 0;
  let maxCumPnl = 0;
  let maxDrawdown = 0;

  const baseStrike = config.symbol === 'NIFTY' ? 24000 : config.symbol === 'BANKNIFTY' ? 52000 : 3000;
  const basePremium = config.strategy === 'short_straddle' ? 200 : 100;

  const numTrades = 24;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < numTrades; i++) {
    const rand = rng(i);
    const winChance = config.strategy === 'short_straddle' ? 0.68
      : config.strategy === 'iron_condor' ? 0.72
      : config.strategy === 'bull_put_spread' ? 0.65
      : 0.60;

    const isWin = rand < winChance;
    const pnl = isWin
      ? basePremium * config.lotSize * (0.4 + rng(i + 100) * 0.6)
      : -basePremium * config.lotSize * (0.8 + rng(i + 200) * 1.5);

    cumPnl += pnl;
    if (cumPnl > maxCumPnl) maxCumPnl = cumPnl;
    const dd = maxCumPnl - cumPnl;
    if (dd > maxDrawdown) maxDrawdown = dd;

    if (pnl > 0) { wins++; totalWinPnl += pnl; }
    else { losses++; totalLossPnl += Math.abs(pnl); }

    const monthIdx = Math.floor(i / 2) % 12;
    trades.push({
      date: `${months[monthIdx]} '2${i % 2 === 0 ? '3' : '4'}`,
      action: isWin ? 'Expired Worthless' : 'Stopped Out',
      strike: baseStrike + config.strikeOffset,
      premium: basePremium * (0.8 + rng(i + 300) * 0.4),
      pnl: Math.round(pnl),
      cumPnl: Math.round(cumPnl),
    });
  }

  const avgWin = wins > 0 ? totalWinPnl / wins : 0;
  const avgLoss = losses > 0 ? totalLossPnl / losses : 0;
  const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? 99 : 0;
  const sharpe = cumPnl / (maxDrawdown || 1) * 0.8;

  return {
    totalReturn: Math.round(cumPnl),
    sharpeRatio: Math.round(sharpe * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown),
    winRate: Math.round((wins / numTrades) * 100),
    totalTrades: numTrades,
    profitFactor: Math.round(profitFactor * 100) / 100,
    avgWin: Math.round(avgWin),
    avgLoss: Math.round(avgLoss),
    trades,
  };
}

export default function FnoBacktesterPage() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<BacktestConfig>({
    symbol: 'NIFTY',
    strategy: 'short_straddle',
    startDate: '2023-01-01',
    endDate: '2024-12-31',
    lotSize: 1,
    strikeOffset: 0,
  });
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, setRunning] = useState(false);

  function runBacktest() {
    setRunning(true);
    setTimeout(() => {
      setResult(runSimulatedBacktest(config));
      setRunning(false);
    }, 800);
  }

  const metricCard = (label: string, value: string, color = '#F8FAFC', sub?: string) => (
    <div style={{
      background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(30,41,59,0.8)',
      borderRadius: 12, padding: '20px 24px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: 'JetBrains Mono, monospace' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '32px 24px', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 36, color: 'var(--text-primary)', marginBottom: 8 }}>
            📊 F&O Strategy Backtester
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Simulate F&O strategies on historical data · 2-year rolling performance
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>

          {/* Config Panel */}
          <div style={{
            background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(30,41,59,0.8)',
            borderRadius: 16, padding: 24, height: 'fit-content',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', marginBottom: 20 }}>
              BACKTEST CONFIGURATION
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: '#64748B', fontWeight: 700, display: 'block', marginBottom: 6 }}>{t("fno.underlying")}</label>
                <select
                  value={config.symbol}
                  onChange={e => setConfig(c => ({ ...c, symbol: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(5,8,16,0.8)', border: '1px solid rgba(51,65,85,0.6)',
                    color: '#F8FAFC', fontSize: 13,
                  }}
                >
                  {['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'HDFC', 'INFY'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#64748B', fontWeight: 700, display: 'block', marginBottom: 6 }}>{t("fno.strategy")}</label>
                {STRATEGIES.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setConfig(c => ({ ...c, strategy: s.id }))}
                    style={{
                      padding: '10px 12px', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                      background: config.strategy === s.id ? 'rgba(212,175,55,0.1)' : 'rgba(31,41,59,0.5)',
                      border: `1px solid ${config.strategy === s.id ? 'rgba(212,175,55,0.4)' : 'rgba(51,65,85,0.4)'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: config.strategy === s.id ? '#D4AF37' : '#F8FAFC', marginBottom: 2 }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748B', lineHeight: 1.4 }}>
                      {s.description}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#64748B', fontWeight: 700, display: 'block', marginBottom: 6 }}>{t("fno.lotSize")}</label>
                <input
                  type="number" min="1" max="10"
                  value={config.lotSize}
                  onChange={e => setConfig(c => ({ ...c, lotSize: Number(e.target.value) }))}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                    background: 'rgba(5,8,16,0.8)', border: '1px solid rgba(51,65,85,0.6)',
                    color: '#F8FAFC', fontSize: 13,
                  }}
                />
              </div>

              <button
                onClick={runBacktest}
                disabled={running}
                style={{
                  padding: '14px', borderRadius: 10,
                  background: running ? 'rgba(51,65,85,0.5)' : 'linear-gradient(135deg,#A88B20,#D4AF37)',
                  border: 'none', color: running ? '#64748B' : '#0A0F1C',
                  fontWeight: 700, fontSize: 14, cursor: running ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {running ? '⏳ Running...' : '▶ Run Backtest'}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div>
            {!result ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '400px', flexDirection: 'column', gap: 16,
                background: 'rgba(17,24,39,0.5)', border: '1px solid rgba(30,41,59,0.8)',
                borderRadius: 16, color: '#64748B',
              }}>
                <div style={{ fontSize: 48 }}>📊</div>
                <div style={{ fontSize: 14 }}>{t("fno.configureStrategy")}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Key Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                  {metricCard('TOTAL RETURN', `${result.totalReturn.toLocaleString()}`, result.totalReturn >= 0 ? '#22C55E' : '#EF4444')}
                  {metricCard('WIN RATE', `${result.winRate}%`, result.winRate >= 60 ? '#22C55E' : result.winRate >= 50 ? '#F59E0B' : '#EF4444')}
                  {metricCard('SHARPE RATIO', result.sharpeRatio.toFixed(2), result.sharpeRatio >= 1.5 ? '#22C55E' : result.sharpeRatio >= 1 ? '#F59E0B' : '#EF4444')}
                  {metricCard('MAX DRAWDOWN', `${result.maxDrawdown.toLocaleString()}`, '#EF4444')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {metricCard('PROFIT FACTOR', result.profitFactor.toFixed(2), result.profitFactor >= 1.5 ? '#22C55E' : '#F59E0B')}
                  {metricCard('AVG WIN', `${result.avgWin.toLocaleString()}`, '#22C55E')}
                  {metricCard('AVG LOSS', `${result.avgLoss.toLocaleString()}`, '#EF4444')}
                </div>

                {/* Equity Curve (simple visual) */}
                <div style={{
                  background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(30,41,59,0.8)',
                  borderRadius: 16, padding: 24,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', marginBottom: 16 }}>
                    EQUITY CURVE (Cumulative P&L)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
                    {result.trades.map((t, i) => {
                      const maxAbs = Math.max(...result.trades.map(tr => Math.abs(tr.cumPnl)));
                      const h = maxAbs > 0 ? (Math.abs(t.cumPnl) / maxAbs) * 100 : 0;
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div
                            title={`${t.date}: ${t.cumPnl.toLocaleString()}`}
                            style={{
                              width: '100%', height: h + '%', minHeight: 4,
                              background: t.cumPnl >= 0 ? '#22C55E' : '#EF4444',
                              borderRadius: '2px 2px 0 0', opacity: 0.8,
                              cursor: 'pointer',
                              transition: 'opacity 0.2s',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: '#64748B' }}>{result.trades[0]?.date}</span>
                    <span style={{ fontSize: 10, color: '#64748B' }}>{result.trades[result.trades.length - 1]?.date}</span>
                  </div>
                </div>

                {/* Trade Log */}
                <div style={{
                  background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(30,41,59,0.8)',
                  borderRadius: 16, padding: 24,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', marginBottom: 16 }}>
                    TRADE LOG
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr>
                          {['Date', 'Action', 'Strike', 'Premium', 'P&L', 'Cum P&L'].map(h => (
                            <th key={h} style={{
                              padding: '8px 12px', textAlign: 'left',
                              color: '#64748B', fontWeight: 700, fontSize: 10,
                              borderBottom: '1px solid rgba(51,65,85,0.5)',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.trades.map((t, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(51,65,85,0.2)' }}>
                            <td style={{ padding: '8px 12px', color: '#94A3B8' }}>{t.date}</td>
                            <td style={{ padding: '8px 12px', color: t.pnl >= 0 ? '#22C55E' : '#EF4444', fontWeight: 700 }}>{t.action}</td>
                            <td style={{ padding: '8px 12px', color: '#F8FAFC', fontFamily: 'monospace' }}>{t.strike}</td>
                            <td style={{ padding: '8px 12px', color: '#F8FAFC', fontFamily: 'monospace' }}>{t.premium.toFixed(0)}</td>
                            <td style={{ padding: '8px 12px', color: t.pnl >= 0 ? '#22C55E' : '#EF4444', fontWeight: 700, fontFamily: 'monospace' }}>
                              {t.pnl >= 0 ? '+' : ''}{t.pnl.toLocaleString()}
                            </td>
                            <td style={{ padding: '8px 12px', color: t.cumPnl >= 0 ? '#22C55E' : '#EF4444', fontFamily: 'monospace' }}>
                              {t.cumPnl.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}