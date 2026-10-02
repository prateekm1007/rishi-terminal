import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { resolveCanonicalPersona } from '@/lib/chat/registry';
import { checkRateLimit } from '@/lib/rateLimit';
import { generateEvidenceGroundedAnswer, toChatWire } from '@/lib/ai/router';
import { createCanonicalStockState } from '@/lib/ai/evidence';

/**
 * Coder Directions 2026-10-02 §8 — the DETERMINISTIC production AI-loop
 * probe. NOT a user feature; unreachable as one:
 *
 *   - PROBE_SECRET unset → 404 (Constitution Rule 6: default deny — the
 *     route does not exist unless the operator provisions the secret);
 *   - wrong/missing `x-probe-secret` header → 404 (timing-safe compare on
 *     SHA-256 digests, so the check leaks nothing about the secret);
 *   - no daily-quota consumption (it is not a chat feature) but the SAME
 *     per-IP burst bound as chat, so a leaked secret cannot become an
 *     unbounded free-chat oracle;
 *   - fixed persona, fixed message shape, fixed seed symbol/tool — the
 *     probe answers exactly one question shape, and `mode=negative` seeds
 *     a deliberately unknown symbol through the SAME executor (the honest
 *     unknown-symbol failure path).
 *
 * What it proves deterministically (everything except the model's CHOICE
 * to request the tool — the one coin flip the nondeterministic canary
 * retries over): the seed executes through the REAL executor, the REAL
 * evidence is injected, the system prompt is REBUILT with the evidence
 * contract (the 2026-10-02 production defect), the REAL provider produces
 * the structured claims, the REAL validator grounds them, and the wire
 * carries the SERVER-GENERATED verified surface plus §11 timings.
 *
 * Rule 10: errors are generic outward, detail logged server-side only.
 */
export const dynamic = 'force-dynamic';

const PROBE_PERSONA = 'damani';
const PROBE_SYMBOL = 'RELIANCE';
const PROBE_TOOL = 'getPrices';
const NEGATIVE_SYMBOL = 'ZZZZNOPE';
const BURST_WINDOW_SECONDS = 60;
const BURST_MAX_REQUESTS = 12;

function secretMatches(header: string | null): boolean {
  const expected = process.env.PROBE_SECRET;
  if (!expected || expected.length < 16) return false; // default deny
  if (!header) return false;
  const a = createHash('sha256').update(header).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

function clientIp(req: NextRequest): string {
  // Same verified header semantics as app/api/chat/route.ts (N4, round 3):
  // Vercel overwrites X-Forwarded-For with exactly the client IP; the LAST
  // entry is the platform-set / trusted-proxy hop under both models.
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function GET(req: NextRequest) {
  if (!secretMatches(req.headers.get('x-probe-secret'))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  // Burst bound per IP (a probe must not bypass abuse controls entirely).
  const burst = await checkRateLimit(`probe:ai-loop:${clientIp(req)}`, BURST_MAX_REQUESTS, BURST_WINDOW_SECONDS);
  if (!burst.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const mode = req.nextUrl.searchParams.get('mode') === 'negative' ? 'negative' : 'positive';
  const symbol = mode === 'negative' ? NEGATIVE_SYMBOL : PROBE_SYMBOL;
  const persona = resolveCanonicalPersona(PROBE_PERSONA);
  if (!persona) {
    console.error('[probe/ai-loop] probe persona missing from canonical registry');
    return NextResponse.json({ error: 'Probe unavailable' }, { status: 503 });
  }

  const message = `What is the latest price of ${symbol}?`;
  const stockState = createCanonicalStockState();
  const probeStart = Date.now();
  try {
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: persona.systemPrompt,
      history: [],
      message,
      evidence: [],
      stockState,
      probeSeedToolCall: { tool: PROBE_TOOL, args: { symbol } },
    });
    if (!answer) {
      console.error('[probe/ai-loop] no approved chat provider configured');
      return NextResponse.json({ error: 'Probe unavailable' }, { status: 503 });
    }
    const wire = toChatWire(answer);
    return NextResponse.json({
      ...wire,
      probe: {
        mode,
        seededTool: PROBE_TOOL,
        seededSymbol: symbol,
        persona: PROBE_PERSONA,
        wallMs: Date.now() - probeStart,
      },
    });
  } catch (e) {
    console.error('[probe/ai-loop] failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Probe failed' }, { status: 502 });
  }
}
