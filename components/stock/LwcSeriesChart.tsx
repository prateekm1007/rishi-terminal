// components/stock/LwcSeriesChart.tsx
// LWC-CHART (round 56): the price-series renderer, re-implemented on
// tradingview/lightweight-charts (Apache-2.0) per the founder's batch-2
// adoption order (docs/evidence/round55/r55-batch2-adoption-record.md).
// This file is imported DYNAMICALLY by components/stock/PriceChart.tsx,
// which is itself a next/dynamic ssr:false chunk inside StockPageClient —
// the library therefore never enters the first-load bundle (the C9 paired
// guard: the bundle ratchet baseline is untouched; the first-byte content
// is unchanged).
//
// Licence condition (upstream README, verified 2026-10-13): the chart
// carries the built-in TradingView attribution logo (LayoutOptions.
// attributionLogo — "will satisfy the link requirement" on the chart
// itself); the NOTICE text and the tradingview.com link render in the
// chart card footer, pinned by test/stockPriceChartAttribution.test.ts.
//
// Feature parity with the replaced SVG line chart (nothing disabled,
// removed, or hidden): same time-axis/price-axis rendering, same
// hover-to-inspect tooltip (date + price, en-IN display), same
// positive/negative colour language, same honest behaviour when fewer
// than two points exist (the parent renders the i18n no-data state —
// this adapter renders only with a renderable series).
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type MouseEventParams,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { PricePoint } from '../../hooks/usePriceHistory';

interface Props {
  points: PricePoint[];
  positive: boolean;
}

interface HoverState {
  t: number;
  v: number;
  x: number;
}

/** Map the fetched series onto lightweight-charts data: ascending,
 *  unique per second (an upstream series can repeat a second across
 *  refreshes — the LAST observation for a timestamp wins; nothing is
 *  invented, only deduplicated deterministically). */
function toChartData(points: PricePoint[]): { time: UTCTimestamp; value: number }[] {
  const bySecond = new Map<number, number>();
  for (const p of points) {
    bySecond.set(Math.floor(p.t / 1000), p.v);
  }
  return [...bySecond.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, value]) => ({ time: time as UTCTimestamp, value }));
}

export function LwcSeriesChart({ points, positive }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // Container width is mirrored into state by the effect/observer (refs are
  // never read during render) so the tooltip can clamp inside the bounds.
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<HoverState | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const line = positive ? '#22C55E' : '#EF4444';
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        attributionLogo: true,
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(148,163,184,0.75)',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;

    const series = chart.addSeries(AreaSeries, {
      lineColor: line,
      topColor: positive ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)',
      bottomColor: positive ? 'rgba(34,197,94,0.01)' : 'rgba(239,68,68,0.01)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    series.setData(toChartData(points));
    chart.timeScale().fitContent();

    const toPoint = (param: MouseEventParams): HoverState | null => {
      if (param.time === undefined || param.point === undefined) return null;
      const value = param.seriesData.get(series);
      if (!value || typeof (value as { value?: unknown }).value !== 'number') return null;
      const t = Number(param.time) * 1000;
      return { t, v: (value as { value: number }).value, x: param.point.x };
    };
    const onMove = (param: MouseEventParams) => setHover(toPoint(param));
    const onLeave = () => setHover(null);
    chart.subscribeCrosshairMove(onMove);
    container.addEventListener('mouseleave', onLeave);

    const observer = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
      setWidth(container.clientWidth);
    });
    observer.observe(container);
    setWidth(container.clientWidth);

    return () => {
      observer.disconnect();
      container.removeEventListener('mouseleave', onLeave);
      chartRef.current = null;
      setHover(null);
      chart.remove();
    };
  }, [points, positive]);

  // Tooltip display parity with the replaced SVG chart: en-IN date, the
  // same two-branch price formatting. Client-interactive only — never in
  // SSR output (rule 18).
  const dateLabel = hover
    ? new Date(hover.t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  const priceLabel = hover
    ? hover.v >= 1000
      ? hover.v.toLocaleString('en-IN', { maximumFractionDigits: 2 })
      : hover.v.toFixed(4)
    : '';

  return (
    <div
      ref={containerRef}
      data-chart="lwc-price-series"
      style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}
    >
      {hover && (
        <div
          style={{
            position: 'absolute',
            left: Math.max(8, Math.min(hover.x - 80, width - 176)),
            top: 8,
            width: 160,
            padding: '6px 10px',
            borderRadius: 6,
            background: '#111827',
            border: '1px solid rgba(212,175,55,0.4)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.8)', fontFamily: 'monospace' }}>{dateLabel}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', fontFamily: 'monospace' }}>{priceLabel}</div>
        </div>
      )}
    </div>
  );
}

export default LwcSeriesChart;
