import 'server-only';

import { RISHI_PERSONALITIES, type RishiPersonality } from './rishiEngine';

/**
 * R3: chat persona availability is decided ONLY on the server.
 *
 * This module is 'server-only' — the build fails if client code imports it,
 * so the tier filter below can never run client-side. The client receives
 * the resolved list from GET /api/chat/personas; /api/chat re-enforces the
 * same allow-list per request (T7), so the UI list is UX, never the control.
 */
export type ChatTier = 'seeker' | 'student' | 'disciple';

export function getRishisByTier(tier: ChatTier): RishiPersonality[] {
  const allRishis = Object.values(RISHI_PERSONALITIES);

  if (tier === 'seeker') {
    return allRishis.filter(r => r.tier === 'free');
  }
  if (tier === 'student') {
    return allRishis.filter(r => r.tier === 'free' || r.tier === 'student');
  }
  return allRishis;
}
