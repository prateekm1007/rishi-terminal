// test/stocksTableTanstack.test.ts
// TANSTACK-STOCKS (round 56): the founder's acceptance for the /stocks
// table adoption — "test against the full 896-row list (T12 parity stays
// 0/896)". The table's options factory (components/screener/
// stocksTableOptions.ts) is exercised HEADLESSLY (TanStack createTable —
// no DOM) over the REAL server-built slim index: the same 896 rows the
// page serves, not a fixture subset.
//
// Behavioural pins carried from the hand-rolled table (nothing disabled,
// removed, or hidden):
// - T11: null (Insufficient Data) numeric values sort last in BOTH
//   directions.
// - The default sort is the consensus score, descending.
// - Search matches symbol OR company name, case-insensitive.
// - The sector select filters by exact sector ("All" = unfiltered).
// - Pagination slices the filtered+sorted rows; the honest page count.

import { describe, expect, it } from "vitest";
import { createTable } from "@tanstack/react-table";
import { getSlimIndex } from "@/lib/scoring/slimIndex";
import { toScreenerRows } from "@/lib/transport/slimWire";
import {
  STOCKS_TABLE_PAGE_SIZE,
  stocksTableColumnFilters,
  stocksTableDefaultState,
  stocksTableOptions,
  type StocksTableRow,
} from "@/components/screener/stocksTableOptions";

/** Build a headless instance over the REAL slim rows with the given
 *  state overrides (the exact options the component uses). */
function buildTable(
  rows: StocksTableRow[],
  stateOverrides: Partial<ReturnType<typeof stocksTableDefaultState>> = {},
) {
  const state = { ...stocksTableDefaultState(), ...stateOverrides };
  // Headless v8 usage (no React): the two options useReactTable normally
  // supplies are filled with their no-op/null defaults here.
  return createTable({
    ...stocksTableOptions(rows, state),
    onStateChange: () => {},
    renderFallbackValue: null,
  });
}

describe("TANSTACK-STOCKS: the /stocks table over the full 896-row list", () => {
  // The wire rows as the page builds them; the live overlay (livePrice /
  // change24h) is a hydration concern the headless instance does not
  // exercise — the honest no-overlay baseline (null) is filled here, never
  // a seed price (T14).
  const rows: StocksTableRow[] = toScreenerRows(getSlimIndex()).map((r) => ({
    ...r,
    livePrice: null,
    change24h: null,
  }));

  it("the server-built slim index is the full list — 896 rows (the founder's number, T12 parity input)", () => {
    expect(rows.length).toBe(896);
  });

  it("default sort: consensus descending, nulls ALWAYS last (T11)", () => {
    const table = buildTable(rows);
    // v8 note: getRowModel() is the PAGINATED model (what the page shows);
    // the full-list assertions read the sorted model.
    const sorted = table.getSortedRowModel().rows;
    expect(sorted.length).toBe(896);
    const values = sorted.map((r) => r.original.consensus);
    const firstNull = values.findIndex((v) => v === null);
    if (firstNull !== -1) {
      // every row after the first null is null — the null block is the tail
      expect(values.slice(firstNull).every((v) => v === null)).toBe(true);
      // and every row before it is a finite number in non-increasing order
      const head = values.slice(0, firstNull) as number[];
      expect(head.every((v) => Number.isFinite(v))).toBe(true);
      for (let i = 1; i < head.length; i++) {
        expect(head[i - 1]).toBeGreaterThanOrEqual(head[i]);
      }
    }
  });

  it("sorting a numeric column ascending keeps nulls LAST (T11, both directions)", () => {
    const table = buildTable(rows, {
      sorting: [{ id: "pe", desc: false }],
    });
    const values = table.getSortedRowModel().rows.map((r) => r.original.pe);
    const firstNull = values.findIndex((v) => v === null);
    if (firstNull !== -1) {
      expect(values.slice(firstNull).every((v) => v === null)).toBe(true);
      const head = values.slice(0, firstNull) as number[];
      for (let i = 1; i < head.length; i++) {
        expect(head[i - 1]).toBeLessThanOrEqual(head[i]);
      }
    }
  });

  it("symbol sort is a real lexicographic sort over all 896", () => {
    const table = buildTable(rows, { sorting: [{ id: "symbol", desc: false }] });
    const symbols = table.getSortedRowModel().rows.map((r) => r.original.symbol);
    const sorted = [...symbols].sort((a, b) => a.localeCompare(b));
    expect(symbols).toEqual(sorted);
  });

  it("search matches symbol or company name, case-insensitive; no match -> honest zero rows", () => {
    const bySymbol = buildTable(rows, { globalFilter: "reliance" });
    const symbolHits = bySymbol.getSortedRowModel().rows;
    expect(symbolHits.length).toBeGreaterThan(0);
    expect(
      symbolHits.every((r) => r.original.symbol.toLowerCase().includes("reliance") ||
        r.original.name.toLowerCase().includes("reliance")),
    ).toBe(true);

    const none = buildTable(rows, { globalFilter: "zzz-no-such-instrument-zzz" });
    expect(none.getSortedRowModel().rows.length).toBe(0);
  });

  it("the sector filter filters by exact sector over the full list", () => {
    const someSector = rows.find((r) => r.sector)?.sector;
    expect(someSector).toBeTruthy();
    const table = buildTable(rows, {
      columnFilters: stocksTableColumnFilters(someSector as string),
    });
    const filtered = table.getSortedRowModel().rows;
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(896);
    expect(filtered.every((r) => r.original.sector === someSector)).toBe(true);
  });

  it("pagination slices the sorted rows honestly (page count, page slices, tail page)", () => {
    const table = buildTable(rows);
    expect(STOCKS_TABLE_PAGE_SIZE).toBe(50);
    const total = table.getFilteredRowModel().rows.length;
    expect(table.getPageCount()).toBe(Math.ceil(total / STOCKS_TABLE_PAGE_SIZE));

    const page0 = table.getRowModel().rows.map((r) => r.original.symbol);
    const allSorted = table.getSortedRowModel().rows.map((r) => r.original.symbol);
    expect(page0).toEqual(allSorted.slice(0, STOCKS_TABLE_PAGE_SIZE));

    const last = buildTable(rows, {
      pagination: { pageIndex: table.getPageCount() - 1, pageSize: STOCKS_TABLE_PAGE_SIZE },
    });
    const tail = last.getRowModel().rows.map((r) => r.original.symbol);
    expect(tail).toEqual(allSorted.slice((table.getPageCount() - 1) * STOCKS_TABLE_PAGE_SIZE));
  });

  it("filters compose with pagination: filtered tail pages still align with the filtered order", () => {
    const someSector = rows.find((r) => r.sector)?.sector as string;
    const state = {
      ...stocksTableDefaultState(),
      columnFilters: stocksTableColumnFilters(someSector),
    };
    const table = buildTable(rows, state);
    const total = table.getFilteredRowModel().rows.length;
    const sorted = table.getSortedRowModel().rows.map((r) => r.original.symbol);
    expect(sorted.length).toBe(total);
    const last = buildTable(rows, {
      ...state,
      pagination: { pageIndex: table.getPageCount() - 1, pageSize: STOCKS_TABLE_PAGE_SIZE },
    });
    expect(last.getRowModel().rows.map((r) => r.original.symbol)).toEqual(
      sorted.slice((table.getPageCount() - 1) * STOCKS_TABLE_PAGE_SIZE),
    );
  });
});
