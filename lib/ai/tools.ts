// lib/ai/tools.ts — the canonical server-side AI tool layer (Commit L1;
// state consistency closed by Commit M7).
//
// R4-01: the internal tool API the model may call during the bounded
// tool-calling loop. Every tool resolves through the platform's CANONICAL
// data surfaces (data/stocks registry, lib/scoring resolver + consensus,
// lib/livePrice, lib/liveFundamentals) — no second source of truth, no
// duplicate calculation logic, and NEVER an AI-side score recomputation.
//
// Hard boundaries (Coder Directions §4):
//   - strict tool allowlist (AI_TOOL_NAMES);
//   - Zod argument validation at the boundary (rule 9) — STRICT: unknown
//     arguments are REJECTED, never silently stripped (Commit M7, §3);
//   - ticker/security-master validation against the one stock registry;
//   - server-only: a tool executes exclusively inside an authenticated,
//     persona-authorized request on the server — there is NO HTTP surface
//     for tools and no client- or model-supplied tool result can ever enter
//     the evidence set (the only producer of tool evidence is executeAiTool);
//   - explicit failure states: unknown-tool | invalid-args |
//     unknown-symbol | no-data | failed — never a plausible fallback;
//   - no provider/debug leakage: model-facing payloads carry data only;
//     internal error detail is logged server-side (rule 10).
//
// Evidence contract: every successful tool result is a set of evidence
// items built by the SAME builders as the canonical evidence package
// (lib/ai/evidence.ts) — deterministic ids, typed facts, provenance wording.
//
// Commit M7 (canonical tool-state consistency): every tool resolves through
// a shared CanonicalStockState — ONE bounded live-fundamentals fetch and ONE
// price observation per symbol, memoized for the request's lifetime and
// identical to the state the initial evidence package was built from. The
// tools therefore answer from the SAME data state as the package: the
// initial evidence score and getScore's score fact are byte-identical for
// the same symbol in the same request.

import 'server-only';

import { z } from "zod";
import { STOCKS } from "@/data/stocks";
import { isValidSymbolInput, normalizeSymbolInput } from "@/lib/registry/validateInput";
import type { ResolvedStockMetrics } from "@/lib/scoring";
import { fetchLivePrice } from "@/lib/livePrice";
import type { FullFundamentals } from "@/lib/liveFundamentals";
import {
  buildProfileItem,
  buildPriceItem,
  buildFundamentalItems,
  buildScoreItem,
  buildPeerItems,
  createCanonicalStockState,
  type AiPeerRow,
  type CanonicalStockState,
} from "./evidence";
import type { AiEvidenceItem } from "./schemas";

/** The closed tool allowlist. Anything else is an explicit unknown-tool
 *  failure — never attempted, never guessed. */
export const AI_TOOL_NAMES = [
  "getStock",
  "getFinancials",
  "getPrices",
  "getScore",
  "getPeers",
] as const;

export type AiToolName = (typeof AI_TOOL_NAMES)[number];

export function isAiToolName(tool: string): tool is AiToolName {
  return (AI_TOOL_NAMES as readonly string[]).includes(tool);
}

// ── argument schemas (zod at every boundary — rule 9) ────────────────────
// Commit M7 (§3): STRICT — an unexpected argument is a validation FAILURE,
// not a silently stripped key. A model (or anything upstream) cannot
// smuggle extra instructions or a forged `result` through the args.
const SymbolArgsSchema = z
  .object({
    symbol: z.string().min(1).max(25),
  })
  .strict();
const PeersArgsSchema = z
  .object({
    symbol: z.string().min(1).max(25),
    limit: z.number().int().min(1).max(10).optional(),
  })
  .strict();
/** G7 driver 2 (founder round-26 directions 8-9): the ONE plural-capable
 *  tool. A multi-instrument ask previously needed N serial tool requests,
 *  each costing a full provider completion (the measured multitool driver:
 *  2-3 post-tool completions, 7.3-15.2 s of the wall). The batch form is
 *  BOUNDED (1-8 symbols, each registry-validated by the executor) and
 *  STRICT (no extra keys; symbol+symbols together are rejected as an
 *  ambiguous ask). Synthesis stays with the model - this only collapses
 *  the observation round-trips.
 *
 *  MODEL-TRAP FIX (2026-10-08, #256 behavioral proof, production 345134c):
 *  the production model (agnes-2.5-flash) answered the canonical
 *  single-symbol price ask with {symbols:["RELIANCE"]} - the taught batch
 *  form, one element. min(2) rejected it and the deterministic disclosure
 *  served "Invalid arguments ... >=2 items" AS THE ANSWER. A 1-element
 *  batch is a well-defined single fetch through the identical executor
 *  path (registry-validate, dedupe, observe, join); the floor is 1 so
 *  EVERY model arg choice is valid. The empty array, the 9+ batch, and
 *  the symbol+symbols ambiguity stay rejected (pinned by test). */
