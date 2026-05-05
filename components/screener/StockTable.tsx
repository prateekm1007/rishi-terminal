"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Stock } from "../../lib/types";
import { buildConsensus } from "../../lib/consensus";

interface StockRow extends Stock {
  consensus: number;
  topRishi: string;
  topRishiScore: number;
  category: string;
}

interface Props {
  stocks: Stock[];
}

type SortKey = "symbol" | "price" | "pe" | "roe" | "mktcap" | "consensus";

function consensusCategory(score: number): string {
  if (score >= 75) return "STRONG BUY";
  if (score >= 60) return "BUY";
  if (score >= 45) return "HOLD";
  return "AVOID";
}

export function StockTable({ stocks }: Props) {
  const dark = true;

  const [search, setSearch]           = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [sortKey, setSortKey]         = useState<SortKey>("consensus");
  const [sortDesc, setSortDesc]       = useState(true);

  const enrichedStocks = useMemo<StockRow[]>(() => {
    return stocks.map(stock => {
      const report   = buildConsensus(stock);
      const topScore = report.scores[0];
      return {
        ...stock,
        consensus:      report.consensus,
        topRishi:       topScore.name,
        topRishiScore:  topScore.score,
        category:       consensusCategory(report.consensus),
      };
    });
  }, [stocks]);

  const sectors = useMemo(() => {
    const unique = new Set(stocks.map(s => s.sector));
    return ["All", ...Array.from(unique).sort()];
  }, [stocks]);

  const filtered = useMemo(() => {
    let result = [...enrichedStocks];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    }
    if (sectorFilter !== "All") {
      result = result.filter(s => s.sector === sectorFilter);
    }
    result.sort((a, b) => {
      if (sortKey === "symbol") {
        return sortDesc
          ? String(b.symbol).localeCompare(String(a.symbol))
          : String(a.symbol).localeCompare(String(b.symbol));
      }
      return sortDesc
        ? (b[sortKey] as number) - (a[sortKey] as number)
        : (a[sortKey] as number) - (b[sortKey] as number);
    });
    return result;
  }, [enrichedStocks, search, sectorFilter, sortKey, sortDesc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(!sortDesc);
    else { setSortKey(key); setSortDesc(true); }
  };

  const sortIcon = (key: SortKey) =>
    sortKey !== key ? "↕" : sortDesc ? "↓" : "↑";

  const scoreColor = (score: number) => {
    if (score >= 75) return dark ? "text-emerald-400" : "text-green-700";
    if (score >= 55) return dark ? "text-yellow-400" : "text-amber-700";
    if (score >= 35) return dark ? "text-orange-400" : "text-orange-600";
    return dark ? "text-red-400" : "text-red-700";
  };

  const categoryBadge = (cat: string) => {
    if (cat === "STRONG BUY") return dark
      ? "bg-emerald-900/40 text-emerald-400 border-emerald-800"
      : "bg-green-100 text-green-800 border-green-300";
    if (cat === "BUY") return dark
      ? "bg-blue-900/40 text-blue-400 border-blue-800"
      : "bg-blue-100 text-blue-800 border-blue-300";
    if (cat === "HOLD") return dark
      ? "bg-yellow-900/40 text-yellow-400 border-yellow-800"
      : "bg-yellow-100 text-yellow-800 border-yellow-300";
    return dark
      ? "bg-red-900/40 text-red-400 border-red-800"
      : "bg-red-100 text-red-700 border-red-300";
  };

  const mktcapFmt = (v: number) => {
    if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L Cr`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K Cr`;
    return `${v} Cr`;
  };

  return (
    <div className="space-y-4">

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-muted)" }}>🔍</span>
          <input
            type="text"
            placeholder="Search symbol or company name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm font-mono focus:outline-none transition-colors"
            style={{
              background:   "var(--bg-card)",
              border:       "1px solid var(--border-primary)",
              color:        "var(--text-primary)",
            }}
          />
        </div>
        <select
          value={sectorFilter}
          onChange={e => setSectorFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-sm font-mono focus:outline-none"
          style={{
            background: "var(--bg-card)",
            border:     "1px solid var(--border-primary)",
            color:      "var(--text-primary)",
          }}
        >
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Count */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          Showing <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>{filtered.length}</span> of {stocks.length} stocks
        </p>
        <div className="flex gap-2">
          {["STRONG BUY", "BUY", "HOLD", "AVOID"].map(cat => {
            const count = filtered.filter(s => s.category === cat).length;
            return (
              <span
                key={cat}
                className={`text-xs font-mono px-2 py-0.5 rounded border ${categoryBadge(cat)}`}
              >
                {cat}: {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-x-auto rounded-xl shadow-lg"
        style={{ border: "1px solid var(--border-primary)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{
              background:   "var(--bg-secondary)",
              borderBottom: "2px solid var(--accent-red)",
            }}>
              {[
                { key: "symbol",    label: "Symbol",    align: "left"  },
                { key: null,        label: "Company",   align: "left"  },
                { key: null,        label: "Sector",    align: "left"  },
                { key: "price",     label: "Price",     align: "right" },
                { key: "pe",        label: "P/E",       align: "right" },
                { key: "roe",       label: "ROE %",     align: "right" },
                { key: "mktcap",    label: "Mkt Cap",   align: "right" },
                { key: "consensus", label: "Rishi Score", align: "right" },
                { key: null,        label: "Signal",    align: "center"},
                { key: null,        label: "Top Rishi", align: "left"  },
              ].map(col => (
                <th
                  key={col.label}
                  onClick={() => col.key && handleSort(col.key as SortKey)}
                  className={`px-4 py-3 text-xs font-mono uppercase tracking-wider ${col.key ? "cursor-pointer hover:opacity-70" : ""}`}
                  style={{
                    textAlign: col.align as "left" | "right" | "center",
                    color:     "var(--text-muted)",
                  }}
                >
                  {col.label} {col.key && sortIcon(col.key as SortKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((stock, i) => (
              <tr
                key={stock.symbol}
                className="transition-colors cursor-pointer"
                style={{
                  background:   i % 2 === 0 ? "var(--bg-card)" : "var(--bg-secondary)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "var(--bg-card)" : "var(--bg-secondary)")}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/stock/${stock.symbol}`}
                    className="font-mono font-bold text-sm hover:underline"
                    style={{ color: "var(--accent-gold)" }}
                  >
                    {stock.symbol}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-sm" style={{ color: "var(--text-primary)" }}>
                  {stock.name}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{
                      background: "var(--bg-hover)",
                      color:      "var(--text-muted)",
                    }}
                  >
                    {stock.sector}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                  {stock.price.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: "var(--text-secondary)" }}>
                  {stock.pe > 0 ? stock.pe.toFixed(1) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: stock.roe >= 15 ? "var(--accent-green)" : "var(--text-secondary)" }}>
                  {stock.roe}%
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                  {mktcapFmt(stock.mktcap)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xl font-mono font-black ${scoreColor(stock.consensus)}`}>
                      {stock.consensus}
                    </span>
                    <div
                      className="w-16 h-1.5 rounded-full overflow-hidden"
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width:      `${stock.consensus}%`,
                          background: stock.consensus >= 75 ? "var(--accent-green)" : stock.consensus >= 55 ? "var(--accent-gold)" : "var(--accent-red)",
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-mono px-2 py-1 rounded border ${categoryBadge(stock.category)}`}>
                    {stock.category}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                  {stock.topRishi} <span style={{ color: "var(--accent-gold)" }}>({stock.topRishiScore})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div
          className="text-center py-16 rounded-xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
        >
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-mono text-sm" style={{ color: "var(--text-muted)" }}>
            No stocks match your filters
          </p>
        </div>
      )}
    </div>
  );
}