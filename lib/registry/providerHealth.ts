/**
 * Provider health + quota protection — Phase 5 T45/T46.
 *
 * Server-side singleton (globalThis-backed so dev HMR and serverless
 * warm instances reuse state within a process lifetime; intentionally
 * per-instance — see T45 note on serverless caches).
 *
 * T45: track success/error rate, latency, last success/failure, and open a
 * cooldown (circuit) so the system stops repeatedly calling unhealthy
 * providers. Callers catch PROVIDER_COOLDOWN and fall to the next provider.
 *
 * T46: `coalesce` deduplicates concurrent identical requests so 20 widgets
 * produce 1 upstream call, not 20. In-memory caches inside livePrice.ts
 * remain the stale-cache layer; persistent caching is Phase 6 (T62/T63).
 */

export interface ProviderHealthEntry {
  calls: number;
  errors: number;
  successRate: number; // 0..1 over the lifetime of this process
  avgLatencyMs: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  cooldownUntil: number; // epoch ms; 0 = closed circuit
}

const COOLDOWN_MS = 60_000;
const COOLDOWN_THRESHOLD = 3; // consecutive failures before the circuit opens

interface HealthState {
  providers: Map<string, ProviderHealthEntry>;
  inflight: Map<string, Promise<unknown>>;
}

const g = globalThis as unknown as { __rishiProviderHealth?: HealthState };

function state(): HealthState {
  if (!g.__rishiProviderHealth) {
    g.__rishiProviderHealth = { providers: new Map(), inflight: new Map() };
  }
  return g.__rishiProviderHealth;
}

function entry(id: string): ProviderHealthEntry {
  const s = state();
  let e = s.providers.get(id);
  if (!e) {
    e = {
      calls: 0,
      errors: 0,
      successRate: 1,
      avgLatencyMs: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastError: null,
      consecutiveFailures: 0,
      cooldownUntil: 0,
    };
    s.providers.set(id, e);
  }
  return e;
}

export function recordProviderResult(id: string, ok: boolean, latencyMs: number, error?: string): void {
  const e = entry(id);
  e.calls += 1;
  e.avgLatencyMs =
    e.avgLatencyMs === 0 ? latencyMs : Math.round(e.avgLatencyMs * 0.8 + latencyMs * 0.2);
  if (ok) {
    e.lastSuccessAt = new Date().toISOString();
    e.consecutiveFailures = 0;
    e.cooldownUntil = 0;
  } else {
    e.errors += 1;
    e.lastFailureAt = new Date().toISOString();
    e.lastError = (error ?? "unknown").slice(0, 200);
    e.consecutiveFailures += 1;
    if (e.consecutiveFailures >= COOLDOWN_THRESHOLD) {
      e.cooldownUntil = Date.now() + COOLDOWN_MS;
    }
  }
  e.successRate = e.calls > 0 ? (e.calls - e.errors) / e.calls : 1;
}

export class ProviderCooldownError extends Error {
  constructor(public providerId: string) {
    super(`provider ${providerId} in cooldown (circuit open)`);
    this.name = "ProviderCooldownError";
  }
}

/**
 * Run an upstream provider call with health accounting (T45). Throws
 * ProviderCooldownError without calling fn while the circuit is open, so
 * callers must be prepared to fall through to the next provider.
 */
export async function withProviderHealth<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const e = entry(id);
  if (Date.now() < e.cooldownUntil) {
    throw new ProviderCooldownError(id);
  }
  const t0 = Date.now();
  try {
    const result = await fn();
    recordProviderResult(id, true, Date.now() - t0);
    return result;
  } catch (err) {
    recordProviderResult(id, false, Date.now() - t0, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

/**
 * T46 request coalescing: identical concurrent requests share one upstream
 * call. The stored promise is removed on settle, so a later request after
 * failure retries normally.
 */
export async function coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const s = state();
  const existing = s.inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fn().finally(() => {
    s.inflight.delete(key);
  });
  s.inflight.set(key, p);
  return p;
}

/** T58 report shape for the admin health endpoint. */
export function providerHealthSnapshot(): Array<
  ProviderHealthEntry & { id: string; currentStatus: "HEALTHY" | "COOLDOWN" | "UNOBSERVED" }
> {
  const s = state();
  const now = Date.now();
  return Array.from(s.providers.entries()).map(([id, e]) => ({
    id,
    ...e,
    currentStatus:
      now < e.cooldownUntil
        ? "COOLDOWN"
        : e.calls === 0
          ? "UNOBSERVED"
          : "HEALTHY",
  }));
}

/** Test-only: reset all health/coalescing state. */
export function resetProviderHealth(): void {
  const s = state();
  s.providers.clear();
  s.inflight.clear();
}
