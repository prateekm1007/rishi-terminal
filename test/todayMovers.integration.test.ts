/**
 * The Today feature carries the movers (13 Oct 2026). The Today panel is a
 * server component that imports 'server-only', so these checks read the
 * source files rather than rendering the panel.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";

describe("Today feature carries the movers", () => {
  it("TodayPanel accepts the movers and renders the movers panel inside the Today section", () => {
    const src = fs.readFileSync("components/dashboard/TodayPanel.tsx", "utf-8");
    expect(src).toContain("movers: MoversResult | null");
    expect(src).toContain("<TopMoversPanel result={movers} />");
    expect(src).toContain("data-today-movers");
  });

  it("the dashboard passes the movers into the Today panel and mounts no second copy", () => {
    const page = fs.readFileSync("app/page.tsx", "utf-8");
    expect(page).toContain("movers={topMovers}");
    expect(page.includes("<TopMoversPanel")).toBe(false);
  });
});
