'use client';
import { useLanguage } from '@/lib/language';
import { useFundamentals } from '@/hooks/useFundamentals';
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
  const { t } = useLanguage();
  const { fundamentals, loading, isLive } = useFundamentals(stock.symbol);

  if (!stock) return null;

  // Merge live fundamentals over static stock data
  const pe = fundamentals?.pe ?? stock.pe;
  const roe = fundamentals?.roe ?? stock.roe;
  const roce = fundamentals?.roce ?? stock.roce;
  const mktcap = fundamentals?.marketCap && fundamentals.marketCap > 10000000
    ? fundamentals.marketCap / 10000000   // Yahoo returns absolute value, convert to Crores
    : stock.mktcap;                        // static data already in Crores
  const bvps = fundamentals?.bookValue ?? stock.bvps;
  const eps = fundamentals?.eps ?? (stock.np && stock.sh ? stock.np / stock.sh : 0);

  const metrics = [
    { label: 'P/E Ratio',     value: pe,             unit: 'x',     threshold: 20,  inverse: true  },
    { label: 'ROE',           value: roe,            unit: '%',     threshold: 15,  inverse: false },
    { label: 'ROCE',          value: roce,           unit: '%',     threshold: 15,  inverse: false },
    { label: 'D/E Ratio',     value: stock.de,       unit: 'x',     threshold: 1,   inverse: true  },
    { label: 'OPM',           value: stock.opm,      unit: '%',     threshold: 10,  inverse: false },
    { label: 'Revenue CAGR',  value: stock.revcagr,  unit: '%',     threshold: 15,  inverse: false },
    { label: 'EPS CAGR',      value: stock.epscagr,  unit: '%',     threshold: 15,  inverse: false },
    { label: 'Mkt Cap',       value: mktcap / 1000,  unit: 'K Cr',  threshold: 100, inverse: false },
  ];

  return (
    <div className="card-sacred p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div className="philosophy-heading text-lg">{t("common.keyMetrics")}</div>
        {isLive && (
          <div style={{
            padding: '4px 10px',
            background: 'rgba(34,197,94,0.15)',
            border: '1px solid rgba(34,197,94,0.4)',
            borderRadius: 6,
            fontSize: 10,
            color: '#22C55E',
            fontWeight: 700,
            letterSpacing: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
            LIVE
          </div>
        )}
      </div>

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
        <div className="philosophy-subheading text-xs mb-4">{t("common.valuationSnapshot")}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatGroup title="P/B Ratio" stats={[
            { label: 'Price / Book', value: bvps > 0 ? (stock.price / bvps).toFixed(2) : 'N/A', unit: 'x' }
          ]} />
          <StatGroup title="PEG Ratio" stats={[
            { label: 'P/E / Growth', value: (pe && stock.epscagr) ? (pe / stock.epscagr).toFixed(2) : 'N/A' }
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