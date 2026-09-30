"use client";

import { SEED_DISCLAIMER, SEED_STATUS } from "@/data/stocks";

/**
 * Remediation R1: the mandatory, non-dismissable label shown wherever
 * seed-derived numbers, scores or rankings are displayed.
 *
 * Contract:
 * - Always visible (no close button, no tooltip-only variant).
 * - Exact wording from SEED_DISCLAIMER — do not paraphrase or soften.
 * - Never accompanied by an "as of <date>" claim for seed data.
 * Rendered no-op-free only while SEED_STATUS === 'placeholder'; once the
 * dataset is genuinely sourced (SEED_STATUS flips), this component renders
 * nothing so stale disclaimers cannot linger.
 */
export default function SeedDataBanner({ suffix }: { suffix?: string }) {
  if (SEED_STATUS !== "placeholder") return null;
  return (
    <div
      data-testid="seed-data-banner"
      role="note"
      aria-live="polite"
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        color: "#f59e0b",
        background: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(245,158,11,0.35)",
        borderRadius: 6,
        padding: "4px 10px",
        marginBottom: 10,
      }}
    >
      {SEED_DISCLAIMER}
      {suffix ? <span style={{ fontWeight: 400, color: "inherit", opacity: 0.85 }}> · {suffix}</span> : null}
    </div>
  );
}
