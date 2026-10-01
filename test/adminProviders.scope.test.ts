/**
 * N5 (round 3) — the provider health report says what it is.
 *
 * Health, circuits, volume windows, reuse counters and the measurement
 * ledger are per-serverless-instance memory (globalThis Maps): on
 * serverless every warm instance has its own copy, so the report
 * reflects ONE random instance — not platform-wide totals. The remedy
 * chosen is option (b) from the spec: keep the state instance-local and
 * SAY SO — `scope: "instance"` in the response, honest wording in
 * docs/DATA_PROVIDER_MATRIX.md (already recorded under "Honest gaps").
 *
 * A persistent (RPC-backed) implementation would be option (a); it is
 * not taken this round because the counters exist to measure and
 * attribute latency within an instance's lifetime, not to gate money.
 */
import { describe, it, expect } from "vitest";

process.env.CRON_SECRET = "test-cron-secret";

import { GET } from "@/app/api/admin/providers/route";

function reqWithAuth(header: string | null): never {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "authorization" ? header : null) },
    nextUrl: {},
  } as never;
}

describe("N5 — /api/admin/providers declares its scope honestly", () => {
  it("reports scope: 'instance' at the top level", async () => {
    const res = await GET(reqWithAuth("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scope).toBe("instance");
  });

  it("still fails closed without the cron secret", async () => {
    const res = await GET(reqWithAuth(null));
    expect(res.status).toBe(401);
  });
});
