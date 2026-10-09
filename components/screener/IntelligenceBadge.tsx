'use client';

/**
 * <IntelligenceBadge> (INT-D2) — the per-row intelligence OPENER on
 * the screener table. Pre-registration:
 * docs/intelligence/stockIntelligence.md (committed BEFORE any
 * evaluation).
 *
 * Presentational only: it carries NO computed intelligence value (no
 * score, no verdict, no recommendation — the A8 absence discipline at
 * breadth) and requests NOTHING. Clicking it opens the intelligence
 * drawer for that row's symbol. The drawer is mounted ONCE in
 * ScreenerClient (the dynamic ssr:false chunk) — this component never
 * imports it, and nothing on the table computes or fetches per row
 * (the 896-row universe triggers zero chain reads and zero
 * intelligence requests on render).
 */

type Props = {
  /** The SERVER-rendered registry symbol of this row (the client invents no subject). */
  symbol: string;
  /** The opener callback — ONE drawer serves the whole table. */
  onOpen: (symbol: string) => void;
};

export function IntelligenceBadge({ symbol, onOpen }: Props) {
  return (
    <button
      type="button"
      className="ml-2 inline-block rounded-full border border-gray-700 px-2 py-0.5 align-middle text-[10px] font-mono font-bold text-gray-400 transition hover:border-yellow-600 hover:text-yellow-500"
      data-intelligence-badge={symbol}
      aria-label={`Open Rishi intelligence for ${symbol}`}
      title={`Rishi intelligence for ${symbol}`}
      onClick={() => onOpen(symbol)}
    >
      Rishi
    </button>
  );
}
