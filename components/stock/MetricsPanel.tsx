"use client";
import { Stock } from "../../lib/consensus/types";

interface Props { stock: Stock }

interface Metric {
  label: string;
  value: string;
  bench: string;
  ok: boolean;
}

export function MetricsPanel({ stock }: Props) {
  const metrics: Metric[] = [
    {
      label: "P/E Ratio",
      value: stock.pe.toLocaleString("en-US"),
      bench: "< 25 preferred",
      ok: stock.pe > 0 && stock.pe < 25,
    },
    {
      label: "ROE",
      value: `${stock.roe.toLocaleString("en-US")}%`,
      bench: "> 15% strong",
      ok: stock.roe >= 15,
    },
    {
      label: "ROCE",
      value: `${stock.roce.toLocaleString("en-US")}%`,
      bench: "> 15% quality",
      ok: stock.roce >= 15,
    },
    {
      label: "OPM",
      value: `${stock.opm.toLocaleString("en-US")}%`,
      bench: "> 15% moat",
      ok: stock.opm >= 15,
    },
    {
      label: "D/E Ratio",
      value: stock.de.toLocaleString("en-US"),
      bench: "< 0.5 safe",
      ok: stock.de < 0.5,
    },
    {
      label: "Rev CAGR",
      value: `${stock.revcagr.toLocaleString("en-US")}%`,
      bench: "> 12% growth",
      ok: stock.revcagr >= 12,
    },
    {
      label: "EPS CAGR",
      value: `${stock.epscagr.toLocaleString("en-US")}%`,
      bench: "> 12% quality",
      ok: stock.epscagr >= 12,
    },
    {
      label: "Promoter %",
      value: `${stock.promo.toLocaleString("en-US")}%`,
      bench: "> 40% aligned",
      ok: stock.promo >= 40,
    },
    {
      label: "Market Cap",
      value: `${(stock.mktcap / 1000).toLocaleString("en-US")}B`,
      bench: "Context only",
      ok: true,
    },
    {
      label: "FCF",
      value: `${stock.fcf.toLocaleString("en-US")}Cr`,
      bench: "> 0 required",
      ok: stock.fcf > 0,
    },
  ];

  return (
    <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-6">
      <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">
        Fundamental Evidence
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metrics.map(m => (
          <div
            key={m.label}
            className={`rounded p-3 border ${
              m.ok
                ? "border-emerald-900 bg-emerald-950/20"
                : "border-zinc-800 bg-zinc-900"
            }`}
          >
            <p className="text-xs text-zinc-500 font-mono mb-1">{m.label}</p>
            <p className={`text-lg font-mono font-bold ${m.ok ? "text-emerald-400" : "text-zinc-300"}`}>
              {m.value}
            </p>
            <p className="text-xs text-zinc-600 font-mono mt-1">{m.bench}</p>
          </div>
        ))}
      </div>
    </div>
  );
}