// lib/alerts/unsubToken.ts (X3-08) — stateless unsubscribe tokens.
//
// token = base64url(userId) + '.' + base64url(HMAC-SHA256(userId, key))
//
// Properties: stable per user (every email's link works forever, until
// the user opts back in and new emails carry the same link), unforgeable
// without the server secret, verifiable without a database read, and no
// token material is stored anywhere.
//
// Key derivation: a dedicated ALERTS_UNSUB_SECRET when provisioned, else
// a domain-separated derivation from CRON_SECRET (already provisioned in
// production) — HMAC(CRON_SECRET, 'alerts-unsub-v1'). Domain separation
// means the ingest-cron secret cannot be used directly as an unsubscribe
// forgery key or vice versa.

import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

function keyMaterial(): Buffer {
  const dedicated = process.env.ALERTS_UNSUB_SECRET;
  if (dedicated) return Buffer.from(dedicated, 'utf8');
  const cron = process.env.CRON_SECRET;
  if (!cron) {
    throw new Error('unsubscribe tokens require ALERTS_UNSUB_SECRET or CRON_SECRET');
  }
  return createHmac('sha256', cron).update('alerts-unsub-v1').digest();
}

export function buildUnsubscribeToken(userId: string): string {
  const mac = createHmac('sha256', keyMaterial()).update(userId).digest('base64url');
  return `${Buffer.from(userId, 'utf8').toString('base64url')}.${mac}`;
}

/** Returns the userId for a valid token, else null (constant-time MAC). */
export function verifyUnsubscribeToken(token: string): string | null {
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;
  const userId = Buffer.from(token.slice(0, dot), 'base64url').toString('utf8');
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const expected = createHmac('sha256', keyMaterial()).update(userId).digest('base64url');
  const given = token.slice(dot + 1);
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}
