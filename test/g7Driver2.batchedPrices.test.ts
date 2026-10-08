/**
 * G7 Driver 2 (founder round-26 directions 8-10): multitool/composition
 * latency - the measured driver is SERIAL per-symbol tool round-trips.
 * Each extra tool request costs one full provider completion (the round-25
 * multitool rows: 2-3 post-tool completions, 7.3-15.2 s of the wall; tool
 * EXECUTION time was 0.1-1.3 s).
 *
 * The one-driver fix under test here:
 *   - the canonical getPrices tool accepts a BOUNDED plural form
 *     {"symbols": [1-8 registry symbols]} alongside the singular form
 *     (the 1-element form is the 2026-10-08 model-trap fix: the production
 *     model sent {symbols:["RELIANCE"]} for the canonical single-symbol
 *     price ask and min(2) served an invalid-args disclosure as the
 *     ANSWER — evidence: #256 behavioral proof, production 345134c);
 *   - the multi-symbol price intent seed (the EXISTING server-enforced
 *     reactive-engagement mechanism, round-3 Coder Directions section 5)
 *     seeds ONE batched call through the SAME real executor for
 *     multi-symbol price asks - deterministic, model-independent;
 *   - synthesis itself is untouched: the model still produces the final
 *     structured answer through validation/grounding (multi-symbol asks
 *     NEVER take the deterministic singleton surface - the singleton gate
 *     excludes them by design, founder direction 9).
 *
 * Rule 21: the batch tests FAIL on the pre-driver-2 tree (STRICT singular
 * schema rejects the plural form with invalid-args).
 */
import { describe, expect, it } from "vitest";
import { executeAiTool, toolRequestTurn } from "@/lib/ai/tools";
import { intentSeedTool, registrySymbolsInMessage } from "@/lib/ai/financialIntent";
import type { AiToolDeps } from "@/lib/ai/tools";

function priceDeps(): AiToolDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    getFundamentals: async () => null,
    getPrice: async (symbol: string) => {
      calls.push(symbol);
      return {
        price: symbol === "TCS" ? 3100.5 : 1420.5,
        change: 0.8,
        source: "yahoo",
        status: "LIVE" as const,
        observedAt: "2026-10-07T09:45:01.000Z",
        lastUpdated: "2026-10-07T09:45:01.000Z",
      };
    },
  };
}

