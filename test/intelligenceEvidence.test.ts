import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import {
  buildEvidenceView,
  type EvidenceView,
} from "@/lib/intelligence/evidence";
import { parseRishiInsight, type RishiInsight } from "@/lib/intelligence/types";
import { EVIDENCE_FIXTURES } from "@/lib/intelligence/evidenceFixtures";

/**
 * INT-A8 — the evidence / uncertainty / contradiction UI shared
 * primitives (roadmap item A8). Pre-registration:
 * docs/intelligence/evidence.md (canonical, founder fixture-route
 * scope 2026-10-09) — the closed display states, the mapping
 * ownership (ALL interpretation in the ONE lib module; JSX renders
 * closed states only), and the verification plan are pinned here.
 *
 * Rule 21 fail-first: on the pre-module tree this file fails at import
 * (the mapping module and the primitives do not exist) — the
 * A3/A4/A5/A6/A7 precedent.
 *
 * Fixture rule (pre-registration): the route and this test share the
 * ONE fixture source (lib/intelligence/evidenceFixtures.ts); every
 * fixture is parseRishiInsight-valid by construction — asserted here,
 * enforced at the route by parse-or-refuse.
 */

const CONFLICT = parseRishiInsight(EVIDENCE_FIXTURES.conflictWithContradictions) as RishiInsight;
const DETERMINISTIC = parseRishiInsight(EVIDENCE_FIXTURES.deterministicProvenance) as RishiInsight;
const BOUNDED = parseRishiInsight(EVIDENCE_FIXTURES.boundedModelProvenance) as RishiInsight;
const MINIMAL = parseRishiInsight(EVIDENCE_FIXTURES.minimal) as RishiInsight;

describe("fixture source — parse-valid by construction", () => {
  it("every fixture parses through the ONE A1 parser", () => {
    for (const [name, raw] of Object.entries(EVIDENCE_FIXTURES)) {
      expect(parseRishiInsight(raw), `fixture ${name} must parse`).not.toBeNull();
    }
  });

  it("covers one fixture per pre-registered closed state", () => {
    expect(Object.keys(EVIDENCE_FIXTURES).sort()).toEqual([
      "boundedModelProvenance",
      "conflictWithContradictions",
      "deterministicProvenance",
      "emptyUncertainty",
      "minimal",
    ]);
  });
});

