'use client';

interface ShareholdingEntry {
  quarter: string;
  promoter: number;
  fii: number;
  dii: number;
  public: number;
}

interface Props {
  history: ShareholdingEntry[];
}

export function ShareholdingChart({ history }: Props) {
  if (!history || history.length === 0) return null;

  const latest = history[0];

  const data = [
    { label: 'Promoter', value: latest.promoter, color: '#10b981' },
    { label: 'FII', value: latest.fii, color: '#3b82f6' },
    { label: 'DII', value: latest.dii, color: '#f59e0b' },
    { label: 'Public', value: latest.public, color: '#71717a' },
  ];

  return (
    <div className="card-sacred p-6">
      <div className="philosophy-heading text-lg mb-6">Shareholding Pattern</div>
      <div className="philosophy-subheading text-xs text-muted mb-4">As of {latest.quarter}</div>

      {/* Stacked Bar */}
      <div className="h-12 flex rounded-lg overflow-hidden mb-6 border border-border-primary/50">
        {data.map((d, idx) => (
          <div
            key={idx}
            style={{ width: `${d.value}%`, backgroundColor: d.color }}
            className="transition-all duration-300 hover:opacity-80"
            title={`${d.label}: ${d.value.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {data.map((d, idx) => (
          <div key={idx} className="p-3 bg-secondary/50 rounded-lg border border-border-primary/50 text-center">
            <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: d.color }} />
            <div className="text-xs text-muted mb-1">{d.label}</div>
            <div className="text-lg font-bold font-mono">{d.value.toFixed(1)}%</div>
          </div>
        ))}
      </div>

      {/* Insights */}
      <div className="mt-6 pt-6 border-t border-border-primary">
        <div className="text-xs text-muted mb-2">📊 OWNERSHIP INSIGHTS</div>
        <div className="text-xs text-secondary">
          {latest.promoter > 50
            ? '✓ Strong promoter control'
            : latest.promoter > 30
              ? '→ Balanced ownership'
              : '⚠️ Dispersed ownership'}
          {latest.fii > latest.dii
            ? ' • FII dominant over DII'
            : ' • DII stronger than FII'}
        </div>
      </div>
    </div>
  );
}