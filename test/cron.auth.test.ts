/** T8: cron/ingest routes fail closed. */
import { describe, it, expect, beforeEach } from "vitest";

import { requireCronAuth } from "@/lib/auth/cron";

function reqWithAuth(header: string | null): any {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "authorization" ? header : null) },
  };
}

beforeEach(() => {
  process.env.CRON_SECRET = "test-cron-secret";
});

describe("T8 — requireCronAuth", () => {
  it("accepts the exact Bearer secret", () => {
    expect(requireCronAuth(reqWithAuth("Bearer test-cron-secret"))).toBeNull();
  });

  it("is case-insensitive on the scheme, exact on the secret", () => {
    expect(requireCronAuth(reqWithAuth("bearer test-cron-secret"))).toBeNull();
    expect(requireCronAuth(reqWithAuth("Bearer wrong-secret"))?.status).toBe(401);
  });

  it("rejects missing header, malformed header and timing probes", async () => {
    expect(requireCronAuth(reqWithAuth(null))?.status).toBe(401);
    expect(requireCronAuth(reqWithAuth("test-cron-secret"))?.status).toBe(401); // no Bearer
    expect(requireCronAuth(reqWithAuth("Basic test-cron-secret"))?.status).toBe(401);
    const res = requireCronAuth(reqWithAuth("Bearer wrong"));
    const body = await res!.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("fails CLOSED when CRON_SECRET is not configured — never an open endpoint", () => {
    const saved = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    try {
      const res = requireCronAuth(reqWithAuth("Bearer anything"));
      expect(res).not.toBeNull();
      expect(res!.status).toBe(500);
    } finally {
      process.env.CRON_SECRET = saved;
    }
  });
});
