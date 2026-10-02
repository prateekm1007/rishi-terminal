/**
 * Coder Directions G10 — CLIENT PERSONA MANIFEST MUST NOT CONTAIN
 * AUTHORITY FIELDS.
 *
 * The public/client projection may carry ONLY rendering fields (id, name,
 * fullName, emoji, color, rank, philosophy, label, bio, formula, bestFor,
 * quote, famousPicks, category, origin). It must NOT carry systemPrompt,
 * stockPrompt, engine, or provider/authorization internals.
 *
 * Structural fix: lib/chat/registryDisplay.ts is the prompt-free projection
 * the client import graph consumes; lib/chat/registry.ts stays the server
 * authority that attaches access + systemPrompt/stockPrompt/engine.
 * These invariants make the projection drift- and leak-proof:
 *   1. the display module contains NO authority field (source scan);
 *   2. the display mirror is byte-equal to the registry's display fields
 *      (no second authority can drift);
 *   3. ALL_RISHIS cards carry no authority keys;
 *   4. no client module ('use client') imports the server authority
 *      (registry / personaAccess / prompts / rishiEngine) directly.
 *
 * Rule 21: written and run BEFORE the split — on the pre-fix tree (1) is
 * vacuous (no display module), (2) fails (module missing), (3) fails
 * (ALL_RISHIS cards carried systemPrompt), (4) fails (app/rishis/page.tsx
 * imported the prompt-carrying personas.ts). Raw output in the PR.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_RISHIS } from "@/lib/chat/personas";
import { CANONICAL_PERSONAS } from "@/lib/chat/registry";
import { PERSONA_DISPLAY } from "@/lib/chat/registryDisplay";

/** Repo root derived from THIS file's location (cwd-independent: vitest
 *  may run from a different working directory). */
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const AUTHORITY_KEYS = ["systemPrompt", "stockPrompt", "engine"] as const;

/** All fields a client-facing persona object is allowed to carry. The
 *  marketing display rank is `rank` (Commit N §12 renamed the historical
 *  `tier` field — the product has no tiers, so the vocabulary must not
 *  suggest one). */
const CLIENT_SAFE_KEYS = new Set([
  "id", "name", "fullName", "emoji", "color", "rank",
  "philosophy", "label", "bio", "formula", "bestFor", "quote",
  "famousPicks", "category", "origin",
]);

describe("G10 — the client projection carries no authority fields", () => {
  it("INVARIANT: registryDisplay.ts source contains no authority field", () => {
    const src = readFileSync(join(ROOT, "lib/chat/registryDisplay.ts"), "utf8");
    for (const k of AUTHORITY_KEYS) {
      expect(src.includes(k), `registryDisplay.ts must not mention "${k}"`).toBe(false);
    }
  });

  it("INVARIANT: the display mirror EXACTLY equals the registry's display fields (no drift, no second authority)", () => {
    expect(PERSONA_DISPLAY).toHaveLength(CANONICAL_PERSONAS.length);
    const byId = new Map(CANONICAL_PERSONAS.map(p => [p.id, p]));
    for (const d of PERSONA_DISPLAY) {
      const p = byId.get(d.id);
      expect(p, `display entry ${d.id} must exist in the registry`).toBeTruthy();
      const projected: Record<string, unknown> = {};
      for (const k of CLIENT_SAFE_KEYS) {
        if (p![k as keyof typeof p] !== undefined) {
          projected[k] = p![k as keyof typeof p];
        }
      }
      expect(d).toEqual(projected);
    }
  });

  it("INVARIANT: ALL_RISHIS marketing cards carry only client-safe keys", () => {
    expect(ALL_RISHIS.length).toBeGreaterThan(0);
    for (const card of ALL_RISHIS) {
      for (const k of Object.keys(card)) {
        expect(CLIENT_SAFE_KEYS.has(k), `card ${card.id} must not carry key "${k}"`).toBe(true);
      }
      for (const k of AUTHORITY_KEYS) {
        expect(card, `card ${card.id} must not carry "${k}"`).not.toHaveProperty(k);
      }
    }
  });

  it("Commit N §12: the client-safe projection carries `rank` and NO entitlement vocabulary", () => {
    // The product has no tiers. The display rank (Legend | Master) is a
    // marketing label — it must be named `rank`, and the historical `tier`
    // spelling must be gone from the ENTIRE client-safe projection
    // (personas.ts is the client-reachable module; registryDisplay already
    // uses `rank`).
    expect(ALL_RISHIS.length).toBeGreaterThan(0);
    for (const card of ALL_RISHIS) {
      expect(card, `card ${card.id} must carry "rank"`).toHaveProperty("rank");
      expect(card, `card ${card.id} must NOT carry the entitlement-sounding "tier" key`).not.toHaveProperty("tier");
      expect(["Legend", "Master", ""]).toContain(card.rank);
    }
    const personasSrc = readFileSync(join(ROOT, "lib/chat/personas.ts"), "utf8");
    // comments may honestly document the rename; code must not spell the
    // field `tier` — strip comments the same way freeAccessAudit does.
    const code = personasSrc
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|\s)\/\/[^\n]*/g, "$1");
    expect(code.includes("tier"), "personas.ts code must not name a field 'tier'").toBe(false);
    const rishisPage = readFileSync(join(ROOT, "app/rishis/page.tsx"), "utf8");
    expect(rishisPage.includes("TIER_COLORS"), "the /rishis page must use RANK_COLORS").toBe(false);
    expect(rishisPage.includes(".tier"), "the /rishis page must read .rank, not .tier").toBe(false);
  });

  it("INVARIANT: no client module imports the server persona authority", () => {
    const offenders: string[] = [];
    // Exact module-path patterns (a trailing quote anchors the path, so
    // "@/lib/chat/registryDisplay" does NOT match the registry rule).
    const FORBIDDEN_RE = [
      /["'][^"']*lib\/chat\/registry["']/,
      /["'][^"']*lib\/chat\/personaAccess["']/,
      /["'][^"']*lib\/chat\/rishiEngine["']/,
      /["'][^"']*lib\/chat\/prompts["']/,
    ];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir)) {
        const full = join(dir, e);
        const st = statSync(full);
        if (st.isDirectory()) {
          if (e !== "node_modules" && e !== ".next") walk(full);
          continue;
        }
        if (!/\.(tsx|ts|jsx|js)$/.test(e)) continue;
        const src = readFileSync(full, "utf8");
        if (!src.includes("'use client'") && !src.includes('"use client"')) continue;
        for (const re of FORBIDDEN_RE) {
          const m = src.match(re);
          if (m) offenders.push(`${full} → ${m[0]}`);
        }
      }
    };
    walk(join(ROOT, "app"));
    walk(join(ROOT, "components"));
    expect(offenders, `client modules must not import the authority:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("INVARIANT: lib/chat/personas.ts (client-reachable) mentions no authority field", () => {
    const src = readFileSync(join(ROOT, "lib/chat/personas.ts"), "utf8");
    for (const k of AUTHORITY_KEYS) {
      expect(src.includes(k), `personas.ts must not mention "${k}"`).toBe(false);
    }
  });
});
