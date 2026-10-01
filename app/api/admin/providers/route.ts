import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/auth/cron';
import {
  providerHealthSnapshot,
  providerReuseStats,
} from '@/lib/registry/providerHealth';
import { PROVIDER_REGISTRY, isProviderApproved } from '@/lib/registry/providerRegistry';
import { measurementSnapshot } from '@/lib/health/measurement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * T58 — source health report (internal/admin only; CRON_SECRET-protected).
 *
 * Shows, per provider: registry status, observed success rate, latency,
 * last success/failure, current circuit state, and Phase 6 T59 windowed
 * request volume. Also reports T60 dedup/reuse counters (coalesce hits =
 * concurrent requests that shared one upstream call; cache hits = snapshot
 * replays served without an upstream call). Provider internals stay out of
 * regular user surfaces by design.
 */
export async function GET(req: NextRequest) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const observed = providerHealthSnapshot();

  const registry = Object.values(PROVIDER_REGISTRY).map(p => ({
    id: p.id,
    status: p.status,
    auth: p.auth,
    productionEligible: isProviderApproved(p.id),
    datasets: p.datasets,
  }));

  const byId = new Map(observed.map(o => [o.id, o]));

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      reuse: providerReuseStats(),
      // Phase 6.1 T59: full measurement ledger — application requests vs
      // actual upstream calls vs served-from split, plus a bounded ring of
      // raw events (app-request / bulk-run / upstream-attempt / serve) for
      // latency attribution and counter reconciliation (T59.2/T59.4/T59.5).
      measurement: measurementSnapshot(),
      providers: registry.map(r => {
        const o = byId.get(r.id);
        return {
          ...r,
          observed: o
            ? {
                calls: o.calls,
                errors: o.errors,
                successRate: Number(o.successRate.toFixed(3)),
                avgLatencyMs: o.avgLatencyMs,
                lastSuccessAt: o.lastSuccessAt,
                lastFailureAt: o.lastFailureAt,
                lastError: o.lastError,
                currentStatus: o.currentStatus,
                volume: o.volume ?? null,
              }
            : null,
        };
      }),
      // Providers observed at runtime but missing from the registry —
      // a registry-hygiene signal (everything observed must be registered).
      unregisteredObserved: observed.filter(o => !PROVIDER_REGISTRY[o.id]).map(o => o.id),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
