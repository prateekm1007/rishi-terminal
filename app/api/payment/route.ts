import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/db/supabase';

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const TIER_PRICES: Record<string, number> = {
  student:  49900,   // 499 in paise
  disciple: 199900,  // 1999 in paise
};

// POST /api/payment  → create Razorpay order
export async function POST(req: NextRequest) {
  try {
    const { userId, tier } = await req.json();

    if (!userId || !tier || !(tier in TIER_PRICES)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const amount = TIER_PRICES[tier];

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt:  `rishi_${tier}_${Date.now()}`,
    });

    await supabaseAdmin.from('payments').insert({
      user_id:           userId,
      razorpay_order_id: order.id,
      tier,
      amount:            amount / 100,
      status:            'created',
    });

    return NextResponse.json({ orderId: order.id, amount, currency: 'INR' });
  } catch (err) {
    console.error('[Payment POST]', err);
    return NextResponse.json({ error: 'Could not create order' }, { status: 500 });
  }
}

// PUT /api/payment  → verify + activate tier
export async function PUT(req: NextRequest) {
  try {
    const { orderId, paymentId, signature, userId } = await req.json();

    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (signature !== expectedSig) {
      return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
    }

    const { data: payment } = await supabaseAdmin
      .from('payments')
      .update({
        razorpay_payment_id: paymentId,
        razorpay_signature:  signature,
        status:              'paid',
        paid_at:             new Date().toISOString(),
      })
      .eq('razorpay_order_id', orderId)
      .select('tier')
      .single();

    if (payment) {
      await supabaseAdmin
        .from('users')
        .update({ tier: payment.tier, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Payment PUT]', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