describe("buildEvidenceView — the ONE presentational mapping", () => {
  it("is deterministic: same insight -> same view model (deep equal)", () => {
    expect(buildEvidenceView(CONFLICT)).toEqual(buildEvidenceView(CONFLICT));
  });

  it("evidence rows carry the text and fact provenance labels; the mapping never arithmetics", () => {
    const view = buildEvidenceView(CONFLICT) as EvidenceView;
    expect(view.evidence.rows.length).toBe(2);
    const first = view.evidence.rows[0];
    expect(first.text).toBe("price = 1204.1 inr per source A");
    expect(first.facts[0].sourceLabel).toBe("live");
    expect(first.facts[0].valueDisplay).toBe("1204.1");
    expect(first.facts[0].unit).toBe("inr");
    // a fact WITHOUT a source/observedAt carries NO provenance claim (never a default word)
    expect(first.facts[1].sourceLabel).toBeNull();
    expect(first.facts[1].observedAtLabel).toBeNull();
    // the mapping copies the deterministic layer's change strings verbatim — no arithmetic
    expect(view.whatChanged).toEqual(CONFLICT.whatChanged);
  });

  it("the contradiction banner mirrors the biconditional: iff status === 'conflict'", () => {
    const conflictView = buildEvidenceView(CONFLICT) as EvidenceView;
    expect(conflictView.contradiction.banner).toBe(true);
    expect(conflictView.contradiction.items.length).toBe(1);
    expect(conflictView.contradiction.items[0].sides[0].text).toBe("price = 1204.1 inr per source A");
    expect(conflictView.contradiction.items[0].sides[1].text).toBe("price = 1210.1 inr per source B");

    const detView = buildEvidenceView(DETERMINISTIC) as EvidenceView;
    expect(DETERMINISTIC.status).not.toBe("conflict");
    expect(detView.contradiction.banner).toBe(false);
    expect(detView.contradiction.items).toEqual([]);
  });

  it("a dangling citation refuses to the null state — never invented text", () => {
    // the A1 schema forbids the state outright — an unparseable object has no view
    const rawDangling = {
      ...EVIDENCE_FIXTURES.conflictWithContradictions,
      contradictions: [
        { field: "price", items: ["price:RELIANCE:src-a", "ghost:id"], description: "dangling" },
      ],
    };
    expect(parseRishiInsight(rawDangling)).toBeNull();

    // defense at the display boundary: the mapping refuses a contradiction
    // id missing from evidence[] (returns the refused null state)
    const hacked = {
      ...(CONFLICT as RishiInsight),
      contradictions: [
        { field: "price", items: ["price:RELIANCE:src-a", "ghost:id"], description: "dangling" },
      ],
    } as RishiInsight;
    const view = buildEvidenceView(hacked) as EvidenceView;
    expect(view.contradiction.refused).toBe(true);
    expect(view.contradiction.items).toEqual([]);
  });

  it("provenance line: deterministic -> 'no model involved'; bounded-model -> trio or refuse", () => {
    const detView = buildEvidenceView(DETERMINISTIC) as EvidenceView;
    expect(detView.provenance.modelInvolved).toBe(false);
    expect(detView.provenance.label).toContain("deterministic artifact");
    expect(detView.provenance.label).toContain("no model involved");
    expect(detView.provenance.model).toBeNull();

    const boundedView = buildEvidenceView(BOUNDED) as EvidenceView;
    expect(boundedView.provenance.modelInvolved).toBe(true);
    expect(boundedView.provenance.model?.provider).toBeTruthy();
    expect(boundedView.provenance.model?.model).toBeTruthy();
    expect(boundedView.provenance.model?.synthesizedAt).toBeTruthy();

    // bounded-model missing ANY of the trio: the display refuses the partial trio
    const partial = parseRishiInsight({
      ...EVIDENCE_FIXTURES.boundedModelProvenance,
      provenance: { synthesisPath: "bounded-model", provider: "openai" },
    });
    expect(partial).not.toBeNull(); // the contract allows provider-only provenance…
    const partialView = buildEvidenceView(partial as RishiInsight) as EvidenceView;
    expect(partialView.provenance.modelInvolved).toBe(true);
    expect(partialView.provenance.model).toBeNull(); // …but never a partial model label
  });

  it("badges render the exact closed vocabulary words", () => {
    const view = buildEvidenceView(CONFLICT) as EvidenceView;
    expect(view.badges).toEqual([
      { kind: "status", value: "conflict" },
      { kind: "confidence", value: "high" },
      { kind: "materiality", value: "medium" },
      { kind: "modelStatus", value: "deterministic" },
    ]);
  });

  it("defense: a badge field missing at the display boundary renders an em dash (C1/R9), never a fallback word", () => {
    // the contract requires all four fields; the mapping still defends
    // (a JS caller can hand the display anything — the honest em dash
    // beats a crash or an invented word)
    const hacked = { ...CONFLICT, materiality: undefined } as unknown as RishiInsight;
    const view = buildEvidenceView(hacked) as EvidenceView;
    expect(view.badges.find((b) => b.kind === "materiality")?.value).toBe("—");
  });

  it("uncertainty and invalidators render verbatim; empty renders the honest states", () => {
    const view = buildEvidenceView(CONFLICT) as EvidenceView;
    expect(view.uncertainty.items).toEqual([
      "Whether source B's feed applies a different adjustment convention",
    ]);
    expect(view.uncertainty.invalidators).toEqual([
      "A provider clock correction that re-dates either observation",
    ]);
    expect(view.uncertainty.nextInvestigations).toEqual([
      "Which source the canonical ingest prefers",
    ]);
    const emptyView = buildEvidenceView(MINIMAL) as EvidenceView;
    expect(emptyView.uncertainty.items).toEqual([]);
    expect(emptyView.uncertainty.invalidators).toEqual([]);
  });

  it("never advises: no BUY/SELL/HOLD strings in the mapping or its output; no model/clock/random surface", () => {
    const src = readFileSync("lib/intelligence/evidence.ts", "utf8");
    for (const banned of ["BUY", "SELL", "HOLD", "fetch(", "Date.now", "Math.random", "lib/ai"]) {
      expect(src, `mapping forbidden surface: ${banned}`).not.toContain(banned);
    }
    const out = JSON.stringify(buildEvidenceView(CONFLICT));
    for (const banned of ["BUY", "SELL", "HOLD"]) {
      expect(out).not.toContain(banned);
    }
  });
});

