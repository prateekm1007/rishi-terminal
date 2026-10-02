import 'server-only';

import { createHash } from 'node:crypto';

/**
 * Anonymous chat quota identity (founder decision 2026-10-03 — chat
 * requires no authentication, but R12 still bounds the spend).
 *
 * An anonymous caller is keyed to a DETERMINISTIC uuidv5 of the client IP
 * (the namespace domain-separates it from any other v5 use). Properties:
 *
 *   - stateless: serverless instances derive the SAME id for the same IP
 *     on every request — no lookup, no cookie, no client-supplied value.
 *   - persistent: the existing atomic chat_usage counter (migration 008)
 *     and its refund path work unchanged; the uuid column type is kept.
 *   - privacy-preserving: the raw IP is never stored — only its v5 digest.
 *
 * This is an abuse ACCOUNTING identity, not an authentication: it cannot
 * grant anything, and it cannot be presented by the client (the server
 * derives it from the platform-set client IP; see the x-forwarded-for
 * note in app/api/chat/route.ts).
 */

// Fixed, app-defined RFC 4122 v5 namespace (an arbitrary constant, NOT a
// secret — it only prevents collision with other v5 namespaces).
const ANON_QUOTA_NAMESPACE = 'a3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

function uuidV5(name: string, namespaceHex: string): string {
  const ns = Buffer.from(namespaceHex.replace(/-/g, ''), 'hex');
  const digest = createHash('sha1')
    .update(ns)
    .update(name, 'utf8')
    .digest();
  digest[6] = (digest[6] & 0x0f) | 0x50; // version 5
  digest[8] = (digest[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = digest.subarray(0, 16).toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/** The deterministic per-IP quota identity for an anonymous chat caller. */
export function anonQuotaId(ip: string): string {
  return uuidV5(`chat-anon:${ip}`, ANON_QUOTA_NAMESPACE);
}
