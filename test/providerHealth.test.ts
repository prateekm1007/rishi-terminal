import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  withProviderHealth,
  coalesce,
  recordProviderResult,
  providerHealthSnapshot,
  providerReuseStats,
  putCachedResult,
  getCachedResult,
  resetProviderHealth,
  ProviderCooldownError,
} from "@/lib/registry/providerHealth";

// T45/T46: health accounting + circuit + request coalescing.
beforeEach(() => resetProviderHealth());

describe("withProviderHealth", () => {
  it("records success (latency, lastSuccessAt) and keeps the circuit closed", async () => {
    const r = await withProviderHealth("test-ok", async () => 42);
    expect(r).toBe(42);
    const snap = providerHealthSnapshot().find(p => p.id === "test-ok");
    expect(snap?.calls).toBe(1);
    expect(snap?.errors).toBe(0);
    expect(snap?.lastSuccessAt).toBeTruthy();
    expect(snap?.currentStatus).toBe("HEALTHY");
  });

  it("records failures and opens the circuit after 3 consecutive failures", async () => {
    const boom = () => withProviderHealth("test-bad", async () => {
      throw new Error("429");
    });
    await expect(boom()).rejects.toThrow("429");
    await expect(boom()).rejects.toThrow("429");
    // 2 failures: still closed.
    const mid = providerHealthSnapshot().find(p => p.id === "test-bad");
    expect(mid?.currentStatus).toBe("HEALTHY");
    // 3rd failure crosses the threshold and opens the circuit.
    await expect(boom()).rejects.toThrow("429");
    const snap = providerHealthSnapshot().find(p => p.id === "test-bad");
    expect(snap?.currentStatus).toBe("COOLDOWN");
    expect(snap?.consecutiveFailures).toBe(3);
    // While open, fn is never invoked.
    const spy = vi.fn(async () => 1);
    await expect(withProviderHealth("test-bad", spy)).rejects.toBeInstanceOf(ProviderCooldownError);
    expect(spy).not.toHaveBeenCalled();
  });

  it("a success resets the failure streak", async () => {
    const fail = () => withProviderHealth("test-flaky", async () => { throw new Error("x"); });
    await expect(fail()).rejects.toThrow();
    await expect(fail()).rejects.toThrow();
    await withProviderHealth("test-flaky", async () => "ok");
    await expect(fail()).rejects.toThrow();
    const snap = providerHealthSnapshot().find(p => p.id === "test-flaky");
    expect(snap?.consecutiveFailures).toBe(1);
    expect(snap?.currentStatus).toBe("HEALTHY");
  });
});

describe("coalesce (T46)", () => {
  it("shares one upstream call between concurrent identical requests", async () => {
    let calls = 0;
    const fn = async () => {
      calls += 1;
      await new Promise(r => setTimeout(r, 20));
      return "result";
    };
    const [a, b, c] = await Promise.all([
      coalesce("key:1", fn),
      coalesce("key:1", fn),
      coalesce("key:1", fn),
    ]);
    expect(calls).toBe(1);
    expect(a).toBe("result");
    expect(b).toBe("result");
    expect(c).toBe("result");
  });

  it("runs again after settle (no stale promise reuse)", async () => {
    let calls = 0;
    const fn = async () => {
      calls += 1;
      return calls;
    };
    await coalesce("key:2", fn);
    const second = await coalesce("key:2", fn);
    expect(second).toBe(2);
  });

  it("removes a failed promise so later callers can retry", async () => {
    let calls = 0;
    const fn = async () => {
      calls += 1;
      if (calls === 1) throw new Error("transient");
      return "recovered";
    };
    await expect(coalesce("key:3", fn)).rejects.toThrow("transient");
    await expect(coalesce("key:3", fn)).resolves.toBe("recovered");
  });
});

describe("providerHealthSnapshot (T58 shape)", () => {
  it("reports unobserved providers and honours recordProviderResult", () => {
    expect(providerHealthSnapshot()).toHaveLength(0);
    recordProviderResult("observed-1", true, 25);
    recordProviderResult("observed-1", false, 40, "boom");
    const snap = providerHealthSnapshot().find(p => p.id === "observed-1");
    expect(snap?.calls).toBe(2);
    expect(snap?.errors).toBe(1);
    expect(snap?.lastError).toBe("boom");
    expect(snap?.currentStatus).toBe("HEALTHY");
    expect(snap?.avgLatencyMs).toBeGreaterThan(0);
  });
});

describe("T59 windowed request volume", () => {
  it("counts upstream attempts per provider (total/today/currentMinute)", async () => {
    await withProviderHealth("vol-1", async () => 1);
    await withProviderHealth("vol-1", async () => 2);
    try {
      await withProviderHealth("vol-1", async () => { throw new Error("x"); });
    } catch { /* accounted */ }
    const snap = providerHealthSnapshot().find(p => p.id === "vol-1");
    expect(snap?.volume).toBeDefined();
    expect(snap?.volume?.total).toBe(3);
    expect(snap?.volume?.today).toBe(3);
    expect(snap?.volume?.currentMinute).toBe(3);
  });

  it("keeps per-provider buckets separate", async () => {
    await withProviderHealth("vol-a", async () => 1);
    await withProviderHealth("vol-b", async () => 1);
    const a = providerHealthSnapshot().find(p => p.id === "vol-a");
    const b = providerHealthSnapshot().find(p => p.id === "vol-b");
    expect(a?.volume?.total).toBe(1);
    expect(b?.volume?.total).toBe(1);
  });
});

describe("T60 coalesce-hit + reuse accounting", () => {
  it("counts a coalesce hit when a concurrent identical request joins", async () => {
    const before = providerReuseStats().coalesceHits;
    const fn = async () => {
      await new Promise(r => setTimeout(r, 10));
      return "x";
    };
    await Promise.all([coalesce("volkey:1", fn), coalesce("volkey:1", fn)]);
    expect(providerReuseStats().coalesceHits).toBe(before + 1);
  });

  it("result-reuse store: hit within TTL, miss after expiry", async () => {
    putCachedResult("k:1", { price: 42 });
    expect(getCachedResult<{ price: number }>("k:1", 60_000)?.price).toBe(42);
    expect(providerReuseStats().cacheHits).toBe(1);
    // Expired entry is dropped and returns null.
    putCachedResult("k:2", { price: 7 });
    expect(getCachedResult<{ price: number }>("k:2", -1)).toBeNull();
    expect(getCachedResult<{ price: number }>("k:2", 60_000)).toBeNull();
  });
});
