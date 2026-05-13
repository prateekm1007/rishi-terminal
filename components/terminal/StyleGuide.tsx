'use client';

import React from 'react';

// ProgressBar
interface ProgressBarProps {
  value:   number;
  color?:  string;
  height?: number;
}

export function ProgressBar({ value, color = '#D4AF37', height = 8 }: ProgressBarProps) {
  return (
    <div style={{
      width: '100%', height,
      background: 'rgba(255,255,255,0.08)',
      borderRadius: 999, overflow: 'hidden',
    }}>
      <div style={{
        width: `${Math.max(0, Math.min(100, value))}%`,
        height: '100%', background: color, borderRadius: 999,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );
}

// MetricCard
interface MetricCardProps {
  title:  string;
  value:  React.ReactNode;
  label?: string;
  unit?:  string;
  color?: 'green' | 'yellow' | 'red';
}

export function MetricCard({ title, value, label, unit, color }: MetricCardProps) {
  const colorMap = {
    green:  '#22C55E',
    yellow: '#D4AF37',
    red:    '#EF4444',
  };

  const textColor = color ? colorMap[color] : '#F8FAFC';

  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: '#111827',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>
        {title || label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: textColor }}>
        {value}{unit && <span style={{ fontSize: 12, color: '#64748B', marginLeft: 4 }}>{unit}</span>}
      </div>
    </div>
  );
}

// StatGroup
interface StatGroupProps {
  title?:    string;
  children?: React.ReactNode;
  stats?:    { label: string; value: string | number; unit?: string }[];
}

export function StatGroup({ title, children, stats }: StatGroupProps) {
  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: '#111827',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {title && (
        <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8, letterSpacing: 1 }}>
          {title}
        </div>
      )}
      {stats && stats.map((s, i) => (
        <div key={i} style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
          {s.value}{s.unit && <span style={{ fontSize: 11, color: '#64748B', marginLeft: 4 }}>{s.unit}</span>}
        </div>
      ))}
      {children}
    </div>
  );
}
