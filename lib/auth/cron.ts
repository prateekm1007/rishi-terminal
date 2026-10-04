import 'server-only';

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Shared bearer-secret authentication for machine callers (remediation T8;
 * Z2 parametrization).
 *
 * Fail-closed rules:
 * - Missing/empty configured secret → 500 in production and development.
 *   An unauthenticated machine endpoint is never acceptable.
 * - Only `Authorization: Bearer <secret>` is accepted. Query strings leak
 *   into access logs, so no `?secret=` form exists.
 * - Comparison uses crypto.timingSafeEqual with equal-length buffers.
 *
 * Callers:
 *   requireCronAuth      — CRON_SECRET, the Vercel-Cron ingest routes
 *                          (/api/ingest/snapshot, /api/ingest/observations).
 *   requireQuotesWarmAuth — QUOTES_WARM_SECRET, the GitHub-Actions-driven
 *                          warmer (Z2, Round 13): a DEDICATED secret so the
 *                          two callers never share a blast radius — rotating
 *                          one must not break the other, and a leaked
 *                          workflow secret must not reach the Vercel-cron
 *                          ingest routes (or vice versa).
 */
function requireBearerSecret(
  req: NextRequest,
  secret: string | undefined,
  label: string,
): NextResponse | null {
  if (!secret) {
    console.error(`[${label}] ${label === 'cron' ? 'CRON_SECRET' : 'QUOTES_WARM_SECRET'} is not configured — refusing request`);
    return NextResponse.json(
      { error: 'Cron authentication is not configured' },
      { status: 500 },
    );
  }

  const header = req.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secretBuf = Buffer.from(secret, 'utf8');
  const providedBuf = Buffer.from(match[1], 'utf8');
  if (
    secretBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(secretBuf, providedBuf)
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export function requireCronAuth(req: NextRequest): NextResponse | null {
  return requireBearerSecret(req, process.env.CRON_SECRET, 'cron');
}

/**
 * Z2 (Round 13): the quotes-warm endpoint's OWN secret. Never falls back to
 * CRON_SECRET — a missing dedicated secret must refuse (Rule 6), not reach
 * for a neighboring credential.
 */
export function requireQuotesWarmAuth(req: NextRequest): NextResponse | null {
  return requireBearerSecret(req, process.env.QUOTES_WARM_SECRET, 'quotes-warm');
}
