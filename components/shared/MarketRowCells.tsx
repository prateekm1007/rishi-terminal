/**
 * MarketRowCells — the FD-15 presentational cells for reference-market
 * surfaces (crypto / forex / commodities / bonds + the dashboard ticker).
 *
 * The founder's contract (2026-10-11): each row SHOWS value, unit, source
 * name, as-of time and state. Tooltips alone do not satisfy it — the
 * source and the date are visible columns, and the value renders only
 * through the shared gate (lib/markets/sourcedRow.renderableMarketValue):
 * a value with no source and no date renders "—" with "no source yet"
 * (forex/commodities: the source cell reads "licence pending").
 *
 * Presentational only: no hooks, no "use client" — usable from server and
 * client components alike (same shape as <DataValue>, which stays the
 * renderer for non-market metrics).
 */

import type { MarketRow, MarketRowState } from "@/lib/markets/sourcedRow";
import { renderableMarketValue, marketSourceText } from "@/lib/markets/sourcedRow";
import { ProvenanceChip } from "./ProvenanceChip";
import { formatUsdCompact } from "@/lib/format";

/** Contract states → the existing chip vocabulary (one mapping, Rule 14). */
function chipStateFor(state: MarketRowState) {
  switch (state) {
    case "live":
      return "live" as const;
    case "delayed":
      return "live" as const; // a delayed observation is a real quote; the chip label says DELAYED
    default:
      return "unavailable" as const;
  }
}

function chipLabelFor(state: MarketRowState) {
  return state === "live" ? "LIVE" : state === "delayed" ? "DELAYED" : "NO SOURCE";
}

/** Format a gated market value for display (monospace surfaces). */
export function formatMarketValue(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: value >= 1000 ? 0 : 4 });
}

/**
 * Format a gated 24h change for display: "+2.45%" / "-1.30%". The
 * formatter lives HERE, not on the four pages — the acceptance scanner
 * forbids direct `.toFixed(` value formatting on those pages so that a
 * future ungated render cannot hide behind local formatting.
 */
export function formatMarketChange(change: number): string {
  return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
}

/**
 * The value cell: the gated number with its unit, or "—" with the
 * no-source note. data-* attributes carry the contract for tests/audits.
 * `compact` renders large magnitudes as $1.95T / $890.5B (market caps and
 * volumes) through the shared formatter in lib/format — the four pages
 * never format values inline (the scanner enforces that).
 */
export function MarketValueCell({ row, muted = false, compact = false }: { row: MarketRow; muted?: boolean; compact?: boolean }) {
  const gated = renderableMarketValue(row);
  const shown = gated === null ? "—" : compact ? formatUsdCompact(gated) : formatMarketValue(gated);
  const title =
    gated === null
      ? `${marketSourceText(row)} — no sourced observation, nothing renders (FD-15)`
      : `${row.source}, as of ${row.asOf}`;
  return (
    <span
      title={title}
      data-ref-market-value={gated ?? ""}
      data-ref-market-source={row.source ?? ""}
      data-ref-market-asof={row.asOf ?? ""}
      style={{
        fontFamily: "monospace",
        fontWeight: 700,
        color: gated === null ? "var(--text-muted)" : muted ? "var(--text-secondary)" : "var(--accent-gold)",
      }}
    >
      {gated === null ? "—" : shown}
      {gated !== null && row.unit && !compact ? (
        <span style={{ fontWeight: 400, fontSize: "0.82em", marginLeft: 4, color: "var(--text-muted)" }}>
          {row.unit}
        </span>
      ) : null}
    </span>
  );
}

/** The unit line shown under an instrument name (always visible). */
export function MarketUnitNote({ row }: { row: MarketRow }) {
  return (
    <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
      {row.unit || "—"}
    </span>
  );
}

/** The source cell: the provider's name, "licence pending", or "no source yet". */
export function MarketSourceCell({ row }: { row: MarketRow }) {
  const text = marketSourceText(row);
  const pending = text === "licence pending";
  return (
    <span
      data-ref-market-source-cell={text}
      title={
        pending
          ? "No data source is licensed for display yet — values stay — until the founder clears one"
          : row.source
            ? `${row.source}${row.asOf ? ` — observed ${row.asOf}` : " — no observation yet (wiring pending)"}`
            : "No source has been cleared for this row yet"
      }
      style={{
        fontSize: 10,
        fontFamily: "monospace",
        letterSpacing: 0.5,
        color: pending ? "#F59E0B" : "var(--text-muted)",
      }}
    >
      {text}
    </span>
  );
}

/** The as-of cell: the provider's own timestamp, or "—". */
export function MarketAsOfCell({ row }: { row: MarketRow }) {
  const shown = renderableMarketValue(row) === null ? null : row.asOf;
  const text = shown ? shown.replace("T", " ").replace("Z", " UTC").slice(0, 17) : "—";
  return (
    <span
      data-ref-market-asof-cell={shown ?? ""}
      title={shown ? `Observation time disclosed by ${row.source}` : "No observation time — nothing renders"}
      style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-muted)" }}
    >
      {text}
    </span>
  );
}

/** The state chip: LIVE / DELAYED / NO SOURCE. */
export function MarketStateChip({ row }: { row: MarketRow }) {
  const label = chipLabelFor(row.state);
  return (
    <ProvenanceChip
      state={chipStateFor(row.state)}
      label={label}
      title={
        row.state === "live"
          ? "Live observation from the named source"
          : row.state === "delayed"
            ? "Delayed observation from the named source"
            : row.state === "seed"
              ? "Reference dataset — never rendered as data on this surface (FD-15)"
              : "No sourced observation yet"
      }
    />
  );
}
