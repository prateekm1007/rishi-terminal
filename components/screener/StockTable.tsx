"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Stock } from "../../lib/types";
import { buildConsensus } from "../../lib/consensus";

import { useBulkFundamentals } from '@/hooks/useFundamentals';
import { useLivePrices } from '@/hooks/useLivePrices';

interface StockRow extends Stock {
  consensus: number;
  topRishi: string;
  topRishiScore: number;
  category: string;
  livePrice: number;
  change24h: number;
}

interface Props {
  stocks: Stock[];
}

type SortKey = "symbol" | "livePrice" | "pe" | "roe" | "mktcap" | "consensus" | "change24h";

function consensusCategory(score: number): string {
  if (score >= 75) return "STRONG BUY";
  if (score >= 60) return "BUY";
  if (score >= 45) return "HOLD";
  return "AVOID";
}

export function StockTable({ stocks }: Props) {
  const dark = true;

  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("consensus");
  const [sortDesc, setSortDesc] = useState(true);

  // Get live prices for all stocks
  const stockSymbols = useMemo(() => stocks.map(s => s.symbol), [stocks]);

  const { prices } = useLivePrices(stockSymbols);
  
  const { fundamentals: bulkFund } = useBulkFundamentals(stockSymbols);

  const enrichedStocks = useMemo<StockRow[]>(() => {
    return stocks.map(stock => {
      const report = buildConsensus(stock);
      const topScore = report.scores[0];
      const livePrice = prices[stock.symbol]?.price ?? stock.price;
      const change24h = prices[stock.symbol]?.change ?? 0;
      return {
        ...stock,
        consensus: Number.isFinite(report.consensus) ? report.consensus : 0,
        topRishi: topScore.name,
        topRishiScore: topScore.score,
        category: Number.isFinite(report.consensus) ? consensusCategory(report.consensus) : "N/A",
        pe: bulkFund[stock.symbol]?.pe ?? stock.pe,
        roe: bulkFund[stock.symbol]?.roe ?? stock.roe,
        livePrice,
        change24h,
      };
    });
  }, [stocks, prices, bulkFund]);

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
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const sortIcon = (key: SortKey) =>
    sortKey !== key ? "â†•" : sortDesc ? "â†“" : "â†‘";

  const scoreColor = (score: number) => {
    if (score >= 75) return dark ? "text-emerald-400" : "text-green-700";
    if (score >= 55) return dark ? "text-yellow-400" : "text-amber-700";
    if (score >= 35) return dark ? "text-orange-400" : "text-orange-600";
    return dark ? "text-red-400" : "text-red-700";
  };

  const changeColor = (change: number) => {
    if (change > 0) return dark ? "text-emerald-400" : "text-green-700";
    if (change < 0) return dark ? "text-red-400" : "text-red-700";
    return dark ? "text-gray-400" : "text-gray-600";
  };

  const categoryBadge = (cat: string) => {
    if (cat === "STRONG BUY")
      return dark
        ? "bg-emerald-900/40 text-emerald-400 border-emerald-800"
        : "bg-green-100 text-green-800 border-green-300";
    if (cat === "BUY")
      return dark
        ? "bg-blue-900/40 text-blue-400 border-blue-800"
        : "bg-blue-100 text-blue-800 border-blue-300";
    if (cat === "HOLD")
      return dark
        ? "bg-amber-900/40 text-amber-400 border-amber-800"
        : "bg-amber-100 text-amber-800 border-amber-300";
    return dark
      ? "bg-red-900/40 text-red-400 border-red-800"
      : "bg-red-100 text-red-800 border-red-300";
  };

  return (
    <div className="w-full">
      {/* Search & Filter */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <input
          type="text"
          placeholder="Search symbols or company names..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`rounded-lg border px-4 py-2 text-sm font-mono transition ${
            dark
              ? "border-gray-700 bg-gray-900/50 text-gray-100 placeholder-gray-500"
              : "border-gray-300 bg-white text-gray-900 placeholder-gray-400"
          }`}
        />
        <select
          value={sectorFilter}
          onChange={e => setSectorFilter(e.target.value)}
          className={`rounded-lg border px-4 py-2 text-sm font-mono transition ${
            dark
              ? "border-gray-700 bg-gray-900/50 text-gray-100"
              : "border-gray-300 bg-white text-gray-900"
          }`}
        >
          {sectors.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm">
          <thead
            className={dark ? "bg-gray-900/50 border-gray-700" : "bg-gray-100 border-gray-300"}
          >
            <tr className="border-b">
              <th className="px-4 py-3 text-left font-mono font-semibold text-gray-400">
                SYMBOL
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-gray-400">
                NAME
              </th>
              <th className="px-4 py-3 text-right font-mono font-semibold text-gray-400 cursor-pointer" onClick={() => handleSort("livePrice")}>
                PRICE {sortIcon("livePrice")}
              </th>
              <th className="px-4 py-3 text-right font-mono font-semibold text-gray-400 cursor-pointer" onClick={() => handleSort("change24h")}>
                24H {sortIcon("change24h")}
              </th>
              <th className="px-4 py-3 text-right font-mono font-semibold text-gray-400 cursor-pointer" onClick={() => handleSort("pe")}>
                PE {sortIcon("pe")}
              </th>
              <th className="px-4 py-3 text-right font-mono font-semibold text-gray-400 cursor-pointer" onClick={() => handleSort("roe")}>
                ROE {sortIcon("roe")}
              </th>
              <th className="px-4 py-3 text-right font-mono font-semibold text-gray-400 cursor-pointer" onClick={() => handleSort("consensus")}>
                SCORE {sortIcon("consensus")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((stock, idx) => (
              <tr
                key={stock.symbol}
                className={`border-b transition ${
                  dark
                    ? "border-gray-800 hover:bg-gray-900/30"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <td className="px-4 py-3 font-mono font-bold text-yellow-500">
                  <Link href={`/stock/${stock.symbol}`} className="hover:underline">
                    {stock.symbol}
                  </Link>
                </td>
                <td className={`px-4 py-3 font-mono text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
                  {stock.name}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-yellow-500">
                  {stock.livePrice.toFixed(2)}
                </td>
                <td className={`px-4 py-3 text-right font-mono font-semibold ${changeColor(stock.change24h)}`}>
                  {stock.change24h > 0 ? "+" : ""}{stock.change24h.toFixed(2)}%
                </td>
                <td className={`px-4 py-3 text-right font-mono ${dark ? "text-gray-400" : "text-gray-600"}`}>
                  {(bulkFund[stock.symbol]?.pe ?? stock.pe) > 0 ? (bulkFund[stock.symbol]?.pe ?? stock.pe).toFixed(1) : "â€”"}
                </td>
                <td className={`px-4 py-3 text-right font-mono ${dark ? "text-gray-400" : "text-gray-600"}`}>
                  {(bulkFund[stock.symbol]?.roe ?? stock.roe) > 0 ? (bulkFund[stock.symbol]?.roe ?? stock.roe).toFixed(1) + "%" : "â€”"}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-mono font-bold border ${categoryBadge(stock.category)}`}
                  >
                    {Number.isFinite(stock.consensus) ? stock.consensus.toFixed(0) : "â€”"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className={`text-center py-8 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          No stocks found matching your criteria.
        </div>
      )}
    </div>
  );
}
