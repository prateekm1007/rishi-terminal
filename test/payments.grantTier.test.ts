/** R2: grantTierForPayment is a thin wrapper around the atomic Postgres RPC. */
import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * The wrapper's own logic is the result mapping + error contract, so the
 * fake admin client only needs to implement `.rpc()`. The RPC's SQL-side
 * behaviour (atomicity, locking, extension rule) is evidenced separately
 * against real Postgres — see PR description for the psql transcript.
 */

const rpcMock = vi.fn();

vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({ rpc: rpcMock }),
}));

import { grantTierForPayment, TIER_PRICES } from "@/lib/payments/grantTier";

const okInput = {
  razorpayOrderId: "order_1",
  razorpayPaymentId: "pay_1",
  amount: 199900,
  currency: "INR",
};

beforeEach(() => {
  rpcMock.mockReset();
});

describe("R2 — grantTierForPayment wrapper maps the RPC contract", () => {
  it("passes arguments through to grant_tier_for_payment", async () => {
    rpcMock.mockResolvedValueOnce({
      data: { status: "granted", tier: "disciple", tier_expires_at: "2027-09-30T00:00:00Z" },
      error: null,
    });
    const res = await grantTierForPayment(okInput);
    expect(res).toEqual({ ok: true, alreadyProcessed: false });
    expect(rpcMock).toHaveBeenCalledWith("grant_tier_for_payment", {
      p_order_id: "order_1",
      p_payment_id: "pay_1",
      p_amount: 199900,
      p_currency: "INR",
    });
  });

  it("status 'already' maps to ok + alreadyProcessed (true no-op replay)", async () => {
    rpcMock.mockResolvedValueOnce({ data: { status: "already", tier: "disciple" }, error: null });
    const res = await grantTierForPayment(okInput);
    expect(res.ok).toBe(true);
    expect(res.alreadyProcessed).toBe(true);
  });

  it("status 'repaired' maps to ok (replay re-asserted a missing grant)", async () => {
    rpcMock.mockResolvedValueOnce({ data: { status: "repaired", tier: "disciple" }, error: null });
    const res = await grantTierForPayment(okInput);
    expect(res.ok).toBe(true);
    expect(res.alreadyProcessed).toBe(false);
  });

  it.each(["unknown_order", "amount_mismatch", "conflict", "unexpected_status"] as const)(
    "permanent refusal '%s' maps to ok:false without throwing",
    async (status) => {
      rpcMock.mockResolvedValueOnce({ data: { status }, error: null });
      const res = await grantTierForPayment(okInput);
      expect(res.ok).toBe(false);
      expect(res.reason).toContain(status);
    },
  );

  it("RPC transport/db errors THROW (transient — webhook must 500 so Razorpay retries)", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "connection terminated" } });
    await expect(grantTierForPayment(okInput)).rejects.toThrow(/rpc failed/);
  });

  it("unknown status shape fails closed as transient (throws)", async () => {
    rpcMock.mockResolvedValueOnce({ data: { status: "???mystery" }, error: null });
    await expect(grantTierForPayment(okInput)).rejects.toThrow(/unexpected status/);
  });

  it("string-encoded jsonb results are parsed", async () => {
    rpcMock.mockResolvedValueOnce({ data: JSON.stringify({ status: "granted" }), error: null });
    const res = await grantTierForPayment(okInput);
    expect(res.ok).toBe(true);
  });

  it("server price table is authoritative (client cannot dictate amount)", () => {
    expect(TIER_PRICES.student).toBe(49900);
    expect(TIER_PRICES.disciple).toBe(199900);
  });
});
