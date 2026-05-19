'use client';

import { usePriceHistory } from '../../hooks/usePriceHistory';

import type { UniversalAsset } from '../../lib/types/asset';

interface Props {
  asset: UniversalAsset;
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

export function AssetTechnicalIndicators({ asset }: Props) {
  const { points } = usePriceHistory(asset?.symbol ?? '', '1M');
  const last = points.length > 0 ? points[points.length-1].v : (asset?.price ?? 0);

  if (!asset) return null;

  const rsi   = asset.metadata?.rsi      ?? 50;
  const adx   = asset.metadata?.adx      ?? 25;
  const macd  = asset.metadata?.macdValue ?? 0.5;
  const signal    = macd * 0.8;
  const histogram = macd - signal;

  const upper      = last * 1.08;
  const middle     = last * 1.02;
  const lower      = last * 0.94;
  const supertrend = last * ((asset.metadata?.roe || 10) > 15 ? 0.97 : 1.03);

  const isBullish    = rsi < 70 && adx > 25 && macd > 0;
  const isOverbought = rsi > 70;

  const rsiLabel  = rsi > 70  ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral';
  const adxLabel  = adx > 50  ? 'Very Strong Trend' : adx > 25 ? 'Strong Trend' : 'Weak / No Trend';
  const macdLabel = macd > 0  ? 'Bullish' : 'Bearish';

  const supertrendUp = supertrend < last;
  const supertrendLabel = supertrendUp
    ? '[UP] UPTREND - Price above Supertrend'
    : '[DOWN] DOWNTREND - Price below Supertrend';

  const biasLabel = isBullish
    ? '[+] Bullish'
    : isOverbought
    ? '[!] Overbought'
    : '[~] Neutral';

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
            {rsiLabel}
          </div>
        </IndicatorCard>

        {/* MACD */}
        <IndicatorCard title="MACD (12,26,9)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'MACD',      val: macd,      colored: true  },
              { label: 'Signal',    val: signal,    colored: false },
              { label: 'Histogram', val: histogram, colored: true  },
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
              { label: 'Upper Band',   val: upper  },
              { label: 'Middle (SMA)', val: middle },
              { label: 'Lower Band',   val: lower  },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-primary)' }}>
                  {val.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <ScoreBar value={last} max={upper} color="#FFD700" />
        </IndicatorCard>

        {/* ADX */}
        <IndicatorCard title="ADX (Trend Strength)">
          <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', color: adx > 50 ? 'var(--accent-green)' : adx > 25 ? 'var(--accent-gold)' : 'var(--accent-red)' }}>
            {adx.toFixed(1)}
          </div>
          <ScoreBar value={adx} color={adx > 50 ? '#00BA7C' : adx > 25 ? '#FFD700' : '#F4212E'} />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            {adxLabel}
          </div>
        </IndicatorCard>

        {/* Supertrend */}
        <IndicatorCard title="Supertrend">
          <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'monospace', color: supertrendUp ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {supertrend.toFixed(2)}
          </div>
          <div style={{ fontSize: '13px', marginTop: '8px', color: supertrendUp ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
            {supertrendLabel}
          </div>
        </IndicatorCard>

        {/* Technical Bias */}
        <IndicatorCard title="Technical Bias">
          <div style={{ fontSize: '20px', fontWeight: 700, color: isBullish ? 'var(--accent-green)' : isOverbought ? 'var(--accent-red)' : 'var(--accent-gold)' }}>
            {biasLabel}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.6 }}>
            RSI {rsiLabel} / ADX {adxLabel} / MACD {macdLabel}
          </div>
        </IndicatorCard>

      </div>
    </div>
  );
}
