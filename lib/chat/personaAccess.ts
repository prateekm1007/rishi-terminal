import 'server-only';

import { CANONICAL_PERSONAS, PERSONA_BY_ID, type CanonicalPersona } from './registry';

/**
 * R3 + Commit M3 (founder decision 2026-10-02 — every feature free):
 * chat persona availability is decided ONLY on the server, and it is no
 * longer an entitlement decision at all.
 *
 * This module is 'server-only' — the build fails if client code imports it,
 * so the roster/validation below can never run client-side. The client
 * receives the resolved list from GET /api/chat/personas; /api/chat
 * re-validates the SAME registry per request, so the UI list is UX, never
 * the control.
 *
 * The invariant (Coder Directions §7):
 *
 *   persona existence + canonical registry validation
 *   NOT
 *   persona existence + tier entitlement
 *
 * Every caller may converse with every canonical persona — no tier and no
 * sign-in (founder decision 2026-10-03). Abuse is bounded by the ONE free
 * quota and the per-IP burst limiter on POST /api/chat, not by hiding the
 * roster or the personas.
 */

/** The personas available to any caller — ALL of them.
 *  Kept as a function (not a bare re-export) so the server-only boundary
 *  and the call-site semantics stay explicit. */
export function getChatPersonas(): CanonicalPersona[] {
  return CANONICAL_PERSONAS;
}

/**
 * Per-request validation for POST /api/chat: is THIS persona id a canonical
 * registry persona? Unknown ids are never allowed (the route rejects them
 * with 400 before this runs, but fail closed regardless). There is no tier
 * parameter and there never will be one again.
 */
export function isCanonicalPersonaId(personaId: string): boolean {
  return !!PERSONA_BY_ID[personaId];
}
