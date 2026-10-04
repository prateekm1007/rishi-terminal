import { isAdmissibleLive } from "@/lib/types/admissibility";

/**
 * Sourced<T> — the provenance contract for every number the UI renders
 * (Roadmap P0-06).
 *
 * A UI component that renders a market number takes a `Sourced`, and the
 * shared <DataValue> component renders the value, a source/as-of tooltip,
 * and `—` when the value is null. Nothing renders a bare number without an
 * answer to "where did this come from, and when was it true?".
 *
 * Relation to the internal T10 resolution (lib/scoring): ResolvedField
 * (source: 'seed' | 'live' | 'derived') stays the engine-internal truth —
 * tests pin its exact values (R1 evidence model). `toSourced` lifts it into
 * this UI-facing contract: 'live' becomes `vendor:<name>` because live
 * data always comes from an upstream (screener, yahoo+nse, …).
 */

/** Template type keeps vendor names open but forces the `vendor:` prefix. */
export type SourcedSource = `vendor:${string}` | "filing" | "seed" | "derived";

export interface Sourced<T = number> {
  value: T | null;
  source: SourcedSource;
  /**
   * When the value was captured/derived. Null means "no provable capture
   * date" — seed data may never claim one (R1).
   */
  asOf: string | null;
}

/** The internal resolution shape produced by lib/scoring (T10). */
export interface ResolvedFieldLike {
  value: number;
  source: "seed" | "live" | "derived";
  asOf: string | null;
}

/** Human-readable source labels for the tooltip. Kept in one place. */
export const SOURCE_LABELS: Record<string, string> = {
  seed: "Reference dataset (illustrative)",
  filing: "Primary filing",
  derived: "Derived on this page",
};

export function sourceLabel(source: SourcedSource): string {
  if (SOURCE_LABELS[source]) return SOURCE_LABELS[source];
  if (source.startsWith("vendor:")) {
    const name = source.slice("vendor:".length);
    return `Live data via ${name}`;
  }
  return source;
}

/**
 * Lift an internal ResolvedField into the UI contract. `vendorName` should
 * carry the actual upstream (e.g. the live fundamentals `source` field:
 * "screener", "yahoo+nse") so the tooltip names a real provider, not a
 * generic "live".
 */
export function toSourced(
  field: ResolvedFieldLike,
  vendorName?: string,
): Sourced<number> {
  let source: SourcedSource;
  switch (field.source) {
    case "live":
      source = `vendor:${vendorName && vendorName !== "static" ? vendorName : "live-fundamentals"}`;
      break;
    case "derived":
      source = "derived";
      break;
    case "seed":
    default:
      source = "seed";
      break;
  }
  return { value: field.value, source, asOf: field.asOf };
}

/** Convenience for values computed on the page from other sourced inputs. */
export function derivedSourced(
  value: number | null,
  asOf: string | null = null,
): Sourced<number> {
  return { value, source: "derived", asOf };
}

/**
 * Overlay a live upstream value on top of a resolved field (N1).
 *
 * lib/scoring is server-only, so the client re-resolution that
 * MetricsPanel used to do is gone: the server resolves the seed baseline
 * (RSC props) and this helper applies the live fundamentals the client
 * fetched from /api/fundamentals.
 *
 * G5 (audit 2026-10-02): admissibility is FIELD-SPECIFIC — pass the
 * canonical field key so zero/negative legitimate observations (negative
 * ROE, D/E = 0, …) override the baseline instead of being silently
 * reinterpreted as missing. Without a field key the strict legacy rule
 * (finite, strictly positive) applies — fail-closed for unkeyed callers.
 *
 * H3 (audit 2026-10-01) plausibility bound: a live value wildly out of
 * line with the baseline it would replace (> 50× or < 1/50) is almost
 * certainly a unit/semantics mismatch (the ₹-vs-₹Cr marketCap class), not
 * real movement — keep the honestly-labelled baseline instead of letting
 * a corrupted number through. Only applies when the baseline itself is a
 * usable positive number; a null/zero baseline has nothing to compare
 * against, so the live value is accepted as before.
 */
const MAX_OVERLAY_RATIO = 50;

export function overlaySourced(
  baseline: Sourced<number>,
  liveValue: number | null | undefined,
  vendorName: string | null | undefined,
  liveAsOf: string | null | undefined,
  field?: string,
): Sourced<number> {
  // Y4 (Round 12): the "static" fundamentals fallback is the seed dataset
  // relabeled server-side — it is NOT a live observation. Overlaying it
  // would launder seed numbers (including placeholder zeros) into the
  // UI as `vendor:live-fundamentals`. Keep the baseline: same numbers,
  // honest label ("Reference dataset (illustrative)").
  if (vendorName === "static") return baseline;
  const admissible =
    typeof liveValue === "number" &&
    (field ? isAdmissibleLive(field, liveValue) : Number.isFinite(liveValue) && liveValue > 0);
  if (admissible) {
    const base = baseline.value;
    const withinBand =
      base === null ||
      base <= 0 ||
      (liveValue <= base * MAX_OVERLAY_RATIO &&
        liveValue >= base / MAX_OVERLAY_RATIO);
    if (withinBand) {
      return {
        value: liveValue,
        source: `vendor:${vendorName && vendorName !== "static" ? vendorName : "live-fundamentals"}`,
        asOf: liveAsOf ?? null,
      };
    }
  }
  return baseline;
}

/**
 * Y4 (Round 12): a seed-sourced ZERO is the June placeholder for
 * "unknown" — the seed generator wrote 0 where a value was missing — and
 * must never render as an observation. A vendor/filing/derived 0 is a
 * REAL observation (a debt-free D/E, a legitimately flat promoter stake)
 * and MUST render as 0 (Rule 16 cuts both ways). This lifts placeholder
 * zeros to null at the UI boundary so <DataValue> renders "—" (Rule 3)
 * without touching the engine's resolution semantics.
 */
export function dropSeedPlaceholderZero(s: Sourced<number>): Sourced<number> {
  return s.value === 0 && s.source === "seed" ? { ...s, value: null } : s;
}
