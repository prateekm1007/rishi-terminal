// FMP_SERVICE_V1
import { z } from 'zod';

const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const FMP_KEY  = process.env.FMP_API_KEY || "";

function fmpUrl(path: string, params: Record<string,string> = {}): string {
  const p = new URLSearchParams({ ...params, apikey: FMP_KEY });
  return `${FMP_BASE}${path}?${p.toString()}`;
}

async function fmpFetch<T>(path: string, params: Record<string,string> = {}): Promise<T | null> {
  if (!FMP_KEY) return null;
  try {
    const res = await fetch(fmpUrl(path, params), {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`FMP HTTP ${res.status}`);
    const json: unknown = await res.json();
    // Trust boundary: validate the statement rows instead of blind-casting.
    const rows = z.array(z.looseObject({
      symbol: z.string().catch(''),
      date: z.string().catch(''),
      period: z.string().catch(''),
      calendarYear: z.string().catch(''),
      revenue: z.coerce.number().catch(0),
      grossProfit: z.coerce.number().catch(0),
      operatingIncome: z.coerce.number().catch(0),
      netIncome: z.coerce.number().catch(0),
      grossProfitRatio: z.coerce.number().catch(0),
      operatingIncomeRatio: z.coerce.number().catch(0),
      netIncomeRatio: z.coerce.number().catch(0),
      eps: z.coerce.number().catch(0),
      ebitda: z.coerce.number().catch(0),
    })).catch([]).parse(json);
    return rows as T;
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