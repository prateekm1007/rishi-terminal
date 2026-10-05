import { NextRequest, NextResponse } from 'next/server';
import { alertsStore } from '@/lib/alerts/store';
import { evaluateAlerts } from '@/lib/alerts/evaluate';
import { fetchLivePrice } from '@/lib/livePrice';
import { STOCKS } from '@/data/stocks';
import { getStockScore } from '@/lib/scoring';

/**
 * X3-08 (Round 16 C7): the alert evaluator entry point.
 *
 * CRON_SECRET-gated (the same bearer discipline as the ingest routes —
 * B-06's lesson: an ungated evaluator is an open write surface). A
 * scheduled caller (Vercel cron is once-a-day on Hobby; a GitHub Actions
 * schedule can call it intra-day the way quotes-warm does) POSTs this
 * route; every user's active triggers are evaluated idempotently.
 *
 * Delivery: FD-5 (provider) is undecided — events are recorded with
 * 'skipped_no_provider' until the founder picks a vendor. Never a fake
 * send (Constitution 1/5).
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed (Constitution 6)
  const header = req.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? new URL(req.url).origin;
  try {
    const summary = await evaluateAlerts({
      store: alertsStore(),
      price: async (symbol) => {
        const q = await fetchLivePrice(symbol);
        return q?.price ?? null;
      },
      score: async (symbol) => {
        // The scoring engine is seed-based until D1; scores exist and are
        // labeled placeholder everywhere they render.
        const stock = STOCKS[symbol];
        if (!stock) return null;
        const report = getStockScore(stock);
        return report.consensus;
      },
      now: new Date(),
      rateCapPerHour: 10,
      appOrigin: origin,
    });
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error('[alerts:evaluate]', err);
    return NextResponse.json({ ok: false, error: 'Evaluation failed.' }, { status: 500 });
  }
}
