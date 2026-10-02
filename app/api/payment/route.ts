import { NextResponse } from 'next/server';

/**
 * POST/PUT /api/payment — RETIRED (Commit M4, founder decision 2026-10-02:
 * every feature free; no tiers, no paid gates, no checkout).
 *
 * Historical contract (remediation T6 era): POST created a Razorpay order
 * (session required, server-side price) and PUT verified the client-side
 * signature and granted the tier idempotently. That product no longer
 * exists: there is nothing to buy and no entitlement a payment could
 * grant.
 *
 * Fail-closed retirement (Coder Directions §11): both methods answer
 * 410 Gone. No order can be created, no verification accepted, and no
 * code path reaches the grant RPC — historical transaction ROWS and the
 * payment MIGRATIONS are preserved untouched (lib/db/migrations/001,
 * 002, 007); only the runtime purchase surface is gone.
 */

const RETIRED_BODY = {
  error: 'Payments are retired — every feature on Rishi Terminal is free.',
  retired: true,
};

export async function POST() {
  return NextResponse.json(RETIRED_BODY, {
    status: 410,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function PUT() {
  return NextResponse.json(RETIRED_BODY, {
    status: 410,
    headers: { 'Cache-Control': 'no-store' },
  });
}
