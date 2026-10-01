// lib/chat/personas.ts
// CLIENT-SAFE derived persona views (Coder Directions G10, audit
// 2026-10-02): the client import graph may carry ONLY rendering fields.
// The prompt-bearing authority (model-prompt / stock-prompt / scoring /
// access fields) lives in lib/chat/registry.ts + lib/chat/rishiEngine.ts and is
// server-reachable only; app/rishis imports THIS module, so this file must
// stay free of those fields (pinned by test/persona.clientProjection.test.ts, which
// also pins the display mirror field-exact against the registry so no
// second authority can drift).
//
// HISTORY: this module used to BE an authority (ALL_RISHIS / CHAT_PERSONAS /
// STOCK_CHAT_PERSONAS) and shipped every persona's full system prompt into
// the client bundle via the /rishis page import. CHAT_PERSONAS moved to
// registry.ts (server); ALL_RISHIS is now a projection of the prompt-free
// display data with the same card shape as before (minus the prompt field
// the UI never read).
//
// The client never sends a system prompt — it sends a personaId which the
// server resolves to the canonical persona from the registry.

import { PERSONA_DISPLAY, type PersonaDisplay } from './registryDisplay';

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
}

function toCard(p: PersonaDisplay): Persona {
  return {
    id: p.id,
    name: p.fullName,
    emoji: p.emoji,
    category: p.category ?? '',
    origin: p.origin ?? '',
    tier: p.rank ?? '',
    label: p.label ?? '',
    bio: p.bio ?? '',
    philosophy: p.philosophy,
    formula: p.formula ?? '',
    bestFor: p.bestFor ?? [],
    quote: p.quote ?? '',
    famousPicks: p.famousPicks ?? [],
  };
}

/** The /rishis roster — the ranked marketing personas (the same 19 as
 *  before the registry; chanos/soros never had marketing cards). */
export const ALL_RISHIS: Persona[] = PERSONA_DISPLAY
  .filter(p => p.rank !== undefined)
  .map(toCard);

/**
 * Alias map: id / short name / full name -> canonical id, derived from the
 * display projection (the same map the registry derives; all 21 personas
 * carry id/name/fullName, so the two are identical by construction).
 */
const DISPLAY_ALIASES: Record<string, string> = Object.fromEntries(
  PERSONA_DISPLAY.flatMap(p => [
    [p.id.toLowerCase(), p.id],
    [p.name.toLowerCase(), p.id],
    [p.fullName.toLowerCase(), p.id],
  ]),
);

/**
 * Resolve a client-supplied persona reference (id, short name or full
 * display name) to a canonical persona id. Returns null when unknown — the
 * route then rejects with 400. Never trust client prompt text.
 */
export function resolvePersonaId(input: string | undefined | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (PERSONA_DISPLAY.some(p => p.id === trimmed)) return trimmed;
  return DISPLAY_ALIASES[trimmed.toLowerCase()] ?? null;
}
