'use client';

import type { UniversalAsset } from '../../lib/types/asset';

interface Props {
  asset: UniversalAsset;
}

function ratingColor(rating: string): string {
  if (!rating) return '#64748B';
  if (rating.startsWith('AAA')) return '#22C55E';
  if (rating.startsWith('AA'))  return '#84CC16';
  if (rating.startsWith('A'))   return '#D4AF37';
  if (rating.startsWith('BBB')) return '#F59E0B';
  return '#EF4444';
}

function yieldColor(ytm: number): string {
  if (ytm >= 8)   return '#22C55E';
  if (ytm >= 6.5) return '#D4AF37';
  if (ytm >= 4)   return '#F59E0B';
  return '#EF4444';
}

function spreadColor(spread: number): string {
  if (spread === 0)   return '#64748B';
  if (spread <= 50)   return '#22C55E';
  if (spread <= 100)  return '#D4AF37';
  if (spread <= 200)  return '#F59E0B';
  return '#EF4444';
}

function durationLabel(duration: number): string {
  if (duration < 1)   return 'Ultra Short';
  if (duration < 3)   return 'Short';
  if (duration < 7)   return 'Medium';
  if (duration < 12)  return 'Long';
  return 'Ultra Long';
}

function typeColor(type: string): string {
  switch (type) {
    case 'G-Sec':       return '#22C55E';
    case 'SDL':         return '#84CC16';
    case 'T-Bill':      return '#D4AF37';
    case 'Corporate':   return '#F59E0B';
    case 'US-Treasury': return '#60A5FA';
    default:            return '#64748B';
  }
}

export function BondMetricsPanel({ asset }: Props) {
  if (!asset || asset.category !== 'bond') return null;

  const m = asset.metadata ?? {};

  const ytm          = m.ytm          ?? 0;
  const couponRate   = m.couponRate   ?? m.coupon ?? 0;
  const duration     = m.duration     ?? 0;
  const spread       = m.spread       ?? 0;
  const rating       = m.rating       ?? m.riskRating ?? '—';
  const maturityDate = m.maturityDate ?? '—';
  const maturityYears= m.maturityYears ?? 0;
  const marketPrice  = m.marketPrice  ?? 0;
  const issuer       = m.issuer       ?? '—';
  const type         = m.type         ?? '—';
  const country      = m.country      ?? '—';

  // Derived
  const realYield       = ytm - 5.0;           // rough: ytm minus assumed CPI
  const priceVsPar      = marketPrice - 100;   // discount / premium
  const interestRateSens = -(duration * 0.01 * marketPrice); // ~DV01 per 100 face

  const cell = (label: string, value: string, color = '#F8FAFC', sub?: string) => (
    <div style={{
      background: 'rgba(30,41,59,0.5)',
      border: '1px solid rgba(255,215,0,0.1)',
      borderRadius: 10,
      padding: '16px 18px',
    }}>
      <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1.5, marginBottom: 6, fontFamily: 'monospace' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'monospace', letterSpacing: 0.5 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );

  return (
    <div className="card-sacred" style={{ padding: 24 }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
        borderRadius: '12px 12px 0 0',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="philosophy-heading" style={{ fontSize: 13, color: '#64748B', letterSpacing: 2 }}>
            BOND METRICS
          </div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, opacity: 0.7 }}>
            {issuer} · {country}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{
            fontSize: 10, padding: '4px 10px', borderRadius: 6, fontFamily: 'monospace',
            background: typeColor(type) + '22',
            border: '1px solid ' + typeColor(type) + '55',
            color: typeColor(type),
          }}>
            {type}
          </span>
          <span style={{
            fontSize: 10, padding: '4px 10px', borderRadius: 6, fontFamily: 'monospace',
            background: ratingColor(rating) + '22',
            border: '1px solid ' + ratingColor(rating) + '55',
            color: ratingColor(rating),
          }}>
            {rating}
          </span>
        </div>
      </div>

      {/* Primary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {cell('YIELD TO MATURITY', ytm.toFixed(2) + '%', yieldColor(ytm), 'Annualised return if held to maturity')}
        {cell('COUPON RATE', couponRate.toFixed(2) + '%', '#D4AF37', 'Annual interest payment')}
        {cell('DURATION', duration.toFixed(1) + ' yrs', '#60A5FA', durationLabel(duration) + ' · interest rate sensitivity')}
        {cell('CREDIT SPREAD', spread === 0 ? 'Benchmark' : '+' + spread + ' bps', spreadColor(spread), spread === 0 ? 'Risk-free reference' : 'Spread over G-Sec')}
      </div>

      {/* Secondary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {cell('MARKET PRICE', '' + marketPrice.toFixed(2), priceVsPar >= 0 ? '#22C55E' : '#EF4444', priceVsPar >= 0 ? 'Trading at premium' : 'Trading at discount')}
        {cell('MATURITY', maturityDate, '#A78BFA', maturityYears.toFixed(1) + ' years remaining')}
        {cell('REAL YIELD (EST)', (realYield >= 0 ? '+' : '') + realYield.toFixed(2) + '%', realYield >= 0 ? '#22C55E' : '#EF4444', 'YTM minus assumed 5% CPI')}
        {cell('RATE SENSITIVITY', '' + Math.abs(interestRateSens).toFixed(2), '#F59E0B', 'Price change per 1% rate move')}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(255,215,0,0.1)', paddingTop: 16 }}>
        <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1.5, marginBottom: 10, fontFamily: 'monospace' }}>
          RISHI INTERPRETATION
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
          {ytm > 7.5
            ? `At ${ytm}% YTM, this bond offers attractive carry vs inflation. Duration of ${duration.toFixed(1)} years means moderate rate risk.`
            : ytm > 6
            ? `At ${ytm}% YTM, this bond offers reasonable carry. Suitable for capital preservation in a stable rate environment.`
            : `At ${ytm}% YTM, this bond offers limited real yield. Consider duration risk before adding exposure.`
          }
          {spread > 0 && ` Credit spread of ${spread}bps over G-Sec reflects ${rating} issuer quality.`}
        </div>
      </div>
    </div>
  );
}