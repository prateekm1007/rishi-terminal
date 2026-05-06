'use client';

import React from 'react';

// ─── MetricCard ───────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  trend?: number;
}

export function MetricCard({ label, value, unit, color = 'gold', size = 'md', trend }: MetricCardProps) {
  const colorMap = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    gold: '#FFD700',
  };

  const sizeMap = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' };

  return (
    <div style={{
      padding: '16px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '8px',
      border: '1px solid var(--border-primary, #2F3336)',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted, #565A5F)', marginBottom: '8px' }}>
        {label}
      </div>
      <div className={`${sizeMap[size]} font-bold font-mono ${color !== 'gold' ? colorMap[color] : ''}`}
        style={color === 'gold' ? { color: '#FFD700' } : {}}>
        {value}
        {unit && <span style={{ fontSize: '11px', marginLeft: '4px' }}>{unit}</span>}
      </div>
      {trend !== undefined && (
        <div style={{ fontSize: '11px', marginTop: '6px', color: trend > 0 ? '#00BA7C' : '#F4212E' }}>
          {trend > 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────
interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'green' | 'yellow' | 'red' | 'gold';
  showLabel?: boolean;
  animated?: boolean;
}

export function ProgressBar({ value, max = 100, color = 'gold', showLabel = true, animated = true }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const colorMap = {
    green: '#00BA7C',
    yellow: '#FFD700',
    red: '#F4212E',
    gold: '#FFD700',
  };

  return (
    <div>
      <div style={{ height: '8px', background: '#1C1F23', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: colorMap[color],
          borderRadius: '4px',
          transition: animated ? 'width 1s ease' : 'none',
        }} />
      </div>
      {showLabel && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted, #565A5F)', marginTop: '4px', textAlign: 'right' }}>
          {value.toFixed(1)} / {max}
        </div>
      )}
    </div>
  );
}

// ─── InfoBox ──────────────────────────────────────────────────────
interface InfoBoxProps {
  type: 'quote' | 'info' | 'warning' | 'success';
  children: React.ReactNode;
}

export function InfoBox({ type, children }: InfoBoxProps) {
  const styles: Record<string, React.CSSProperties> = {
    quote:   { background: 'rgba(255,215,0,0.08)',  borderLeft: '2px solid #FFD700', color: 'var(--text-secondary)' },
    info:    { background: 'rgba(29,155,240,0.08)', borderLeft: '2px solid #1D9BF0', color: 'var(--text-secondary)' },
    warning: { background: 'rgba(255,215,0,0.08)',  borderLeft: '2px solid #f59e0b', color: 'var(--text-secondary)' },
    success: { background: 'rgba(0,186,124,0.08)',  borderLeft: '2px solid #00BA7C', color: 'var(--text-secondary)' },
  };

  return (
    <div style={{ padding: '16px', borderRadius: '8px', fontStyle: 'italic', lineHeight: 1.8, ...styles[type] }}>
      {children}
    </div>
  );
}

// ─── StatGroup ────────────────────────────────────────────────────
interface StatGroupProps {
  title: string;
  stats: Array<{ label: string; value: string | number; unit?: string }>;
}

export function StatGroup({ title, stats }: StatGroupProps) {
  return (
    <div style={{
      padding: '16px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '8px',
      border: '1px solid var(--border-primary, #2F3336)',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted, #565A5F)', marginBottom: '12px', letterSpacing: '0.1em' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {stats.map((stat, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #565A5F)' }}>{stat.label}</span>
            <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
              {stat.value}{stat.unit && <span style={{ fontSize: '11px', marginLeft: '2px' }}>{stat.unit}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}