describe("G7 driver 2 - the canonical getPrices tool accepts a bounded batch", () => {
  it("MUST FAIL PRE-DRIVER-2: {symbols: [TCS, RELIANCE]} executes ONE tool call producing BOTH price items", async () => {
    const deps = priceDeps();
    const r = await executeAiTool(
      { tool: "getPrices", args: { symbols: ["TCS", "RELIANCE"] } },
      deps,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    // ONE tool execution, TWO evidence items - the batched observation set
    expect(r.evidence).toHaveLength(2);
    expect(r.evidence.map((e) => e.id)).toEqual([
      "price:TCS:2026-10-07T09:45:01.000Z",
      "price:RELIANCE:2026-10-07T09:45:01.000Z",
    ]);
    // the model-facing payload carries BOTH items (ids + text only)
    const payload = JSON.parse(r.modelPayload) as { items: Array<{ id: string }>; status: string };
    expect(payload.status).toBe("ok");
    expect(payload.items).toHaveLength(2);
    // both upstream observations happened through the SAME shared state
    expect(deps.calls).toEqual(["TCS", "RELIANCE"]);
  });

  it("MUST FAIL PRE-DRIVER-2: duplicate symbols dedupe to one item per symbol (deterministic)", async () => {
    const r = await executeAiTool(
      { tool: "getPrices", args: { symbols: ["TCS", "TCS", "INFY"] } },
      priceDeps(),
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.evidence).toHaveLength(2);
    expect(r.evidence.map((e) => e.id)).toEqual([
      "price:TCS:2026-10-07T09:45:01.000Z",
      "price:INFY:2026-10-07T09:45:01.000Z",
    ]);
  });

  it("STRICT: an element outside the registry fails the WHOLE call closed (unknown-symbol)", async () => {
    const r = await executeAiTool(
      { tool: "getPrices", args: { symbols: ["TCS", "BOGUSXYZ"] } },
      priceDeps(),
    );
    expect(r.status).toBe("unknown-symbol");
  });

  it("STRICT: 9 symbols exceed the batch cap (invalid-args, no execution)", async () => {
    const r = await executeAiTool(
      {
        tool: "getPrices",
        args: {
          symbols: ["TCS", "INFY", "WIPRO", "RELIANCE", "SBIN", "HDFCBANK", "ICICIBANK", "ITC", "LT"],
        },
      },
      priceDeps(),
    );
    expect(r.status).toBe("invalid-args");
  });

  it("MODEL-TRAP FIX (2026-10-08): a 1-element symbols array executes as the single fetch — ok, never invalid-args", async () => {
    // Production evidence (#256 behavioral proof, 2026-10-08 05:26 UTC,
    // production 345134c, model agnes-2.5-flash): "What is the price of
    // RELIANCE?" was answered with {"tool":"getPrices",
    // "args":{"symbols":["RELIANCE"]}} — the #257 prompt teaches the
    // symbols form and the model chose it for ONE symbol; min(2) rejected
    // it and the deterministic disclosure served "Invalid arguments for
    // getPrices: symbols Too small: expected array to have >=2 items."
    // as the answer to the canonical price ask. A 1-element batch is a
    // well-defined single fetch through the identical executor path
    // (registry-validate, dedupe, observe, join) — the constraint was a
    // model-trap, not a safety property. Rule 21: RED on the pre-fix
    // tree (invalid-args).
    const deps = priceDeps();
    const r = await executeAiTool(
      { tool: "getPrices", args: { symbols: ["TCS"] } },
      deps,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.evidence).toHaveLength(1);
    expect(r.evidence.map((e) => e.id)).toEqual([
      "price:TCS:2026-10-07T09:45:01.000Z",
    ]);
    // the joined label of one canonical symbol is the symbol itself —
    // the singleton gate's key matches, so the driver-1 fast path serves
    expect(r.symbol).toBe("TCS");
    expect(deps.calls).toEqual(["TCS"]);
  });

  it("STRICT: an EMPTY symbols array still fails closed (invalid-args, no execution)", async () => {
    const r = await executeAiTool(
      { tool: "getPrices", args: { symbols: [] } },
      priceDeps(),
    );
    expect(r.status).toBe("invalid-args");
  });

  it("STRICT: symbol + symbols together are rejected (ambiguous ask)", async () => {
    const r = await executeAiTool(
      { tool: "getPrices", args: { symbol: "TCS", symbols: ["INFY", "WIPRO"] } },
      priceDeps(),
    );
    expect(r.status).toBe("invalid-args");
  });

  it("MUST FAIL PRE-DRIVER-2: toolRequestTurn echoes batch args as CANONICAL validated JSON (no truncation path)", () => {
    const echo = toolRequestTurn("getPrices", { symbols: ["TCS", "INFY"] });
    const parsed = JSON.parse(echo) as { tool: string; args: { symbols: string[] } };
    expect(parsed.tool).toBe("getPrices");
    expect(parsed.args).toEqual({ symbols: ["TCS", "INFY"] });
  });

  it("the plural form serves registry-but-not-stock instruments (price-registry scope)", async () => {
    const deps = priceDeps();
    const r = await executeAiTool(
      { tool: "getPrices", args: { symbols: ["BTC", "GOLD"] } },
      deps,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.evidence).toHaveLength(2);
  });
});

describe("G7 driver 2 - the multi-symbol price intent seed (server-enforced, deterministic)", () => {
  it("MUST FAIL PRE-DRIVER-2: a 2-symbol price ask seeds ONE batched getPrices", () => {
    expect(
      intentSeedTool("Compare the latest prices of TCS and INFY."),
    ).toEqual({ tool: "getPrices", args: { symbols: ["TCS", "INFY"] } });
  });

  it("MUST FAIL PRE-DRIVER-2: a 3-symbol price ask seeds first-appearance order", () => {
    expect(
      intentSeedTool("What are the latest prices of INFY, WIPRO and HCLTECH?"),
    ).toEqual({ tool: "getPrices", args: { symbols: ["INFY", "WIPRO", "HCLTECH"] } });
  });

  it("MUST FAIL PRE-DRIVER-2: a message naming 9+ registry symbols caps the seed at 8", () => {
    const message =
      "Show me the latest prices of TCS, INFY, WIPRO, RELIANCE, SBIN, HDFCBANK, ICICIBANK, ITC, LT and MARUTI.";
    const seed = intentSeedTool(message);
    expect(seed?.tool).toBe("getPrices");
    if (seed?.tool !== "getPrices") return;
    const args = seed.args as { symbols?: string[] };
    expect(args.symbols).toHaveLength(8);
  });

  it("the SINGLE-symbol price ask is byte-identical to the historical contract", () => {
    expect(intentSeedTool("What is the latest price of TCS?")).toEqual({
      tool: "getPrices",
      args: { symbol: "TCS" },
    });
  });

  it("a fundamentals comparison (P/E) is NOT batch-seeded - it keeps the historical single getFinancials seed", () => {
    const seed = intentSeedTool("Which is cheaper on P/E: SBIN or HDFCBANK?");
    expect(seed?.tool).toBe("getFinancials");
    if (seed?.tool !== "getFinancials") return;
    expect(seed.args).toEqual({ symbol: "SBIN" });
  });

  it("a single-symbol mixed ask keeps the historical seed (price + promoter holding)", () => {
    const seed = intentSeedTool("Show SBIN's price and its promoter holding.");
    expect(seed?.tool).toBe("getPrices");
    if (seed?.tool !== "getPrices") return;
    expect(seed.args).toEqual({ symbol: "SBIN" });
  });

  it("registrySymbolsInMessage is pure: distinct, first-appearance order, registry-scoped", () => {
    expect(registrySymbolsInMessage("Compare INFY with TCS, then TCS again and WIPRO.")).toEqual([
      "INFY",
      "TCS",
      "WIPRO",
    ]);
    expect(registrySymbolsInMessage("What is the latest price of BOGUSXYZ?")).toEqual([]);
    expect(registrySymbolsInMessage("No symbols here at all.")).toEqual([]);
  });
});