const PricesBatchArgsSchema = z
  .object({
    symbols: z.array(z.string().min(1).max(25)).min(1).max(8),
  })
  .strict();
const PricesArgsSchema = z.union([SymbolArgsSchema, PricesBatchArgsSchema]);

/** ONE schema-selection rule, shared by the executor and the transcript
 *  echo (toolRequestTurn) so the W3 canonical echo can never drift from
 *  what the executor actually accepts (rule 14). */
function argsSchemaFor(
  tool: string,
): typeof PeersArgsSchema | typeof PricesArgsSchema | typeof SymbolArgsSchema {
  if (tool === "getPeers") return PeersArgsSchema;
  if (tool === "getPrices") return PricesArgsSchema;
  return SymbolArgsSchema;
}

/** Explicit tool outcome states. `ok` carries evidence items (the ONLY way
 *  tool data enters the grounding set); every other status is a disclosed
 *  failure/no-data state — nothing is fabricated to fill the gap. */
export type AiToolOutcome =
  | {
      status: "ok";
      tool: AiToolName;
      symbol: string;
      /** Canonical evidence items produced by this tool call (deterministic
       *  ids, typed facts). These join the request's evidence set. */
      evidence: AiEvidenceItem[];
      /** Model-facing payload: item ids + text ONLY (data, no debug). */
      modelPayload: string;
    }
  | { status: "unknown-tool"; tool: string; modelPayload: string }
  | { status: "invalid-args"; tool: string; modelPayload: string }
  | { status: "unknown-symbol"; tool: string; symbol: string; modelPayload: string }
  | { status: "no-data"; tool: string; symbol: string; modelPayload: string }
  | { status: "failed"; tool: string; symbol: string; modelPayload: string };

/** Injectable surfaces (tests); production uses the canonical defaults. */
export interface AiToolDeps {
  getFundamentals?: (symbol: string) => Promise<FullFundamentals | null>;
  getPrice?: (symbol: string) => ReturnType<typeof fetchLivePrice>;
  getPeers?: (symbol: string) => AiPeerRow[];
}

/**
 * Execute one validated AI tool call on the server. This is the ONLY
 * producer of tool evidence: the model can request a tool, never supply or
 * simulate one; a client has no path here at all.
 *
 * Commit M7: `state` threads the per-request canonical observation state.
 * When omitted, a fresh one is created from `deps` (single-call callers
 * keep their existing behavior); the chat path passes the SAME state that
 * built the initial evidence package, so every tool answers from the same
 * data state as the package.
 */
