// components/dashboard/IndexStripPanel.tsx — INDEXSTRIP (founder order,
// 2026-10-14, option (b)): the Today panel's index strip — NIFTY 50 and
// SENSEX, every row carrying ITS OWN source label (derived from the
// row's source field — a BSE row can never read "Source: NSE") and its
// own as-of. A leg with no observation renders the honest empty slot;
// a missing number renders "—" (P0-2: null is not zero). SERVER
// component — zero first-load JS (the C9 pairing, ENG-3).

import "server-only";

import type { IndexStripSnapshot } from "@/lib/markets/indexStrip";
import { indexStripRowsFace } from "@/lib/markets/indexStrip";

const SLOTS: Array<{ symbol: string; source: "nse" | "bse"; sourceName: string }> = [
  { symbol: "NIFTY 50", source: "nse", sourceName: "NSE" },
  { symbol: "SENSEX", source: "bse", sourceName: "BSE" },
];

export function IndexStripPanel({ indices }: { indices: IndexStripSnapshot | null }) {
  const faces = new Map(indexStripRowsFace(indices?.rows ?? []).map(f => [f.symbol, f]));
  return (
    <div
      data-index-strip
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "6px 18px",
        alignItems: "baseline",
        padding: "10px 12px",
        border: "1px solid rgba(212,175,55,0.18)",
        borderRadius: 8,
        background: "rgba(212,175,55,0.04)",
      }}
      aria-label="Indices"
    >
      <span style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase" }}>
        Indices
      </span>
      {SLOTS.map(slot => {
        const face = faces.get(slot.symbol);
        if (!face) {
          return (
            <span
              key={slot.symbol}
              data-index-empty={slot.symbol}
              style={{ fontSize: 12.5, color: "var(--text-muted)" }}
            >
              {slot.symbol} — no {slot.sourceName} observation yet (waiting for the warmer tick; nothing
              is estimated in the meantime)
            </span>
          );
        }
        const up = face.changeText.startsWith("+");
        return (
          <span key={slot.symbol} data-index-row={slot.symbol} style={{ fontSize: 13 }}>
            <strong style={{ color: "var(--text-secondary)" }}>{face.symbol}</strong>{" "}
            <span data-index-value style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-primary)" }}>
              {face.valueText}
            </span>{" "}
            <span
              data-index-change
              style={{
                fontVariantNumeric: "tabular-nums",
                color: face.changeText === "—"
                  ? "var(--text-muted)"
                  : up
                    ? "var(--color-up, #16a34a)"
                    : "var(--color-down, #dc2626)",
              }}
            >
              {face.changeText}
            </span>{" "}
            <span data-index-source style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {face.sourceLabel} · {face.asOfText}
            </span>
          </span>
        );
      })}
    </div>
  );
}
