import { NextResponse } from 'next/server';

/**
 * POST /api/payment/webhook — RETIRED (Commit M4, founder decision
 * 2026-10-02: every feature free).
 *
 * Historical contract (remediation T6 era): verified the Razorpay
 * X-Razorpay-Signature (HMAC-SHA256, timing-safe) and granted the tier
 * through the atomic `grant_tier_for_payment` RPC. That product no longer
 * exists: no orders can be created (POST /api/payment is 410), and there
 * is no entitlement left that a payment could grant.
 *
 * Fail-closed retirement (Coder Directions §11): 410 Gone for EVERY
 * delivery — a permanent status tells the processor to stop retrying.
 * Nothing here reads the body, verifies a signature, or touches the
 * database; no grant is possible from this endpoint. Historical
 * transaction rows and the settlement migrations are preserved in the
 * database, out of reach of this route.
 */

export async function POST() {
  return NextResponse.json(
    {
      error: 'Payments are retired — every feature on Rishi Terminal is free.',
      retired: true,
    },
    {
      status: 410,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