describe("the thin primitives — JSX renders closed states only", () => {
  it("EvidenceList renders rows with data-* audit attributes; absent source = no claim", async () => {
    const { EvidenceList } = await import("@/components/intelligence/EvidenceList");
    const view = buildEvidenceView(CONFLICT) as EvidenceView;
    const html = renderToString(createElement(EvidenceList, { view }));
    expect(html).toContain("price = 1204.1 inr per source A");
    expect(html).toContain('data-insight-fact-source="live"');
    expect(html).not.toContain("unspecified");
  });

  it("ContradictionBanner renders iff the mapping says so; refused/hidden render nothing", async () => {
    const { ContradictionBanner } = await import("@/components/intelligence/ContradictionBanner");
    const conflictView = buildEvidenceView(CONFLICT) as EvidenceView;
    const shown = renderToString(createElement(ContradictionBanner, { view: conflictView }));
    expect(shown).toContain("The two sources report different closing prices");
    const detView = buildEvidenceView(DETERMINISTIC) as EvidenceView;
    expect(renderToString(createElement(ContradictionBanner, { view: detView }))).toBe("");
    const hacked = {
      ...(CONFLICT as RishiInsight),
      contradictions: [
        { field: "price", items: ["price:RELIANCE:src-a", "ghost:id"], description: "dangling" },
      ],
    } as RishiInsight;
    const refusedView = buildEvidenceView(hacked) as EvidenceView;
    expect(renderToString(createElement(ContradictionBanner, { view: refusedView }))).toBe("");
  });

  it("UncertaintyBlock renders the honest empty state; ProvenanceLine mirrors disclosure", async () => {
    const { UncertaintyBlock } = await import("@/components/intelligence/UncertaintyBlock");
    const { ProvenanceLine } = await import("@/components/intelligence/ProvenanceLine");
    const emptyView = buildEvidenceView(MINIMAL) as EvidenceView;
    expect(renderToString(createElement(UncertaintyBlock, { view: emptyView }))).toContain(
      "No stated uncertainties",
    );
    const detView = buildEvidenceView(DETERMINISTIC) as EvidenceView;
    const prov = renderToString(createElement(ProvenanceLine, { view: detView }));
    expect(prov).toContain("deterministic artifact");
    expect(prov).toContain("no model involved");
    const boundedView = buildEvidenceView(BOUNDED) as EvidenceView;
    expect(renderToString(createElement(ProvenanceLine, { view: boundedView }))).toContain("openai");
  });

  it("InsightBadges render the exact vocabulary words", async () => {
    const { InsightBadges } = await import("@/components/intelligence/InsightBadges");
    const view = buildEvidenceView(CONFLICT) as EvidenceView;
    const html = renderToString(createElement(InsightBadges, { badges: view.badges }));
    expect(html).toContain('data-insight-badge="status">conflict<');
    expect(html).toContain('data-insight-badge="confidence">high<');
    expect(html).toContain('data-insight-badge="materiality">medium<');
    expect(html).toContain('data-insight-badge="modelStatus">deterministic<');
  });
});
