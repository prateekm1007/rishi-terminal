/**
 * INT-D3 Stock Dossier — the compiled dossier on /stock/[symbol]
 * (pre-registration: docs/intelligence/stockDossier.md, PR #296,
 * committed BEFORE any evaluation).
 *
 * Fail-first: on the pre-implementation tree these pins FAIL raw —
 * the dossier and affordance do not exist (source scans fail), the
 * mount is absent, the exact-surface scan count mismatches (the three
 * declared consumers vs the four the D3 pre-registration declares).
 *
 * What this file pins:
 *   1. The dossier (components/stock/IntelligenceDossier.tsx): 'use
 *      client', fetches ONLY /api/intelligence with capability=insight
 *      (the ONE surface, the generated-insight capability — its first
 *      product mount); 404 → the section renders ABSENT
 *      (data-dossier-insight="absent"), 5xx/network/timeout/contract
 *      mismatch → "error" — visually the same nothing, verifiably
 *      different; ready renders the route's A1-VALIDATED artifact
 *      through the ONE canonical ReadyComposition (the #304
 *      centralization) — NO second parser, no zod on the client, no
 *      chain import, no advice strings.
 *   2. The affordance (components/stock/AskRishi.tsx): mounted ONLY
 *      when the artifact carries a changeKey (it cannot anchor —
 *      honest absence); ONE POST to the EXISTING /api/chat with the
 *      bounded payload { personaId, message, insightRef, symbol } —
 *      no history replay, no system prompt, no other keys (the
 *      route's own persona selector is REQUIRED by the route — a 400
 *      without it — so the drift from the pre-registration's bare
 *      triple is repaired here with justification: the dossier sends
 *      the conversation surface's own default persona id, it invents
 *      no persona logic); refusals render AS THE REFUSAL THEY ARE
 *      (the response's error text verbatim — never reworded into
 *      content); empty input disables the submit; no conversation
 *      state machine (each ask is one POST; /chat stays the full
 *      conversation surface).
 *   3. The mount (positive control — B-18): the dossier mounts on the
 *      scored-surface branch of /stock/[symbol] directly after the B1
 *      IntelligencePanel and passes the SERVER-resolved symbol; the
 *      InsufficientDataRecord branch mounts NOTHING (no intelligence
 *      claims on a page that promises none).
 *   4. The exact-surface scan: the set of surfaces fetching
 *      /api/intelligence grows to EXACTLY the four declared product
 *      surfaces {B1 panel, C1 brief, D2 drawer, D3 dossier} — a fifth
 *      undeclared consumer breaks the build (the growth the D3
 *      pre-registration names; declared, never silent).
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const DOSSIER = "components/stock/IntelligenceDossier.tsx";
const ASKRISHI = "components/stock/AskRishi.tsx";
const PAGE = join(ROOT, "app", "stock", "[symbol]", "page.tsx");

/** The A10 single-caller scan's traversal, reused verbatim. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (require("node:fs").statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function rel(p: string): string {
  return p.slice(ROOT.length + 1).split(require("node:path").sep).join("/");
}

function src(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("INT-D3 the dossier (the compiled dossier on the stock page)", () => {
  it("exists as a client component that fetches ONLY /api/intelligence with capability=insight", () => {
    expect(existsSync(join(ROOT, DOSSIER))).toBe(true);
    const s = src(DOSSIER);
    expect(s).toContain("'use client'");
    // the ONE surface, the generated-insight capability
    expect(s).toContain("/api/intelligence");
    expect(s).toContain("capability=insight");
    expect(s).not.toContain("capability=thesis");
    // the bounded wait rides the same discipline as B1/D2
    expect(s).toMatch(/AbortSignal\.timeout\(|AbortController/);
  });

  it("imports no chain module, no parser, no zod; renders no advice strings", () => {
    const s = src(DOSSIER);
    expect(s).not.toMatch(/from ["']@?\/?lib\/intelligence\/(chain|events|materiality|thesis|stateLog|insightCache|capabilities)/);
    expect(s).not.toContain("parseRishiInsight");
    expect(s).not.toMatch(/from ["']zod["']/);
    // the artifact flows through the ONE canonical composition
    expect(s).toContain("ReadyComposition");
  });

  it("the absence discipline: 404 -> 'absent', anything else non-OK -> 'error', verifiably different, both visually nothing", () => {
    const s = src(DOSSIER);
    // the DOM contract carries both states
    expect(s).toContain('data-dossier-insight');
    expect(s).toContain('"absent"');
    expect(s).toContain('"error"');
    // 404 is distinguished from every other failure by status
    expect(s).toMatch(/404/);
    // no placeholder, no promise, no fabricated content in either state
    expect(s).not.toMatch(/coming soon|placeholder|will be available/i);
  });

  it("the affordance mounts ONLY on a changeKey-bearing artifact", () => {
    const s = src(DOSSIER);
    expect(s).toContain("AskRishi");
    expect(s).toContain("changeKey");
    // the mount is conditional on the artifact's key
    expect(s).toMatch(/changeKey\s*&&|changeKey\s*\?/);
  });
});

describe("INT-D3 Ask Rishi (the FIRST affordance mount over the ONE chat path)", () => {
  it("exists as a client component that fetches ONLY /api/chat", () => {
    expect(existsSync(join(ROOT, ASKRISHI))).toBe(true);
    const s = src(ASKRISHI);
    expect(s).toContain("'use client'");
    expect(s).toContain("/api/chat");
    expect(s).not.toContain("/api/intelligence");
  });

  it("sends the bounded payload: personaId + message + insightRef + symbol — nothing else", () => {
    const s = src(ASKRISHI);
    expect(s).toContain("insightRef");
    expect(s).toContain("symbol");
    expect(s).toContain("personaId");
    expect(s).toContain("message");
    // no history replay, no challenge field, no system prompt construction
    expect(s).not.toMatch(/history\s*:/);
    expect(s).not.toContain("challenge");
    expect(s).not.toMatch(/systemPrompt|system_prompt/);
  });

  it("renders refusals AS the refusal they are (the error text verbatim) and disables the empty submit", () => {
    const s = src(ASKRISHI);
    // the response's error text is rendered verbatim — never reworded
    expect(s).toMatch(/error/);
    // the empty-input gate
    expect(s).toMatch(/disabled/);
    // one-shot: no conversation state machine (no message array state)
    expect(s).not.toMatch(/useState<.*\[\].*>/);
  });

  it("imports no intelligence module beyond types", () => {
    const s = src(ASKRISHI);
    const imports = s.match(/from ["'][^"']+["']/g) ?? [];
    for (const imp of imports) {
      if (imp.includes("lib/intelligence")) {
        expect(imp).toContain("types");
      }
    }
  });
});

describe("INT-D3 the mount (scored-surface branch, after the B1 panel)", () => {
  it("the stock page mounts the dossier directly after the B1 IntelligencePanel, passing the server-resolved symbol", () => {
    const s = readFileSync(PAGE, "utf8");
    expect(s).toContain("IntelligenceDossier");
    const panelIdx = s.indexOf("<IntelligencePanel");
    const dossierIdx = s.indexOf("<IntelligenceDossier");
    expect(panelIdx).toBeGreaterThan(-1);
    expect(dossierIdx).toBeGreaterThan(panelIdx);
    // the symbol is the page's server-resolved key — no client invention
    expect(s).toMatch(/<IntelligenceDossier symbol=\{key\}/);
  });

  it("the InsufficientDataRecord branch mounts NO dossier (no intelligence claims on a page that promises none)", () => {
    const s = readFileSync(PAGE, "utf8");
    const insufficientBranch = s.indexOf("InsufficientDataRecord stock={stock} />");
    const dossierMount = s.indexOf("<IntelligenceDossier");
    expect(insufficientBranch).toBeGreaterThan(-1);
    expect(dossierMount).toBeGreaterThan(-1);
    // the early-return branch closes before any dossier mount exists
    const branchReturn = s.indexOf("return <InsufficientDataRecord stock={stock} />;");
    expect(branchReturn).toBeGreaterThan(-1);
    expect(dossierMount).toBeGreaterThan(branchReturn);
  });
});

describe("INT-D3 the exact-surface scan grows to EXACTLY the four declared product surfaces", () => {
  it("the set of surfaces fetching /api/intelligence is EXACTLY {B1 panel, C1 brief, D2 drawer, D3 dossier}", () => {
    const files = [
      ...walk(join(ROOT, "app")),
      ...walk(join(ROOT, "lib")),
      ...walk(join(ROOT, "components")),
    ].filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
    const consumers = files.filter((f) =>
      /fetch\([^)]*\/api\/intelligence/.test(readFileSync(f, "utf8")),
    );
    expect(consumers.map(rel).sort()).toEqual([
      "components/dashboard/DashboardBrief.tsx",
      "components/screener/IntelligenceDrawer.tsx",
      "components/stock/IntelligenceDossier.tsx",
      "components/stock/IntelligencePanel.tsx",
    ]);
  });
});
