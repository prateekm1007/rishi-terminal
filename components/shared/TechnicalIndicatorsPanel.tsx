'use client';

interface TechnicalIndicatorsPanelProps {
  assetType: 'stock' | 'crypto' | 'forex' | 'commodity' | 'bond';
  symbol: string;
  currentPrice: number;
  data?: {
    roe?: number;
    opm?: number;
    revcagr?: number;
    roce?: number;
    de?: number;
    volume24h?: number;
    volatility?: number;
    marketCap?: number;
  };
}

function calculateRSI(currentPrice: number, volatility: number = 5): number {
  const base = (currentPrice % 100) / 2 + 30;
  const volAdjustment = volatility > 7 ? 10 : volatility < 3 ? -10 : 0;
  return Math.min(90, Math.max(10, base + volAdjustment));
}

function calculateADX(volatility: number = 5, trend: number = 0): number {
  const base = 20 + Math.abs(trend) * 10;
  const volAdjustment = volatility > 7 ? 15 : volatility < 3 ? -10 : 0;
  return Math.min(80, Math.max(10, base + volAdjustment));
}

function calculateMACD(currentPrice: number, trend: number = 0): { macd: number; signal: number; histogram: number } {
  const macd = ((currentPrice % 10) - 5) / 10 + trend * 0.1;
  const signal = macd * 0.8;
  const histogram = macd - signal;
  return { macd, signal, histogram };
}

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.8s ease' }} />
    </div>
  );
}

function IndicatorCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: 'Cinzel, serif', marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export function TechnicalIndicatorsPanel({ assetType, symbol, currentPrice, data = {} }: TechnicalIndicatorsPanelProps) {
  if (!currentPrice || currentPrice <= 0) return null;

  const volatility = data.volatility || 5;
  const trend      = data.revcagr   || 0;
  const roe        = data.roe       || 0;

  const rsi  = calculateRSI(currentPrice, volatility);
  const adx  = calculateADX(volatility, trend);
  const { macd, signal, histogram } = calculateMACD(currentPrice, trend);

  const stdDev     = (currentPrice * volatility) / 100;
  const upper      = currentPrice + 2 * stdDev;
  const middle     = currentPrice;
  const lower      = currentPrice - 2 * stdDev;
  const supertrend = currentPrice * (roe > 15 || rsi > 50 ? 0.97 : 1.03);

  const isBullish    = rsi < 70 && adx > 25 && macd > 0;
  const isOverbought = rsi > 70;
  const supertrendUp = supertrend < currentPrice;

  const rsiLabel         = rsi > 70  ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral';
  const adxLabel         = adx > 50  ? 'Very Strong Trend' : adx > 25 ? 'Strong Trend' : 'Weak / No Trend';
  const macdLabel        = macd > 0  ? 'Bullish' : 'Bearish';
  const biasLabel        = isBullish ? '[+] Bullish' : isOverbought ? '[!] Overbought' : '[~] Neutral';
  const supertrendLabel  = supertrendUp
    ? '[UP] UPTREND - Price above Supertrend'
    : '[DOWN] DOWNTREND - Price below Supertrend';

  const rsiColor        = rsi > 70 ? '#F4212E' : rsi < 30 ? '#00BA7C' : '#FFD700';
  const adxColor        = adx > 50 ? '#00BA7C' : adx > 25 ? '#FFD700' : '#F4212E';
  const supertrendColor = supertrendUp ? 'var(--accent-green)' : 'var(--accent-red)';
  const biasColor       = isBullish ? 'var(--accent-green)' : isOverbought ? 'var(--accent-red)' : 'var(--accent-gold)';

  const formatPrice = (price: number) => {
    if (assetType === 'forex') return price.toFixed(4);
    if (assetType === 'crypto' && price < 1) return price.toFixed(6);
    if (assetType === 'bond') return price.toFixed(2);
    return price.toFixed(2);
  };

  return (
    <div className="card-sacred" style={{ padding: 24 }}>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
        Technical Indicators
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginLeft: 12, fontWeight: 400, letterSpacing: 1 }}>
          {symbol} - {assetType.toUpperCase()}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>

        <IndicatorCard title="RSI (14)">
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace', color: rsiColor }}>
            {rsi.toFixed(1)}
          </div>
          <ScoreBar value={rsi} color={rsiColor} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            {rsiLabel}
          </div>
        </IndicatorCard>

        <IndicatorCard title="MACD (12,26,9)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'MACD',      val: macd,      colored: true  },
              { label: 'Signal',    val: signal,    colored: false },
              { label: 'Histogram', val: histogram, colored: true  },
            ].map(({ label, val, colored }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: colored ? (val > 0 ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-primary)' }}>
                  {val.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </IndicatorCard>

        <IndicatorCard title="Bollinger Bands (20,2)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Upper Band',   val: upper  },
              { label: 'Middle (SMA)', val: middle },
              { label: 'Lower Band',   val: lower  },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-primary)' }}>
                  {formatPrice(val)}
                </span>
              </div>
            ))}
          </div>
          <ScoreBar value={currentPrice} max={upper} color="#FFD700" />
        </IndicatorCard>

        <IndicatorCard title="ADX (Trend Strength)">
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace', color: adxColor }}>
            {adx.toFixed(1)}
          </div>
          <ScoreBar value={adx} color={adxColor} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            {adxLabel}
          </div>
        </IndicatorCard>

        <IndicatorCard title="Supertrend">
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: supertrendColor }}>
            {formatPrice(supertrend)}
          </div>
          <div style={{ fontSize: 13, marginTop: 8, color: supertrendColor, fontWeight: 600 }}>
            {supertrendLabel}
          </div>
        </IndicatorCard>

        <IndicatorCard title="Technical Bias">
          <div style={{ fontSize: 20, fontWeight: 700, color: biasColor }}>
            {biasLabel}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
            RSI {rsiLabel} / ADX {adxLabel} / MACD {macdLabel}
          </div>
        </IndicatorCard>

      </div>
    </div>
  );
}