// test/payments.signatures.test.ts
// T6 acceptance: Razorpay signature verification primitives.
import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
  timingSafeEqualHex,
} from '@/lib/payments/signatures';

const KEY_SECRET = 'test_key_secret';
const WEBHOOK_SECRET = 'test_webhook_secret';

function hmac(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

describe('verifyPaymentSignature (checkout path)', () => {
  const orderId = 'order_test123';
  const paymentId = 'pay_test123';

  it('accepts a valid signature', () => {
    const sig = hmac(KEY_SECRET, `${orderId}|${paymentId}`);
    expect(verifyPaymentSignature(orderId, paymentId, sig, KEY_SECRET)).toBe(true);
  });

  it('rejects a wrong signature', () => {
    const sig = hmac(KEY_SECRET, `${orderId}|${paymentId}_tampered`);
    expect(verifyPaymentSignature(orderId, paymentId, sig, KEY_SECRET)).toBe(false);
  });

  it('rejects a signature for a different order id (payload swap)', () => {
    const sig = hmac(KEY_SECRET, `${orderId}|${paymentId}`);
    expect(verifyPaymentSignature('order_EVIL', paymentId, sig, KEY_SECRET)).toBe(false);
  });

  it('rejects a signature computed with the wrong secret', () => {
    const sig = hmac('attacker_secret', `${orderId}|${paymentId}`);
    expect(verifyPaymentSignature(orderId, paymentId, sig, KEY_SECRET)).toBe(false);
  });

  it('rejects empty inputs', () => {
    const sig = hmac(KEY_SECRET, `${orderId}|${paymentId}`);
    expect(verifyPaymentSignature('', paymentId, sig, KEY_SECRET)).toBe(false);
    expect(verifyPaymentSignature(orderId, '', sig, KEY_SECRET)).toBe(false);
    expect(verifyPaymentSignature(orderId, paymentId, '', KEY_SECRET)).toBe(false);
    expect(verifyPaymentSignature(orderId, paymentId, sig, '')).toBe(false);
  });
});

describe('verifyWebhookSignature (raw-body path)', () => {
  it('accepts a valid signature over the raw body', () => {
    const raw = JSON.stringify({ event: 'payment.captured' });
    expect(verifyWebhookSignature(raw, hmac(WEBHOOK_SECRET, raw), WEBHOOK_SECRET)).toBe(true);
  });

  it('rejects when the body was modified after signing', () => {
    const raw = JSON.stringify({ event: 'payment.captured', amount: 49900 });
    const tampered = JSON.stringify({ event: 'payment.captured', amount: 1 });
    expect(verifyWebhookSignature(tampered, hmac(WEBHOOK_SECRET, raw), WEBHOOK_SECRET)).toBe(false);
  });

  it('rejects a signature computed with the checkout secret (wrong key)', () => {
    const raw = JSON.stringify({ event: 'order.paid' });
    expect(verifyWebhookSignature(raw, hmac(KEY_SECRET, raw), WEBHOOK_SECRET)).toBe(false);
  });

  it('rejects missing signature / secret / body', () => {
    const raw = '{}';
    expect(verifyWebhookSignature(raw, null, WEBHOOK_SECRET)).toBe(false);
    expect(verifyWebhookSignature(raw, undefined, WEBHOOK_SECRET)).toBe(false);
    expect(verifyWebhookSignature(raw, hmac(WEBHOOK_SECRET, raw), '')).toBe(false);
    expect(verifyWebhookSignature('', hmac(WEBHOOK_SECRET, raw), WEBHOOK_SECRET)).toBe(false);
  });
});

describe('timingSafeEqualHex', () => {
  it('does not throw on length mismatch and returns false', () => {
    expect(timingSafeEqualHex('abc', 'abcd')).toBe(false);
  });

  it('returns true for equal digests', () => {
    expect(timingSafeEqualHex('deadbeef', 'deadbeef')).toBe(true);
  });
});
