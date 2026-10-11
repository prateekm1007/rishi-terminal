/**
 * Round-47 P1-LIVE-UNIVERSE — the price-display internal flag (founder
 * directive 2026-10-11, verbatim scope):
 *
 *   "Land #350 last, with prices behind an internal flag."
 *   "Keep NSE-sourced end-of-day prices off public pages until NSE answers
 *    the display question in writing."
 *
 * What this pin enforces:
 *   1. THE flag is lib/licensing.ts EOD_PRICE_DISPLAY_LICENSE (one
 *      licensing home, rule 14): status "unresolved", dated, attributed,
 *      naming the pending written answer (rule 1: no unattributed state).
 *   2. Fail-closed (rule 6): eodPricesDisplayable() is false while
 *      unresolved, and NO env var, query parameter, or client value can
 *      influence it (rule 7) — the module contains no process.env read.
 *   3. The internal route refuses 503 BEFORE any network I/O while the
 *      licence is unresolved — fetch is mocked to throw, and the handler
 *      must still answer 503 "withheld" with no price fields in the body
 *      (the ordering IS the control: a handler that fetched first would
 *      error the test, C5).
 *   4. Prices stay off public pages: no page file under app imports the
 *      bhavcopy parser or the eod-prices route (zero-count) with the
 *      route file itself as the positive control (B-18).
 *   5. The patterns bite (C5): the pre-fix handler shape (fetch before
 *      the licence check, or no check) fails pin 3.
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const read = (p: string) => readFileSync(p, "utf8");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("P1 — the EOD price-display internal flag (founder directive 2026-10-11)", () => {
  it("the flag is unresolved, dated, attributed, and names the pending NSE display answer", async () => {
    const { EOD_PRICE_DISPLAY_LICENSE, eodPricesDisplayable } = await import("@/lib/licensing");
    expect(EOD_PRICE_DISPLAY_LICENSE.status).toBe("unresolved");
    expect(eodPricesDisplayable()).toBe(false);
    expect(EOD_PRICE_DISPLAY_LICENSE.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(EOD_PRICE_DISPLAY_LICENSE.authority).toContain("founder directive 2026-10-11");
    expect(EOD_PRICE_DISPLAY_LICENSE.enquiry).toContain("NSE Data & Analytics");
    expect(EOD_PRICE_DISPLAY_LICENSE.enquiry).toContain("display");
  });

  it("no environment variable can move the switch (rule 7 — the constant is the only input)", async () => {
    const mod = await import("@/lib/licensing");
    // the module must not read process.env at all
    const src = read("lib/licensing.ts");
    expect(src.includes("process.env")).toBe(false);
    // and mutating the environment changes nothing
    process.env.NSE_DISPLAY_LICENCE = "licensed";
    process.env.EOD_PRICE_DISPLAY = "licensed";
    expect(mod.eodPricesDisplayable()).toBe(false);
    delete process.env.NSE_DISPLAY_LICENCE;
    delete process.env.EOD_PRICE_DISPLAY;
  });

  it("the internal route refuses 503 BEFORE any network I/O while the licence is unresolved (C5 ordering pin)", async () => {
    // fetch throws — if the handler fetched before checking the licence,
    // this test ERRORS instead of observing the 503, which is the bite.
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("FETCH-MUST-NOT-BE-CALLED-WHILE-UNRESOLVED");
      }),
    );
    const { GET } = await import("@/app/api/universe/eod-prices/route");
    const res = await GET();
    expect(res.status).toBe(503);
    const body = (await res.json()) as { status?: string; note?: string; prices?: unknown };
    expect(body.status).toBe("withheld");
    expect(body.note).toContain("display licence is unresolved");
    // no price byte leaves the server: the body carries no price payload
    expect(body).not.toHaveProperty("prices");
    expect(JSON.stringify(body)).not.toMatch(/"(open|high|low|close)"/);
  });

  it("prices stay off public pages: no page imports the bhavcopy parser or the price route (B-18 control below)", () => {
    let out = "";
    try {
      out = execFileSync(
        "git",
        ["grep", "-l", "-E", "universe/bhavcopy|universe/eod-prices", "--", "app/**/page.tsx"],
        { encoding: "utf8" },
      ).trim();
    } catch {
      out = ""; // grep exits 1 on zero matches — that IS the pass state
    }
    expect(out).toBe("");
  });

  it("B-18 positive control: the internal route exists, imports the flag and the parser, and is not linked from any nav", () => {
    const route = read("app/api/universe/eod-prices/route.ts");
    expect(route).toContain("eodPricesDisplayable");
    expect(route).toContain("parseBhavcopyCsv");
    // and the route is absent from the navigation surfaces
    let out = "";
    try {
      out = execFileSync(
        "git",
        ["grep", "-l", "universe/eod-prices", "--", "components/Sidebar.tsx", "components/**/Nav*.tsx"],
        { encoding: "utf8" },
      ).trim();
    } catch {
      out = ""; // grep exits 1 on zero matches — that IS the pass state
    }
    expect(out).toBe("");
  });

  it("the patterns bite (C5): the pre-fix handler shape fails the ordering pin", async () => {
    // The defect this gate exists for: a handler that fetches (or serves)
    // before consulting the licence. Pinned as source shape so the bite
    // does not depend on a refactor surviving review:
    const route = read("app/api/universe/eod-prices/route.ts");
    const licenseCheck = route.indexOf("eodPricesDisplayable()");
    const firstFetch = route.indexOf("await fetch(");
    expect(licenseCheck).toBeGreaterThan(-1);
    expect(firstFetch).toBeGreaterThan(-1);
    expect(licenseCheck).toBeLessThan(firstFetch);
    // and the refusal path returns before the universe fetch too
    expect(route.indexOf("return NextResponse.json")).toBeLessThan(route.indexOf("await fetchUniverse()"));
  });
});
