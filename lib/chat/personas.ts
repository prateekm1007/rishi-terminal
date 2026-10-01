// lib/chat/personas.ts
// DERIVED persona views for the canonical registry (audit 2026-10-02, P0
// "persona one-source-of-truth").
//
// HISTORY (why this file shrank): this module used to BE the authority and
// grew three of its own (ALL_RISHIS, CHAT_PERSONAS, STOCK_CHAT_PERSONAS)
// which drifted against rishiEngine.ts RISHI_PERSONALITIES and prompts.ts
// RISHI_PROMPTS — the audit's P0: /api/chat resolved prompts from
// CHAT_PERSONAS with no entitlement check while personaAccess gated via a
// DIFFERENT authority. lib/chat/registry.ts is now the single source; every
// export below is a mechanical derivation, so a persona can no longer exist
// in one authority but not the other (pinned by test/persona.registry.test.ts).
//
// The client never sends a system prompt — it sends a personaId which the
// server resolves to the canonical persona from the registry.

import {
  CANONICAL_PERSONAS,
  MARKETING_PERSONAS,
  PERSONA_ALIASES,
  type CanonicalPersona,
} from './registry';

/**
 * The /rishis marketing card shape (unchanged from the pre-registry era so
 * the page and its tests keep working). `tier` here is the DISPLAY rank
 * ('Legend' | 'Master') — it has never been an entitlement; chat gating
 * uses the registry's `access` via personaAccess.isPersonaAllowed.
 */
export interface Persona {
  id: string;
  name: string;
  emoji: string;
  category: string;
  origin: string;
  tier: string;
  label: string;
  bio: string;
  philosophy: string;
  formula: string;
  bestFor: string[];
  quote: string;
  famousPicks: string[];
  systemPrompt: string;
}

function toMarketing(p: CanonicalPersona): Persona {
  return {
    id: p.id,
    name: p.fullName,
    emoji: p.emoji,
    category: p.category ?? "",
    origin: p.origin ?? "",
    tier: p.rank ?? "",
    label: p.label ?? "",
    bio: p.bio ?? "",
    philosophy: p.philosophy,
    formula: p.formula ?? "",
    bestFor: p.bestFor ?? [],
    quote: p.quote ?? "",
    famousPicks: p.famousPicks ?? [],
    systemPrompt: p.systemPrompt,
  };
}

/** The /rishis roster — the ranked marketing personas (the same 19 as
 *  before the registry; chanos/soros never had marketing cards). */
export const ALL_RISHIS: Persona[] = MARKETING_PERSONAS.map(toMarketing);

/** ── Allow-list: id -> system prompt (DERIVED from the registry). ── */
export const CHAT_PERSONAS: Record<string, string> = Object.fromEntries(
  CANONICAL_PERSONAS.map(p => [p.id, p.systemPrompt]),
);

export const PERSONA_IDS = Object.keys(CHAT_PERSONAS);

/**
 * Resolve a client-supplied persona reference (id, short name or full
 * display name) to a canonical persona id. Returns null when unknown — the
 * route then rejects with 400. Never trust client prompt text.
 *
 * Note: this now resolves through the registry alias map (id / 'Buffett' /
 * 'Warren Buffett' all land on 'buffett'). The old map ALSO admitted
 * display-name keys as first-class CHAT_PERSONAS entries — two different
 * prompts for the same persona depending on spelling; the concise
 * stock-page variant is now `stockPrompt` on the canonical persona, applied
 * by the route when a symbol is in scope.
 */
export function resolvePersonaId(input: string | undefined | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const byId = CANONICAL_PERSONAS.find(p => p.id === trimmed);
  if (byId) return byId.id;
  return PERSONA_ALIASES[trimmed.toLowerCase()] ?? null;
}

// Re-export the canonical type + resolver so route/UI code can use the
// object form without importing the registry directly.
export type { CanonicalPersona };
export { resolveCanonicalPersona } from './registry';
