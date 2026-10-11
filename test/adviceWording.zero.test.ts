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
 *   - The internal ActionType enum keys (STRONG_BUY etc.) — never
 *     rendered raw; actionLabel() is the only sanctioned render path
 *     (pinned below).
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
 *  legal, or an internal key, and none is trading advice). */
const EXCEPTIONS: RegExp[] = [
  /an offer to buy or sell any/, // terms legal disclaimer
  /We do not sell your personal data|We never sell your/, // privacy policy
  /Long Straddle|Short Strangle|Long Call|Long Put/, // factual options strategy names
  /"(STRONG_BUY|BUY|HOLD|REDUCE|SELL|STRONG_SHORT|SHORT)"|'(STRONG_BUY|BUY|HOLD|REDUCE|SELL|STRONG_SHORT|SHORT)'|case "(STRONG_BUY|BUY|HOLD|REDUCE|SELL|STRONG_SHORT|SHORT)"|ScoreMode/, // internal enum keys + type unions
  /getAction\(|actionLabel\(|ActionType/, // the map itself
  /Short Interest/i, // the factual market metric (% of float sold short)
  /short-seller|short seller/i, // factual journalism (Hindenburg)
  /\(Short\)",?$/, // historical position facts (Soros 1992 pound, 1997 baht)
  /systemPrompt:/, // server-side LLM persona instructions — not UI strings (the AI-loop stage governs model output)
];

describe("P0-6 — the advice vocabulary is gone from UI strings", () => {
  it("a grep of UI strings returns zero hits (with the documented exceptions)", () => {
    const files = uiStringFiles();
    expect(files.length).toBeGreaterThan(250); // positive control: the scan covers the tree
    const hits: string[] = [];
    for (const f of files) {
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
    expect(en).toContain('"topBuySignals": "Top Ranked"');
    expect(en).toContain('"shortRadar": "Deterioration Radar"');
    const dual = readFileSync("components/score/RishiScoreDual.tsx", "utf8");
    expect(dual).toContain("📈 Upside");
    expect(dual).toContain("📉 Downside");
    expect(dual).toContain("Weak Framework Support");
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
      "STRONG_BUY", "BUY", "HOLD", "REDUCE", "SELL", "STRONG_SHORT", "SHORT",
    ];
    const closed = new Set(actions);
    for (const a of actions) {
      expect(actionLabel(a).match(ADVICE_WORDS)).toBeNull();
    }
    // Every rendered label is descriptive; the KEY stays a closed enum
    // (never rendered raw — actionLabel() is the only sanctioned render
    // path, pinned by the RishiScoreDual source check above).
    for (const score of [10, 30, 50, 60, 72, 88, 95]) {
      expect(closed.has(getAction(score, "LONG"))).toBe(true);
      expect(closed.has(getAction(score, "SHORT"))).toBe(true);
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
