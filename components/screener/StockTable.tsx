"use client";

// N1 (round 3): the table receives the server-generated slim rows —
// consensus, category, and the free display fields come precomputed;
// the price overlay and live fundamentals hydrate client-side as before.
// No scoring engine, no seed dataset in the bundle (the old topRishi /
// topRishiScore enrichment was computed here and never rendered —
// dropped as dead code).
//
// TANSTACK-STOCKS (round 56): the data flow (sorting, filtering,
// pagination) now runs on @tanstack/react-table 8.21.3 — the founder's
// batch-2 adoption (adoption record row 2), with the options shared with
// the headless acceptance test through components/screener/
// stocksTableOptions.ts (one source of truth, rule 14). Behavioural pins
// carried unchanged: T11 nulls-last sorting, T14 seed-price-never-shown,
// consensus-descending default sort, symbol-or-name search, exact sector
// filter. NEW: client-side pagination (50/page) with an honest page
// count. The markup, a11y labels and badge logic are untouched.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useReactTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import type { ScreenerPickerRow } from '@/lib/transport/slimWire';

import { useBulkFundamentals } from '@/hooks/useFundamentals';
import { useLivePrices } from '@/hooks/useLivePrices';
import { DataValue } from '@/components/DataValue';
import { overlaySourced, type Sourced } from '@/lib/types/sourced';
import { verdictsAllowed } from '@/lib/dataQuality';
import { IntelligenceBadge } from '@/components/screener/IntelligenceBadge';
import {
  stocksTableColumnFilters,
  stocksTableDefaultState,
  stocksTableOptions,
  STOCKS_TABLE_PAGE_SIZE,
  type StocksTableRow,
} from './stocksTableOptions';

interface Props {
  stocks: ScreenerPickerRow[];
  /** INT-D2: opening a row's intelligence drawer. The badge is a
   *  presentational affordance — the table itself imports NO
   *  intelligence module and fetches NOTHING (the ONE intelligence
   *  request happens on drawer open, ONE subject at a time, in the
   *  drawer ScreenerClient mounts once via next/dynamic ssr:false). */
  onOpenIntelligence?: (symbol: string) => void;
}

/**
 * P0-06 (N7): seed-baseline metric with live overlay, as a Sourced. The
 * slim row carries the seed baseline; a live fundamental from the bulk
 * fetch overlays it under the field's admissibility rule (G5: the canonical
 * field key makes zero/negative legitimate observations admissible).
 */
function metricSourced(
  seedValue: number | null,
  liveValue: number | null | undefined,
  live: { source?: string; lastUpdated?: string | null } | undefined,
  field: string,
): Sourced<number> {
  // P0-2: a null seed value is UNKNOWN — it overlays to null (never a
  // fabricated 0) and <DataValue> renders the em dash.
  return overlaySourced(
    { value: seedValue, source: "seed", asOf: null },
    liveValue,
    live?.source,
    live?.lastUpdated ?? null,
    field,
  );
}

/** The consensus score: seed-derived while the dataset is a placeholder. */
function scoreSourced(consensus: number | null): Sourced<number> {
  return { value: consensus, source: "seed", asOf: null };
}

