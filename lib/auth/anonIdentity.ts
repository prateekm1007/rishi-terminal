import 'server-only';

import { createHmac } from 'node:crypto';

/**
 * Anonymous chat quota identity (founder decision 2026-10-02 — chat
 * requires no authentication, but the spend is still bounded; W3
 * founder round-10 hardening; round-11 trust-boundary closure).
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
 *   - Trust boundary (Constitution rule 9, round-11 closure): an input
 *     is either a VALID dotted-quad IPv4 or a VALID IPv6 text form, or
 *     it maps to the ONE explicit unresolved scope. The previous shape
 *     accepted arbitrary non-colon strings as "IPv4" and built prefix
 *     identities out of malformed IPv6 fragments — a different garbage
 *     string per request minted a fresh quota identity (fragmentation
 *     at the abuse-accounting boundary). Malformed input now shares
 *     one bucket; it can never invent identities.
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

/** The ONE scope every unparseable input maps to (round-11 closure):
 *  empty, whitespace, "unknown", garbage, malformed IPv4/IPv6 — all
 *  share this single fail-closed bucket, so malformed callers cannot
 *  fragment the quota identity space. Exported for its own tests. */
export const IDENTITY_SCOPE_UNRESOLVED = 'unresolved';

/** Strict dotted-quad IPv4: exactly four decimal octets 0-255, no
 *  signs, no hex, no leading zeros (ambiguous with octal), no port. */
function parseIpv4(s: string): string | null {
  const parts = s.split('.');
  if (parts.length !== 4) return null;
  for (const part of parts) {
    if (!/^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(part)) return null;
  }
  return s;
}

/** Parse an IPv6 text form into its 8 16-bit groups (numbers), or null.
 *  Handles `::` compression (which must stand for at least one group),
 *  an embedded trailing IPv4 dotted quad, and rejects group counts over
 *  8, groups longer than 4 hex digits, and non-hex characters. The zone
 *  index must already be stripped by the caller. */
function parseIpv6Groups(input: string): number[] | null {
  let s = input.toLowerCase();
  if (s.length === 0 || s.length > 45 || /[^0-9a-f:.]/.test(s)) return null;

  // A trailing embedded IPv4 dotted quad supplies the last 2 groups.
  let v4Tail: number[] | null = null;
  if (s.includes('.')) {
    const lastColon = s.lastIndexOf(':');
    const octets = s.slice(lastColon + 1).split('.');
    if (octets.length !== 4) return null;
    const bytes: number[] = [];
    for (const part of octets) {
      // The embedded form uses the same strict IPv4 octet rules.
      if (!/^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(part)) return null;
      bytes.push(Number(part));
    }
    v4Tail = [(bytes[0] << 8) | bytes[1], (bytes[2] << 8) | bytes[3]];
    s = s.slice(0, lastColon + 1); // keep head hex only; ends with ':'
  }

  const parts = s.split(':');
  if (s.startsWith('::')) parts.shift(); // artificial piece before '::'
  if (v4Tail ? parts[parts.length - 1] === '' : s.endsWith('::')) {
    parts.pop(); // artificial piece after '::' (or from the v4 truncation)
  }

  const gapIndex = parts.indexOf('');
  if (gapIndex >= 0 && parts.indexOf('', gapIndex + 1) >= 0) return null; // >1 gap
  const headHex = gapIndex >= 0 ? parts.slice(0, gapIndex) : parts;
  const midHex = gapIndex >= 0 ? parts.slice(gapIndex + 1) : [];

  const head: number[] = [];
  for (const g of headHex) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    head.push(parseInt(g, 16));
  }
  const mid: number[] = [];
  for (const g of midHex) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    mid.push(parseInt(g, 16));
  }

  const withoutFill = head.length + mid.length + (v4Tail ? 2 : 0);
  if (gapIndex >= 0) {
    // '::' must stand for at least one group (RFC 4291) — an address
    // with 8 explicit groups and a gap is malformed.
    if (withoutFill >= 8) return null;
  } else if (withoutFill !== 8) {
    return null;
  }
  const missing = 8 - withoutFill;
  return [...head, ...Array<number>(missing).fill(0), ...mid, ...(v4Tail ?? [])];
}

/**
 * Collapse a client IP to its quota-normalized form: valid IPv4 as-is,
 * IPv4-mapped IPv6 unwrapped, valid IPv6 truncated to the /64 prefix,
 * EVERYTHING ELSE -> IDENTITY_SCOPE_UNRESOLVED (one shared fail-closed
 * bucket; malformed input never mints an identity). Exported for its
 * own tests (the truncation contract is the abuse boundary, not a
 * display concern).
 */
export function normalizeIpForIdentity(ip: string): string {
  const raw = ip.trim().split('%')[0].toLowerCase();
  if (raw === '') return IDENTITY_SCOPE_UNRESOLVED;

  // IPv4-mapped IPv6 (::ffff:203.0.113.7) is the same client as the IPv4.
  const v4mapped = raw.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4mapped) {
    const v4 = parseIpv4(v4mapped[1]);
    if (v4) return v4;
    return IDENTITY_SCOPE_UNRESOLVED; // mapped form with a malformed tail
  }

  if (!raw.includes(':')) {
    return parseIpv4(raw) ?? IDENTITY_SCOPE_UNRESOLVED;
  }

  const groups = parseIpv6Groups(raw);
  if (!groups) return IDENTITY_SCOPE_UNRESOLVED;
  // Canonicalize the /64 prefix to its minimal hex spelling so
  // compressed and expanded spellings of the same address agree.
  const canonical = groups.slice(0, 4).map((g) => g.toString(16)).join(':');
  return `${canonical}::/64`;
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
