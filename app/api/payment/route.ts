import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// POST /api/payment — Create Razorpay order
export async function POST(req: NextRequest) {
  try {
    const { tier, userId } = await req.json();

    const TIER_PRICES: Record<string, number> = {
      student: 49900,   // 499 in paise
      disciple: 199900, // 1999 in paise
    };

    const amount = TIER_PRICES[tier];
    if (!amount) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      // Demo mode — return mock order
      return NextResponse.json({
        orderId: 'order_demo_' + Date.now(),
        amount,
        currency: 'INR',
        keyId: 'rzp_test_demo',
        demo: true,
      });
    }

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
        receipt: `rishi_${tier}_${userId}_${Date.now()}`,
        notes: { tier, userId },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: 'Razorpay error: ' + err }, { status: 500 });
    }

    const order = await response.json();
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT /api/payment — Verify payment signature
export async function PUT(req: NextRequest) {
  try {
    const { orderId, paymentId, signature } = await req.json();

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      // Demo mode — always verify as success
      return NextResponse.json({ verified: true, demo: true });
    }

    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === signature;

    if (isValid) {
      // TODO: Update user tier in Supabase
      // await supabase.from('users').update({ tier: 'student' }).eq('id', userId);
      return NextResponse.json({ verified: true });
    } else {
      return NextResponse.json({ verified: false, error: 'Invalid signature' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}