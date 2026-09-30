import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/auth/cron';
import { providerHealthSnapshot } from '@/lib/registry/providerHealth';
import { PROVIDER_REGISTRY, isProviderApproved } from '@/lib/registry/providerRegistry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * T58 — source health report (internal/admin only; CRON_SECRET-protected).
 *
 * Shows, per provider: registry status, observed success rate, latency,
 * last success/failure, and current circuit state. Provider internals stay
 * out of regular user surfaces by design.
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