export async function executeAiTool(
  call: { tool: string; args: unknown },
  deps: AiToolDeps = {},
  state?: CanonicalStockState,
): Promise<AiToolOutcome> {
  // 1. strict allowlist.
  if (typeof call?.tool !== "string" || !isAiToolName(call.tool)) {
    return {
      status: "unknown-tool",
      tool: typeof call?.tool === "string" ? call.tool : "nonstring",
      modelPayload: failPayload(
        typeof call?.tool === "string" ? call.tool : "nonstring",
        "unknown-tool",
        { message: `Unknown tool. Allowed tools: ${AI_TOOL_NAMES.join(", ")}.` },
      ),
    };
  }
  const tool = call.tool;

  // 2. zod argument validation (STRICT — unknown keys rejected).
  const schema = argsSchemaFor(tool);
  const parsed = schema.safeParse(call.args ?? {});
  if (!parsed.success) {
    return {
      status: "invalid-args",
      tool,
      modelPayload: failPayload(tool, "invalid-args", {
        message: `Invalid arguments for ${tool}: ${parsed.error.issues.map(i => `${i.path.join(".") || "(root)"} ${i.message}`).join("; ")}.`,
      }),
    };
  }

  // 3. validation against the ONE registry (R9-12, Rule 14). Until this
  //    fix the gate was the stock master alone: getPrices(WTI) answered
  //    unknown-symbol while /api/prices?symbol=WTI served LIVE data on the
  //    same runtime — the tool layer lied to the model. Now: genuinely
  //    unknown → unknown-symbol; registry-but-not-stock → stock-only tools
  //    answer honest no-data (known-but-out-of-scope is NOT unknown);
  //    getPrices serves the full canonical price registry through the same
  //    shared canonical state (lib/livePrice underneath).
  // G7 driver 2: the batch form carries no singular `symbol` — each element
  // is registry-validated here (fail-closed whole call: one unknown element
  // is a caller error, never a partial observation set), deduped in
  // first-appearance order, then observed through the SAME shared canonical
  // state the singular form uses (one price observation per symbol per
  // request — Commit M7).
  if (tool === "getPrices" && "symbols" in parsed.data) {
    const canonical: string[] = [];
    for (const raw of parsed.data.symbols as string[]) {
      const rs = raw.trim().toUpperCase();
      if (!isValidSymbolInput(rs)) {
        return {
          status: "unknown-symbol",
          tool,
          symbol: rs,
          modelPayload: failPayload(tool, "unknown-symbol", {
            symbol: rs,
            message: `Symbol ${rs} is not in the security master. Do not guess data for it.`,
          }),
        };
      }
      const norm = normalizeSymbolInput(rs) ?? rs;
      if (!canonical.includes(norm)) canonical.push(norm);
    }
    const sharedBatch = state ?? createCanonicalStockState(deps);
    try {
      const points = await Promise.all(canonical.map((sym) => sharedBatch.price(sym)));
      const evidence = canonical.map((sym, i) => buildPriceItem(sym, points[i] ?? null));
      const batchSymbol = canonical.join(",");
      return {
        status: "ok",
        tool,
        symbol: batchSymbol,
        evidence,
        modelPayload: okPayload(tool, batchSymbol, evidence),
      };
    } catch (e) {
      console.error(`[ai/tools] getPrices(${batchCanonicalLabel(canonical)}) failed:`, e instanceof Error ? e.message : e);
      return {
        status: "failed",
        tool,
        symbol: canonical.join(","),
        modelPayload: failPayload(tool, "failed", { symbol: canonical.join(","), message: "Tool getPrices could not be completed. Do not invent its data." }),
      };
    }
  }
  // Defensive narrowing (fail-closed): every schema that reaches this line
  // is singular-arg; a batch-shaped parse here would be a selector bug.
  if (!("symbol" in parsed.data)) {
    return {
      status: "invalid-args",
      tool,
      modelPayload: failPayload(tool, "invalid-args", {
        message: `Invalid arguments for ${tool}: the plural symbols form is accepted by getPrices only.`,
      }),
    };
  }
  const rawSymbol = parsed.data.symbol.trim().toUpperCase();
  if (!isValidSymbolInput(rawSymbol)) {
    return {
      status: "unknown-symbol",
      tool,
      symbol: rawSymbol,
      modelPayload: failPayload(tool, "unknown-symbol", {
        symbol: rawSymbol,
        message: `Symbol ${rawSymbol} is not in the security master. Do not guess data for it.`,
      }),
    };
  }
  const symbol = normalizeSymbolInput(rawSymbol) ?? rawSymbol;
  const isStock = Object.prototype.hasOwnProperty.call(STOCKS, symbol);
  if (!isStock && tool !== "getPrices") {
    return {
      status: "no-data",
      tool,
      symbol,
      modelPayload: failPayload(tool, "no-data", {
        symbol,
        message: `${symbol} is in the canonical price registry but has no equity security-master record; ${tool} serves stock data only. Use getPrices for its observed price, or answer without equity data.`,
      }),
    };
  }

  // 4. dispatch through the SHARED canonical state (Commit M7): every
  //    resolution reuses the memoized observation the evidence package (or
  //    a previous tool in this loop) already fetched. Any throw → explicit
  //    failed state (detail logged server-side only, rule 10).
  const shared = state ?? createCanonicalStockState(deps);
  try {
    switch (tool) {
      case "getStock": {
        const resolved = await shared.resolve(symbol);
        if (!resolved) {
          return { status: "no-data", tool, symbol, modelPayload: failPayload(tool, "no-data", { symbol, message: `No resolved stock data for ${symbol}.` }) };
        }
        const evidence = [buildProfileItem(resolved)];
        return { status: "ok", tool, symbol, evidence, modelPayload: okPayload(tool, symbol, evidence) };
      }

      case "getFinancials": {
        const live = await shared.fundamentals(symbol);
        const resolved = await shared.resolve(symbol);
        if (!resolved) {
          return { status: "no-data", tool, symbol, modelPayload: failPayload(tool, "no-data", { symbol, message: `No resolved fundamentals for ${symbol}.` }) };
        }
        const vendorName = live?.source && live.source !== "static" ? live.source : undefined;
        const evidence = buildFundamentalItems(resolved, vendorName);
        return { status: "ok", tool, symbol, evidence, modelPayload: okPayload(tool, symbol, evidence) };
      }

      case "getPrices": {
        const point = await shared.price(symbol);
        const evidence = [buildPriceItem(symbol, point ?? null)];
        return { status: "ok", tool, symbol, evidence, modelPayload: okPayload(tool, symbol, evidence) };
      }

      case "getScore": {
        const resolved = await shared.resolve(symbol);
        if (!resolved) {
          return { status: "no-data", tool, symbol, modelPayload: failPayload(tool, "no-data", { symbol, message: `No resolved stock data for ${symbol}.` }) };
        }
        // The canonical consensus, consumed as-is (engine version embedded in
        // the item id). Resolved through the SAME state as the initial
        // package, so the id and facts are byte-identical to the package's
        // score item for this symbol (Commit M7 contract). Insufficient
        // data → the item says so and carries NO fact, so any numeric score
        // assertion fails closed downstream.
        const evidence = [buildScoreItem(resolved)];
        return { status: "ok", tool, symbol, evidence, modelPayload: okPayload(tool, symbol, evidence) };
      }

      case "getPeers": {
        const resolved: ResolvedStockMetrics | null = await shared.resolve(symbol);
        if (!resolved) {
          return { status: "no-data", tool, symbol, modelPayload: failPayload(tool, "no-data", { symbol, message: `No resolved stock data for ${symbol}.` }) };
        }
        // The zod schema already bounds limit to 1-10; this narrow read only
        // bridges the union type of the two arg schemas (no assertion).
        const limitRaw = (parsed.data as { limit?: unknown }).limit;
        const limit = typeof limitRaw === "number" ? limitRaw : 5;
        const peers = deps.getPeers ? deps.getPeers(symbol) : canonicalPeers(symbol, resolved.sector, limit);
        if (peers.length === 0) {
          return { status: "no-data", tool, symbol, modelPayload: failPayload(tool, "no-data", { symbol, message: `No same-sector peers found for ${symbol} (${resolved.sector}) in the registry.` }) };
        }
        const evidence = buildPeerItems(symbol, peers);
        return { status: "ok", tool, symbol, evidence, modelPayload: okPayload(tool, symbol, evidence) };
      }
    }
  } catch (e) {
    console.error(`[ai/tools] ${tool}(${symbol}) failed:`, e instanceof Error ? e.message : e);
    return {
      status: "failed",
      tool,
      symbol,
      modelPayload: failPayload(tool, "failed", { symbol, message: `Tool ${tool} could not be completed. Do not invent its data.` }),
    };
  }
}

