/**
 * R13 TODAY-AND-TRACKING (founder order, 2026-10-12, DEMO-2 + DEMO-4):
 *
 *   "Build the Today view with an honest empty state (DEMO-4). Add
 *    'tracking: not started' to methodology (DEMO-2)."
 *
 * Acceptance (issue #366): both render on main.
 *
 * What this pin enforces:
 *   1. lib/demoState is the ONE source (rule 14) — the tracking literal is
 *      "not started" and the line reads "tracking: not started" verbatim.
 *   2. The methodology page renders the line through that source (source
 *      pin: the import + the data-methodology-tracking surface exist).
 *   3. The homepage mounts the TodayPanel (the honest Today view) and
 *      passes the Stock-of-the-Day prop — the panel is the demo path's
 *      landing surface.
 *   4. The TodayPanel is a SERVER component — no "use client" directive —
 *      so the honest Today view costs zero first-load JS (the C9 pairing
 *      for the demo LCP budget, ENG-3).
 *   5. The honest states are LITERALS in the panel (no fabricated counts):
 *      "none" for verdicts produced today, the honest no-pick state, and
 *      the tracking status from the one source.
 *
 * Fail-first (C5): on the pre-fix tree the page sources lack the imports
 * and the demoState module does not exist — every leg below fails.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { trackingLine, TRACKING_STATUS } from "../lib/demoState";

const read = (p: string) => readFileSync(p, "utf8");

describe("R13 — the Today view and the tracking line", () => {
  it("the tracking literal comes from the ONE source and reads verbatim", () => {
    expect(existsSync("lib/demoState.ts")).toBe(true);
    expect(TRACKING_STATUS).toBe("not started");
    expect(trackingLine()).toBe("tracking: not started");
  });

  it("the methodology page renders the line through the one source", () => {
    const page = read("app/methodology/page.tsx");
    expect(page).toContain("from '@/lib/demoState'");
    expect(page).toContain("data-methodology-tracking");
    expect(page).toContain("S2-03/S2-04");
    // the line is not hardcoded to a computed-looking state — the literal
    // rides the import
    expect(page).toContain("trackingLine()");
    expect(page).toContain("TRACKING_STATUS");
  });

  it("the homepage mounts the honest Today view", () => {
    const page = read("app/page.tsx");
    expect(page).toContain("TodayPanel");
    expect(page).toContain("<TodayPanel stockOfDay={stockOfDay}");  // still mounted with the SOD prop; movers prop added (DASHBOARD-MOVERS)
  });

  it("the TodayPanel is a server component with honest literals (B-18 positive control)", () => {
    const panel = read("components/dashboard/TodayPanel.tsx");
    // server component: no "use client" (zero first-load JS)
    expect(panel.startsWith("'use client'")).toBe(false);
    expect(panel.startsWith('"use client"')).toBe(false);
    // the honest states are present as literals
    expect(panel).toContain("Verdicts produced today");
    expect(panel).toContain("none");
    expect(panel).toContain("no verdict-allowed pick exists");
    expect(panel).toContain("No headlines yet");
    // the tracking status rides the ONE source, not a local literal
    expect(panel).toContain("from '@/lib/demoState'");
    expect(panel).toContain("{TRACKING_STATUS}");
    // the deterministic IST date renders (rule 18 class: fixed timezone)
    expect(panel).toContain("Asia/Kolkata");
  });
});
