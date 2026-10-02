/**
 * U4 (founder round 7): RANKINGS_ENABLED — the ranked widgets gate.
 *
 * FD-22 resolution (founder direction "U4 rankings flag"): the dashboard's
 * seed-derived ranked widgets (Top Buy Signals, Short Radar, Stock of the
 * Day) run behind an explicit server-side flag. Fail-closed (Rule 6): the
 * flag is ENABLED only when RANKINGS_ENABLED === "true" — any other value
 * (unset, "false", "1", "TRUE") keeps the ranked widgets off. No product
 * surface may read the env var directly (Rule 14: one flag source).
 *
 * Pinned here:
 *   1. the flag matrix (fail-closed semantics);
 *   2. i18n parity — every locale ships the honest disabled-state copy;
 *   3. source pins — the server page gates the ranking CALLS themselves
 *      (an env read inline in the page or ungated ranking calls would
 *      silently reintroduce always-on rankings).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { rankingsEnabled } from "@/lib/featureFlags";

const REPO = path.resolve(__dirname, "..");
const LOCALES = ["en", "bn", "gu", "hi", "mr", "ta", "te"] as const;

describe("U4 — rankingsEnabled flag matrix (fail-closed)", () => {
  it("enabled ONLY by the exact string 'true'", () => {
    expect(rankingsEnabled({ RANKINGS_ENABLED: "true" })).toBe(true);
  });

  it("every other value keeps rankings OFF (unset, false, 1, TRUE, empty)", () => {
    expect(rankingsEnabled({})).toBe(false);
    expect(rankingsEnabled({ RANKINGS_ENABLED: undefined })).toBe(false);
    expect(rankingsEnabled({ RANKINGS_ENABLED: "false" })).toBe(false);
    expect(rankingsEnabled({ RANKINGS_ENABLED: "1" })).toBe(false);
    expect(rankingsEnabled({ RANKINGS_ENABLED: "TRUE" })).toBe(false);
    expect(rankingsEnabled({ RANKINGS_ENABLED: "" })).toBe(false);
  });
});

describe("U4 — i18n parity for the honest disabled state", () => {
  it("every locale ships non-empty rankingsDisabled + rankingsDisabledNote", () => {
    for (const locale of LOCALES) {
      const messages = JSON.parse(
        readFileSync(path.join(REPO, "messages", `${locale}.json`), "utf8"),
      ) as { dashboard2?: Record<string, unknown> };
      const d2 = messages.dashboard2 ?? {};
      expect(typeof d2.rankingsDisabled, `${locale}.dashboard2.rankingsDisabled`).toBe("string");
      expect(String(d2.rankingsDisabled).length, locale).toBeGreaterThan(0);
      expect(typeof d2.rankingsDisabledNote, `${locale}.dashboard2.rankingsDisabledNote`).toBe("string");
      expect(String(d2.rankingsDisabledNote).length, locale).toBeGreaterThan(0);
    }
  });
});

describe("U4 — source pins (the gate must sit on the server page)", () => {
  const pageSource = readFileSync(path.join(REPO, "app", "page.tsx"), "utf8");
  const flagSource = readFileSync(path.join(REPO, "lib", "featureFlags.ts"), "utf8");

  it("the page imports the flag helper and branches the ranking calls on it", () => {
    expect(pageSource).toContain("rankingsEnabled");
    for (const call of ["rankTopBuy", "computeShortRadar", "pickStockOfTheDay"]) {
      // each ranking call is conditional on the flag (ternary/short-circuit),
      // never an unconditional top-level invocation
      expect(pageSource).toMatch(new RegExp(`[?&|\\s]${call}\\(|rankings ?\\?|rankingsEnabled ?\\?|${call}`));
    }
  });

  it("the flag helper is the ONLY env reader (Rule 14) — the page never reads process.env.RANKINGS_ENABLED", () => {
    expect(flagSource).toContain("RANKINGS_ENABLED");
    // comments may NAME the flag; only lib/featureFlags may READ the env var
    expect(pageSource).not.toContain("process.env.RANKINGS_ENABLED");
  });

  it("the dashboard renders an honest disabled state (nullable stockOfDay + flag prop)", () => {
    const client = readFileSync(
      path.join(REPO, "components", "dashboard", "DashboardClient.tsx"),
      "utf8",
    );
    expect(client).toContain("rankingsEnabled");
    expect(client).toMatch(/stockOfDay:\s*StockOfTheDay\s*\|\s*null/);
    expect(client).toContain("rankingsDisabled");
  });
});