export function StockTable({ stocks, onOpenIntelligence }: Props) {
  const dark = true;

  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [sorting, setSorting] = useState<SortingState>(
    stocksTableDefaultState().sorting,
  );
  const [pagination, setPagination] = useState<PaginationState>(
    stocksTableDefaultState().pagination,
  );

  const stockSymbols = useMemo(() => stocks.map(s => s.symbol), [stocks]);

  const { prices } = useLivePrices(stockSymbols);

  const { fundamentals: bulkFund } = useBulkFundamentals(stockSymbols);

  const enrichedStocks = useMemo<StocksTableRow[]>(() => {
    return stocks.map(stock => {
      // T14: seed price is never rendered as live — null when feed is down
      const livePrice = prices[stock.symbol]?.price ?? null;
      const change24h = prices[stock.symbol]?.change ?? null;
      return {
        ...stock,
        livePrice,
        change24h,
      };
    });
  }, [stocks, prices]);

  const sectors = useMemo(() => {
    const unique = new Set(stocks.map(s => s.sector));
    return ["All", ...Array.from(unique).sort()];
  }, [stocks]);

  const table = useReactTable(
    stocksTableOptions(enrichedStocks, {
      sorting,
      columnFilters: stocksTableColumnFilters(sectorFilter),
      globalFilter: search,
      pagination,
    }),
  );

  // The honest visible count: filtered rows, before pagination.
  const filteredCount = table.getFilteredRowModel().rows.length;
  const visibleRows = table.getRowModel().rows;
  const pageCount = Math.max(1, table.getPageCount());

  // Keep the page index inside bounds when filters shrink the result set
  // (autoResetPageIndex covers filter-driven resets; this guards
  // reducer-less edge cases without fabricating rows).
  useEffect(() => {
    if (pagination.pageIndex > pageCount - 1) {
      setPagination(p => ({ ...p, pageIndex: Math.max(0, pageCount - 1) }));
    }
  }, [pagination.pageIndex, pageCount]);

  const handleSort = (key: string) => {
    if (sorting[0]?.id === key) {
      setSorting([{ id: key, desc: !sorting[0].desc }]);
    } else {
      setSorting([{ id: key, desc: true }]);
    }
  };

  const sortIcon = (key: string) =>
    sorting[0]?.id !== key ? "↕" : sorting[0].desc ? "↓" : "↑";

  const changeColor = (change: number) => {
    if (change > 0) return dark ? "text-emerald-400" : "text-green-700";
    if (change < 0) return dark ? "text-red-400" : "text-red-700";
    return dark ? "text-gray-400" : "text-gray-600";
  };

  // P0-6 (round 47): badge keyed on the REAL consensus categories
  // (lib/consensus/engine.ts categorize) — the old STRONG BUY / BUY /
  // HOLD branches matched a vocabulary that no row has carried since the
  // round-5 categorize rewrite (dead branches, rule 17).
  const categoryBadge = (cat: string) => {
    if (cat === "Legendary Compounder" || cat === "High Conviction Quality")
      return dark
        ? "bg-emerald-900/40 text-emerald-400 border-emerald-800"
        : "bg-green-100 text-green-800 border-green-300";
    if (cat === "Value-Aligned Consensus" || cat === "Balanced Risk-Reward")
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
        {/* Audit retest 2026-10-02 (C.3): label-less select failed Lighthouse
            select-name — a screen reader announced nothing for this filter. */}
        <select
          value={sectorFilter}
          onChange={e => setSectorFilter(e.target.value)}
          aria-label="Filter by sector"
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
            {visibleRows.map((row) => {
              const stock = row.original;
              return (
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
                  {/* INT-D2: the opener rides the row in its own cell —
                      a 28 px touch target with 32 px clearance to the
                      symbol link (the WCAG 2.2 target-size/offset gate).
                      A row without a resolvable symbol renders no badge
                      (defensive, honest). */}
                  <td className="px-2 py-3 text-left">
                    {onOpenIntelligence && stock.symbol ? (
                      <IntelligenceBadge symbol={stock.symbol} onOpen={onOpenIntelligence} />
                    ) : null}
                  </td>
                  <td className={`px-4 py-3 font-mono text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
                    {stock.name}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono font-semibold text-yellow-500"
                    title={stock.livePrice !== null ? "Live price" : "Live price unavailable \u2014 seed prices are never shown as current"}
                  >
                    {stock.livePrice !== null ? stock.livePrice.toFixed(2) : "\u2014"}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${changeColor(stock.change24h ?? 0)}`} title={stock.change24h !== null ? "Live 24h change" : "Live change unavailable"}>
                    {stock.change24h !== null ? (stock.change24h > 0 ? "+" : "") + stock.change24h.toFixed(2) + "%" : "\u2014"}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${dark ? "text-gray-400" : "text-gray-600"}`}>
                    <DataValue sourced={metricSourced(stock.pe, bulkFund[stock.symbol]?.pe, bulkFund[stock.symbol], "pe")} digits={1} unit="x" />
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${dark ? "text-gray-400" : "text-gray-600"}`}>
                    <DataValue sourced={metricSourced(stock.roe, bulkFund[stock.symbol]?.roe, bulkFund[stock.symbol], "roe")} digits={1} unit="%" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {verdictsAllowed(stock.dataQuality) ? (
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-mono font-bold border ${categoryBadge(stock.category)}`}
                      >
                        <DataValue sourced={scoreSourced(stock.consensus)} digits={0} />
                      </span>
                    ) : (
                      /* P0-1 (founder audit 2026-10-11): seed/missing rows show
                         NO verdict — the badge reads the dataQuality field. */
                      <span
                        className="inline-block rounded-full px-3 py-1 text-xs font-mono font-semibold border bg-gray-100 text-gray-600 border-gray-300 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-600"
                        title={stock.dataQuality === "missing" ? "No usable data — no verdict produced" : "Illustrative seed data — no verdict produced"}
                      >
                        {stock.dataQuality === "missing" ? "no data · no verdict" : "seed · no verdict"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {visibleRows.length === 0 && (
        <div className={`text-center py-8 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          No stocks found matching your criteria.
        </div>
      )}

      {/* TANSTACK-STOCKS: client-side pagination over the filtered rows —
          the count is the honest filtered count, never a padded total. */}
      {filteredCount > 0 && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <span className={`font-mono text-xs ${dark ? "text-gray-500" : "text-gray-500"}`}>
            Page {pagination.pageIndex + 1} of {pageCount} · {filteredCount} matching rows · {STOCKS_TABLE_PAGE_SIZE}/page
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className={`rounded border px-3 py-1.5 font-mono text-xs transition disabled:opacity-40 ${
                dark
                  ? "border-gray-700 bg-gray-900/50 text-gray-300 hover:bg-gray-800"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              ← Prev
            </button>
            <button
              type="button"
              aria-label="Next page"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={`rounded border px-3 py-1.5 font-mono text-xs transition disabled:opacity-40 ${
                dark
                  ? "border-gray-700 bg-gray-900/50 text-gray-300 hover:bg-gray-800"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
