/**
 * Q3 Commit B — override lifecycle classification (stale-override gate).
 *
 * The auditor (round 4, Commit B directions): V7's `if (!row) continue`
 * lets an override whose symbol disappeared from the official direct
 * listing live forever without being challenged — an unchallenged override
 * is exactly how a wrong binding would re-enter through the back door.
 *
 * Every curated entry is now classified as exactly one of:
 *   - "active-valid": the symbol is a direct listing row and the live name
 *     still matches the entry's pinned officialName.
 *   - "stale-requires-review": the override cannot be re-verified against
 *     the current listing although it still matters — either the listing
 *     row moved to a different name, or the symbol left the listing while
 *     the seed dataset still carries it and/or symbol_history still binds
 *     it. Stale entries FAIL the validator (fail closed).
 *   - "inactive-historical": the symbol left the listing AND no seed record
 *     and no active binding references it. Kept for provenance, reported
 *     explicitly (never silently skipped), not a failure.
 */
import { describe, expect, it } from "vitest";
import { classifyOverrideStatus, type NameOverrideEntry } from "@/lib/db/nameAgreement";

function entry(overrides: Partial<NameOverrideEntry>): NameOverrideEntry {
  return {
    symbol: "TEST",
    seedName: "Test Corp",
    officialName: "Test Corporation Limited",
    verdict: "SAME_COMPANY",
    action: "BIND_WITH_OVERRIDE",
    basis: "test",
    sources: ["nse_equity_l_test.csv (sha256 abc)"],
    reviewedOn: "2026-10-01",
    reviewedBy: "test",
    ...overrides,
  };
}

describe("Q3 — override lifecycle: active-valid", () => {
  it("listed direct + live name matches the pinned officialName", () => {
    const r = classifyOverrideStatus(
      entry({ symbol: "AFFLE", officialName: "Affle 3i Limited" }),
      { listedDirect: true, liveName: "Affle 3i Limited", seedPresent: true, activeBound: true },
    );
    expect(r.status).toBe("active-valid");
  });
});

describe("Q3 — stale-requires-review (validator must FAIL)", () => {
  it("THE HOLE: symbol left the listing but the seed dataset still carries it", () => {
    const r = classifyOverrideStatus(
      entry({ symbol: "GONE", officialName: "Old Name Limited" }),
      { listedDirect: false, liveName: null, seedPresent: true, activeBound: false },
    );
    expect(r.status).toBe("stale-requires-review");
    expect(r.reason).toContain("no longer appears in the official listing");
  });

  it("symbol left the listing but symbol_history still binds it", () => {
    const r = classifyOverrideStatus(
      entry({ symbol: "GONE2", officialName: "Old Name Limited" }),
      { listedDirect: false, liveName: null, seedPresent: false, activeBound: true },
    );
    expect(r.status).toBe("stale-requires-review");
  });

  it("listing row moved to a different name (name drift)", () => {
    const r = classifyOverrideStatus(
      entry({ symbol: "MOVED", officialName: "Old Name Limited" }),
      { listedDirect: true, liveName: "New Name Limited", seedPresent: true, activeBound: true },
    );
    expect(r.status).toBe("stale-requires-review");
    expect(r.reason).toContain("re-review");
  });
});

describe("Q3 — inactive-historical (kept for provenance, reported, not a failure)", () => {
  it("unlisted, seed retired, no active binding — historical record only", () => {
    const r = classifyOverrideStatus(
      entry({ symbol: "DEAD", officialName: "Delisted Corp Limited", action: "REMOVE_SEED_RECORD" }),
      { listedDirect: false, liveName: null, seedPresent: false, activeBound: false },
    );
    expect(r.status).toBe("inactive-historical");
    expect(r.reason).toContain("provenance");
  });
});

describe("Q3 — the real 55-entry overrides file classifies coherently", () => {
  it("every entry in the repo file reaches a decision (no crashes, no unknowns)", async () => {
    const { parseNameOverrides } = await import("@/lib/db/nameAgreement");
    const fs = await import("node:fs");
    const raw = JSON.parse(
      fs.readFileSync("data/security-master/name_overrides.json", "utf8"),
    );
    const file = parseNameOverrides(raw);
    expect(file.entries.length).toBe(55);
    for (const e of file.entries) {
      const r = classifyOverrideStatus(e, {
        listedDirect: false,
        liveName: null,
        seedPresent: false,
        activeBound: false,
      });
      // With no listing and no binding at all, nothing can be active —
      // but the classifier must still return one of the three states.
      expect(["inactive-historical", "stale-requires-review"]).toContain(r.status);
    }
  });

  it("a WRONG_BINDING removal whose symbol IS still listed stays active-valid when the name matches", () => {
    const r = classifyOverrideStatus(
      entry({ symbol: "JKIL", officialName: "J.Kumar Infraprojects Limited", verdict: "WRONG_BINDING", action: "REMOVE_SEED_RECORD" }),
      { listedDirect: true, liveName: "J.Kumar Infraprojects Limited", seedPresent: false, activeBound: false },
    );
    expect(r.status).toBe("active-valid");
  });
});
