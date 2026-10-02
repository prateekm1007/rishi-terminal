/**
 * Round 9 (Coder Directions 2026-10-02, directive 18) — Rule-10 error
 * hygiene, repository-wide sweep.
 *
 * Errors are generic on the wire and detailed in server logs only. The
 * round-9 audit found six remaining outward-leakage surfaces:
 *   /api/news                detail: String(error)
 *   /api/history             detail: String(error)
 *   /api/history/breadth     error: err.message (inside a 200 fallback)
 *   /api/pulse/blocks        detail: String(err)
 *   /api/pulse/breadth       detail: String(err)
 *   /api/fundamentals        details: (err as Error).message
 *
 * Each is probed with an upstream failure whose exception text carries a
 * unique marker; the marker must NEVER reach the response body.
 *
 * Rule 21: written first and watched FAIL on main (all six leaked).
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

const REAL_FETCH = globalThis.fetch;
const MARKER = "secret-upstream-host-9f3a.internal.example";

beforeEach(() => {
  (globalThis as { fetch: unknown }).fetch = vi.fn(async () => {
    throw new Error(`connection refused by ${MARKER} (upstream diagnostics)`);
  }) as unknown as typeof fetch;
});
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.restoreAllMocks();
});

function req(url: string, extra: Record<string, unknown> = {}): never {
  // Some routes read req.nextUrl (NextRequest), others req.url — provide both.
  return { url, nextUrl: new URL(url), headers: { get: () => null }, ...extra } as never;
}

async function bodyText(res: Response): Promise<string> {
  return JSON.stringify(await res.json());
}

describe("R9 §18 — Rule 10: no upstream error detail on the wire", () => {
  it("/api/news: generic error, no detail field, no marker", async () => {
    const { GET } = await import("@/app/api/news/route");
    const res = await GET(req("https://t.test/api/news"));
    const text = await bodyText(res);
    expect(text).not.toContain(MARKER);
    expect(text).not.toContain("detail");
  });

  it("/api/history: generic error, no detail field, no marker", async () => {
    const { GET } = await import("@/app/api/history/route");
    const res = await GET(req("https://t.test/api/history?symbol=RELIANCE&tf=1d"));
    const text = await bodyText(res);
    expect(text).not.toContain(MARKER);
    expect(text).not.toContain("detail");
  });

  it("/api/history/breadth: honest fallback WITHOUT the upstream message", async () => {
    const { GET } = await import("@/app/api/history/breadth/route");
    const res = await GET(req("https://t.test/api/history/breadth"));
    const text = await bodyText(res);
    expect(text).not.toContain(MARKER);
    expect(text).not.toContain("error");
  });

  it("/api/pulse/blocks: generic error, no detail field, no marker", async () => {
    const { GET } = await import("@/app/api/pulse/blocks/route");
    const res = await GET();
    const text = await bodyText(res);
    expect(text).not.toContain(MARKER);
    expect(text).not.toContain("detail");
  });

  it("/api/pulse/breadth: generic error, no detail field, no marker", async () => {
    const { GET } = await import("@/app/api/pulse/breadth/route");
    const res = await GET();
    const text = await bodyText(res);
    expect(text).not.toContain(MARKER);
    expect(text).not.toContain("detail");
  });

  it("/api/fundamentals: generic error, no details field, no marker", async () => {
    const { GET } = await import("@/app/api/fundamentals/route");
    const res = await GET(req("https://t.test/api/fundamentals?symbol=RELIANCE"));
    const text = await bodyText(res);
    expect(text).not.toContain(MARKER);
    expect(text).not.toContain("details");
  });
});
