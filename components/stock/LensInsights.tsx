'use client';

import { RishiLens } from '../../lib/wisdom/lens';

interface Props {
  lens: RishiLens;
  warning: string | null;
  opportunity: string | null;
  keyMetrics: Array<{ label: string; value: string | number; priority: boolean }>;
  lensInsight: string;
}

export function LensInsights({ lens, warning, opportunity, keyMetrics, lensInsight }: Props) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `2px solid ${lens.colorScheme.primary}`,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 24,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: lens.colorScheme.primary,
          padding: '16px 24px',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>{lens.icon}</span>
          <div>
            <div style={{ fontSize: 18, fontFamily: 'Cinzel, serif', fontWeight: 700, marginBottom: 4 }}>
              {lens.fullName} Lens Active
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              {lens.philosophy}
            </div>
          </div>
        </div>
      </div>

      {/* Signals */}
      <div style={{ padding: 24 }}>
        {opportunity && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 14, color: 'var(--accent-green)', lineHeight: 1.6 }}>
              {opportunity}
            </div>
          </div>
        )}

        {warning && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 14, color: 'var(--accent-red)', lineHeight: 1.6 }}>
              {warning}
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              fontFamily: 'JetBrains Mono',
              color: 'var(--text-muted)',
              marginBottom: 12,
              letterSpacing: 1,
            }}
          >
            {lens.rishi.toUpperCase()} PRIORITY METRICS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
            {keyMetrics.slice(0, 5).map(metric => (
              <div
                key={metric.label}
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '12px',
                  borderRadius: 8,
                  borderLeft: `3px solid ${lens.colorScheme.accent}`,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontFamily: 'JetBrains Mono',
                    color: 'var(--text-muted)',
                    marginBottom: 4,
                  }}
                >
                  {metric.label}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontFamily: 'JetBrains Mono',
                    fontWeight: 700,
                    color: lens.colorScheme.primary,
                  }}
                >
                  {typeof metric.value === 'number' ? metric.value.toFixed(1) : metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lens Insight */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            padding: 16,
            borderRadius: 8,
            borderLeft: `3px solid ${lens.colorScheme.primary}`,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontFamily: 'JetBrains Mono',
              color: 'var(--text-muted)',
              marginBottom: 8,
              letterSpacing: 1,
            }}
          >
            {lens.rishi.toUpperCase()} INSIGHT
          </div>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {lensInsight}
          </p>
        </div>
      </div>
    </div>
  );
}