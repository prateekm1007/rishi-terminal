/**
 * Round-47 P0-6-ADVICE-WORDING (founder order, 2026-10-11):
 *
 *   "Remove buy, sell and advice wording from the UI: STRONG BUY, Long,
 *    Short, REDUCE, Avoid, 'Value Plays', and 'Short' in mode names.
 *    Test: a grep of UI strings returns zero hits."
 *
 * What this pin enforces:
 *   1. The advice vocabulary is ABSENT from every UI-string surface:
 *      the locale files (all 8), the JSX/lib/data source that renders
 *      string literals, and the RUNTIME label functions (the action
 *      labels, the conviction labels, the consensus categories, the
 *      screener presets, the commentary headlines).
 *   2. A positive control (B-18): the descriptive replacement
 *      vocabulary IS present — a zero-count over a gutted codebase
 *      would pass vacuously.
 *   3. The scan itself BITES: every pattern is proven against embedded
 *      pre-fix strings (C5 — a gate that cannot fail is theater).
 *
 * Sanctioned exceptions (documented, each factual rather than advisory):
 *   - The terms-page legal disclaimer ("an offer to buy or sell any
 *     security") — the not-advice disclaimer must use the legal
 *     vocabulary; rewording it would weaken the disclosure.
 *   - The privacy policy ("We do not sell your personal data") — a
 *     factual statement about data handling, not trading advice.
 *   - Options strategy NAMES ("Long Straddle", "Short Strangle") —
 *     factual instrument terminology; renaming them would be a factual
 *     lie (rule 1).
 *   - Hyphenated compounds (long-term, top-down) — not the listed
 *     vocabulary.
 *   - The rishi_snapshots DB `signal` column vocabulary ("BUY"/"HOLD"/
 *     "SELL" in lib/services/rishiMemory.ts + scripts/snapshotBatch.ts +
 *     scripts/snapshotHealth.ts) — persisted analytics values with NO
 *     UI consumer (grep-verified: every `signal:` in app/components is
 *     AbortSignal or the descriptive technical vocabulary); renaming
 *     them would mix vocabularies across historical rows for zero UI
 *     effect.
 *
 * Round-47 follow-up (founder audit, same day): the earlier "internal
 * enum keys" exception is WITHDRAWN — the audit named
 * STRONG_BUY/BUY/HOLD/SELL and REDUCE in lib/scorers/types.ts, so the
 * enum keys themselves are now descriptive (STRONGLY_FAVORABLE … ) and
 * the LONG/SHORT ScoreMode became UPSIDE/DOWNSIDE. No surface, internal
 * or rendered, carries the advice vocabulary.
 *
 * FD-24 (founder order 11 Oct 2026, recorded in ROADMAP): "Keep 'Top Buy
 * Signals' as the name." — a P0-6 exception for THIS NAME ONLY (no other
 * buy wording is added); "Short Radar" keeps its name. Both names are
 * CODER's decisions retained with the founder's endorsement; counsel's
 * view on them stays on the open list. The two names are the only
 * exception strings added below. Pre-existing bare lowercase "buy"/"sell"
 * sites OUTSIDE this change's scope (documented, unchanged by FD-24): the
 * portfolio thesis placeholder ("Why did you buy this?" — the user's own
 * trade record), the free-access statement ("There is nothing to buy")
 * and the buyHoldSell chat-question example — none is advice wording the
 * P0-6 order listed, and FD-24 adds no new one.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  actionLabel,
  getAction,
  getGrade,
  type ActionType,
} from "@/lib/scorers/types";
import { SCREENER_PRESETS } from "@/lib/screener/presets";

/** The founder's listed vocabulary, as standalone words (hyphenated
 *  compounds excluded — "long-term" is a duration, not a stance). */
const ADVICE_WORDS =
  /\b([Ss]trong[ _]?[Bb]uy|STRONG[ _]?BUY|VALUE[ _]?PLAYS?|value[ _]?plays?|[Vv]alue[ _]?[Pp]lays?|REDUCE|[Aa]void|Long|Short)\b(?![\w-])/g;

