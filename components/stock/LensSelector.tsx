'use client';

import { getAvailableLenses, RishiLens } from '../../lib/wisdom/lens';

interface Props {
  currentLens: string | null;
  onLensChange: (rishiName: string | null) => void;
}

export function LensSelector({ currentLens, onLensChange }: Props) {
  const lenses = getAvailableLenses();

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 24 }}>🎨</span>
        <div>
          <h3 style={{ fontSize: 16, fontFamily: 'Cinzel, serif', color: 'var(--text-primary)', marginBottom: 4 }}>
            Rishi Lens
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            View this stock through one investor's philosophy
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* Clear Lens Button */}
        <button
          onClick={() => onLensChange(null)}
          style={{
            padding: '10px 16px',
            background: currentLens === null ? 'var(--accent-gold)' : 'var(--bg-secondary)',
            color: currentLens === null ? '#000' : 'var(--text-secondary)',
            border: '1px solid',
            borderColor: currentLens === null ? 'var(--accent-gold)' : 'var(--border-primary)',
            borderRadius: 8,
            fontSize: 13,
            fontFamily: 'JetBrains Mono',
            cursor: 'pointer',
            fontWeight: currentLens === null ? 700 : 400,
            transition: 'all 0.2s ease',
          }}
        >
          All Rishis
        </button>

        {/* Individual Lens Buttons */}
        {lenses.map(lens => {
          const isActive = currentLens === lens.rishi;
          return (
            <button
              key={lens.rishi}
              onClick={() => onLensChange(lens.rishi)}
              style={{
                padding: '10px 16px',
                background: isActive ? lens.colorScheme.primary : 'var(--bg-secondary)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: isActive ? lens.colorScheme.primary : 'var(--border-primary)',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'JetBrains Mono',
                cursor: 'pointer',
                fontWeight: isActive ? 700 : 400,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>{lens.icon}</span>
              <span>{lens.rishi}</span>
            </button>
          );
        })}
      </div>

      {currentLens && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: 'var(--bg-secondary)',
            borderRadius: 8,
            borderLeft: `3px solid ${lenses.find(l => l.rishi === currentLens)?.colorScheme.primary}`,
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'JetBrains Mono' }}>
            ACTIVE LENS
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>
            {lenses.find(l => l.rishi === currentLens)?.fullName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            {lenses.find(l => l.rishi === currentLens)?.greeting}
          </div>
        </div>
      )}
    </div>
  );
}