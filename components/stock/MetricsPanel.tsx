'use client';

import { Stock } from '../../lib/types';
import { MetricCard, StatGroup } from './StyleGuide';

interface Props {
  stock: Stock;
}

function getColor(value: number, threshold: number, inverse = false): 'green' | 'yellow' | 'red' {
  const good = inverse ? value < threshold : value > threshold;
  if (good) return 'green';
  if (Math.abs(value - threshold) < threshold * 0.2) return 'yellow';
  return 'red';
}

export function MetricsPanel({ stock }: Props) {
  if (!stock) return null;

  const metrics = [
    { label: 'P/E Ratio',     value: stock.pe,       unit: 'x',     threshold: 20,  inverse: true  },
    { label: 'ROE',           value: stock.roe,      unit: '%',     threshold: 15,  inverse: false },
    { label: 'ROCE',          value: stock.roce,     unit: '%',     threshold: 15,  inverse: false },
    { label: 'D/E Ratio',     value: stock.de,       unit: 'x',     threshold: 1,   inverse: true  },
    { label: 'OPM',           value: stock.opm,      unit: '%',     threshold: 10,  inverse: false },
    { label: 'Revenue CAGR',  value: stock.revcagr,  unit: '%',     threshold: 15,  inverse: false },
    { label: 'EPS CAGR',      value: stock.epscagr,  unit: '%',     threshold: 15,  inverse: false },
    { label: 'Mkt Cap',       value: stock.mktcap / 1000, unit: 'K Cr', threshold: 100, inverse: false },
  ];

  return (
    <div className="card-sacred p-6">
      <div className="philosophy-heading text-lg mb-6">Key Metrics</div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {metrics.map((m, idx) => (
          <MetricCard
            key={idx}
            label={m.label}
            value={m.value.toFixed(1)}
            unit={m.unit}
            color={getColor(m.value, m.threshold, m.inverse)}
          />
        ))}
      </div>

      <div className="pt-6 border-t border-border-primary">
        <div className="philosophy-subheading text-xs mb-4">VALUATION SNAPSHOT</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatGroup title="P/B Ratio" stats={[
            { label: 'Price / Book', value: stock.bvps > 0 ? (stock.price / stock.bvps).toFixed(2) : 'N/A', unit: 'x' }
          ]} />
          <StatGroup title="PEG Ratio" stats={[
            { label: 'P/E / Growth', value: (stock.pe && stock.epscagr) ? (stock.pe / stock.epscagr).toFixed(2) : 'N/A' }
          ]} />
          <StatGroup title="FCF Yield" stats={[
            { label: 'FCF / Mkt Cap', value: (stock.fcf && stock.mktcap) ? ((stock.fcf / stock.mktcap) * 100).toFixed(2) : 'N/A', unit: '%' }
          ]} />
          <StatGroup title="Promoter" stats={[
            { label: 'Promoter Hold', value: stock.promo.toFixed(1), unit: '%' }
          ]} />
        </div>
      </div>
    </div>
  );
}