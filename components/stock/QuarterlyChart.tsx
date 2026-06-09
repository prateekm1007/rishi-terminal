'use client';
import { useLanguage } from '../../lib/language';

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
  const { t } = useLanguage();
  if (!quarters || quarters.length === 0) return null;

  return (
    <div className="card-sacred p-6">
      <div className="philosophy-heading text-lg mb-6">{t("quarterly.title")}</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quarters.slice(0, 3).map((q, idx) => (
          <div key={idx} className="p-4 bg-secondary/50 rounded-lg border border-border-primary/50">
            <div className="philosophy-subheading text-xs mb-3">{q.quarter || 'N/A'}</div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted mb-1">{t("quarterly.revenue")}</div>
                <div className="text-xl font-bold font-mono">{q.revenue?.toLocaleString() || '0'}</div>
              </div>
              <div>
                <div className="text-xs text-muted mb-1">{t("quarterly.netProfit")}</div>
                <div className="text-xl font-bold font-mono text-green-400">
                  {q.netProfit?.toLocaleString() || '0'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted mb-1">{t("quarterly.margins")}</div>
                <div className="text-sm font-mono">{q.margins != null ? `${q.margins.toFixed(1)}%` : 'N/A'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}