/** Same-sector peers from the ONE stock registry, deterministically ordered
 *  (market cap desc, then symbol asc) — no second universe, no scoring. */
function canonicalPeers(symbol: string, sector: string, limit: number): AiPeerRow[] {
  return Object.values(STOCKS)
    .filter(s => s.sector === sector && s.symbol !== symbol)
    .sort((a, b) => b.mktcap - a.mktcap || a.symbol.localeCompare(b.symbol))
    .slice(0, limit)
    .map(s => ({ symbol: s.symbol, name: s.name, sector: s.sector, price: s.price, mktcap: s.mktcap, pe: s.pe, roe: s.roe }));
}

/**
 * W3 hard-cap audit (round-12, directive 11): the tool-request echo the
 * loop injects into the transcript. The model's args are model-controlled
 * JSON bounded only by the provider's output cap — echoing them RAW parked
 * up to ~16k chars per tool turn in every subsequent attempt's input (the
 * exact hole test/w3.inputBound.test.ts pins RED on the pre-fix tree).
 * The echo is therefore normalized through the SAME zod schemas the
 * executor uses (one validation source — this module):
 *   - valid args  -> the canonical validated form (~60 chars);
 *   - invalid args-> the raw JSON truncated to a bounded string, so the
 *     model keeps enough context to correct a typo without bloating the
 *     loop. Truncation is deterministic; the marker states the original
 *     size. These turns are transcript-only context — never evidence, and
 *     nothing here can execute (the executor validates independently).
 */
export function toolRequestTurn(tool: string, args: unknown): string {
  const schema = argsSchemaFor(tool);
  const parsed = schema.safeParse(args ?? {});
  if (parsed.success) {
    return JSON.stringify({ tool, args: parsed.data });
  }
  const raw = JSON.stringify(args ?? null) ?? "null";
  const MAX_ECHO_CHARS = 256;
  const bounded =
    raw.length > MAX_ECHO_CHARS
      ? `${raw.slice(0, MAX_ECHO_CHARS)}...(truncated, ${raw.length} chars total)`
      : raw;
  return JSON.stringify({ tool, args: bounded });
}

/** The model-facing rendering of an ok outcome: ids + item text only. */
function batchCanonicalLabel(canonical: readonly string[]): string {
  return canonical.length > 0 ? canonical.join(",") : "(empty batch)";
}

function okPayload(tool: AiToolName, symbol: string, evidence: AiEvidenceItem[]): string {
  return JSON.stringify({
    tool,
    symbol,
    status: "ok",
    items: evidence.map(e => ({ id: e.id, text: e.text })),
  });
}

function failPayload(tool: string, status: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ tool, status, ...extra });
}
