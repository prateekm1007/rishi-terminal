import 'server-only';

import { getAdminSupabase } from '@/lib/services/supabaseAdmin';

/**
 * Idempotent, ATOMIC tier grant shared by the Razorpay webhook and the
 * client verify endpoint (remediation T6, made atomic in R2).
 *
 * All settlement logic lives in the Postgres function
 * `grant_tier_for_payment` (migration 007): lock -> verify -> settle ->
 * grant in ONE transaction. This module is a thin wrapper that maps the
 * RPC's structured result onto GrantResult.
 *
 * Error contract:
 * - Structured refusals (unknown order, amount/currency mismatch, conflict,
 *   unexpected status) come back as `{ ok: false, reason }` — permanent,
 *   retrying will never succeed.
 * - RPC/transport failures THROW — callers must treat that as transient
 *   (HTTP 500) so Razorpay retries.
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

/** RPC statuses that are permanent rejections (never worth retrying). */
const PERMANENT_STATUSES = new Set([
  'unknown_order',
  'amount_mismatch',
  'conflict',
  'unexpected_status',
]);

interface RpcResult {
  status: string;
  detail?: string;
  settled_with?: string | null;
  tier?: string | null;
  tier_expires_at?: string | null;
}

export async function grantTierForPayment(input: GrantInput): Promise<GrantResult> {
  const admin = getAdminSupabase();

  const { data, error } = await admin.rpc('grant_tier_for_payment', {
    p_order_id: input.razorpayOrderId,
    p_payment_id: input.razorpayPaymentId,
    p_amount: input.amount,
    p_currency: input.currency,
  });

  if (error) {
    // Transport / DB / function error — TRANSIENT by definition. Throw so
    // the webhook answers 500 and Razorpay retries.
    throw new Error(`grant_tier_for_payment rpc failed: ${error.message}`);
  }

  let result: RpcResult;
  try {
    result = (typeof data === 'string' ? JSON.parse(data) : data) as RpcResult;
  } catch {
    throw new Error(`grant_tier_for_payment: unparseable rpc result: ${String(data)}`);
  }

  if (PERMANENT_STATUSES.has(result.status)) {
    const detail = result.settled_with ? ` (settled with ${result.settled_with})` : '';
    return { ok: false, reason: `${result.status}${result.detail ? `: ${result.detail}` : detail}` };
  }

  if (result.status !== 'granted' && result.status !== 'repaired' && result.status !== 'already') {
    // Unknown status shape — fail closed as transient.
    throw new Error(`grant_tier_for_payment: unexpected status: ${result.status}`);
  }

  return { ok: true, alreadyProcessed: result.status === 'already' };
}

/** Server-side price table — the client never dictates the amount. */
export const TIER_PRICES: Record<'student' | 'disciple', number> = {
  student: 49900,   // ₹499 in paise
  disciple: 199900, // ₹1,999 in paise
};
