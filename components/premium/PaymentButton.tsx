'use client';

import type { WisdomTier } from '@/lib/premium';

/**
 * Razorpay Checkout integration (remediation T6).
 *
 * Flow: POST /api/payment (session required, server-side price) → open
 * Razorpay Checkout with the returned order → on success, PUT /api/payment
 * verifies the signature server-side and the tier is refreshed from
 * /api/auth/me. The webhook remains the source of truth; this is the UX
 * shortcut.
 */

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

async function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined' || window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
    document.head.appendChild(script);
  });
}

export async function startRazorpayCheckout(
  tier: 'student' | 'disciple',
  onTierRefreshed?: () => Promise<void>,
): Promise<void> {
  const createRes = await fetch('/api/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier }),
  });

  if (createRes.status === 401) {
    window.location.href = '/auth/signin?next=/pricing';
    return;
  }

  const order = await createRes.json();
  if (!createRes.ok) {
    throw new Error(order.error ?? 'Could not create payment order');
  }

  await loadRazorpayScript();

  await new Promise<void>((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'Rishi Terminal',
      description: `${tier} tier — 1 year`,
      order_id: order.orderId,
      theme: { color: '#D4AF37' },
      async handler(response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) {
        try {
          const verifyRes = await fetch('/api/payment', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
          const verify = await verifyRes.json();
          if (!verifyRes.ok || !verify.verified) {
            reject(new Error(verify.error ?? 'Payment verification failed'));
            return;
          }
          await onTierRefreshed?.();
          resolve();
        } catch (e) {
          reject(e instanceof Error ? e : new Error('Verification failed'));
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Checkout closed before payment completed')),
      },
    });
    rzp.open();
  });
}
