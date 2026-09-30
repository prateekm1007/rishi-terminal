// INGESTION_V1
import { getAdminSupabase } from "./supabaseAdmin";
import { fetchQuarterlyStatements, fetchAnnualStatements, type FMPIncomeStatement } from "./fmp";
import { PROVIDER_IDS, isProviderApproved } from "../registry/providerRegistry";

function toNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parsePeriod(stmt: FMPIncomeStatement): { fy: number; fq: number } {
  const year = parseInt(stmt.calendarYear || stmt.date.slice(0, 4));
  const qMap: Record<string, number> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
  const fq = qMap[stmt.period] ?? 0;
  return { fy: year, fq };
}

/**
 * Phase 5.1 (T55 reconciliation): the registry marks FMP RESEARCH_ONLY —
 * "free API ≠ display rights" (T36). The matrix previously described the
 * client as "inert" while this module still wired FMP into the production
 * financial-ingestion path; that contradiction is resolved structurally:
 * ingestion is registry-gated and fail-closed. FMP becomes reachable ONLY
 * when the registry status changes to APPROVED, which requires rights
 * evidence (licensing agreement) — never an env toggle.
 */
function fmpApproved(): boolean {
  if (isProviderApproved(PROVIDER_IDS.FMP)) return true;
  console.warn("[ingestion] FMP is RESEARCH_ONLY (not APPROVED) — production ingestion skipped (T55)");
  return false;
}

export async function ingestQuarterly(symbol: string): Promise<{
  inserted: number; errors: number; source: string; skipped?: "not-approved";
}> {
  if (!fmpApproved()) {
    return { inserted: 0, errors: 0, source: "FMP", skipped: "not-approved" };
  }
  const db = getAdminSupabase();
  const stmts = await fetchQuarterlyStatements(symbol, 12);

  if (!stmts.length) return { inserted: 0, errors: 0, source: "FMP" };

  let inserted = 0;
  let errors   = 0;

  for (const s of stmts) {
    const { fy, fq } = parsePeriod(s);
    if (!fq) continue;

    const rev = toNum(s.revenue);
    const np  = toNum(s.netIncome);
    if (rev === null || np === null) continue;

    const opm = s.operatingIncome && s.revenue
      ? Math.round((s.operatingIncome / s.revenue) * 10000) / 100
      : null;

    const { error } = await db.from("financial_quarters").upsert({
      symbol,
      period:         `Q${fq}-${fy}`,
      fiscal_year:    fy,
      fiscal_quarter: fq,
      quarter_end:    s.date,
      revenue:        rev,
      net_profit:     np,
      gross_profit:   toNum(s.grossProfit),
      operating_income: toNum(s.operatingIncome),
      opm,
      net_margin:     toNum(s.netIncomeRatio) !== null ? Math.round((s.netIncomeRatio ?? 0) * 10000) / 100 : null,
      eps:            toNum(s.eps),
      ebitda:         toNum(s.ebitda),
      currency:       "USD",
      source:         "FMP",
      derived:        false,
      fetched_at:     new Date().toISOString(),
    }, { onConflict: "symbol,fiscal_year,fiscal_quarter" });

    if (error) { errors++; } else { inserted++; }
  }

  return { inserted, errors, source: "FMP" };
}

export async function ingestAnnual(symbol: string): Promise<{
  inserted: number; errors: number; source: string; skipped?: "not-approved";
}> {
  if (!fmpApproved()) {
    return { inserted: 0, errors: 0, source: "FMP", skipped: "not-approved" };
  }
  const db = getAdminSupabase();
  const stmts = await fetchAnnualStatements(symbol, 5);

  if (!stmts.length) return { inserted: 0, errors: 0, source: "FMP" };

  let inserted = 0;
  let errors   = 0;

  for (const s of stmts) {
    const fy = parseInt(s.calendarYear || s.date.slice(0, 4));

    const { error } = await db.from("financial_annual").upsert({
      symbol,
      fiscal_year:     fy,
      revenue:         toNum(s.revenue),
      net_profit:      toNum(s.netIncome),
      gross_profit:    toNum(s.grossProfit),
      operating_income: toNum(s.operatingIncome),
      opm:             s.operatingIncome && s.revenue
        ? Math.round((s.operatingIncome / s.revenue) * 10000) / 100
        : null,
      net_margin:      toNum(s.netIncomeRatio) !== null ? Math.round((s.netIncomeRatio ?? 0) * 10000) / 100 : null,
      eps:             toNum(s.eps),
      ebitda:          toNum(s.ebitda),
      currency:        "USD",
      source:          "FMP",
      derived:         false,
      fetched_at:      new Date().toISOString(),
    }, { onConflict: "symbol,fiscal_year" });

    if (error) { errors++; } else { inserted++; }
  }

  return { inserted, errors, source: "FMP" };
}

export async function logIngestion(params: {
  job_name: string;
  symbol?: string;
  status: "success" | "error" | "partial";
  records_in?: number;
  records_out?: number;
  error_msg?: string;
  source?: string;
  started_at: string;
}) {
  const db = getAdminSupabase();
  await db.from("ingestion_log").insert({
    ...params,
    finished_at: new Date().toISOString(),
  });
}