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
 * The ONE fail-closed identity state for malformed client IPs (W3
 * closure, review defect D): every input that is neither a well-formed
 * IPv4 literal nor a well-formed IPv6 literal maps here. All malformed
 * callers therefore SHARE one daily quota bucket — garbage cannot mint
 * fresh identities by varying a malformed string (the old code returned
 * the raw string, one identity per distinct junk value).
 */
export const MALFORMED_IP_IDENTITY = 'malformed-ip';

/** Strict IPv4: exactly four decimal octets 0-255, no leading zeros. */
function parseIPv4(s: string): string | null {
  const m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  for (const octet of m.slice(1)) {
    if (octet.length > 1 && octet[0] === '0') return null; // "01" is malformed
    if (Number(octet) > 255) return null;
  }
  return s;
}

/**
 * Strict IPv6 parse -> the eight 16-bit groups as numbers, or null when
 * malformed. Accepts one "::" compression (standing for one or more
 * zero groups, RFC 4291), 1-4 hex digits per group, and an embedded
 * IPv4 tail (legal only as the last group, counting as two groups).
 */
function parseIPv6Groups(raw: string): number[] | null {
  const dbl = raw.indexOf('::');
  if (dbl !== -1 && raw.indexOf('::', dbl + 1) !== -1) return null; // two "::"
  const head = dbl === -1 ? raw : raw.slice(0, dbl);
  const tail = dbl === -1 ? '' : raw.slice(dbl + 2);
  // A stray single leading/trailing colon (not part of "::") is malformed.
  if (head.startsWith(':') || head.endsWith(':')) return null;
  if (tail.startsWith(':') || tail.endsWith(':')) return null;

  const parseGroups = (s: string): number[] | null => {
    if (s === '') return [];
    const parts = s.split(':');
    const out: number[] = [];
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.includes('.')) {
        // Embedded IPv4 — legal ONLY as the final group.
        if (i !== parts.length - 1) return null;
        const v4 = parseIPv4(p);
        if (!v4) return null;
        const o = v4.split('.').map(Number);
        out.push((o[0] << 8) | o[1], (o[2] << 8) | o[3]);
      } else {
        if (!/^[0-9a-f]{1,4}$/.test(p)) return null;
        out.push(Number.parseInt(p, 16));
      }
    }
    return out;
  };

  const hg = parseGroups(head);
  if (hg === null) return null;
  const tg = parseGroups(tail);
  if (tg === null) return null;

  const total = hg.length + tg.length;
  if (dbl === -1) {
    return total === 8 ? [...hg, ...tg] : null; // uncompressed: exactly 8
  }
  if (total > 7) return null; // "::" stands for >= 1 zero group
  return [...hg, ...Array<number>(8 - total).fill(0), ...tg];
}

/**
 * Collapse a client IP to its quota-normalized form: IPv4 as-is,
 * IPv4-mapped IPv6 unwrapped (in EITHER spelling — the dotted
 * "::ffff:203.0.113.7" and the hex "::ffff:cb00:7107" forms are the
 * same address and must share one identity), IPv6 truncated to the /64
 * prefix. Zone indices are stripped. Malformed input maps to
 * MALFORMED_IP_IDENTITY (one shared fail-closed state — see above).
 * Exported for its own tests (the truncation contract is the abuse
 * boundary, not a display concern).
 */
export function normalizeIpForIdentity(ip: string): string {
  if (typeof ip !== 'string') return MALFORMED_IP_IDENTITY;
  // Zone indices (fe80::1%eth0, also %25-encoded) never affect identity.
  const raw = ip.trim().split('%')[0].toLowerCase();
  if (raw === '' || raw === 'unknown') return 'unknown'; // the route's documented no-header fallback

  const v4 = parseIPv4(raw);
  if (v4 !== null) return v4;

  if (!raw.includes(':')) return MALFORMED_IP_IDENTITY; // neither IPv4 nor IPv6

  const groups = parseIPv6Groups(raw);
  if (groups === null) return MALFORMED_IP_IDENTITY;

  // IPv4-mapped (::ffff:0:0/96, either spelling) is the same client as
  // the IPv4 form.
  if (
    groups.slice(0, 5).every((g) => g === 0) &&
    groups[5] === 0xffff
  ) {
    const hi = groups[6];
    const lo = groups[7];
    return `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
  }

  // /64 prefix, each group canonicalized to minimal hex so compressed
  // and expanded spellings of the same address agree.
  return `${groups.slice(0, 4).map((g) => g.toString(16)).join(':')}::/64`;
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
