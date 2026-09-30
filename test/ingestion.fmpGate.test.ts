import { describe, expect, it, vi, afterEach } from "vitest";
import { ingestQuarterly, ingestAnnual } from "@/lib/services/ingestion";
import { fetchQuarterlyStatements } from "@/lib/services/fmp";
import { PROVIDER_IDS, getProviderDefinition } from "@/lib/registry/providerRegistry";

// Phase 5.1 (T55 reconciliation): the matrix says FMP is RESEARCH_ONLY, and
// that must now be TRUE structurally — production ingestion and the FMP
// client primitive are registry-gated and fail closed. If any of these tests
// fail, FMP has leaked back into the production path.

const REAL_FETCH = globalThis.fetch;

afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.restoreAllMocks();
});

describe("Phase 5.1 — FMP RESEARCH_ONLY is enforced, not nominal", () => {
  it("registry still marks FMP RESEARCH_ONLY", () => {
    expect(getProviderDefinition(PROVIDER_IDS.FMP)?.status).toBe("RESEARCH_ONLY");
    expect(getProviderDefinition(PROVIDER_IDS.FMP)?.status).not.toBe("APPROVED");
  });

  it("ingestQuarterly skips without touching FMP upstream or the database", async () => {
    const spy = vi.fn();
    (globalThis as { fetch: unknown }).fetch = spy as unknown as typeof fetch;
    const r = await ingestQuarterly("TCS");
    expect(r).toEqual({ inserted: 0, errors: 0, source: "FMP", skipped: "not-approved" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("ingestAnnual skips without touching FMP upstream or the database", async () => {
    const spy = vi.fn();
    (globalThis as { fetch: unknown }).fetch = spy as unknown as typeof fetch;
    const r = await ingestAnnual("INFY");
    expect(r.inserted).toBe(0);
    expect(r.skipped).toBe("not-approved");
    expect(spy).not.toHaveBeenCalled();
  });

  it("the FMP client primitive itself refuses to fetch while not APPROVED", async () => {
    const spy = vi.fn();
    (globalThis as { fetch: unknown }).fetch = spy as unknown as typeof fetch;
    const stmts = await fetchQuarterlyStatements("TCS");
    expect(stmts).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
});
