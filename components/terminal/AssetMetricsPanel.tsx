'use client';
import { useLanguage } from '@/lib/language';

import type { UniversalAsset } from '../../lib/types/asset';
import { MetricCard, StatGroup } from './StyleGuide';
import { useFundamentals } from '@/hooks/useFundamentals';

interface Props {
  asset: UniversalAsset;
}

function getColor(value: number, threshold: number, inverse = false): 'green' | 'yellow' | 'red' {
  const good = inverse ? value < threshold : value > threshold;
  if (good) return 'green';
  if (Math.abs(value - threshold) < threshold * 0.2) return 'yellow';
  return 'red';
}

export function AssetMetricsPanel({ asset }: Props) {
  const { t } = useLanguage();
  const { fundamentals: liveFund, isLive } = useFundamentals(asset.symbol);
  if (!asset) return null;

  const metrics = [
    { label: 'P/E Ratio',     value: ((liveFund?.pe ?? asset.metadata?.pe ?? 0)),       unit: 'x',     threshold: 20,  inverse: true  },
    { label: 'ROE',           value: ((liveFund?.roe ?? asset.metadata?.roe ?? 0)),      unit: '%',     threshold: 15,  inverse: false },
    { label: 'ROCE',          value: ((liveFund?.roce ?? asset.metadata?.roce ?? 0)),     unit: '%',     threshold: 15,  inverse: false },
    { label: 'D/E Ratio',     value: (asset.metadata?.de ?? asset.metadata?.debt ?? 0),       unit: 'x',     threshold: 1,   inverse: true  },
    { label: 'OPM',           value: (asset.metadata?.opm || 0),      unit: '%',     threshold: 10,  inverse: false },
    { label: 'Revenue CAGR',  value: (asset.metadata?.revcagr || 0),  unit: '%',     threshold: 15,  inverse: false },
    { label: 'EPS CAGR',      value: (asset.metadata?.epscagr || 0),  unit: '%',     threshold: 15,  inverse: false },
    { label: 'Mkt Cap',       value: ((liveFund?.marketCap ? liveFund.marketCap / 10000000 : (asset.metadata?.marketCap ?? 0))) / 1000, unit: 'K Cr', threshold: 100, inverse: false },
  ];

  return (
    <div className="card-sacred p-6">
      <div className="philosophy-heading text-lg mb-6">{t("common.keyMetrics")}</div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {metrics.map((m, idx) => (
          <MetricCard
            key={idx}
            title={m.label}
            value={m.value.toFixed(1)}
            unit={m.unit}
            color={getColor(m.value, m.threshold, m.inverse)}
          />
        ))}
      </div>

      <div className="pt-6 border-t border-border-primary">
        <div className="philosophy-subheading text-xs mb-4">{t("common.valuationSnapshot")}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatGroup title="P/B Ratio" stats={[
            { label: 'Price / Book', value: ((liveFund?.bookValue ?? asset.metadata?.bvps ?? 1)) > 0 ? (asset.price / ((liveFund?.bookValue ?? asset.metadata?.bvps ?? 1))).toFixed(2) : 'N/A', unit: 'x' }
          ]} />
          <StatGroup title="PEG Ratio" stats={[
            { label: 'P/E / Growth', value: (((liveFund?.pe ?? asset.metadata?.pe ?? 0)) && (asset.metadata?.epscagr || 0)) ? (((liveFund?.pe ?? asset.metadata?.pe ?? 0)) / (asset.metadata?.epscagr || 0)).toFixed(2) : 'N/A' }
          ]} />
          <StatGroup title="FCF Yield" stats={[
            { label: 'FCF / Mkt Cap', value: ((asset.metadata?.fcf || 0) && ((liveFund?.marketCap ? liveFund.marketCap / 10000000 : (asset.metadata?.marketCap ?? 0)))) ? (((asset.metadata?.fcf || 0) / ((liveFund?.marketCap ? liveFund.marketCap / 10000000 : (asset.metadata?.marketCap ?? 0)))) * 100).toFixed(2) : 'N/A', unit: '%' }
          ]} />
          <StatGroup title="Promoter" stats={[
            { label: 'Promoter Hold', value: (asset.metadata?.promo || 0).toFixed(1), unit: '%' }
          ]} />
        </div>
      </div>
    </div>
  );
}
