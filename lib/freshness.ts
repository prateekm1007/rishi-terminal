/**
 * Data-freshness display helpers (remediation T14).
 *
 * UI rule: a seed price is NEVER rendered as a live price. When the live
 * feed has no price, UIs show an em dash with an explanatory tooltip and
 * never fall back to the static seed value. Live prices are always shown
 * with their update time in IST.
 */

export const IST_TIMEZONE = "Asia/Kolkata";

/** "14:07 IST" style stamp for live price updates. */
export function formatISTTime(d: Date | number): string {
  const date = typeof d === "number" ? new Date(d) : d;
  const hh = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: IST_TIMEZONE,
  }).format(date);
  const mm = new Intl.DateTimeFormat("en-GB", {
    minute: "2-digit",
    timeZone: IST_TIMEZONE,
  }).format(date);
  return `${hh}:${mm} IST`;
}

export interface PriceDisplay {
  /** Formatted price string, or em dash when unavailable. */
  text: string;
  /** Tooltip text explaining freshness (or absence). */
  title: string;
}

/** Format a live price for display; never accepts a seed price. */
export function priceDisplay(
  livePrice: number | null | undefined,
  lastUpdated?: number | Date,
): PriceDisplay {
  if (typeof livePrice === "number" && Number.isFinite(livePrice) && livePrice > 0) {
    const when = lastUpdated ? ` · updated ${formatISTTime(lastUpdated)}` : "";
    return {
      text: livePrice.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
      title: `Live price${when}`,
    };
  }
  return {
    text: "—",
    title: "Live price unavailable — seed prices are never shown as current",
  };
}

export interface ChangeDisplay {
  text: string;
  title: string;
  up: boolean;
}

/** Format a live 24h change; null when there is no live quote. */
export function changeDisplay(
  changePct: number | null | undefined,
): ChangeDisplay {
  if (typeof changePct === "number" && Number.isFinite(changePct) && changePct !== 0) {
    return {
      text: (changePct >= 0 ? "+" : "") + changePct.toFixed(2) + "%",
      title: "Live 24h change",
      up: changePct >= 0,
    };
  }
  if (changePct === 0) {
    return { text: "0.00%", title: "Live 24h change", up: true };
  }
  return {
    text: "—",
    title: "Live change unavailable — seed prices are never shown as current",
    up: true,
  };
}
