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
/** Shared fail-closed bearer gate (Z2): one implementation, two named
 *  entry points. `envName` is the ONLY accepted secret for that route —
 *  a dedicated secret per endpoint ends the shared-credential class:
 *  rotating or mis-provisioning one route's secret can never 401 another
 *  (the quotes-warm warmer never ran because its shared secret never
 *  reached the runtime). Missing env -> 500; wrong/missing bearer -> 401.
 *  Comparison uses crypto.timingSafeEqual with equal-length buffers. */
function requireBearerSecret(req: NextRequest, envName: string, label: string): NextResponse | null {
  const secret = process.env[envName];

  if (!secret) {
    console.error(`[cron] ${envName} is not configured — refusing request`);
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

/** The ingest routes' shared secret (Vercel crons: snapshot, observations,
 *  financials). Untouched by Z2. */
export function requireCronAuth(req: NextRequest): NextResponse | null {
  return requireBearerSecret(req, 'CRON_SECRET', 'cron');
}

/** Z2 (Round 13): the quotes-warm warmer's DEDICATED secret. Accepted only
 *  by /api/ingest/quotes-warm — CRON_SECRET never authenticates this
 *  route. Provisioned per Constitution rule 32 (vault + HF mirror), set
 *  as a GitHub Actions secret and a Vercel production env var. */
export function requireQuotesWarmAuth(req: NextRequest): NextResponse | null {
  return requireBearerSecret(req, 'QUOTES_WARM_SECRET', 'quotes-warm');
}
