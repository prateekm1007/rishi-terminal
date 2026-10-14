// lib/verdicts/presentation.ts — TODAY-VERDICTS: the ONE face owner for
// the Today panel's verdicts row (the FD-15 class: every figure carries
// its own provenance; the wording lives HERE, the row renders it — the
// same pattern as lib/movers/presentation).
//
// The row states EXACTLY what the ledger holds: the count produced
// today, the latest verdict (symbol, category, the consensus number
// with its data-quality class), the fundamentals transport, the
// candidate set, and the production time. The consensus number is
// labelled a heuristic score on live fundamentals — never advice (the
// same not-a-verdict-on-advice framing every scoring surface carries).

import type { VerdictsTodayFace } from "./types";

/** The transport's display name — mirrored from the fundamentals
 *  module's own vocabulary (FullFundamentals.source), human-worded. */
export function fundamentalsTransportLabel(source: string | null): string {
  switch (source) {
    case "screener":
      return "Screener.in (unofficial)";
    case "yahoo+nse":
      return "Yahoo Finance + NSE (unofficial)";
    default:
      return "live fundamentals transport undisclosed";
  }
}

/** The data-quality class in user-facing words (the P0-1 vocabulary —
 *  'live' and 'delayed' are the only classes a produced row can carry). */
export function dataQualityLabel(dq: string): string {
  if (dq === "live") return "live data";
  if (dq === "delayed") return "delayed live data (undated provider observations)";
  return "undisclosed data class";
}

/** The IST time-of-day of an ISO timestamp, rendered for the row
 *  (e.g. "14 Oct, 09:41 IST"). Deterministic per timestamp. */
export function producedAtLabel(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "time undisclosed";
  const rendered = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
  return `${rendered} IST`;
}

/** The full verdicts-row sentence for a POPULATED ledger (count > 0). */
export function verdictsRowText(face: VerdictsTodayFace): string {
  const parts: string[] = [];
  const n = face.count;
  parts.push(
    `${n} verdict${n === 1 ? "" : "s"} produced today on live fundamentals — ` +
      `latest: ${face.today[face.today.length - 1].symbol} ` +
      `(${face.today[face.today.length - 1].category}, ` +
      `${face.today[face.today.length - 1].consensus.toFixed(1)}/100, ` +
      `${dataQualityLabel(face.today[face.today.length - 1].dataQuality)})`,
  );
  const transport = face.today[face.today.length - 1].fundamentalsSource;
  parts.push(`fundamentals via ${fundamentalsTransportLabel(transport)}`);
  if (face.candidates && face.candidates.length > 0) {
    parts.push(candidateSetLabel(face));
  }
  parts.push(`produced ${producedAtLabel(face.today[face.today.length - 1].producedAt)}`);
  return `${parts.join(" · ")}. A heuristic score, not investment advice.`;
}

/**
 * TODAY-NIFTY: the candidate set's disclosure line. The licensed NSE
 * path summarizes (a 50-symbol list does not fit a sentence — the full
 * list stays in verdicts_meta for the audit trail); the founder-confirmed
 * floor names its five as before.
 */
export function candidateSetLabel(face: VerdictsTodayFace): string {
  if (
    face.candidateSource === "nifty50-nse" &&
    face.candidates &&
    face.candidates.length > 8
  ) {
    const universe = face.candidateUniverseSize ?? face.candidates.length;
    return (
      `candidate set: Nifty 50 constituents per NSE — ${face.candidates.length} tracked symbols ` +
      `of ${universe} (licensed use)`
    );
  }
  return `candidate set: ${(face.candidates ?? []).join(", ")}`;
}

/**
 * TODAY-NIFTY: one ranked row's provenance line (the FD-15 class — the
 * card states where its fundamentals came from and when the verdict was
 * produced; the consensus number never travels without it).
 */
export function verdictRowProvenance(row: {
  fundamentalsSource: string | null;
  producedAt: string;
}): string {
  return `fundamentals via ${fundamentalsTransportLabel(row.fundamentalsSource)} · produced ${producedAtLabel(row.producedAt)}`;
}
