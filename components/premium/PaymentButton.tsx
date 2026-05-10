'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

declare global {
  interface Window { Razorpay: any; }
}

const TIER_PRICES = { student: 499, disciple: 1999 } as const;
const TIER_LABELS = { student: 'Student', disciple: 'Disciple' } as const;

export default function PaymentButton({ tier }: { tier: 'student' | 'disciple' }) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  async function handlePayment() {
    if (!session?.user?.id) {
      alert('Please sign in to upgrade your tier.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/payment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: session.user.id, tier }),
      });

      const { orderId, amount } = await res.json();
      if (!orderId) throw new Error('Order creation failed');

      const options = {
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency:    'INR',
        name:        'Rishi Terminal',
        description: `Upgrade to ${TIER_LABELS[tier]}`,
        order_id:    orderId,
        handler: async (response: any) => {
          const verifyRes = await fetch('/api/payment', {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              orderId:   response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              userId:    session.user.id,
            }),
          });

          const { success } = await verifyRes.json();
          if (success) {
            alert(`✅ Upgraded to ${TIER_LABELS[tier]}! Please refresh.`);
            window.location.reload();
          } else {
            alert('Payment verification failed. Contact support.');
          }
        },
        theme: { color: '#F97316' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => alert('Payment failed. Please try again.'));
      rzp.open();
    } catch (err) {
      console.error('[PaymentButton]', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Processing…' : `Upgrade to ${TIER_LABELS[tier]} — ${TIER_PRICES[tier]}/yr`}
    </button>
  );
}
