/**
 * <DataValue> — the ONLY way UI renders a sourced number (P0-06).
 *
 * Renders:
 *  - the formatted value, or `—` when null/absent (never 0, never "N/A" lies)
 *  - a tooltip naming the source and the as-of timestamp (plain title attr,
 *    so the component stays server-component safe — no hooks, no client JS)
 *  - data-source / data-as-of attributes for tests and audits
 *
 * Server component safe: no "use client", no event handlers.
 */

import type { Sourced } from "@/lib/types/sourced";
import { sourceLabel } from "@/lib/types/sourced";
import { formatMetric } from "@/lib/format";

export interface DataValueProps {
  sourced: Sourced<number>;
  /** Digits for the default formatter; ignored when `format` is given. */
  digits?: number;
  /** Custom formatter (e.g. percentage, crore shorthand). */
  format?: (value: number) => string;
  /** Unit suffix rendered after the value ("%", "x", "Cr"), not part of the value. */
  unit?: string;
  className?: string;
}

export function DataValue({ sourced, digits = 1, format, unit, className }: DataValueProps) {
  const fmt = format ?? ((v: number) => formatMetric(v, digits));
  const text = sourced.value === null ? "—" : fmt(sourced.value);

  const tooltip =
    sourced.value === null
      ? `${sourceLabel(sourced.source)} — no value available`
      : `${sourceLabel(sourced.source)}${sourced.asOf ? `, as of ${sourced.asOf}` : " (no provable capture date)"}`;

  return (
    <span
      className={className}
      title={tooltip}
      data-source={sourced.source}
      data-as-of={sourced.asOf ?? ""}
      data-value={sourced.value ?? ""}
    >
      {text}
      {unit && sourced.value !== null ? <span className="data-unit">{unit}</span> : null}
    </span>
  );
}
