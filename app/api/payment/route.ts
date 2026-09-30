import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSessionUser } from '@/lib/auth/session';
import { grantTierForPayment, TIER_PRICES } from '@/lib/payments/grantTier';

/**
 * Razorpay payment endpoints (remediation T6).
 *
 * POST — create an order:      session required; price from server table;
 *                              inserts a transactions row (status 'created').
 * PUT  — client-side verify:   session required; order must belong to the
 *                              session user; timing-safe signature check;
 *                              grants tier idempotently; returns the
 *                              SERVER's current tier. UX shortcut only —
 *                              the webhook remains the source of truth.
 *
 * Fail closed: when RAZORPAY_* configuration is missing in production this
 * route returns 503. There is no demo mode that reports verified:true.
 */

function missingRazorpayConfig(): boolean {
  return !(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: { tier?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tier = body.tier as keyof typeof TIER_PRICES;
  const amount = TIER_PRICES[tier];
  if (!amount) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  if (missingRazorpayConfig()) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Payments unavailable' }, { status: 503 });
    }
    return NextResponse.json(
      { error: 'RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured' },
      { status: 503 },
    );
  }

  const keyId = process.env.RAZORPAY_KEY_ID!;
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;

  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt: `rishi_${tier}_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { tier, userId: user.id },
    }),
  });

  if (!response.ok) {
    // Log server-side; never echo upstream error details to the client.
    console.error('[payment] Razorpay order creation failed:', await response.text());
    return NextResponse.json({ error: 'Could not create order' }, { status: 502 });
  }

  const order = await response.json();

  // Persist the order so the webhook can verify amount/currency later.
  const admin = (await import('@/lib/services/supabaseAdmin')).getAdminSupabase();
  const { error: insertErr } = await admin.from('transactions').insert({
    user_id: user.id,
    razorpay_order_id: order.id,
    amount,
    currency: 'INR',
    status: 'created',
    tier_purchased: tier,
  });

  if (insertErr) {
    console.error('[payment] failed to record transaction:', insertErr.message);
    return NextResponse.json({ error: 'Could not record order' }, { status: 500 });
  }

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId,
  });
}

/** Timing-safe comparison; guards against length leaks via early return. */
function timingSafeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: { orderId?: string; paymentId?: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { orderId, paymentId, signature } = body;
  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (missingRazorpayConfig()) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Payments unavailable' }, { status: 503 });
    }
    return NextResponse.json(
      { error: 'RAZORPAY_KEY_SECRET is not configured' },
      { status: 503 },
    );
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET!;
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  if (!timingSafeEqualHex(expected, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // The order must belong to the session user.
  const admin = (await import('@/lib/services/supabaseAdmin')).getAdminSupabase();
  const { data: tx } = await admin
    .from('transactions')
    .select('user_id, amount, currency')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();

  if (!tx || (tx as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const result = await grantTierForPayment({
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    amount: (tx as { amount: number }).amount,
    currency: (tx as { currency: string }).currency,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? 'Verification failed' }, { status: 400 });
  }

  // Always return the server's authoritative tier, re-read after the grant.
  const fresh = await getSessionUser();
  return NextResponse.json({ verified: true, tier: fresh?.tier });
}
