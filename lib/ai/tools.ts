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
import type { ResolvedStockMetrics } from "@/lib/scoring";
import { fetchLivePrice } from "@/lib/livePrice";
import { fetchFullFundamentals } from "@/lib/liveFundamentals";
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
  const schema = tool === "getPeers" ? PeersArgsSchema : SymbolArgsSchema;
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

  // 3. security-master validation against the one registry.
  const symbol = parsed.data.symbol.trim().toUpperCase();
  if (!STOCKS[symbol]) {
    return {
      status: "unknown-symbol",
      tool,
      symbol,
      modelPayload: failPayload(tool, "unknown-symbol", {
        symbol,
        message: `Symbol ${symbol} is not in the security master. Do not guess data for it.`,
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

/** The model-facing rendering of an ok outcome: ids + item text only. */
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
