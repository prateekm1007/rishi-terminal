'use client';

import { RishiScore } from '../../lib/types';
import { useEffect, useState } from 'react';

interface Props {
  scores: RishiScore[];
}

// Pure CSS/SVG radar chart — no recharts dependency issues
export function PhilosophyRadar({ scores }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!scores || scores.length === 0) return null;

  const data = scores.slice(0, 8).map(s => ({
    name: s.name.length > 9 ? s.name.substring(0, 9) : s.name,
    value: s.score,
    full: s.name,
    insight: s.insight ?? '',
  }));

  const N = data.length;
  const cx = 160;
  const cy = 160;
  const R = 110;
  const levels = 4;

  // Compute polygon points for each data point
  function polarToXY(index: number, value: number, maxR: number) {
    const angle = (Math.PI * 2 * index) / N - Math.PI / 2;
    const r = (value / 100) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  function labelXY(index: number) {
    const angle = (Math.PI * 2 * index) / N - Math.PI / 2;
    const r = R + 24;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  // Grid level polygons
  function levelPoints(level: number) {
    const r = (R * level) / levels;
    return Array.from({ length: N }, (_, i) => {
      const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
  }

  // Data polygon
  const dataPoints = data
    .map((d, i) => {
      const pt = polarToXY(i, d.value, R);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  const getColor = (score: number) =>
    score >= 75 ? '#22C55E' : score >= 55 ? '#D4AF37' : '#EF4444';

  return (
    <div style={{
      background: 'rgba(17,24,39,0.85)',
      border: '1px solid rgba(30,41,59,0.8)',
      borderRadius: 16,
      padding: 24,
    }}>
      <div style={{
        fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700,
        marginBottom: 20, color: '#F8FAFC',
      }}>
        Philosophy Radar
      </div>

      {/* SVG Radar */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <svg
          width={320}
          height={320}
          viewBox="0 0 320 320"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="radar-fill" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.05" />
            </radialGradient>
          </defs>

          {/* Grid levels */}
          {Array.from({ length: levels }, (_, i) => i + 1).map(level => (
            <polygon
              key={level}
              points={levelPoints(level)}
              fill="none"
              stroke="rgba(212,175,55,0.1)"
              strokeWidth={1}
            />
          ))}

          {/* Axis lines */}
          {data.map((_, i) => {
            const pt = polarToXY(i, 100, R);
            return (
              <line
                key={i}
                x1={cx} y1={cy}
                x2={pt.x} y2={pt.y}
                stroke="rgba(212,175,55,0.12)"
                strokeWidth={1}
              />
            );
          })}

          {/* Data polygon */}
          <polygon
            points={dataPoints}
            fill="url(#radar-fill)"
            stroke="#D4AF37"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((d, i) => {
            const pt = polarToXY(i, d.value, R);
            const color = getColor(d.value);
            return (
              <g key={i}>
                <circle cx={pt.x} cy={pt.y} r={5} fill={color} stroke="#0A0F1C" strokeWidth={2} />
                <circle cx={pt.x} cy={pt.y} r={9} fill={color} fillOpacity={0.15} />
              </g>
            );
          })}

          {/* Labels */}
          {data.map((d, i) => {
            const lp = labelXY(i);
            const color = getColor(d.value);
            const isLeft = lp.x < cx - 10;
            const isRight = lp.x > cx + 10;
            const anchor = isLeft ? 'end' : isRight ? 'start' : 'middle';
            return (
              <g key={i}>
                <text
                  x={lp.x}
                  y={lp.y - 5}
                  textAnchor={anchor}
                  fontSize={10}
                  fontWeight={700}
                  fill="#94A3B8"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {d.name}
                </text>
                <text
                  x={lp.x}
                  y={lp.y + 8}
                  textAnchor={anchor}
                  fontSize={11}
                  fontWeight={900}
                  fill={color}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {d.value}
                </text>
              </g>
            );
          })}

          {/* Center score */}
          {mounted && (
            <>
              <circle cx={cx} cy={cy} r={28} fill="rgba(212,175,55,0.08)" stroke="rgba(212,175,55,0.2)" strokeWidth={1} />
              <text x={cx} y={cy - 4} textAnchor="middle" fontSize={16} fontWeight={900} fill="#D4AF37" fontFamily="JetBrains Mono, monospace">
                {Math.round(data.reduce((s, d) => s + d.value, 0) / data.length)}
              </text>
              <text x={cx} y={cy + 10} textAnchor="middle" fontSize={8} fill="#64748B" fontFamily="JetBrains Mono, monospace">
                AVG
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Score Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 8,
            background: 'rgba(31,41,59,0.5)',
            border: '1px solid rgba(51,65,85,0.3)',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: getColor(d.value), flexShrink: 0,
            }} />
            <span style={{ fontSize: 11, color: '#94A3B8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.full}
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, color: getColor(d.value), fontFamily: 'JetBrains Mono, monospace' }}>
              {d.value}
            </span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: '#475569', textAlign: 'center', marginTop: 14 }}>
        Top 8 Rishis · Distance from center = conviction strength
      </div>
    </div>
  );
}