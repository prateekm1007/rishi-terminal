'use client';
import { useLanguage } from '@/lib/language';
import { useFundamentals } from '@/hooks/useFundamentals';
import { MetricCard, StatGroup } from './StyleGuide';
import { DataValue } from '@/components/DataValue';
import type { ResolvedStockMetrics } from '@/lib/scoring';
import { derivedSourced, dropSeedPlaceholderZero, overlaySourced, type Sourced } from '@/lib/types/sourced';

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
  // server-side; overlaySourced applies the field's admissibility rule —
  // G5: the canonical field key is passed so legitimate zero/negative
  // observations override the baseline instead of being reinterpreted).
  const live = fundamentals;
  const vendor = live?.source;
  const asOf = live?.lastUpdated || null;
  const o = (base: Sourced<number>, v: number | null | undefined, field: string) =>
    overlaySourced(base, v, vendor, asOf, field);

  const s = {
    pe:      o(resolved.sourced.pe,      live?.pe,          'pe'),
    roe:     o(resolved.sourced.roe,     live?.roe,         'roe'),
    roce:    o(resolved.sourced.roce,    live?.roce,        'roce'),
    de:      o(resolved.sourced.de,      live?.debtToEquity,'de'),
    opm:     o(resolved.sourced.opm,     live?.opm,         'opm'),
    revcagr: o(resolved.sourced.revcagr, live?.revCagr3y,   'revcagr'),
    epscagr: o(resolved.sourced.epscagr, live?.epsCagr,     'epscagr'),
    // H3: live.marketCap is already ₹ Cr (the /api/fundamentals contract
    // unit) — the ÷1e7 here turned 1,577,229 Cr into 0.16, which then
    // replaced a valid 1.7M Cr baseline and exploded FCF yield to 28M %.
    mktcap:  o(resolved.sourced.mktcap,  live?.marketCap,   'mktcap'),
    bvps:    o(resolved.sourced.bvps,    live?.bookValue,   'bvps'),
    promo:   o(resolved.sourced.promo,   live?.promoterHolding, 'promo'),
    pb:      resolved.sourced.pb,
    fcfMargin: resolved.sourced.fcfMargin,
  };

  // Y4 (Round 12): a seed-sourced ZERO is the June placeholder for
  // "unknown" (the founder's live greps: "Promoter Hold0.0%",
  // "D/E Ratio0.0x" on BANDHANBNK). Lift every placeholder zero to null
  // at this boundary so <DataValue> renders "—"; a LIVE 0 (a real
  // debt-free D/E from a vendor) survives the overlay path untouched.
  const metricsSourced = {
    pe: dropSeedPlaceholderZero(s.pe),
    roe: dropSeedPlaceholderZero(s.roe),
    roce: dropSeedPlaceholderZero(s.roce),
    de: dropSeedPlaceholderZero(s.de),
    opm: dropSeedPlaceholderZero(s.opm),
    revcagr: dropSeedPlaceholderZero(s.revcagr),
    epscagr: dropSeedPlaceholderZero(s.epscagr),
    mktcap: dropSeedPlaceholderZero(s.mktcap),
    bvps: dropSeedPlaceholderZero(s.bvps),
    promo: dropSeedPlaceholderZero(s.promo),
    pb: dropSeedPlaceholderZero(s.pb),
    fcfMargin: dropSeedPlaceholderZero(s.fcfMargin),
  };

  // Y4 (Round 12): banking-sector metrics. D/E, OPM and FCF yield are
  // meaningless or distorted for banks under leverage-based accounting
  // (the seed's bank D/E 0 is a placeholder; its OPM 32-44% is a
  // non-bank formula). P/B and ROE stay — the standard bank lenses.
  // NIM and GNPA remain blocked on the banking data feed (FD-16).
  const isBank = resolved.stock.sector === 'Banking';

  const asOfOf = (...parts: Sourced<number>[]) =>
    parts.every(p => p.asOf) ? (parts.find(p => p.asOf) as Sourced<number>).asOf : null;

  // Derived valuation ratios — computed from the same sourced inputs
  // (live when a live overlay arrived, seed baseline otherwise).
  const peg: Sourced<number> = derivedSourced(
    metricsSourced.pe.value !== null && metricsSourced.epscagr.value !== null && metricsSourced.epscagr.value > 0
      ? metricsSourced.pe.value / metricsSourced.epscagr.value
      : null,
    asOfOf(s.pe, s.epscagr),
  );
  const fcfYield: Sourced<number> = derivedSourced(
    metricsSourced.mktcap.value !== null && resolved.stock.fcf > 0 && metricsSourced.mktcap.value > 0
      ? (resolved.stock.fcf / metricsSourced.mktcap.value) * 100
      : null,
    s.mktcap.asOf,
  );

  const metrics = [
    { label: 'P/E Ratio',    sourced: metricsSourced.pe,      unit: 'x',    threshold: 20,  inverse: true  },
    { label: 'ROE',          sourced: metricsSourced.roe,     unit: '%',    threshold: 15,  inverse: false },
    { label: 'ROCE',         sourced: metricsSourced.roce,    unit: '%',    threshold: 15,  inverse: false },
    // Y4: hidden for banks (isBank) — leverage accounting makes them misleading.
    { label: 'D/E Ratio',    sourced: metricsSourced.de,      unit: 'x',    threshold: 1,   inverse: true,  bankHidden: true },
    { label: 'OPM',          sourced: metricsSourced.opm,     unit: '%',    threshold: 10,  inverse: false, bankHidden: true },
    { label: 'Revenue CAGR', sourced: metricsSourced.revcagr, unit: '%',    threshold: 15,  inverse: false },
    { label: 'EPS CAGR',     sourced: metricsSourced.epscagr, unit: '%',    threshold: 15,  inverse: false },
    { label: 'Mkt Cap',      sourced: metricsSourced.mktcap,  unit: 'K Cr', threshold: 100, inverse: false, scale: 1000 },
  ].filter(m => !(isBank && m.bankHidden));

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
            { label: 'Price / Book', value: <DataValue sourced={metricsSourced.pb} digits={2} unit="x" /> }
          ]} />
          <StatGroup title="PEG Ratio" stats={[
            { label: 'P/E / Growth', value: <DataValue sourced={peg} digits={2} /> }
          ]} />
          {isBank ? (
            <StatGroup title="Banking note" stats={[
              { label: 'D/E · OPM · FCF yield', value: <span style={{ fontSize: 12, color: '#94A3B8' }}>hidden for banks — leverage accounting makes them misleading; NIM / GNPA arrive with the banking data feed (FD-16)</span> }
            ]} />
          ) : (
            <StatGroup title="FCF Yield" stats={[
              { label: 'FCF / Mkt Cap', value: <DataValue sourced={fcfYield} digits={2} unit="%" /> }
            ]} />
          )}
          <StatGroup title="Promoter" stats={[
            { label: 'Promoter Hold', value: <DataValue sourced={metricsSourced.promo} unit="%" /> }
          ]} />
        </div>
      </div>
    </div>
  );
}
