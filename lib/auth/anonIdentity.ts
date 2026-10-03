import 'server-only';

import { createHmac } from 'node:crypto';

/**
 * Anonymous chat quota identity (founder decision 2026-10-02 — chat
 * requires no authentication, but the spend is still bounded; W3
 * founder round-10 hardening).
 *
 * An anonymous caller is keyed to a PSEUDONYMOUS digest of a TRUNCATED
 * client IP:
 *
 *   - IPv6 addresses are truncated to their /64 prefix (one prefix =
 *     one identity): a household or an ISP prefix rotation must not
 *     mint fresh daily quotas, and the /64 is the coarsest unit that
 *     still separates real users.
 *   - IPv4-mapped IPv6 (::ffff:a.b.c.d) collapses to the IPv4 form.
 *   - The digest is an HMAC under the ANON_ID_PEPPER server secret.
 *     The previous uuidv5/SHA-1 of the full IP was trivially reversible
 *     by enumerating the 2^32 IPv4 space; an HMAC under a server
 *     secret is a pseudonym, not an encoding.
 *   - Fail closed (Constitution rule 6): with no pepper configured the
 *     identity REFUSES — the chat route answers 503 rather than
 *     silently degrading to a pepperless digest.
 *
 * This is an abuse ACCOUNTING identity, not an authentication: it can
 * grant nothing and cannot be presented by the client (the server
 * derives it from the platform-set client IP; see the x-forwarded-for
 * note in app/api/chat/route.ts). The docs say "pseudonymous" — a
 * keyed digest of a truncated IP — never "the raw IP is never stored"
 * as if it were anonymous.
 *
 * Rotation note: changing ANON_ID_PEPPER mints new identities exactly
 * once (a one-time quota reset for anonymous callers); signed-in users
 * are unaffected (their quota identity is the account id).
 */

/** Thrown when ANON_ID_PEPPER is absent — the route fails closed on it. */
export class MissingPepperError extends Error {
  constructor() {
    super('ANON_ID_PEPPER is not configured — anonymous identity refuses to degrade to a pepperless digest');
    this.name = 'MissingPepperError';
  }
}

/**
 * Collapse a client IP to its quota-normalized form: IPv4 as-is,
 * IPv4-mapped IPv6 unwrapped, IPv6 truncated to the /64 prefix.
 * Exported for its own tests (the truncation contract is the abuse
 * boundary, not a display concern).
 */
export function normalizeIpForIdentity(ip: string): string {
  const raw = ip.trim().split('%')[0].toLowerCase();
  if (raw === '') return 'unknown';

  // IPv4-mapped IPv6 (::ffff:203.0.113.7) is the same client as the IPv4.
  const v4mapped = raw.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4mapped) return v4mapped[1];

  if (!raw.includes(':')) return raw; // plain IPv4

  // IPv6: expand the :: compression, then keep the first four groups
  // (the /64 prefix). Zone indices were stripped above.
  const doubleColon = raw.indexOf('::');
  let groups: string[];
  if (doubleColon === -1) {
    groups = raw.split(':');
  } else {
    const head = raw.slice(0, doubleColon);
    const tail = raw.slice(doubleColon + 2);
    const headGroups = head ? head.split(':') : [];
    const tailGroups = tail ? tail.split(':') : [];
    const missing = 8 - headGroups.length - tailGroups.length;
    if (missing < 0) return raw; // malformed: fall back to the raw string
    groups = [...headGroups, ...Array<string>(missing).fill('0'), ...tailGroups];
  }
  if (groups.length < 4) return raw; // malformed: fall back to the raw string
  // Canonicalize each kept group to its minimal hex spelling so
  // compressed and expanded inputs of the same address agree.
  const canonical = groups.slice(0, 4).map((g) => {
    const n = Number.parseInt(g, 16);
    return Number.isFinite(n) ? n.toString(16) : g;
  });
  return `${canonical.join(':')}::/64`;
}

/**
 * The pseudonymous per-IP quota identity for an anonymous chat caller.
 * Deterministic for the same (pepper, /64-or-IPv4) pair across
 * processes (stateless serverless); shaped as a UUID because
 * chat_usage.user_id is a uuid column.
 */
export function anonQuotaId(ip: string, pepper: string): string {
  if (!pepper) throw new MissingPepperError();
  const digest = createHmac('sha256', pepper)
    .update(`chat-anon:${normalizeIpForIdentity(ip)}`)
    .digest();
  // Shape as RFC 4122 (version 8 = custom; variant 10xx) so the value
  // is a valid uuid for the chat_usage column.
  digest[6] = (digest[6] & 0x0f) | 0x80;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.subarray(0, 16).toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/** Read ANON_ID_PEPPER from the environment (fail closed when absent). */
export function anonQuotaIdFromEnv(ip: string): string {
  return anonQuotaId(ip, process.env.ANON_ID_PEPPER ?? '');
}
