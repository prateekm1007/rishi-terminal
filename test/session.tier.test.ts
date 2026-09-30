/** T5: tier resolution is server-side only — forged/expired tiers downgrade. */
import { describe, it, expect } from "vitest";

import { resolveTier } from "@/lib/auth/session";

const FUTURE = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
const PAST = new Date(Date.now() - 1000).toISOString();

describe("T5 — resolveTier", () => {
  it("ignores client-forged tier names entirely", () => {
    expect(resolveTier("disciple_godmode", FUTURE)).toBe("seeker");
    expect(resolveTier("admin", FUTURE)).toBe("seeker");
    expect(resolveTier("SUPERUSER'; --", FUTURE)).toBe("seeker");
    expect(resolveTier(1337 as any, FUTURE)).toBe("seeker");
  });

  it("downgrades to seeker when the paid tier is expired", () => {
    expect(resolveTier("disciple", PAST)).toBe("seeker");
    expect(resolveTier("student", "not-a-date")).toBe("seeker");
    expect(resolveTier("disciple", null)).toBe("seeker");
    expect(resolveTier("disciple", undefined)).toBe("seeker");
  });

  it("honours a valid paid tier that has not expired", () => {
    expect(resolveTier("student", FUTURE)).toBe("student");
    expect(resolveTier("disciple", FUTURE)).toBe("disciple");
  });

  it("expiry boundary is inclusive (expires exactly now -> seeker)", () => {
    const now = new Date();
    expect(resolveTier("disciple", new Date(now.getTime() - 1).toISOString(), now)).toBe("seeker");
    expect(resolveTier("disciple", new Date(now.getTime() + 60_000).toISOString(), now)).toBe("disciple");
  });
});
