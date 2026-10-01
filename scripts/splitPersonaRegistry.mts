/**
 * One-off generator: derive lib/chat/registryDisplay.ts (the prompt-free
 * client projection) from the canonical registry's runtime data.
 * Coder Directions G10 — client persona manifest must not contain
 * authority fields. The mirror is pinned field-exact by
 * test/persona.clientProjection.test.ts, so drift fails CI.
 *
 * Run: npx tsx scripts/splitPersonaRegistry.mts
 */
import { writeFileSync } from "node:fs";
import { CANONICAL_PERSONAS } from "../lib/chat/registry";

const CLIENT_SAFE_KEYS = [
  "id", "name", "fullName", "emoji", "color", "rank",
  "philosophy", "label", "bio", "formula", "bestFor", "quote",
  "famousPicks", "category", "origin",
] as const;

type Display = Record<string, unknown>;

const display: Display[] = CANONICAL_PERSONAS.map(p => {
  const d: Display = {};
  for (const k of CLIENT_SAFE_KEYS) {
    const v = (p as unknown as Record<string, unknown>)[k];
    if (v !== undefined) d[k] = v;
  }
  return d;
});

const header = `// lib/chat/registryDisplay.ts — the CLIENT-SAFE persona projection.
//
// GENERATED from lib/chat/registry.ts by scripts/splitPersonaRegistry.mts
// (Coder Directions G10, audit 2026-10-02): the client import graph may
// carry ONLY rendering fields — never the model-prompt, scoring-parameter
// or entitlement-internals fields (the test pins this token-free too). The
// server authority stays in lib/chat/registry.ts, which imports THIS module
// for the display data — one authored source per field class:
//   display fields  → HERE (this file, the only authored copy)
//   authority fields→ lib/chat/registry.ts
// Drift between the projection and the registry is impossible to merge:
// test/persona.clientProjection.test.ts pins this mirror field-exact
// against CANONICAL_PERSONAS and fails the build on any mismatch.

export type PersonaDisplay = {
  id: string;
  name: string;
  fullName: string;
  emoji: string;
  color?: string;
  rank?: "Legend" | "Master";
  philosophy: string;
  label?: string;
  bio?: string;
  formula?: string;
  bestFor?: string[];
  quote?: string;
  famousPicks?: string[];
  category?: string;
  origin?: string;
};

export const PERSONA_DISPLAY: PersonaDisplay[] =
${JSON.stringify(display, null, 2)};
`;

writeFileSync(new URL("../lib/chat/registryDisplay.ts", import.meta.url), header);
console.log(`registryDisplay.ts written: ${display.length} personas, authority-free`);
