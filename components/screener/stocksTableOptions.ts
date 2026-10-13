// components/screener/stocksTableOptions.ts
// TANSTACK-STOCKS (round 56): the ONE TanStack Table options factory for the
// /stocks table (founder batch-2 order 13 Oct 2026 — adoption record row 2:
// "the /stocks table sorting/pagination/filters; acceptance = test against
// the full 896-row list"). Extracted as a pure factory so the component and
// the headless test (test/stocksTableTanstack.test.ts) drive the EXACT same
// options — one source of truth per concept (rule 14).
//
// Library: @tanstack/react-table 8.21.3 — the major the tablecn pattern
// repo used for most of its life (it has since moved to the weeks-old v9
// store-atoms rewrite; upgrading majors is a recorded follow-up, not a
// demo-path gamble).
//
// Behavioural parity pins carried from the previous hand-rolled table:
// - T11: null (Insufficient Data) numeric values ALWAYS sort last,
//   regardless of direction — never coerced to 0 (rule 16).
// - T14: the seed price never renders — the live-price column reads the
//   live overlay only (null -> em dash in the cell).
// - The default sort is the consensus score, descending.
// - Search matches symbol OR company name, case-insensitive.
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type PaginationState,
  type SortingFn,
  type SortingState,
} from "@tanstack/react-table";
import type { ScreenerPickerRow } from "@/lib/transport/slimWire";

/** The row the table renders: the slim wire row plus the live overlay
 *  (T14: null = no live quote — the seed price is NEVER displayed). */
export interface StocksTableRow extends ScreenerPickerRow {
  livePrice: number | null;
  change24h: number | null;
}

export const STOCKS_TABLE_PAGE_SIZE = 50;

/** T11 parity: numbers sort naturally; null/NaN sinks to the bottom in
 *  BOTH directions; two nulls are equal. */
const nullsLastNumeric: SortingFn<StocksTableRow> = (rowA, rowB, columnId) => {
  const a = rowA.getValue<number | null>(columnId);
  const b = rowB.getValue<number | null>(columnId);
  const aNull = a === null || !Number.isFinite(a);
  const bNull = b === null || !Number.isFinite(b);
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  return (a as number) - (b as number);
};

/** Search parity: symbol OR name, case-insensitive substring. */
export const stocksGlobalFilter: FilterFn<StocksTableRow> = (row, _columnId, filterValue) => {
  const q = String(filterValue ?? "").toLowerCase();
  if (!q) return true;
  return (
    row.original.symbol.toLowerCase().includes(q) ||
    row.original.name.toLowerCase().includes(q)
  );
};

type SortKey = "symbol" | "livePrice" | "pe" | "roe" | "consensus" | "change24h";

/** The sortable columns, in header order (the render reads these ids). */
export const STOCKS_TABLE_SORT_KEYS: SortKey[] = [
  "symbol",
  "livePrice",
  "change24h",
  "pe",
  "roe",
  "consensus",
];

/** The column model. `sector` is a filter-only column (never rendered). */
export function stocksTableColumns(): ColumnDef<StocksTableRow>[] {
  return [
    {
      id: "symbol",
      accessorKey: "symbol",
      sortingFn: (a, b) =>
        String(a.original.symbol).localeCompare(String(b.original.symbol)),
    },
    {
      id: "name",
      accessorKey: "name",
      enableSorting: false,
    },
    {
      id: "livePrice",
      accessorFn: (row) => row.livePrice,
      sortingFn: nullsLastNumeric,
    },
    {
      id: "change24h",
      accessorFn: (row) => row.change24h,
      sortingFn: nullsLastNumeric,
    },
    {
      id: "pe",
      accessorKey: "pe",
      sortingFn: nullsLastNumeric,
    },
    {
      id: "roe",
      accessorKey: "roe",
      sortingFn: nullsLastNumeric,
    },
    {
      id: "consensus",
      accessorKey: "consensus",
      sortingFn: nullsLastNumeric,
    },
    {
      id: "sector",
      accessorKey: "sector",
      enableSorting: false,
      filterFn: "equalsString",
    },
  ];
}

export interface StocksTableState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  globalFilter: string;
  pagination: PaginationState;
}

/** The default state, exported so the component and the test share it. */
export function stocksTableDefaultState(): StocksTableState {
  return {
    sorting: [{ id: "consensus", desc: true }],
    columnFilters: [],
    globalFilter: "",
    pagination: { pageIndex: 0, pageSize: STOCKS_TABLE_PAGE_SIZE },
  };
}

/** The derived state: the sector select value -> the column-filter slice
 *  (the same "All" sentinel the previous table used). */
export function stocksTableColumnFilters(sectorFilter: string): ColumnFiltersState {
  return sectorFilter === "All" ? [] : [{ id: "sector", value: sectorFilter }];
}

/** The ONE options factory (component + test). */
export function stocksTableOptions(
  data: StocksTableRow[],
  state: StocksTableState,
) {
  return {
    data,
    columns: stocksTableColumns(),
    state,
    getCoreRowModel: getCoreRowModel<StocksTableRow>(),
    getSortedRowModel: getSortedRowModel<StocksTableRow>(),
    getFilteredRowModel: getFilteredRowModel<StocksTableRow>(),
    getPaginationRowModel: getPaginationRowModel<StocksTableRow>(),
    globalFilterFn: stocksGlobalFilter,
    enableSortingRemoval: false,
    autoResetPageIndex: true,
  };
}
