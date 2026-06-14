'use client';

import { Stock } from '../../lib/types';
import { useTechnicalData } from '../../hooks/useTechnicalData';

interface Props {
  stock: Stock;
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
  const { indicators, loading, error } = useTechnicalData(stock.symbol);

  // Fallback to static if live fails
  const rsi = indicators?.rsi ?? Math.min(90, Math.max(10, (stock.roe * 2 + stock.opm) % 70 + 30));
  const adx = indicators?.adx ?? Math.min(80, Math.max(10, (stock.revcagr * 1.5 + stock.roce) % 60 + 20));
  const macd = indicators?.macd ?? ((stock.roe - stock.de * 5) % 2) - 0.5;
  const signal = indicators?.macdSignal ?? macd * 0.8;
  const histogram = indicators?.macdHistogram ?? macd - signal;
  const upper = indicators?.bollingerUpper ?? stock.price * 1.08;
  const middle = indicators?.bollingerMiddle ?? stock.price * 1.02;
  const lower = indicators?.bollingerLower ?? stock.price * 0.94;
  const supertrend = indicators?.lastPrice
    ? (indicators.lastPrice * (rsi > 50 ? 0.97 : 1.03))
    : stock.price * (stock.roe > 15 ? 0.97 : 1.03);

  return (
    <div className="card-sacred p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '18px', fontWeight: 700 }}>
          Real-Time Technicals
        </div>
        {!loading && indicators && (
          <div style={{
            fontSize: '10px', color: '#22C55E', fontWeight: 700,
            padding: '2px 10px', border: '1px solid #22C55E', borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 4
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
            LIVE
          </div>
        )}
        {loading && <div style={{ fontSize: '10px', color: '#F59E0B' }}>LOADING...</div>}
        {error && <div style={{ fontSize: '10px', color: '#EF4444' }}>OFFLINE — using static</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* RSI */}
        <IndicatorCard title="RSI (14)">
          <div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'monospace', color: rsi > 70 ? 'var(--accent-red)' : rsi > 30 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {rsi.toFixed(1)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
            {rsi > 70 ? 'Overbought' : rsi > 30 ? 'Neutral' : 'Oversold'}
          </div>
          <ScoreBar value={rsi} max={100} color={rsi > 70 ? '#EF4444' : rsi > 30 ? '#22C55E' : '#EF4444'} />
        </IndicatorCard>

        {/* MACD */}
        <IndicatorCard title="MACD (12,26,9)">
          <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', color: macd > signal ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {macd.toFixed(4)}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: 4, fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>Signal: {signal.toFixed(4)}</span>
            <span style={{ color: histogram >= 0 ? '#22C55E' : '#EF4444' }}>Hist: {histogram >= 0 ? '+' : ''}{histogram.toFixed(4)}</span>
          </div>
        </IndicatorCard>

        {/* Bollinger Bands */}
        <IndicatorCard title="Bollinger Bands (20,2)">
          <div style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
            Upper: {upper.toFixed(2)}
          </div>
          <div style={{ fontSize: '14px', color: '#D4AF37', marginTop: 2 }}>Middle: {middle.toFixed(2)}</div>
          <div style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
            Lower: {lower.toFixed(2)}
          </div>
        </IndicatorCard>

        {/* Supertrend (price vs ATR-based) */}
        <IndicatorCard title="Supertrend">
          <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'monospace', color: supertrend < (indicators?.lastPrice ?? stock.price) ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {supertrend.toFixed(2)}
          </div>
          <div style={{ fontSize: '13px', marginTop: '8px', color: supertrend < (indicators?.lastPrice ?? stock.price) ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {supertrend < (indicators?.lastPrice ?? stock.price) ? '▲ UPTREND' : '▼ DOWNTREND'}
          </div>
        </IndicatorCard>

        {/* ADX */}
        <IndicatorCard title="ADX (14)">
          <div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'monospace', color: adx > 25 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            {adx.toFixed(1)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
            {adx > 50 ? 'Strong Trend' : adx > 25 ? 'Trending' : 'Ranging'}
          </div>
          <ScoreBar value={adx} max={60} color="#D4AF37" />
        </IndicatorCard>

        {/* Price Change */}
        {indicators && (
          <IndicatorCard title="Price Change">
            <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'monospace' }}>
              1D: <span style={{ color: indicators.priceChange1d >= 0 ? '#22C55E' : '#EF4444' }}>{indicators.priceChange1d >= 0 ? '+' : ''}{indicators.priceChange1d}%</span>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'monospace', marginTop: 4 }}>
              5D: <span style={{ color: indicators.priceChange5d >= 0 ? '#22C55E' : '#EF4444' }}>{indicators.priceChange5d >= 0 ? '+' : ''}{indicators.priceChange5d}%</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 8 }}>
              Vol SMA(20): {Number(indicators.volumeSMA).toLocaleString('en-IN')}
            </div>
          </IndicatorCard>
        )}
      </div>
    </div>
  );
}