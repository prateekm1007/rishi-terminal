/**
 * lib/intelligence/evidence.ts (INT-A8) — the ONE presentational
 * mapping over the A1 RishiInsight contract. Pre-registration:
 * docs/intelligence/evidence.md (canonical, committed before this
 * code).
 *
 * Ownership precedent: lib/pricePresentation.ts (Round 9) — ALL
 * interpretation lives in this module; the JSX primitives render the
 * closed states it returns, nothing else. Pure: no React, no fetch,
 * no clock, no randomness, no model imports (pinned by a static
 * source scan in the suite).
 *
 * Input: an already-parsed RishiInsight (A1's parseRishiInsight is the
 * boundary gate; this module never re-parses, never imports a parser).
 * Output: the closed display states —
 *
 *   - evidence rows: text + fact provenance labels verbatim from the
 *     source enum; an absent source/observedAt carries NO claim (never
 *     a default word). Numbers reach the screen only through the
 *     facts' values and the whatChanged strings the deterministic
 *     layer composed — this mapping never arithmetics, never formats
 *     a number from parts.
 *   - contradiction banner: iff status === "conflict" (the display
 *     MIRRORS the contract's biconditional, never re-derives it); ids
 *     resolved to evidence text; a dangling id refuses the whole
 *     block to the null state (refused: true) — never invented text.
 *   - provenance line: deterministic → "no model involved" (never a
 *     model label); bounded-model → provider+model+synthesizedAt ALL
 *     THREE or the model state refuses (null) — never a partial label.
 *   - badges: the exact closed vocabulary words; a field missing at
 *     the display boundary renders an em dash (C1/R9), never a
 *     fallback word.
 *   - uncertainty / invalidators / next investigations: verbatim
 *     lists — never investment advice (the suite pins the absence of
 *     advice strings).
 *   - prose passthrough (2026-10-10 repair): summary, whyItMatters and
 *     the whatChanged delta lines reach the display VERBATIM — this
 *     mapping adds nothing, trims nothing, composes no numbers; the
 *     excludedVerdicts breakdown carries A4's actual verdict COUNTS by
 *     reason (never ledger rows, never ids).
 */

import type { RishiInsight } from "./types";

export interface EvidenceFactView {
  field: string;
  valueDisplay: string;
  unit: string;
  sourceLabel: string | null;
  observedAtLabel: string | null;
}

export interface EvidenceRowView {
  id: string;
  text: string;
  facts: EvidenceFactView[];
}

export interface ContradictionItemView {
  field: string;
  description: string;
  sides: { id: string; text: string }[];
}

export interface EvidenceView {
  evidence: { rows: EvidenceRowView[] };
  whatChanged: { field: string; change: string }[];
  /** A1 prose, verbatim (directive 2026-10-10: the deterministic
   *  artifact's own words reach the screen; this mapping adds
   *  nothing, trims nothing). */
  summary: string;
  whyItMatters: string;
  /** A4 excluded-verdict counts by reason (display-side disclosure;
   *  counts only — never ledger rows). */
  excludedVerdicts: { reason: string; count: number }[];
  contradiction: {
    banner: boolean;
    items: ContradictionItemView[];
    refused: boolean;
  };
  provenance: {
    modelInvolved: boolean;
    label: string;
    model: { provider: string; model: string; synthesizedAt: string } | null;
  };
  badges: { kind: "status" | "confidence" | "materiality" | "modelStatus"; value: string }[];
  uncertainty: { items: string[]; invalidators: string[]; nextInvestigations: string[] };
}

const EM_DASH = "—";

function badge(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : EM_DASH;
}

export function buildEvidenceView(insight: RishiInsight): EvidenceView {
  // Evidence rows — verbatim text; provenance labels only when the fact
  // carries them (no claim, never a default).
  const rows: EvidenceRowView[] = (Array.isArray(insight.evidence) ? insight.evidence : []).map(
    (item) => ({
      id: item.id,
      text: item.text,
      facts: (Array.isArray(item.facts) ? item.facts : []).map((f) => ({
        field: f.field,
        valueDisplay: String(f.value),
        unit: f.unit,
        sourceLabel: f.source ?? null,
        observedAtLabel: f.observedAt ?? null,
      })),
    }),
  );

  // Contradiction banner — mirror the biconditional; resolve ids to the
  // evidence text the insight already carries; a dangling id refuses the
  // whole block to the null state (never a partial render, never invented
  // text).
  const banner = insight.status === "conflict";
  const byId = new Map(rows.map((r) => [r.id, r.text]));
  let refused = false;
  const items: ContradictionItemView[] = [];
  if (banner) {
    for (const c of Array.isArray(insight.contradictions) ? insight.contradictions : []) {
      const sides: { id: string; text: string }[] = [];
      for (const id of c.items) {
        const text = byId.get(id);
        if (text === undefined) {
          refused = true;
          break;
        }
        sides.push({ id, text });
      }
      if (refused) break;
      items.push({ field: c.field, description: c.description, sides });
    }
    if (refused) items.length = 0;
  }

  // Provenance line — the honesty coupling, display-side: deterministic
  // artifacts never render a model label; bounded-model renders the full
  // trio or refuses (never a partial label).
  const p = insight.provenance;
  const modelInvolved = p.synthesisPath === "bounded-model";
  let model: EvidenceView["provenance"]["model"] = null;
  if (modelInvolved) {
    if (p.provider && p.model && p.synthesizedAt) {
      model = { provider: p.provider, model: p.model, synthesizedAt: p.synthesizedAt };
    }
    // else: refuse — model stays null; the trio must be complete
  }
  const label = modelInvolved
    ? model
      ? `bounded-model synthesis — provider ${model.provider}, model ${model.model}, synthesized ${model.synthesizedAt}`
      : "bounded-model synthesis — model disclosure unavailable"
    : "deterministic artifact, no model involved";

  // Badges — exact vocabulary words; missing at the boundary = em dash.
  const badges: EvidenceView["badges"] = [
    { kind: "status", value: badge(insight.status) },
    { kind: "confidence", value: badge(insight.confidence) },
    { kind: "materiality", value: badge(insight.materiality) },
    { kind: "modelStatus", value: badge(insight.modelStatus) },
  ];

  return {
    evidence: { rows },
    summary: typeof insight.summary === "string" ? insight.summary : "",
    whyItMatters: typeof insight.whyItMatters === "string" ? insight.whyItMatters : "",
    excludedVerdicts: (Array.isArray(insight.excludedVerdicts)
      ? insight.excludedVerdicts
      : []
    )
      .filter(
        (v): v is { reason: string; count: number } =>
          typeof v?.reason === "string" && Number.isInteger(v?.count) && v.count > 0,
      )
      .map((v) => ({ reason: v.reason, count: v.count })),
    whatChanged: (Array.isArray(insight.whatChanged) ? insight.whatChanged : []).map((w) => ({
      field: w.field,
      change: w.change,
    })),
    contradiction: { banner, items, refused },
    provenance: { modelInvolved, label, model },
    badges,
    uncertainty: {
      items: Array.isArray(insight.uncertainty) ? [...insight.uncertainty] : [],
      invalidators: Array.isArray(insight.invalidators) ? [...insight.invalidators] : [],
      nextInvestigations: Array.isArray(insight.nextInvestigations)
        ? [...insight.nextInvestigations]
        : [],
    },
  };
}
