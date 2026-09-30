/** T6: webhook verifies the RAW-body HMAC and fails closed. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

vi.mock("@/lib/payments/grantTier", () => ({
  grantTierForPayment: vi.fn(async () => ({ ok: true })),
}));

import { POST } from "@/app/api/payment/webhook/route";
import { grantTierForPayment } from "@/lib/payments/grantTier";

const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

function makeReq(raw: string, signature: string | null): any {
  return {
    text: async () => raw,
    headers: {
      get: (k: string) =>
        k.toLowerCase() === "x-razorpay-signature" ? signature : null,
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
  vi.mocked(grantTierForPayment).mockClear();
});

describe("T6 — webhook signature verification", () => {
  it("accepts a correctly signed raw body", async () => {
    const sig = crypto.createHmac("sha256", SECRET).update(validEvent).digest("hex");
    const res = await POST(makeReq(validEvent, sig));
    expect(res.status).toBe(200);
    expect(grantTierForPayment).toHaveBeenCalledWith({
      razorpayOrderId: "order_1",
      razorpayPaymentId: "pay_1",
      amount: 49900,
      currency: "INR",
    });
  });

  it("rejects a signature computed over a DIFFERENT body (tamper)", async () => {
    const sig = crypto.createHmac("sha256", SECRET)
      .update(JSON.stringify({ event: "payment.captured" })).digest("hex");
    const res = await POST(makeReq(validEvent, sig));
    expect(res.status).toBe(400);
    expect(grantTierForPayment).not.toHaveBeenCalled();
  });

  it("rejects garbage and missing signatures", async () => {
    const res = await POST(makeReq(validEvent, "deadbeef"));
    expect(res.status).toBe(400);
    const noSig = await POST(makeReq(validEvent, null));
    expect(noSig.status).toBe(400);
  });

  it("fails closed without the secret", async () => {
    const saved = process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    try {
      const sig = "x";
      const res = await POST(makeReq(validEvent, sig));
      expect(res.status).toBe(503);
    } finally {
      process.env.RAZORPAY_WEBHOOK_SECRET = saved;
    }
  });

  it("ignores non-payment events without granting anything", async () => {
    const raw = JSON.stringify({ event: "refund.processed", payload: {} });
    const sig = crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
    const res = await POST(makeReq(raw, sig));
    expect(res.status).toBe(200);
    expect(grantTierForPayment).not.toHaveBeenCalled();
  });
});
