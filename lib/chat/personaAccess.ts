import 'server-only';

import { CANONICAL_PERSONAS, PERSONA_BY_ID, type CanonicalPersona } from './registry';

/**
 * R3: chat persona availability is decided ONLY on the server.
 *
 * This module is 'server-only' — the build fails if client code imports it,
 * so the tier filter below can never run client-side. The client receives
 * the resolved list from GET /api/chat/personas; /api/chat re-enforces the
 * SAME allow-list per request via isPersonaAllowed (audit 2026-10-02: the
 * route previously resolved prompts from CHAT_PERSONAS with no check at
 * all — the UI list was the only gate, which is no gate), so the UI list is
 * UX, never the control.
 *
 * The roster and its `access` tiers live in the canonical registry; the
 * seeker surface remains exactly {damani}, unchanged from the historical
 * /api/chat/personas contract.
 */
export type ChatTier = 'seeker' | 'student' | 'disciple';

const ACCESS_ORDER: Record<CanonicalPersona['access'], number> = {
  free: 0,
  student: 1,
  disciple: 2,
};

const TIER_ORDER: Record<ChatTier, number> = {
  seeker: 0,
  student: 1,
  disciple: 2,
};

/** The personas a given session tier may converse with (server decision). */
export function getRishisByTier(tier: ChatTier): CanonicalPersona[] {
  return CANONICAL_PERSONAS.filter(p => ACCESS_ORDER[p.access] <= TIER_ORDER[tier]);
}

/**
 * Per-request entitlement check for POST /api/chat: does THIS tier allow
 * THIS persona id? Unknown ids are never allowed (the route rejects them
 * with 400 before this runs, but fail closed regardless).
 */
export function isPersonaAllowed(personaId: string, tier: ChatTier): boolean {
  const p = PERSONA_BY_ID[personaId];
  if (!p) return false;
  return ACCESS_ORDER[p.access] <= TIER_ORDER[tier];
}
