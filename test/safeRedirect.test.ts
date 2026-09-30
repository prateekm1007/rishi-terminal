/** R7: `next` redirect parameter can only ever produce same-origin targets. */
import { describe, it, expect } from "vitest";

import { safeNextPath } from "@/lib/auth/safeRedirect";

describe("R7 — safeNextPath", () => {
  it("every spec-listed attack falls back to '/'", () => {
    for (const evil of [
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "javascript:alert(1)",
      "%2F%2Fevil.com",
      "http://evil.com",
      "data:text/html,x",
      "/\\/\\/evil.com",
      "\t//evil.com",
    ]) {
      expect(safeNextPath(evil), `${evil} must be rejected`).toBe("/");
    }
  });

  it("legitimate internal destinations pass through unchanged", () => {
    expect(safeNextPath("/lab")).toBe("/lab");
    expect(safeNextPath("/portfolio")).toBe("/portfolio");
    expect(safeNextPath("/alerts")).toBe("/alerts");
    expect(safeNextPath("/stock/RELIANCE")).toBe("/stock/RELIANCE");
    expect(safeNextPath("/lab?tab=compare&x=1")).toBe("/lab?tab=compare&x=1");
  });

  it("empty / missing / whitespace-only values fall back", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("   ")).toBe("/");
  });

  it("a custom fallback is honoured for rejects", () => {
    expect(safeNextPath("//evil.com", "/dashboard")).toBe("/dashboard");
  });

  it("double-encoded protocol-relative URLs are still rejected", () => {
    expect(safeNextPath("%252F%252Fevil.com")).toBe("/");
  });
});
