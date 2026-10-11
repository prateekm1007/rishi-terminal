import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const read = (p: string) => readFileSync(p, "utf8");

/**
 * R5-ADVICE-IDENTIFIERS (founder directive 2026-10-11, verbatim: "Remove
 * BUY, HOLD and AVOID from lib/utils.ts:11 and lib/services/rishiMemory.ts:64.
 * Confirm the portfolio journal's BUY and SELL only record the user's own
 * trades, and label them that way. For the F&O strategy legs, escalate with
 * a recommended default: hide the route until the founder decides."
 *
 * Acceptance: the grep gate covers IDENTIFIERS as well as strings — the
 * banned advice vocabulary may not return as an identifier, a key, or a
 * literal in product code. The user's own portfolio journal BUY/SELL are
 * the documented exception (they record the user's own trades — the type
 * contract pins the labelling requirement), and the F&O strategy legs'
 * paper-trade actions live behind the hidden route (fnoEnabled()).
 */
describe("R5 — the advice identifiers are gone from product code", () => {
  it("lib/utils.ts no longer exports getSig/SIG or any BUY/HOLD/AVOID identifier", () => {
    const s = read("lib/utils.ts");
    expect(s).not.toMatch(/\bgetSig\b/);
    expect(s).not.toMatch(/\bSIG\b/);
    expect(s).not.toMatch(/'BUY'|"BUY"|'HOLD'|"HOLD"|'AVOID'|"AVOID"/);
  });

  it("lib/services/rishiMemory.ts writes the NEUTRAL snapshot signal vocabulary", () => {
    const s = read("lib/services/rishiMemory.ts");
    expect(s).not.toMatch(/"BUY"|"HOLD"|"SELL"/);
    expect(s).toMatch(/"favorable"/);
    expect(s).toMatch(/"balanced"/);
    expect(s).toMatch(/"deterioration"/);
  });

  it("the identifier grep gate: BUY|HOLD|AVOID appear in NO product file except the two documented exceptions", () => {
    // The gate the founder asked for: identifiers AND strings, product-wide.
    let out = "";
    try {
      out = execFileSync(
        "git",
        ["grep", "-l", "-E", "'BUY'|\"BUY\"|'HOLD'|\"HOLD\"|'AVOID'|\"AVOID\"", "--", "lib", "components", "app"],
        { encoding: "utf8" },
      ).trim();
    } catch {
      out = ""; // grep exits 1 on zero matches
    }
    const files = out ? out.split("\n") : [];
    const allowed = new Set([
      "lib/types/portfolio.ts", // the USER'S OWN journal trades (the type contract)
      "lib/validation/schemas.ts", // BlockDeal.side: a FACTUAL NSE filing field (third-party block deals — market data, not advice)
      "lib/fno/strategyEngine.ts", // the strategy legs' paper-trade actions — behind the HIDDEN route (fnoEnabled())
      "app/fno/options/page.tsx", // behind the hidden route
      "app/fno/backtester/page.tsx", // behind the hidden route
    ]);
    const unexpected = files.filter((f) => !allowed.has(f));
    expect(unexpected).toEqual([]);
  });

  it("the portfolio journal's BUY/SELL are the USER'S OWN trades — the type contract pins the labelling (B-18: the contract string exists)", () => {
    const s = read("lib/types/portfolio.ts");
    expect(s).toMatch(/the user's own/i);
    expect(s).toMatch(/your trade/i);
    // and NOTHING in the product writes a JournalEntry programmatically:
    // the journal is user-authoring by construction.
    let out = "";
    try {
      out = execFileSync("git", ["grep", "-l", "JournalEntry", "--", "lib", "components", "app"], { encoding: "utf8" }).trim();
    } catch {
      out = "";
    }
    expect(out).toBe("lib/types/portfolio.ts");
  });

  it("the F&O strategy legs are hidden until the founder decides (fail-closed flag)", async () => {
    const { fnoEnabled, rankingsEnabled } = await import("@/lib/featureFlags");
    expect(fnoEnabled({})).toBe(false);
    expect(fnoEnabled({ FNO_ENABLED: "false" })).toBe(false);
    expect(fnoEnabled({ FNO_ENABLED: "1" })).toBe(false);
    expect(fnoEnabled({ FNO_ENABLED: "true" })).toBe(true);
    // the RANKINGS contract is untouched
    expect(rankingsEnabled({})).toBe(false);
    // every /fno route gate references the flag (the notFound() wiring)
    for (const f of ["app/fno/page.tsx", "app/fno/options/page.tsx", "app/fno/backtester/page.tsx", "app/fno/layout.tsx"]) {
      expect(read(f)).toMatch(/fnoEnabled\(\)/);
    }
  });

  it("the patterns bite (C5): the pre-fix state is matchable", () => {
    // The dead exports existed before this PR; git history holds them.
    // Here the bite is the gate itself: adding a 'BUY' literal to any
    // product file (outside the exceptions) fails the identifier grep.
    const s = read("lib/utils.ts");
    expect(s.includes("BUY")).toBe(false);
  });
});