/** Files whose string literals can render in the UI. */
function uiStringFiles(): string[] {
  const roots = ["app", "components", "lib", "data", "messages"];
  const out: string[] = [];
  for (const root of roots) {
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx|json)$/.test(e.name) && !e.name.includes(".test.")) {
          out.push(p);
        }
      }
    };
    walk(root);
  }
  return out;
}

/** Strip comments (line, trailing, and JSX) — none are renderable. */
function stripComments(l: string): string {
  return l
    .replace(/\/\*[\s\S]*?\*\//g, "")   // {/* ... */} and /* ... */
    .replace(/(?<![:\"'])\/\/.*$/g, "");   // trailing // (not // inside a URL string)
}

/** Sanctioned exception substrings (see the header — each is factual,
 *  legal, or a persisted non-UI value, and none is trading advice). */
const EXCEPTIONS: RegExp[] = [
  /an offer to buy or sell any/, // terms legal disclaimer
  /We do not sell your personal data|We never sell your/, // privacy policy
  /Long Straddle|Short Strangle|Long Call|Long Put/, // factual options strategy names
  /Short Interest/i, // the factual market metric (% of float sold short)
  /short-seller|short seller/i, // factual journalism (Hindenburg)
  /\(Short\)",?$/, // historical position facts (Soros 1992 pound, 1997 baht)
  /systemPrompt:/, // server-side LLM persona instructions — not UI strings (the AI-loop stage governs model output)
  /Top Buy Signals/, // FD-24 (11 Oct 2026): the founder's P0-6 exception — THIS NAME ONLY
  /\bShort Radar\b/, // FD-24 (11 Oct 2026): "Short Radar" keeps its name
];

/** Files whose string literals are PERSISTED ANALYTICS, never rendered:
 *  the rishi_snapshots.signal DB column vocabulary (see the header). */
const NON_UI_FILES: RegExp[] = [
  /^lib\/services\/rishiMemory\.ts$/,
  /^scripts\//, // scripts/ is outside the uiStringFiles roots anyway — belt and braces
];

describe("P0-6 — the advice vocabulary is gone from UI strings", () => {
  it("a grep of UI strings returns zero hits (with the documented exceptions)", () => {
    const files = uiStringFiles();
    expect(files.length).toBeGreaterThan(250); // positive control: the scan covers the tree
    const hits: string[] = [];
    for (const f of files) {
      if (NON_UI_FILES.some((x) => x.test(f))) continue;
      const src = readFileSync(f, "utf8");
      for (const [i, raw] of src.split("\n").entries()) {
        if (raw.trim().startsWith("//") || raw.trim().startsWith("*") || raw.trim().startsWith("/*")) continue;
        const line = stripComments(raw);
        const m = line.match(ADVICE_WORDS);
        if (!m) continue;
        if (EXCEPTIONS.some((x) => x.test(line))) continue;
        hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 110)}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("the replacement vocabulary is present (positive control, B-18)", () => {
    const en = readFileSync("messages/en.json", "utf8");
    expect(en).toContain('"highConviction": "High Conviction"');
    expect(en).toContain('"lowPE": "Low P/E"');
    // FD-24 (11 Oct 2026): the founder's exception — the restored names.
    expect(en).toContain('"topBuySignals": "Top Buy Signals"');
    expect(en).toContain('"shortRadar": "Short Radar"');
    const dual = readFileSync("components/score/RishiScoreDual.tsx", "utf8");
    expect(dual).toContain("📈 Upside");
    expect(dual).toContain("📉 Downside");
    expect(dual).toContain("Weak Framework Support");
  });

  it("FD-24: the exception is THIS NAME ONLY — no other capitalized Buy wording is added (en.json)", () => {
    // The founder: "Don't add other buy wording." Every capitalized
    // \bBuy\b in en.json must be the restored name itself (the section
    // title + the disabled-note naming the trio) — a new Buy phrase
    // anywhere else fails this pin.
    const en = readFileSync("messages/en.json", "utf8");
    const hits = en.match(/^.*\bBuy\b.*$/gm) ?? [];
    expect(hits.length).toBe(2);
    expect(hits[0]).toContain('"topBuySignals": "Top Buy Signals"');
    expect(hits[1]).toContain("Top Buy Signals, Short Radar");
  });

  it("the audit's five named sites carry none of the vocabulary (round-47 follow-up)", () => {
    const dual = readFileSync("components/score/RishiScoreDual.tsx", "utf8");
    // 1. lib/scorers/types.ts — the enum keys themselves are descriptive
    const types = readFileSync("lib/scorers/types.ts", "utf8");
    expect(types).not.toMatch(/STRONG_BUY|REDUCE|"LONG"|"SHORT"|AVOID/);
    expect(types).toContain('"UPSIDE" | "DOWNSIDE"');
    expect(types).toContain('"STRONGLY_FAVORABLE" | "FAVORABLE" | "BALANCED"');
    // 2. StockTable — the renamed consensus category, not the old one
    const table = readFileSync("components/screener/StockTable.tsx", "utf8");
    expect(table).not.toContain("Classic Value Opportunity");
    // 3. eliteGraph — no BUY/SELL/HOLD emission
    const graph = readFileSync("lib/consensus/eliteGraph.ts", "utf8");
    expect(graph).not.toMatch(/triggers BUY|signals HOLD|buy_signal|sell_signal/);
    // 4. the consensus category renamed
    const engine = readFileSync("lib/consensus/engine.ts", "utf8");
    expect(engine).not.toContain("Classic Value Opportunity");
    expect(engine).toContain("Value-Aligned Consensus");
    // 5. RishiScoreDual — the toggle carries no LONG/SHORT mode value
    expect(dual).not.toMatch(/mode === "LONG"|mode === "SHORT"|setMode\("(LONG|SHORT)"\)/);
    // 6. the epistemic signal union (renders via replace('_',' '))
    const epis = readFileSync("lib/engine/epistemicTransparency.ts", "utf8");
    expect(epis).not.toContain("'STRONG_BUY'");
    expect(epis).toContain("'STRONGLY_FAVORABLE'");
  });

  it("every pattern BITES (embedded pre-fix strings must match — C5)", () => {
    const preFix = [
      "STRONG BUY",
      "label: 'Value Plays'",
      "return 'REDUCE';",
      "🚫 Avoid",
      "📈 Long",
      "📉 Short",
      '"Short Mode"',
    ];
    for (const s of preFix) {
      expect(s.match(ADVICE_WORDS)).not.toBeNull();
    }
    // and the sanctioned non-hits stay non-hits
    for (const s of ["long-term approach", "top-down analysis"]) {
      expect(s.match(ADVICE_WORDS)).toBeNull();
    }
  });

  it("the runtime label functions carry no advice vocabulary", () => {
    const actions: ActionType[] = [
      "STRONGLY_FAVORABLE", "FAVORABLE", "BALANCED",
      "UNFAVORABLE", "STRONGLY_UNFAVORABLE",
      "SEVERE_DETERIORATION", "DETERIORATION",
    ];
    const closed = new Set(actions);
    for (const a of actions) {
      expect(actionLabel(a).match(ADVICE_WORDS)).toBeNull();
    }
    // Every rendered label is descriptive; the KEY stays a closed enum
    // (never rendered raw — actionLabel() is the only sanctioned render
    // path, pinned by the RishiScoreDual source check above).
    for (const score of [10, 30, 50, 60, 72, 88, 95]) {
      expect(closed.has(getAction(score, "UPSIDE"))).toBe(true);
      expect(closed.has(getAction(score, "DOWNSIDE"))).toBe(true);
      expect(getGrade(score).match(ADVICE_WORDS)).toBeNull();
    }
  });

  it("no screener mode name carries the vocabulary ('Short' in mode names)", () => {
    for (const p of SCREENER_PRESETS) {
      expect(`${p.name} ${p.description}`.match(ADVICE_WORDS)).toBeNull();
    }
    // positive control: the renamed preset exists
    expect(SCREENER_PRESETS.some((p) => p.name === "Pharma Deterioration Mode")).toBe(true);
  });
});
