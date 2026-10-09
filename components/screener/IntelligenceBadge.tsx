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
 *
 * Styling: INLINE (the ScreenerClient control convention — this tree
 * has no utility-CSS pipeline; a class-only touch target would render
 * unstyled and fail the WCAG 2.2 target-size gate, which the CI smoke
 * proved with real bite). The 28 px box MEETS the 24 px minimum by
 * construction.
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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 28,
        minWidth: 28,
        padding: '0 8px',
        borderRadius: 999,
        border: '1px solid var(--border)',
        background: 'transparent',
        color: 'var(--text-muted)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        verticalAlign: 'middle',
      }}
      data-intelligence-badge={symbol}
      aria-label={`Open Rishi intelligence for ${symbol}`}
      title={`Rishi intelligence for ${symbol}`}
      onClick={() => onOpen(symbol)}
    >
      Rishi
    </button>
  );
}
