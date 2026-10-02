/**
 * Proxy protected-path contract (founder decision 2026-10-03):
 * /lab — the Portfolio Lab — works WITHOUT sign-in; its data is
 * browser-local. The path list lives in lib/auth/protectedPaths.ts and is
 * consumed by proxy.ts, so the redirect decision is unit-testable.
 */
import { describe, it, expect } from "vitest";
import { isProtectedPath, PROTECTED_PATHS } from "@/lib/auth/protectedPaths";

describe("proxy protected paths", () => {
  it("/lab is NOT protected — the Portfolio Lab works without sign-in", () => {
    expect(isProtectedPath("/lab")).toBe(false);
    expect(isProtectedPath("/lab/")).toBe(false);
    expect(PROTECTED_PATHS).not.toContain("/lab");
  });

  it("/alerts remains protected (outside the founder decision)", () => {
    expect(isProtectedPath("/alerts")).toBe(true);
  });

  it("'/portfolio' is not protected — no such route exists (the lab is /lab); an honest 404 beats a sign-in wall", () => {
    expect(isProtectedPath("/portfolio")).toBe(false);
    expect(PROTECTED_PATHS).not.toContain("/portfolio");
  });

  it("matching is by path SEGMENT (R9): /laboratory is not /lab", () => {
    expect(isProtectedPath("/laboratory")).toBe(false);
    expect(isProtectedPath("/alerts-foo")).toBe(false);
  });
});
