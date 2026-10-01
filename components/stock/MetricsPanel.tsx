'use client';
import { useLanguage } from '@/lib/language';
import { useFundamentals } from '@/hooks/useFundamentals';
import { MetricCard, StatGroup } from './StyleGuide';
import { DataValue } from '@/components/DataValue';
import type { ResolvedStockMetrics } from '@/lib/scoring';
import { derivedSourced, overlaySourced, type Sourced } from '@/lib/types/sourced';

interface Props {
  /**
   * N1 (round 3): the server-computed seed-baseline resolution (RSC
   * props from /stock/[symbol]). The live fundamentals fetched below
   * overlay it with overlaySourced — same pick() policy as the engine:
   * only a finite, strictly-positive live value overrides the baseline.
   */
  resolved: ResolvedStockMetrics;
}

function getColor(
  value: number | null,
  threshold: number,
  inverse = false,
): 'green' | 'yellow' | 'red' | undefined {
  if (value === null) return undefined; // DataValue shows "—"; keep neutral card
  const good = inverse ? value < threshold : value > threshold;
  if (good) return 'green';
  if (Math.abs(value - threshold) < threshold * 0.2) return 'yellow';
  return 'red';
}

/**
 * Key metrics (P0-06): the ONLY merge path is resolveStockMetrics — the
 * panel never mixes its own sources, and every number renders through
 * <DataValue> with source + as-of provenance. Derived ratios are marked
 * `derived` and claim an as-of only when their live inputs have one (R1).
 */
export function MetricsPanel({ resolved }: Props) {
  const { t } = useLanguage();
  const { fundamentals, isLive } = useFundamentals(resolved.symbol);

  if (!resolved) return null;

  // Live overlay on the server-resolved baseline (N1: the engine stays
  // server-side; overlaySourced applies the same >0 finite rule).
  const live = fundamentals;
  const vendor = live?.source;
  const asOf = live?.lastUpdated || null;
  const o = (base: Sourced<number>, v: number | null | undefined) =>
    overlaySourced(base, v, vendor, asOf);

  const s = {
    pe:      o(resolved.sourced.pe,      live?.pe),
    roe:     o(resolved.sourced.roe,     live?.roe),
    roce:    o(resolved.sourced.roce,    live?.roce),
    de:      o(resolved.sourced.de,      live?.debtToEquity),
    opm:     o(resolved.sourced.opm,     live?.opm),
    revcagr: o(resolved.sourced.revcagr, live?.revCagr3y),
    epscagr: o(resolved.sourced.epscagr, live?.epsCagr),
    // H3: live.marketCap is already ₹ Cr (the /api/fundamentals contract
    // unit) — the ÷1e7 here turned 1,577,229 Cr into 0.16, which then
    // replaced a valid 1.7M Cr baseline and exploded FCF yield to 28M %.
    mktcap:  o(resolved.sourced.mktcap,  live?.marketCap),
    bvps:    o(resolved.sourced.bvps,    live?.bookValue),
    promo:   o(resolved.sourced.promo,   live?.promoterHolding),
    pb:      resolved.sourced.pb,
    fcfMargin: resolved.sourced.fcfMargin,
  };

  const asOfOf = (...parts: Sourced<number>[]) =>
    parts.every(p => p.asOf) ? (parts.find(p => p.asOf) as Sourced<number>).asOf : null;

  // Derived valuation ratios — computed from the same sourced inputs
  // (live when a live overlay arrived, seed baseline otherwise).
  const peg: Sourced<number> = derivedSourced(
    s.pe.value !== null && s.epscagr.value !== null && s.epscagr.value > 0
      ? s.pe.value / s.epscagr.value
      : null,
    asOfOf(s.pe, s.epscagr),
  );
  const fcfYield: Sourced<number> = derivedSourced(
    s.mktcap.value !== null && resolved.stock.fcf > 0 && s.mktcap.value > 0
      ? (resolved.stock.fcf / s.mktcap.value) * 100
      : null,
    s.mktcap.asOf,
  );

  const metrics = [
    { label: 'P/E Ratio',    sourced: s.pe,      unit: 'x',    threshold: 20,  inverse: true  },
    { label: 'ROE',          sourced: s.roe,     unit: '%',    threshold: 15,  inverse: false },
    { label: 'ROCE',         sourced: s.roce,    unit: '%',    threshold: 15,  inverse: false },
    { label: 'D/E Ratio',    sourced: s.de,      unit: 'x',    threshold: 1,   inverse: true  },
    { label: 'OPM',          sourced: s.opm,     unit: '%',    threshold: 10,  inverse: false },
    { label: 'Revenue CAGR', sourced: s.revcagr, unit: '%',    threshold: 15,  inverse: false },
    { label: 'EPS CAGR',     sourced: s.epscagr, unit: '%',    threshold: 15,  inverse: false },
    { label: 'Mkt Cap',      sourced: s.mktcap,  unit: 'K Cr', threshold: 100, inverse: false, scale: 1000 },
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
        {metrics.map((m, idx) => {
          const display: Sourced<number> =
            m.scale && m.sourced.value !== null
              ? { ...m.sourced, value: m.sourced.value / m.scale }
              : m.sourced;
          return (
            <MetricCard
              key={idx}
              label={m.label}
              value={<DataValue sourced={display} unit={m.unit} />}
              color={getColor(m.sourced.value, m.threshold, m.inverse)}
            />
          );
        })}
      </div>

      <div className="pt-6 border-t border-border-primary">
        <div className="philosophy-subheading text-xs mb-4">{t("common.valuationSnapshot")}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatGroup title="P/B Ratio" stats={[
            { label: 'Price / Book', value: <DataValue sourced={s.pb} digits={2} unit="x" /> }
          ]} />
          <StatGroup title="PEG Ratio" stats={[
            { label: 'P/E / Growth', value: <DataValue sourced={peg} digits={2} /> }
          ]} />
          <StatGroup title="FCF Yield" stats={[
            { label: 'FCF / Mkt Cap', value: <DataValue sourced={fcfYield} digits={2} unit="%" /> }
          ]} />
          <StatGroup title="Promoter" stats={[
            { label: 'Promoter Hold', value: <DataValue sourced={s.promo} unit="%" /> }
          ]} />
        </div>
      </div>
    </div>
  );
}
