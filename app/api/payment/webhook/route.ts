import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { grantTierForPayment } from '@/lib/payments/grantTier';

/**
 * Razorpay webhook (remediation T6).
 *
 * - Reads the RAW body and verifies X-Razorpay-Signature with
 *   HMAC-SHA256(RAZORPAY_WEBHOOK_SECRET) using crypto.timingSafeEqual
 *   (equal-length buffers first).
 * - On payment.captured / order.paid: finds the transaction by order id,
 *   confirms amount/currency, then grants the tier in ONE idempotent step.
 *   Replays never extend the tier twice.
 * - Fail closed: missing secret in production → 503.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 });
    }
    return NextResponse.json({ error: 'RAZORPAY_WEBHOOK_SECRET not configured' }, { status: 503 });
  }

  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { order_id?: string; id?: string; amount?: number; currency?: string } };
      order?: { entity?: { id?: string; amount?: number; currency?: string } };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (event.event !== 'payment.captured' && event.event !== 'order.paid') {
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const payment = event.payload?.payment?.entity;
  const order = event.payload?.order?.entity;
  const orderId = payment?.order_id ?? order?.id;
  const paymentId = payment?.id;
  const amount = payment?.amount ?? order?.amount;
  const currency = payment?.currency ?? order?.currency ?? 'INR';

  if (!orderId || !paymentId || typeof amount !== 'number') {
    return NextResponse.json({ error: 'Incomplete event payload' }, { status: 400 });
  }

  const result = await grantTierForPayment({
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    amount,
    currency,
  });

  if (!result.ok) {
    // Never 5xx on bad payloads — Razorpay would retry forever. Acknowledge
    // with the rejection reason logged server-side.
    console.error('[webhook] grant refused:', result.reason);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return NextResponse.json({ ok: true, alreadyProcessed: result.alreadyProcessed === true });
}
