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
 * fetched from /api/fundamentals. Same policy as the engine's `pick()`:
 * only a finite, strictly-positive live number overrides the baseline —
 * a failed/partial live fetch must never zero out a real value.
 */
export function overlaySourced(
  baseline: Sourced<number>,
  liveValue: number | null | undefined,
  vendorName: string | null | undefined,
  liveAsOf: string | null | undefined,
): Sourced<number> {
  if (
    typeof liveValue === "number" &&
    Number.isFinite(liveValue) &&
    liveValue > 0
  ) {
    return {
      value: liveValue,
      source: `vendor:${vendorName && vendorName !== "static" ? vendorName : "live-fundamentals"}`,
      asOf: liveAsOf ?? null,
    };
  }
  return baseline;
}
