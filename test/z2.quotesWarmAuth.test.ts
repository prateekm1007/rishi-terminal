// Z2 (Round 13): the warm endpoint gets its OWN dedicated secret.
//
// Founder directive (Z2): a new env var QUOTES_WARM_SECRET (token_hex(32)),
// accepted only by /api/ingest/quotes-warm. CRON_SECRET stays untouched
// (no cutover window, no 401 risk to the Vercel crons that authenticate
// the OTHER ingest routes). The shared-secret setup had a real incident
// behind it: the synced CRON_SECRET never reached the runtime (the first
// provisioning attempt was invisible to git-triggered deploys), and the
// founder's audit found no Actions secret at all — the warmer has never
// run. A dedicated secret with explicit per-side verification ends that.
//
// Contracts written to FAIL FIRST against the pre-Z2 route (Rule 21/24):
// it accepts CRON_SECRET and ignores QUOTES_WARM_SECRET.

import { describe, expect, it, beforeEach, vi } from "vitest";

const marketStateMock = vi.fn();
const cachedQuoteBatchForEquitiesMock = vi.fn();
const serveQuoteMock = vi.fn();

vi.mock("@/lib/marketHours", () => ({
  marketState: (...a: unknown[]) => marketStateMock(...a),
}));

vi.mock("@/lib/quotePath", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/quotePath")>();
  return {
    ...actual,
    cachedQuoteBatchForEquities: (...a: unknown[]) => cachedQuoteBatchForEquitiesMock(...a),
    serveQuote: (...a: unknown[]) => serveQuoteMock(...a),
  };
});

const FAKE_STOCKS = vi.hoisted(() =>
  Object.fromEntries(
    ["AAA", "BBB", "CCC"].map((s) => [s, { symbol: s }]),
  ),
);

vi.mock("@/data/stocks", () => ({ STOCKS: FAKE_STOCKS }));

import { POST } from "@/app/api/ingest/quotes-warm/route";

// Fixture values are NOT credentials (nothing real here); the names and
// values avoid the generic-api-key keyword shape so the secret scan does
// not false-positive on test fixtures.
const WARM_BEARER = "z2-dedicated-warm-bearer";
const OTHER_ROUTE_BEARER = "z2-unrelated-cron-bearer";

function warmReq(query = "", bearer: string | null): never {
  return {
    nextUrl: new URL(`https://terminal.test/api/ingest/quotes-warm${query}`),
    headers: { get: (k: string) => (k.toLowerCase() === "authorization" ? bearer : null) },
  } as never;
}

beforeEach(() => {
  marketStateMock.mockReset();
  cachedQuoteBatchForEquitiesMock.mockReset();
  serveQuoteMock.mockReset();
  process.env.QUOTES_WARM_SECRET = WARM_BEARER;
  process.env.CRON_SECRET = OTHER_ROUTE_BEARER;
  marketStateMock.mockReturnValue({ open: true, ttlSeconds: 60, freshness: "live-delayed", sessionDate: "2026-10-05" });
  cachedQuoteBatchForEquitiesMock.mockResolvedValue({ quotes: {} });
  serveQuoteMock.mockResolvedValue(null);
});

describe("Z2 — the warm endpoint accepts ONLY its dedicated secret", () => {
  it("correct QUOTES_WARM_SECRET Bearer -> 200", async () => {
    const res = await POST(warmReq("", `Bearer ${WARM_BEARER}`));
    expect(res.status).toBe(200);
  });

  it("a CRON_SECRET Bearer is REJECTED (the shared secret never authenticates this route)", async () => {
    const res = await POST(warmReq("", `Bearer ${OTHER_ROUTE_BEARER}`));
    expect(res.status).toBe(401);
    expect(cachedQuoteBatchForEquitiesMock).not.toHaveBeenCalled();
  });

  it("missing QUOTES_WARM_SECRET env -> 500, even with CRON_SECRET configured", async () => {
    const saved = process.env.QUOTES_WARM_SECRET;
    delete process.env.QUOTES_WARM_SECRET;
    try {
      const res = await POST(warmReq("", `Bearer ${OTHER_ROUTE_BEARER}`));
      expect(res.status).toBe(500);
    } finally {
      process.env.QUOTES_WARM_SECRET = saved;
    }
  });

  it("wrong bearer and missing bearer -> 401, nothing warmed", async () => {
    for (const bearer of [null, "Bearer wrong", `Bearer ${WARM_BEARER} `]) {
      const res = await POST(warmReq("", bearer));
      expect(res.status).toBe(401);
    }
    expect(cachedQuoteBatchForEquitiesMock).not.toHaveBeenCalled();
    expect(serveQuoteMock).not.toHaveBeenCalled();
  });
});
