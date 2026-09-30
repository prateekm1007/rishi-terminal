import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

/**
 * R8: CSP violation report collector.
 *
 * The Content-Security-Policy-Report-Only header (next.config.js) points
 * here via report-uri/report-to. Reports are LOGGED SERVER-SIDE only —
 * never echoed back, never proxied to a third party. The summary lines
 * (directive + blocked URI, truncated) are enough to review a week of
 * violations before flipping the policy out of report-only mode.
 *
 * Acceptance (spec R8): rate-limited, logs to server, generic response.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(`csp-report:ip:${clientIp(req)}`, 30, 60);
  if (!rl.allowed) {
    return new NextResponse(null, { status: 429 });
  }

  try {
    const body: unknown = await req.json();
    const report = (body as { 'csp-report'?: Record<string, unknown> })['csp-report'];
    if (report && typeof report === 'object') {
      const directive = String(report['violated-directive'] ?? report['effective-directive'] ?? 'unknown');
      const blocked = String(report['blocked-uri'] ?? 'unknown');
      // Art. 10: detail stays server-side; the client gets a bare 204.
      console.warn(
        `[csp-report] ${directive} blocked=${blocked.slice(0, 120)} ` +
        `document=${String(report['document-uri'] ?? '').slice(0, 120)} ` +
        `source=${String(report['source-file'] ?? '')}:${String(report['line-number'] ?? '')}`,
      );
    }
  } catch {
    // Malformed body: still acknowledge so the browser does not retry storms.
  }
  return new NextResponse(null, { status: 204 });
}
