import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * W3 (founder round-10): anonymous chat identity is PSEUDONYMOUS — an
 * HMAC (secret pepper) over a TRUNCATED IP, not a bare digest of the
 * full address.
 *
 * Why each property is asserted:
 *  - IPv6 /64 sharing: one household/ISP-prefix rotation must not mint
 *    100 fresh daily quotas (the acceptance case in the founder
 *    direction: "100 IPv6 addresses in one /64 share one quota").
 *  - pepper-keyed: a plain SHA-1/uuidv5 of an IP is trivially reversed
 *    by enumerating the 2^32 IPv4 space — an HMAC under a server secret
 *    makes the digest pseudonymous.
 *  - fail-closed: with no pepper configured the identity REFUSES
 *    (Constitution rule 6) — chat must not silently fall back to a
 *    pepperless digest.
 *  - IPv4-mapped IPv6 must collapse to the IPv4 identity (a proxied
 *    ::ffff:1.2.3.4 is the same client as 1.2.3.4).
 *  - identity CHANGE on pepper rotation is expected (documented one-time
 *    quota reset) — but the SAME pepper must be deterministic across
 *    processes (stateless serverless).
 */
import {
  anonQuotaId,
  anonQuotaIdFromEnv,
  normalizeIpForIdentity,
  MissingPepperError,
} from '@/lib/auth/anonIdentity';

const PEPPER = 'test-pepper-0123456789abcdef';

describe('W3 — normalizeIpForIdentity (truncation)', () => {
  it('IPv4 stays intact', () => {
    expect(normalizeIpForIdentity('203.0.113.7')).toBe('203.0.113.7');
  });

  it('IPv4-mapped IPv6 collapses to the IPv4 form', () => {
    expect(normalizeIpForIdentity('::ffff:203.0.113.7')).toBe('203.0.113.7');
  });

  it('IPv6 truncates to the /64 prefix (compressed and expanded spellings agree)', () => {
    expect(normalizeIpForIdentity('2001:db8:1:2:3:4:5:6')).toBe('2001:db8:1:2::/64');
    expect(normalizeIpForIdentity('2001:db8:1:2::dead:beef')).toBe('2001:db8:1:2::/64');
    expect(normalizeIpForIdentity('2001:0db8:0001:0002:00ff:0011:0022:0033')).toBe('2001:db8:1:2::/64');
  });

  it('a different /64 prefix stays distinct', () => {
    expect(normalizeIpForIdentity('2001:db8:1:3::1')).toBe('2001:db8:1:3::/64');
    expect(normalizeIpForIdentity('2001:db8:1:2::1')).not.toBe(normalizeIpForIdentity('2001:db8:1:3::1'));
  });

  it('IPv4 and IPv6 never collide after normalization', () => {
    expect(normalizeIpForIdentity('203.0.113.7')).not.toBe(normalizeIpForIdentity('203.0.113.7::'));
  });
});

describe('W3 — anonQuotaId (HMAC pepper)', () => {
  it('100 IPv6 addresses in one /64 share ONE quota identity', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const host = (i * 0x01010101 + 0x1234).toString(16).padStart(4, '0');
      const ip = `2001:db8:42:1:${host}::${(i + 1).toString(16)}`;
      ids.add(anonQuotaId(ip, PEPPER));
    }
    expect(ids.size).toBe(1);
  });

  it('different /64 prefixes get different identities', () => {
    expect(anonQuotaId('2001:db8:42:1::1', PEPPER)).not.toBe(anonQuotaId('2001:db8:42:2::1', PEPPER));
  });

  it('deterministic across calls (stateless serverless)', () => {
    expect(anonQuotaId('203.0.113.7', PEPPER)).toBe(anonQuotaId('203.0.113.7', PEPPER));
  });

  it('the digest is pepper-keyed (a different pepper yields a different id)', () => {
    expect(anonQuotaId('203.0.113.7', PEPPER)).not.toBe(anonQuotaId('203.0.113.7', 'other-pepper'));
  });

  it('output is a valid UUID (chat_usage.user_id column type)', () => {
    expect(anonQuotaId('203.0.113.7', PEPPER)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('no pepper -> refuses (fail closed, rule 6)', () => {
    expect(() => anonQuotaId('203.0.113.7', '')).toThrow(MissingPepperError);
  });
});

describe('W3 — anonQuotaIdFromEnv (environment wiring)', () => {
  beforeEach(() => {
    vi.stubEnv('ANON_ID_PEPPER', PEPPER);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads ANON_ID_PEPPER and matches the explicit form', () => {
    expect(anonQuotaIdFromEnv('203.0.113.7')).toBe(anonQuotaId('203.0.113.7', PEPPER));
  });

  it('missing env pepper -> MissingPepperError (never a pepperless digest)', () => {
    vi.stubEnv('ANON_ID_PEPPER', '');
    expect(() => anonQuotaIdFromEnv('203.0.113.7')).toThrow(MissingPepperError);
  });
});
