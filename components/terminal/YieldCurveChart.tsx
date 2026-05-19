'use client';

import { BONDS } from '../../data/bonds';

const INDIA_CURVE = ['IN91DTB', 'IN182DTB', 'IN2YS', 'IN6YS', 'IN10YS', 'IN15YS'];
const US_CURVE    = ['US3MTB', 'US2Y', 'US5Y', 'US10Y', 'US30Y'];

function CurveSection({
  label,
  symbols,
  color,
}: {
  label: string;
  symbols: string[];
  color: string;
}) {
  const points = symbols
    .map(sym => BONDS.find(b => b.symbol === sym))
    .filter(Boolean)
    .map(b => ({ label: b!.maturityYears < 1 ? (b!.maturityYears * 12).toFixed(0) + 'M' : b!.maturityYears + 'Y', ytm: b!.ytm, symbol: b!.symbol }));

  if (points.length === 0) return null;

  const minYtm = Math.min(...points.map(p => p.ytm)) - 0.2;
  const maxYtm = Math.max(...points.map(p => p.ytm)) + 0.2;
  const range  = maxYtm - minYtm || 1;

  // SVG path
  const w = 400, h = 120, padX = 40, padY = 16;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  const toX = (i: number) => padX + (i / (points.length - 1)) * innerW;
  const toY = (ytm: number) => padY + innerH - ((ytm - minYtm) / range) * innerH;

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.ytm)}`).join(' ');
  const areaD = pathD + ` L ${toX(points.length - 1)} ${h} L ${toX(0)} ${h} Z`;

  return (
    <div style={{ flex: 1, minWidth: 280 }}>
      <div style={{ fontSize: 11, color, letterSpacing: 1.5, fontFamily: 'monospace', marginBottom: 12 }}>
        {label}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${label})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={p.symbol}>
            <circle cx={toX(i)} cy={toY(p.ytm)} r="4" fill={color} />
            <text x={toX(i)} y={h - 2} textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="monospace">
              {p.label}
            </text>
            <text x={toX(i)} y={toY(p.ytm) - 8} textAnchor="middle" fill={color} fontSize="9" fontFamily="monospace">
              {p.ytm.toFixed(2)}%
            </text>
          </g>
        ))}
      </svg>

      {/* Inversion check */}
      {points.length >= 2 && points[0].ytm > points[points.length - 1].ytm && (
        <div style={{
          marginTop: 8, fontSize: 10, padding: '4px 10px', borderRadius: 6,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#EF4444', fontFamily: 'monospace',
        }}>
          ⚠ Inverted curve — recession signal
        </div>
      )}
    </div>
  );
}

export function YieldCurveChart() {
  return (
    <div className="card-sacred" style={{ padding: 24, position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
        borderRadius: '12px 12px 0 0',
      }} />

      <div style={{ marginBottom: 20 }}>
        <div className="philosophy-heading" style={{ fontSize: 13, color: '#64748B', letterSpacing: 2 }}>
          YIELD CURVE
        </div>
        <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, opacity: 0.7 }}>
          Sovereign yield curves — shape reveals macro regime
        </div>
      </div>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <CurveSection label="INDIA G-SEC" symbols={INDIA_CURVE} color="#D4AF37" />
        <CurveSection label="US TREASURY" symbols={US_CURVE}    color="#60A5FA" />
      </div>
    </div>
  );
}