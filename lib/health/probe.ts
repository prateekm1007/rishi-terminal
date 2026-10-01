/**
 * lib/health/probe.ts — the memoized single-round-trip DB probe for
 * /api/health (N8, round 3).
 *
 * The route previously ran two service-role queries per request with
 * no-store and no limit — an unauthenticated DB hammer. Now:
 *   - ONE `health_probe(...)` RPC per window (timestamps only, no row
 *     counts), with the job-name lists passed from lib/health/slo.ts so
 *     the SQL holds no copy of them;
 *   - a 12 s server-side memo (per instance, globalThis-backed so dev
 *     HMR and warm serverless instances share it): 50 rapid requests
 *     cause at most 1 DB round-trip per window;
 *   - a DB failure is NOT memoized as a cached body — failures re-probe
 *     on the next request (fail closed, and recoverable without waiting
 *     out a window);
 *   - `asOf` is the PROBE time (the moment the data was observed), not
 *     the response time — a cached response never claims fresh data.
 */

import { getServiceSupabase } from "@/lib/db/supabase";
import {
  FUNDAMENTALS_INGEST_JOBS,
  PRICE_INGEST_JOBS,
} from "./slo";
import { computeHealth, type HealthBody } from "./compute";
import { SCORE_ENGINE_VERSION } from "@/lib/consensus/version";

/** Spec: 10–15 s. Short enough to bound staleness, long enough to absorb
 * bursts and monitoring polls. */
export const HEALTH_MEMO_TTL_MS = 12_000;

interface ProbeResult {
  users_visible?: boolean;
  last_price_ingest_at?: string | null;
  last_fundamentals_ingest_at?: string | null;
}

interface MemoState {
  body: HealthBody | null;
  probedAt: number;
  inflight: Promise<HealthBody> | null;
}

const g = globalThis as unknown as { __rishiHealthMemo?: MemoState };

function memo(): MemoState {
  if (!g.__rishiHealthMemo) {
    g.__rishiHealthMemo = { body: null, probedAt: 0, inflight: null };
  }
  return g.__rishiHealthMemo;
}

/** Test hook: forget the memo (unit tests need independent windows). */
export function resetHealthMemo(): void {
  g.__rishiHealthMemo = { body: null, probedAt: 0, inflight: null };
}

function downBody(now: Date): HealthBody {
  return computeHealth({
    dbOk: false,
    now,
    ingestionRows: [],
    engineVersion: SCORE_ENGINE_VERSION,
  });
}

async function probeOnce(now: Date): Promise<HealthBody> {
  let res: { data: unknown; error: unknown };
  try {
    res = await getServiceSupabase().rpc("health_probe", {
      p_price_jobs: PRICE_INGEST_JOBS,
      p_fundamentals_jobs: FUNDAMENTALS_INGEST_JOBS,
    });
  } catch (e) {
    // Transport-level failure — down, never memoized.
    console.error("[health] probe threw:", e instanceof Error ? e.message : e);
    return downBody(now);
  }

  // Any RPC failure (missing function, missing table, connection) is a
  // down condition.
  if (res.error || !res.data) return downBody(now);

  const r = res.data as ProbeResult;
  if (r.users_visible === false) {
    // The RPC executed but the core schema is absent — down, not ok.
    return downBody(now);
  }

  // Shape the timestamps exactly like the ingestion-log path so
  // computeHealth's SLO logic is unchanged (single consumer).
  const ingestionRows = [
    {
      job_name: PRICE_INGEST_JOBS[0] ?? "ingestPrices",
      finished_at: r.last_price_ingest_at ?? null,
    },
    {
      job_name: FUNDAMENTALS_INGEST_JOBS[0] ?? "ingestQuarterly",
      finished_at: r.last_fundamentals_ingest_at ?? null,
    },
  ];
  return computeHealth({
    dbOk: true,
    now,
    ingestionRows,
    engineVersion: SCORE_ENGINE_VERSION,
  });
}

/**
 * The health body, memoized for HEALTH_MEMO_TTL_MS. Concurrent requests
 * within a window share one probe (no thundering herd). A `down` result
 * is returned but never memoized — the next request re-probes.
 */
export async function getHealthBody(): Promise<HealthBody> {
  const m = memo();

  if (m.body !== null && Date.now() - m.probedAt < HEALTH_MEMO_TTL_MS) {
    return m.body;
  }
  if (m.inflight) return m.inflight;

  const p = (async () => {
    const body = await probeOnce(new Date());
    if (body.status === "down") {
      // Failures are not memoized: recovery does not wait out a window.
      resetHealthMemo();
    } else {
      g.__rishiHealthMemo = { body, probedAt: Date.now(), inflight: null };
    }
    return body;
  })();

  m.inflight = p;
  void p.catch(() => {
    /* probeOnce maps every failure to a down body; guard unexpected
       throws only so the inflight slot never rejects unhandled. */
    resetHealthMemo();
  });
  return p;
}
