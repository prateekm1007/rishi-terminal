'use client';

interface QuarterlyResult {
  quarter: string;
  revenue: number;
  netProfit: number;
  margins: number;
}

interface Props {
  quarters: QuarterlyResult[];
}

export function QuarterlyChart({ quarters }: Props) {
  if (!quarters || quarters.length === 0) {
    return (
      <div className="card-sacred p-6">
        <h3 className="philosophy-heading text-lg mb-4">Quarterly Results</h3>
        <div className="text-muted text-center">No quarterly data available</div>
      </div>
    );
  }

  return (
    <div className="card-sacred p-6">
      <h3 className="philosophy-heading text-lg mb-4">Quarterly Results</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quarters.slice(0, 3).map((q, idx) => (
          <div key={idx} className="p-4 bg-secondary border border-primary rounded-lg">
            <div className="text-xs text-muted mb-2">{q.quarter || 'N/A'}</div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-muted">Revenue</div>
                <div className="text-lg font-bold font-mono">
                  {q.revenue ? q.revenue.toLocaleString() : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Net Profit</div>
                <div className="text-lg font-bold font-mono text-green-400">
                  {q.netProfit ? q.netProfit.toLocaleString() : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Margins</div>
                <div className="text-sm font-mono">
                  {q.margins != null ? `${q.margins.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}