/**
 * FD-13 (round 48, founder directive 2026-10-11, verbatim: "label or
 * hide the boilerplate rows and market-cap artifacts") — the seed-residual
 * detectors behind the honest-display labels.
 *
 * Why this module exists: the seed dataset carries two residual defect
 * families the round-5 audit measured (roadmap FD-13) —
 *   1. BOILERPLATE CLONES: rows whose (ocf, rev, sh, np) tuple is
 *      byte-identical to another row's — placeholder financials stamped
 *      onto many companies. On the round-48 896-row dataset: 429 rows in
 *      17 repeated-tuple groups (top group 390).
 *   2. MARKET-CAP ARTIFACTS: rows whose mktcap is EXACTLY price x 1000 —
 *      the ingestion-era placeholder arithmetic (the audit's named
 *      examples: APEX, AIAENG). On the round-48 dataset: 396 rows.
 *
 * The interim impossibility gate (P0-x) already excludes 55
 * self-contradictory rows from scored surfaces; everything else displays
 * under the seed banner. THIS module adds the per-row HONEST LABEL so a
 * user can see WHICH seed rows are boilerplate/artifact at a glance
 * ("label or hide" — the founder chose to allow either; the labels keep
 * the data visible and are the reversible choice).
 *
 * The REAL fix is the D1 live-fundamentals project (the roadmap records
 * this); these labels retire the moment D1 lands.
 *
 * Client-safe: pure functions over plain fields, no data imports, no
 * server-only directive (the lib/dataQuality.ts precedent). The
 * cross-row clone detection takes the rows as an argument — the caller
 * (the server page, which already has STOCKS) supplies them; nothing
 * here ships the dataset into a client bundle.
 */

/** A row's (ocf, rev, sh, np) tuple key — the boilerplate signature. */
function cloneKey(r: { ocf: unknown; rev: unknown; sh: unknown; np: unknown }): string {
  return `${r.ocf}|${r.rev}|${r.sh}|${r.np}`;
}

/**
 * The market-cap artifact: mktcap is EXACTLY price x 1000 (the
 * placeholder arithmetic signature). A near-miss is NOT flagged — this
 * is a detector for a specific defect, not a heuristic (a real company
 * CAN have a market cap near 1000x its price if the units are mixed;
 * only the exact artifact is labelled). Null/zero/non-finite inputs are
 * never artifacts (rule 16: null is a real value).
 */
export function isMktcapArtifact(
  price: number | null | undefined,
  mktcap: number | null | undefined,
): boolean {
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return false;
  if (typeof mktcap !== "number" || !Number.isFinite(mktcap) || mktcap <= 0) return false;
  return Math.abs(mktcap - price * 1000) < 1e-9;
}

/**
 * The boilerplate-clone symbols: every row whose (ocf, rev, sh, np)
 * tuple is shared by at least one OTHER row. In a curated per-company
 * dataset, byte-identical four-field tuples are a placeholder signature,
 * not a coincidence. Pure over the input — deterministic for the same
 * rows (rule 18).
 */
export function boilerplateCloneSymbols(
  rows: Iterable<{ symbol: string; ocf: unknown; rev: unknown; sh: unknown; np: unknown }>,
): Set<string> {
  const seen = new Map<string, number>();
  for (const r of rows) {
    const k = cloneKey(r);
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const out = new Set<string>();
  for (const r of rows) {
    if ((seen.get(cloneKey(r)) ?? 0) >= 2) out.add(r.symbol);
  }
  return out;
}

/**
 * The compact page-prop form: pipe-joined symbol lists (the /stocks page
 * computes them server-side over STOCKS and hands ONE small prop to the
 * client table — the wire contract is untouched).
 */
export function seedResidualMarks(
  rows: Iterable<{ symbol: string; ocf: unknown; rev: unknown; sh: unknown; np: unknown; price: unknown; mktcap: unknown }>,
): { boilerplate: string; mktcapArtifact: string } {
  const clones = boilerplateCloneSymbols(rows);
  const artifacts: string[] = [];
  for (const r of rows as Iterable<{ symbol: string; price: unknown; mktcap: unknown }>) {
    if (isMktcapArtifact(r.price as number, r.mktcap as number)) artifacts.push(r.symbol);
  }
  return {
    boilerplate: [...clones].sort().join("|"),
    mktcapArtifact: artifacts.sort().join("|"),
  };
}
