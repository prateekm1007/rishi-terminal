'use client';

import { useState } from 'react';

interface Props {
  tier: 'student' | 'disciple';
  userId?: string;
  onSuccess?: () => void;
}

const TIER_DETAILS = {
  student: { name: 'Student', price: '499/month', amount: 49900 },
  disciple: { name: 'Disciple', price: '1,999/month', amount: 199900 },
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PaymentButton({ tier, userId = 'demo', onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const details = TIER_DETAILS[tier];

  async function handlePayment() {
    setLoading(true);
    try {
      // Create order
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, userId }),
      });
      const order = await res.json();

      if (order.demo) {
        // Demo mode — simulate success
        await new Promise(r => setTimeout(r, 1000));
        setStatus('success');
        onSuccess?.();
        return;
      }

      // Load Razorpay script if not loaded
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay'));
          document.head.appendChild(script);
        });
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Rishi Terminal',
        description: `${details.name} Plan — ${details.price}`,
        order_id: order.orderId,
        theme: { color: '#D4AF37' },
        handler: async (response: any) => {
          // Verify payment
          const verify = await fetch('/api/payment', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
          const result = await verify.json();
          if (result.verified) {
            setStatus('success');
            onSuccess?.();
          } else {
            setStatus('error');
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      });

      rzp.open();
    } catch (err) {
      console.error('Payment error:', err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'success') {
    return (
      <div style={{
        padding: '14px 24px', borderRadius: 12, textAlign: 'center',
        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
        color: '#22C55E', fontWeight: 700, fontSize: 14,
      }}>
        ✅ Upgrade Successful! Welcome to {details.name}.
      </div>
    );
  }

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      style={{
        padding: '14px 28px', borderRadius: 12, fontWeight: 700, fontSize: 14,
        cursor: loading ? 'not-allowed' : 'pointer',
        background: loading ? 'rgba(51,65,85,0.5)' : 'linear-gradient(135deg,#A88B20,#D4AF37)',
        border: 'none', color: loading ? '#64748B' : '#0A0F1C',
        width: '100%', transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}
    >
      {loading ? (
        <>⏳ Processing...</>
      ) : (
        <>💳 Upgrade to {details.name} — {details.price}</>
      )}
    </button>
  );
}