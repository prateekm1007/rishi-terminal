/**
 * Commit N1 (founder decision 2026-10-03: Portfolio Lab works without
 * sign-in) — the PROXY behavior, verified end to end.
 *
 * The path LIST lives in lib/auth/protectedPaths.ts and is unit-pinned by
 * test/protectedPaths.test.ts. This file pins the actual proxy FUNCTION:
 * with Supabase session resolution mocked to "signed out",
 *   - /lab (and /lab?tab=…) passes through — no sign-in redirect;
 *   - /alerts still redirects to /auth/signin (retained gate);
 *   - '/portfolio' (no such route) is not walled either — an honest 404
 *     beats a sign-in wall.
 *
 * Rule 21: the /lab cases FAIL on the pre-N1 proxy (it redirected every
 * signed-out /lab request to /auth/signin).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Signed-out user for every proxy run in this file.
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}));

import { proxy } from "@/proxy";
import { NextRequest } from "next/server";

function req(path: string): NextRequest {
  return new NextRequest(`https://rishi-terminal.vercel.app${path}`);
}

// The proxy's protected-path logic only runs when Supabase env is present
// (otherwise it passes through untouched). Stub the env so the gate is
// actually exercised — without this the behavioral cases below are vacuous.
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stub.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "stub-anon-key");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Commit N1 — the proxy no longer walls off Portfolio Lab", () => {
  it("MUST FAIL PRE-N1: GET /lab signed-out passes through (no sign-in redirect)", async () => {
    const res = await proxy(req("/lab"));
    expect(res.headers.get("location")).toBeNull();
    expect([200, null, undefined]).toContain(res.status);
  });

  it("MUST FAIL PRE-N1: GET /lab?tab=compare signed-out keeps its query (no redirect)", async () => {
    const res = await proxy(req("/lab?tab=compare"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("GET /portfolio (no such route) is not walled — an honest 404 beats a sign-in wall", async () => {
    const res = await proxy(req("/portfolio"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("GET /alerts signed-out STILL redirects to sign-in (retained, out-of-scope gate)", async () => {
    const res = await proxy(req("/alerts"));
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/auth/signin");
  });

  it("path-segment matching is preserved (R9): /laboratory is not /lab, /alerts-foo is not /alerts", async () => {
    const laboratory = await proxy(req("/laboratory"));
    expect(laboratory.headers.get("location")).toBeNull();
    const alertsFoo = await proxy(req("/alerts-foo"));
    expect(alertsFoo.headers.get("location")).toBeNull();
  });
});
