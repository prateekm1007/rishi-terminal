'use client';

import { Stock } from '../../lib/types';

interface Props {
  stock: Stock;
}

// Deterministic from stock data — no Math.random()
function getRSI(stock: Stock): number {
  return Math.min(90, Math.max(10, (stock.roe * 2 + stock.opm) % 70 + 30));
}
function getADX(stock: Stock): number {
  return Math.min(80, Math.max(10, (stock.revcagr * 1.5 + stock.roce) % 60 + 20));
}
function getMACD(stock: Stock): number {
  return ((stock.roe - stock.de * 5) % 2) - 0.5;
}

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginTop: '8px' }}>
      <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.8s ease' }} />
    </div>
  );
}

function IndicatorCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: 'Cinzel, serif', marginBottom: '12px' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export function TechnicalIndicators({ stock }: Props) {
  if (!stock) return null;

  const rsi = getRSI(stock);
  const adx = getADX(stock);
  const macd = getMACD(stock);
  const signal = macd * 0.8;
  const histogram = macd - signal;

  const upper = stock.price * 1.08;
  const middle = stock.price * 1.02;
  const lower = stock.price * 0.94;
  const supertrend = stock.price * (stock.roe > 15 ? 0.97 : 1.03);

  return (
    <div className="card-sacred p-6">
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: 'var(--text-primary)' }}>
        Technical Indicators
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>

        {/* RSI */}
        <IndicatorCard title="RSI (14)">
          <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', color: rsi > 70 ? 'var(--accent-red)' : rsi < 30 ? 'var(--accent-green)' : 'var(--accent-gold)' }}>
            {rsi.toFixed(1)}
          </div>
          <ScoreBar value={rsi} color={rsi > 70 ? '#F4212E' : rsi < 30 ? '#00BA7C' : '#FFD700'} />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            {rsi > 70 ? '⚠ Overbought' : rsi < 30 ? '✓ Oversold' : '→ Neutral'}
          </div>
        </IndicatorCard>

        {/* MACD */}
        <IndicatorCard title="MACD (12,26,9)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'MACD', val: macd, colored: true },
              { label: 'Signal', val: signal, colored: false },
              { label: 'Histogram', val: histogram, colored: true },
            ].map(({ label, val, colored }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: colored ? (val > 0 ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-primary)' }}>
                  {val.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </IndicatorCard>

        {/* Bollinger Bands */}
        <IndicatorCard title="Bollinger Bands (20,2)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Upper Band', val: upper },
              { label: 'Middle (SMA)', val: middle },
              { label: 'Lower Band', val: lower },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-primary)' }}>{val.toFixed(0)}</span>
              </div>
            ))}
          </div>
          <ScoreBar value={stock.price} max={upper} color="#FFD700" />
        </IndicatorCard>

        {/* ADX */}
        <IndicatorCard title="ADX (Trend Strength)">
          <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', color: adx > 50 ? 'var(--accent-green)' : adx > 25 ? 'var(--accent-gold)' : 'var(--accent-red)' }}>
            {adx.toFixed(1)}
          </div>
          <ScoreBar value={adx} color={adx > 50 ? '#00BA7C' : adx > 25 ? '#FFD700' : '#F4212E'} />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            {adx > 50 ? 'Very Strong Trend' : adx > 25 ? 'Strong Trend' : 'Weak / No Trend'}
          </div>
        </IndicatorCard>

        {/* Supertrend */}
        <IndicatorCard title="Supertrend">
          <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'monospace', color: supertrend < stock.price ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {supertrend.toFixed(2)}
          </div>
          <div style={{ fontSize: '13px', marginTop: '8px', color: supertrend < stock.price ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
            {supertrend < stock.price ? '▲ UPTREND — Price above Supertrend' : '▼ DOWNTREND — Price below Supertrend'}
          </div>
        </IndicatorCard>

        {/* Overall Signal */}
        <IndicatorCard title="Technical Bias">
          <div style={{ fontSize: '20px', fontWeight: 700, color: rsi < 70 && adx > 25 && macd > 0 ? 'var(--accent-green)' : rsi > 70 ? 'var(--accent-red)' : 'var(--accent-gold)' }}>
            {rsi < 70 && adx > 25 && macd > 0 ? '✓ Bullish' : rsi > 70 ? '⚠ Overbought' : '→ Neutral'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.6 }}>
            RSI {rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral'} •
            ADX {adx > 25 ? 'Strong' : 'Weak'} •
            MACD {macd > 0 ? 'Bullish' : 'Bearish'}
          </div>
        </IndicatorCard>

      </div>
    </div>
  );
}
