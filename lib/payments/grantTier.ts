import 'server-only';

import { getAdminSupabase } from '@/lib/services/supabaseAdmin';

/**
 * Idempotent tier grant shared by the Razorpay webhook and the client
 * verify endpoint (remediation T6).
 *
 * Guarantees:
 * - The transaction must exist and be in 'created' status (or already paid
 *   with the SAME payment id — replays are no-ops, never a second extension).
 * - The amount and currency reported by Razorpay must match the stored row.
 * - users.tier / tier_expires_at are updated in the same winning step.
 */
export interface GrantResult {
  ok: boolean;
  alreadyProcessed?: boolean;
  reason?: string;
}

export interface GrantInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number;           // paise, as reported by Razorpay
  currency: string;         // 'INR'
}

const TIER_DURATION_DAYS = 365;

export async function grantTierForPayment(input: GrantInput): Promise<GrantResult> {
  const admin = getAdminSupabase();

  // 1. Find the transaction by order id.
  const { data: tx, error: txErr } = await admin
    .from('transactions')
    .select('id, user_id, tier_purchased, amount, currency, status, razorpay_payment_id')
    .eq('razorpay_order_id', input.razorpayOrderId)
    .maybeSingle();

  if (txErr || !tx) {
    return { ok: false, reason: 'unknown order' };
  }

  const row = tx as {
    id: string;
    user_id: string;
    tier_purchased: string;
    amount: number;
    currency: string;
    status: string;
    razorpay_payment_id: string | null;
  };

  // 2. Replay guard: same order + same payment id already settled → no-op.
  if (row.status === 'paid' && row.razorpay_payment_id === input.razorpayPaymentId) {
    return { ok: true, alreadyProcessed: true };
  }

  // 3. A paid row settled with a DIFFERENT payment id, or any other
  //    non-created status: refuse rather than double-grant.
  if (row.status !== 'created') {
    return { ok: false, reason: `transaction in unexpected status: ${row.status}` };
  }

  // 4. Amount/currency must match what we asked Razorpay to collect.
  if (row.amount !== input.amount || row.currency !== input.currency) {
    return { ok: false, reason: 'amount or currency mismatch' };
  }

  // 5. Winning write: only one caller can flip status created -> paid
  //    (razorpay_payment_id is UNIQUE in 001, so two different payment ids
  //    cannot both claim the same order).
  const { data: updated, error: updErr } = await admin
    .from('transactions')
    .update({
      status: 'paid',
      razorpay_payment_id: input.razorpayPaymentId,
      paid_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('status', 'created')
    .select('id')
    .maybeSingle();

  if (updErr || !updated) {
    // Lost the race (webhook + client verify concurrently) — the winner
    // granted the tier; this call is a no-op.
    return { ok: true, alreadyProcessed: true };
  }

  // 6. Grant the tier for one year from now.
  const expires = new Date(Date.now() + TIER_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const { error: userErr } = await admin
    .from('users')
    .update({ tier: row.tier_purchased, tier_expires_at: expires.toISOString() })
    .eq('id', row.user_id);

  if (userErr) {
    return { ok: false, reason: 'failed to update user tier' };
  }

  return { ok: true };
}

/** Server-side price table — the client never dictates the amount. */
export const TIER_PRICES: Record<'student' | 'disciple', number> = {
  student: 49900,   // ₹499 in paise
  disciple: 199900, // ₹1,999 in paise
};
