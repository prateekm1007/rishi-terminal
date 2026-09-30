// FMP_SERVICE_V1
//
// Phase 5.1 (T55): the registry marks FMP RESEARCH_ONLY — display rights
// unresolved ("free API ≠ display rights", T36). Fail-closed gate INSIDE the
// client primitive: even a future caller that skips the ingestion-service
// gate cannot reach the upstream from production code until the registry
// status becomes APPROVED on documented rights evidence.
import { PROVIDER_IDS, isProviderApproved } from "../registry/providerRegistry";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const FMP_KEY  = process.env.FMP_API_KEY || "";

function fmpUrl(path: string, params: Record<string,string> = {}): string {
  const p = new URLSearchParams({ ...params, apikey: FMP_KEY });
  return `${FMP_BASE}${path}?${p.toString()}`;
}

async function fmpFetch<T>(path: string, params: Record<string,string> = {}): Promise<T | null> {
  // Phase 5.1: registry gate inside the primitive (fail-closed, T55).
  if (!isProviderApproved(PROVIDER_IDS.FMP)) {
    console.warn(`[FMP] blocked: provider is RESEARCH_ONLY, not APPROVED (${path})`);
    return null;
  }
  if (!FMP_KEY) return null;
  try {
    const res = await fetch(fmpUrl(path, params), {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`FMP HTTP ${res.status}`);
    return await res.json() as T;
  } catch (e) {
    console.error(`[FMP] ${path}:`, e);
    return null;
  }
}

export interface FMPIncomeStatement {
  symbol: string;
  date: string;
  period: string;
  calendarYear: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  grossProfitRatio: number;
  operatingIncomeRatio: number;
  netIncomeRatio: number;
  eps: number;
  ebitda: number;
}

export async function fetchQuarterlyStatements(symbol: string, limit = 8): Promise<FMPIncomeStatement[]> {
  const data = await fmpFetch<FMPIncomeStatement[]>(
    `/income-statement/${encodeURIComponent(symbol)}`,
    { period: "quarter", limit: String(limit) }
  );
  return data ?? [];
}

export async function fetchAnnualStatements(symbol: string, limit = 5): Promise<FMPIncomeStatement[]> {
  const data = await fmpFetch<FMPIncomeStatement[]>(
    `/income-statement/${encodeURIComponent(symbol)}`,
    { period: "annual", limit: String(limit) }
  );
  return data ?? [];
}