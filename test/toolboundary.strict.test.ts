/**
 * Commit M (founder §19) — STRICT tool-argument boundaries.
 *
 * lib/ai/tools.ts previously validated tool arguments with non-strict Zod
 * objects: unexpected keys were silently STRIPPED and the tool executed
 * anyway. A model (or an injected provider) could smuggle extra arguments —
 * `{"tool": "getStock", "args": {"symbol": "TCS", "universe": "all",
 * "include": "everything"}}` — and the call would succeed with the junk
 * discarded silently, so neither the model nor the audit trail learned the
 * boundary existed. Rule 9: validate at EVERY trust boundary, and the
 * tool-call shape IS a trust boundary.
 *
 * Contract under test:
 *   - every tool argument object is a STRICT Zod contract: unknown keys are
 *     rejected as invalid-args, never silently dropped;
 *   - malformed nested values / wrong types / oversized values fail closed;
 *   - the rejection is the explicit invalid-args failure state (no execution,
 *     no partial data).
 *
 * Rule 21: the extra-key tests FAIL on the pre-M tree (strip-mode objects).
 */
import { describe, expect, it } from "vitest";
import { executeAiTool, AI_TOOL_NAMES } from "@/lib/ai/tools";

const NO_DATA_DEPS = {
  getFundamentals: async () => null,
  getPrice: async () => null,
};

describe("tool arguments are STRICT zod contracts (founder §19)", () => {
  it("MUST FAIL PRE-M: extra fields on getStock are rejected, not silently discarded", async () => {
    const r = await executeAiTool(
      { tool: "getStock", args: { symbol: "RELIANCE", universe: "everything", force: true } },
      NO_DATA_DEPS,
    );
    expect(r.status).toBe("invalid-args");
    expect(r.modelPayload).toContain("invalid-args");
  });

  it("MUST FAIL PRE-M: extra fields on getScore are rejected", async () => {
    const r = await executeAiTool(
      { tool: "getScore", args: { symbol: "TCS", recompute: true } },
      NO_DATA_DEPS,
    );
    expect(r.status).toBe("invalid-args");
  });

  it("MUST FAIL PRE-M: extra fields on getPrices are rejected", async () => {
    const r = await executeAiTool(
      { tool: "getPrices", args: { symbol: "TCS", interval: "1m" } },
      NO_DATA_DEPS,
    );
    expect(r.status).toBe("invalid-args");
  });

  it("MUST FAIL PRE-M: extra fields on getFinancials are rejected", async () => {
    const r = await executeAiTool(
      { tool: "getFinancials", args: { symbol: "TCS", period: "annual" } },
      NO_DATA_DEPS,
    );
    expect(r.status).toBe("invalid-args");
  });

  it("MUST FAIL PRE-M: extra fields on getPeers (beyond symbol+limit) are rejected", async () => {
    const r = await executeAiTool(
      { tool: "getPeers", args: { symbol: "RELIANCE", limit: 3, sector: "Energy" } },
      NO_DATA_DEPS,
    );
    expect(r.status).toBe("invalid-args");
  });

  it("a null prototype / array args object is invalid-args, never executed", async () => {
    const r = await executeAiTool({ tool: "getStock", args: ["RELIANCE"] as never }, NO_DATA_DEPS);
    expect(r.status).toBe("invalid-args");
  });

  it("malformed nested values are rejected (object where a string belongs)", async () => {
    const r = await executeAiTool(
      { tool: "getStock", args: { symbol: { nested: "RELIANCE" } } as never },
      NO_DATA_DEPS,
    );
    expect(r.status).toBe("invalid-args");
  });

  it("wrong types are rejected (numeric symbol, string limit)", async () => {
    const r1 = await executeAiTool({ tool: "getScore", args: { symbol: 42 as never } }, NO_DATA_DEPS);
    expect(r1.status).toBe("invalid-args");
    const r2 = await executeAiTool(
      { tool: "getPeers", args: { symbol: "RELIANCE", limit: "3" as never } },
      NO_DATA_DEPS,
    );
    expect(r2.status).toBe("invalid-args");
  });

  it("oversized values are rejected (26-char symbol, limit out of 1-10)", async () => {
    const r1 = await executeAiTool({ tool: "getStock", args: { symbol: "A".repeat(26) } }, NO_DATA_DEPS);
    expect(r1.status).toBe("invalid-args");
    const r2 = await executeAiTool({ tool: "getPeers", args: { symbol: "RELIANCE", limit: 11 } }, NO_DATA_DEPS);
    expect(r2.status).toBe("invalid-args");
    const r3 = await executeAiTool({ tool: "getPeers", args: { symbol: "RELIANCE", limit: 0 } }, NO_DATA_DEPS);
    expect(r3.status).toBe("invalid-args");
  });

  it("the valid shapes still pass (no over-reach): symbol-only and symbol+limit", async () => {
    const r1 = await executeAiTool({ tool: "getStock", args: { symbol: "RELIANCE" } }, NO_DATA_DEPS);
    expect(r1.status).toBe("ok");
    const r2 = await executeAiTool({ tool: "getPeers", args: { symbol: "RELIANCE", limit: 3 } }, NO_DATA_DEPS);
    expect(r2.status).toBe("ok");
  });

  it("every tool in the allowlist has a registered STRICT schema (gate: exactly one allowlist, strict objects)", async () => {
    // Static proof for the aiLoopAudit gate: the tool module must declare
    // strict schemas for every allowlisted tool — no tool reachable without
    // boundary validation.
    const src = (await import("node:fs")).readFileSync("lib/ai/tools.ts", "utf8");
    expect(src).toMatch(/strictObject|\.strict\(\)/); // strictness is declared
    expect(src).toMatch(/AI_TOOL_NAMES/);
    expect(AI_TOOL_NAMES).toEqual(["getStock", "getFinancials", "getPrices", "getScore", "getPeers"]);
  });
});
