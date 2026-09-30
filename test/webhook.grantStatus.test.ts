/** R2: webhook maps grant failures to 500 (transient) vs 200 (permanent). */
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

vi.mock("@/lib/payments/grantTier", () => ({
  grantTierForPayment: vi.fn(),
}));

import { POST } from "@/app/api/payment/webhook/route";
import { grantTierForPayment } from "@/lib/payments/grantTier";

const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

function signed(raw: string): string {
  return crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
}

function makeReq(raw: string): any {
  return {
    text: async () => raw,
    headers: {
      get: (k: string) =>
        k.toLowerCase() === "x-razorpay-signature" ? signed(raw) : null,
    },
  };
}

const validEvent = JSON.stringify({
  event: "payment.captured",
  payload: {
    payment: {
      entity: { order_id: "order_1", id: "pay_1", amount: 49900, currency: "INR" },
    },
  },
});

beforeEach(() => {
  vi.mocked(grantTierForPayment).mockReset();
});

describe("R2 — webhook grant failure semantics", () => {
  it("transient RPC failure -> 500 (Razorpay retries)", async () => {
    vi.mocked(grantTierForPayment).mockRejectedValueOnce(
      new Error("grant_tier_for_payment rpc failed: connection terminated"),
    );
    const res = await POST(makeReq(validEvent));
    expect(res.status).toBe(500);
  });

  it("permanent refusal (amount mismatch) -> 200 {ok:false}, not 4xx/5xx", async () => {
    vi.mocked(grantTierForPayment).mockResolvedValueOnce({
      ok: false,
      reason: "amount_mismatch",
    });
    const res = await POST(makeReq(validEvent));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: false });
  });

  it("permanent refusal (unknown order) -> 200 {ok:false}", async () => {
    vi.mocked(grantTierForPayment).mockResolvedValueOnce({
      ok: false,
      reason: "unknown_order",
    });
    const res = await POST(makeReq(validEvent));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(false);
  });

  it("success still -> 200 {ok:true}", async () => {
    vi.mocked(grantTierForPayment).mockResolvedValueOnce({ ok: true });
    const res = await POST(makeReq(validEvent));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, alreadyProcessed: false });
  });
});
