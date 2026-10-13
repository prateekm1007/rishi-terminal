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
    // LIVE-TODAY (round 56): the mount now also passes the movers
    // snapshot (the live Top Winners / Top Losers view). The pin moves
    // WITH the contract — it still bites on the exact mount shape.
    // TODAY-MOVERS (founder order, 2026-10-13): the mount literal gains
    // the live-news prop — the gate still pins the mounting AND the SOD
    // and movers props (unchanged intent, updated shape).
    // TODAY-FULL (founder order, 2026-10-14): the seed-gated stockOfDay
    // prop is RETIRED from this mount (the SOD row renders the LIVE pick
    // from the movers snapshot; the ranked trio's own SOD card in
    // DashboardTail keeps its seed-gated semantics) — the gate still
    // pins the mounting AND the movers/news props (updated shape).
    expect(page).toContain(
      "<TodayPanel movers={movers} latestNews={latestNews} />",
    );
    expect(page).toContain("readMoversSnapshot");
  });

  it("the TodayPanel is a server component with honest literals (B-18 positive control)", () => {
    const panel = read("components/dashboard/TodayPanel.tsx");
    // server component: no "use client" (zero first-load JS)
    expect(panel.startsWith("'use client'")).toBe(false);
    expect(panel.startsWith('"use client"')).toBe(false);
    // the honest states are present as literals
    expect(panel).toContain("Verdicts produced today");
    expect(panel).toContain("none");
    // TODAY-FULL (founder order, 2026-10-14): the SOD row went LIVE —
    // the pick renders from the movers snapshot with the not-a-verdict
    // label; the no-pick state is the honest live empty (the OLD
    // seed-gated "no verdict-allowed pick exists" wording retired
    // WITH the row's seed derivation).
    expect(panel).toContain("no live pick yet");
    expect(panel).toContain("not a verdict");
    expect(panel).toContain("No headlines yet");
    // the tracking status rides the ONE source, not a local literal
    expect(panel).toContain("from '@/lib/demoState'");
    expect(panel).toContain("{TRACKING_STATUS}");
    // the deterministic IST date renders (rule 18 class: fixed timezone)
    expect(panel).toContain("Asia/Kolkata");
    // LIVE-TODAY: the movers view mounts inside the panel
    expect(panel).toContain("MoversPanel");
    expect(panel).toContain("movers");
  });
});
