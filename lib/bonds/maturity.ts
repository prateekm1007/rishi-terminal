// lib/bonds/maturity.ts — instrument maturity state, derived from the date.
//
// Audit 2026-10-02 (P1): IN91DTB carried maturityDate 2026-08-15 and was
// still listed as an ordinary tradable row on 2026-10-01 — a stale
// instrument state presented as current. The honest fix is NOT an invented
// replacement date (rule 4): the state is DERIVED from the recorded date
// and the row is explicitly labelled MATURED (the underlying data fix —
// replacing the instrument — is a founder/data decision, see FD-9).

export type BondMaturityState = "active" | "matured";

/**
 * @param maturityDate ISO date (YYYY-MM-DD) recorded for the instrument.
 * @param now injectable clock (tests); defaults to the real current time.
 * An instrument matures ON its maturity date (a T-Bill maturing 2026-08-15
 * is matured from that day onward, including the day itself).
 */
export function bondMaturityState(maturityDate: string, now: Date = new Date()): BondMaturityState {
  const t = Date.parse(maturityDate);
  if (!Number.isFinite(t)) return "active"; // unparseable date: not our claim to relabel
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return t <= todayUtc ? "matured" : "active";
}
