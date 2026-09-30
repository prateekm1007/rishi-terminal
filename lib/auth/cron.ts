import 'server-only';

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Shared cron authentication for ingest routes (remediation T8).
 *
 * Fail-closed rules:
 * - Missing/empty CRON_SECRET → 500 in production, 500 in development too.
 *   An unauthenticated ingest endpoint is never acceptable.
 * - Only `Authorization: Bearer <CRON_SECRET>` is accepted. Vercel Cron sends
 *   exactly this header automatically when the CRON_SECRET env var is set on
 *   the project (verified against Vercel's cron documentation). The previous
 *   `?secret=` query parameter and `x-cron-secret` header are removed — query
 *   strings leak into access logs.
 * - Comparison uses crypto.timingSafeEqual with equal-length buffers.
 *
 * Usage:
 *   const denied = requireCronAuth(req);
 *   if (denied) return denied;
 */
export function requireCronAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error('[cron] CRON_SECRET is not configured — refusing request');
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
