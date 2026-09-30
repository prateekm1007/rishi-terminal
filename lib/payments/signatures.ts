const x: any = 1; // R4 gate probe: this line must FAIL CI (no-explicit-any=error in lib/payments)
// lib/payments/signatures.ts
// Razorpay signature verification primitives (remediation T6).
//
// Extracted from the route handlers so they can be unit-tested directly
// (tests/payment/signatures.test.ts) and so both /api/payment and
// /api/payment/webhook share ONE implementation.
//
// Deliberately free of `server-only` and any imports beyond node:crypto —
// these are pure functions over strings, which is exactly what makes them
// testable.

import crypto from 'crypto';

/**
 * Timing-safe comparison of two hex digests.
 * crypto.timingSafeEqual throws on length mismatch, so the length is
 * compared first — returning false without leaking length via timing.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Checkout verification (Razorpay client success handler):
 * expected = HMAC-SHA256(keySecret, `${orderId}|${paymentId}`) as hex.
 * Equivalent to the Razorpay SDK's validatePaymentVerification.
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string
): boolean {
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return timingSafeEqualHex(expected, signature);
}

/**
 * Webhook verification: HMAC-SHA256 over the RAW request body with
 * RAZORPAY_WEBHOOK_SECRET, compared timing-safely. The signature must be
 * computed over the exact bytes Razorpay sent — never over a re-serialized
 * JSON object.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  webhookSecret: string
): boolean {
  if (!rawBody || !signature || !webhookSecret) return false;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody, 'utf8')
    .digest('hex');
  return timingSafeEqualHex(expected, signature);
}
