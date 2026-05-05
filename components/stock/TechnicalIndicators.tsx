'use client';

interface TechnicalIndicator {
  name: string;
  value: string;
  signal: string;
  timeframe: string;
}

interface Props {
  technicals: TechnicalIndicator[];
}

const signalColor = (signal: string) => {
  if (signal === 'BUY') return { bg: 'bg-emerald-900/40', text: 'text-emerald-400', border: 'border-emerald-800' };
  if (signal === 'SELL') return { bg: 'bg-red-900/40', text: 'text-red-400', border: 'border-red-800' };
  return { bg: 'bg-amber-900/40', text: 'text-amber-400', border: 'border-amber-800' };
};

export function TechnicalIndicators({ technicals }: Props) {
  const pivots = [
    { level: 'R2', value: 3420, type: 'resistance' },
    { level: 'R1', value: 3310, type: 'resistance' },
    { level: 'PP', value: 3250, type: 'pivot' },
    { level: 'S1', value: 3180, type: 'support' },
    { level: 'S2', value: 3095, type: 'support' },
  ];

  const movingAvgs = [
    { period: 'SMA 20', value: 3215, signal: 'BUY', vsPrice: '+1.1%' },
    { period: 'SMA 50', value: 3180, signal: 'BUY', vsPrice: '+2.2%' },
    { period: 'SMA 200', value: 3050, signal: 'BUY', vsPrice: '+6.6%' },
    { period: 'EMA 20', value: 3235, signal: 'NEUTRAL', vsPrice: '+0.5%' },
  ];

  return (
    <div className="space-y-6">

      {/* Main Indicators */}
      <div style={{ border: '1px solid var(--border-primary)', background: 'var(--bg-card)', borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', letterSpacing: 1 }}>
          <span>TECHNICAL INDICATORS</span>
          <span style={{ color: 'var(--accent-green)' }}>8/10 BULLISH</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 16 }}>
          {technicals && technicals.length > 0 ? (
            technicals.map((tech, i) => {
              const colors = signalColor(tech.signal);
              return (
                <div key={i} style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 10, border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>
                    {tech.name}
                  </div>
                  <div style={{ fontSize: 18, fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                    {tech.value}
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: colors.bg === 'bg-emerald-900/40' ? 'rgba(16,185,129,0.15)' : colors.bg === 'bg-red-900/40' ? 'rgba(239,68,68,0.15)' : 'rgba(217,119,6,0.15)',
                    color: colors.text === 'text-emerald-400' ? 'var(--accent-green)' : colors.text === 'text-red-400' ? 'var(--accent-red)' : 'var(--accent-gold)',
                    border: '1px solid',
                    borderColor: colors.text === 'text-emerald-400' ? 'rgba(16,185,129,0.3)' : colors.text === 'text-red-400' ? 'rgba(239,68,68,0.3)' : 'rgba(217,119,6,0.3)',
                    fontWeight: 700,
                    display: 'inline-block',
                  }}>
                    {tech.signal}
                  </span>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
              <p style={{ fontSize: 13 }}>Technical data unavailable for this stock</p>
            </div>
          )}
        </div>
      </div>

      {/* Moving Averages Table */}
      <div style={{ border: '1px solid var(--border-primary)', background: 'var(--bg-card)', borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 1 }}>
          MOVING AVERAGES
        </div>
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border-primary)' }}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                <th style={{ textAlign: 'left', padding: 12, fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>PERIOD</th>
                <th style={{ textAlign: 'right', padding: 12, fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>VALUE</th>
                <th style={{ textAlign: 'right', padding: 12, fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>VS PRICE</th>
                <th style={{ textAlign: 'center', padding: 12, fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>SIGNAL</th>
              </tr>
            </thead>
            <tbody>
              {movingAvgs.map((ma, i) => {
                const colors = signalColor(ma.signal);
                return (
                  <tr key={i} style={{ borderBottom: i < movingAvgs.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
                    <td style={{ padding: 12, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>{ma.period}</td>
                    <td style={{ padding: 12, textAlign: 'right', fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>{ma.value.toLocaleString()}</td>
                    <td style={{ padding: 12, textAlign: 'right', fontFamily: 'JetBrains Mono', color: 'var(--accent-green)' }}>{ma.vsPrice}</td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <span style={{
                        fontSize: 10,
                        fontFamily: 'JetBrains Mono',
                        padding: '4px 12px',
                        borderRadius: 6,
                        background: colors.bg === 'bg-emerald-900/40' ? 'rgba(16,185,129,0.15)' : colors.bg === 'bg-red-900/40' ? 'rgba(239,68,68,0.15)' : 'rgba(217,119,6,0.15)',
                        color: colors.text === 'text-emerald-400' ? 'var(--accent-green)' : colors.text === 'text-red-400' ? 'var(--accent-red)' : 'var(--accent-gold)',
                        border: '1px solid',
                        borderColor: colors.text === 'text-emerald-400' ? 'rgba(16,185,129,0.3)' : colors.text === 'text-red-400' ? 'rgba(239,68,68,0.3)' : 'rgba(217,119,6,0.3)',
                        fontWeight: 700,
                        display: 'inline-block',
                      }}>
                        {ma.signal}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pivot Points */}
      <div style={{ border: '1px solid var(--border-primary)', background: 'var(--bg-card)', borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 1 }}>
          PIVOT POINTS (Standard)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pivots.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: 12, borderRadius: 10 }}>
              <span style={{
                fontSize: 10,
                fontFamily: 'JetBrains Mono',
                fontWeight: 700,
                color: p.type === 'resistance' ? 'var(--accent-red)' : p.type === 'support' ? 'var(--accent-green)' : 'var(--accent-gold)',
              }}>
                {p.level}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, color: 'var(--text-primary)', fontWeight: 700 }}>
                {p.value.toLocaleString()}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>
                {p.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* RSI, MACD, Bollinger */}
      <div style={{ border: '1px solid var(--border-primary)', background: 'var(--bg-card)', borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 1 }}>
          ADVANCED INDICATORS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { name: 'RSI (14)', value: '62', status: 'NEUTRAL', detail: 'Mid-range momentum' },
            { name: 'MACD', value: 'BULLISH', status: 'BUY', detail: 'Positive divergence' },
            { name: 'Bollinger Bands', value: 'NORMAL', status: 'NEUTRAL', detail: 'Trading within bands' },
            { name: 'ADX (14)', value: '28', status: 'BUY', detail: 'Strong trend detected' },
            { name: 'Stochastic', value: '68', status: 'NEUTRAL', detail: 'Approaching overbought' },
            { name: 'ATR', value: '45.2', status: 'NEUTRAL', detail: 'Moderate volatility' },
          ].map((ind, i) => (
            <div key={i} style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 10, borderLeft: '3px solid var(--accent-gold)' }}>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 6 }}>
                {ind.name}
              </div>
              <div style={{ fontSize: 18, fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                {ind.value}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: 1.5 }}>
                {ind.detail}
              </p>
              <span style={{
                fontSize: 9,
                fontFamily: 'JetBrains Mono',
                padding: '3px 8px',
                borderRadius: 4,
                marginTop: 8,
                display: 'inline-block',
                background: ind.status === 'BUY' ? 'rgba(16,185,129,0.15)' : ind.status === 'SELL' ? 'rgba(239,68,68,0.15)' : 'rgba(217,119,6,0.15)',
                color: ind.status === 'BUY' ? 'var(--accent-green)' : ind.status === 'SELL' ? 'var(--accent-red)' : 'var(--accent-gold)',
                fontWeight: 700,
              }}>
                {ind.status}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}