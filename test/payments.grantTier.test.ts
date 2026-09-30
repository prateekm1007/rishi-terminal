/** T6: payments that actually grant and persist access — idempotent, amount-checked. */
import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * grantTierForPayment is tested against an in-memory fake of the two Supabase
 * tables it touches (transactions, users), implementing the exact contract the
 * real queries rely on: eq() filters, select(), maybeSingle(), and the
 * optimistic `eq('status','created')` claim on the winning write.
 */

type TxRow = {
  id: string;
  razorpay_order_id: string;
  user_id: string;
  tier_purchased: string;
  amount: number;
  currency: string;
  status: string;
  razorpay_payment_id: string | null;
};

let transactions: TxRow[] = [];
let users: Array<{ id: string; tier: string; tier_expires_at: string | null }> = [];
let userUpdateCount = 0;

function makeFakeAdmin() {
  return {
    from: (name: string) => {
      const rows = name === "transactions" ? transactions : users;
      const filters: Record<string, any> = {};
      let patch: any = null;
      let applied = false;

      const apply = () => {
        if (applied || !patch) return;
        applied = true;
        // Evaluate WHERE against the PRE-update state (real SQL semantics).
        for (const r of rows) {
          const matches = Object.entries(filters).every(([c, v]) => (r as any)[c] === v);
          if (!matches) continue;
          Object.assign(r, patch);
          claimed.push(r);
          if (name !== "transactions") userUpdateCount++;
        }
      };

      let claimed: any[] = [];

      const b: any = {
        select: () => {
          apply();
          return b;
        },
        update: (p: any) => {
          patch = p;
          return b;
        },
        eq: (col: string, val: any) => {
          filters[col] = val;
          return b;
        },
        maybeSingle: () => {
          apply();
          // UPDATE ... RETURNING: return a claimed row from the update,
          // otherwise the single row matching the WHERE clause.
          if (claimed.length > 0) {
            return Promise.resolve({ data: claimed[0], error: null });
          }
          const filtered = rows.filter(r =>
            Object.entries(filters).every(([c, v]) => (r as any)[c] === v),
          );
          const single = filtered.length === 1 ? filtered[0] : null;
          return Promise.resolve({ data: single, error: null });
        },
        then: (resolve: any, reject: any) => {
          apply();
          Promise.resolve({ data: null, error: null }).then(resolve, reject);
        },
      };
      return b;
    },
  };
}

vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => makeFakeAdmin(),
}));

import { grantTierForPayment, TIER_PRICES } from "@/lib/payments/grantTier";

const baseTx = (): TxRow => ({
  id: "tx-1",
  razorpay_order_id: "tx-1",
  user_id: "user-1",
  tier_purchased: "disciple",
  amount: 199900,
  currency: "INR",
  status: "created",
  razorpay_payment_id: null,
});

beforeEach(() => {
  transactions = [baseTx()];
  users = [{ id: "user-1", tier: "seeker", tier_expires_at: null }];
  userUpdateCount = 0;
});

describe("T6 — grantTierForPayment", () => {
  it("grants the tier exactly once for a valid payment", async () => {
    const res = await grantTierForPayment({
      razorpayOrderId: "tx-1",
      razorpayPaymentId: "pay-1",
      amount: 199900,
      currency: "INR",
    });
    expect(res.ok).toBe(true);
    expect(transactions[0].status).toBe("paid");
    expect(transactions[0].razorpay_payment_id).toBe("pay-1");
    expect(users[0].tier).toBe("disciple");
    expect(users[0].tier_expires_at).toBeTruthy();
  });

  it("replays with the same payment id are no-ops (never a second extension)", async () => {
    await grantTierForPayment({ razorpayOrderId: "tx-1", razorpayPaymentId: "pay-1", amount: 199900, currency: "INR" });
    const first = { ...users[0] };
    const replay = await grantTierForPayment({ razorpayOrderId: "tx-1", razorpayPaymentId: "pay-1", amount: 199900, currency: "INR" });
    expect(replay.ok).toBe(true);
    expect(replay.alreadyProcessed).toBe(true);
    expect(users[0].tier_expires_at).toBe(first.tier_expires_at);
  });

  it("refuses a paid row settled with a DIFFERENT payment id", async () => {
    await grantTierForPayment({ razorpayOrderId: "tx-1", razorpayPaymentId: "pay-1", amount: 199900, currency: "INR" });
    const res = await grantTierForPayment({ razorpayOrderId: "tx-1", razorpayPaymentId: "pay-2", amount: 199900, currency: "INR" });
    expect(res.ok).toBe(false);
  });

  it("rejects amount mismatch", async () => {
    const res = await grantTierForPayment({ razorpayOrderId: "tx-1", razorpayPaymentId: "pay-9", amount: 100, currency: "INR" });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/mismatch/);
  });

  it("rejects currency mismatch and unknown orders", async () => {
    const cur = await grantTierForPayment({ razorpayOrderId: "tx-1", razorpayPaymentId: "pay-9", amount: 199900, currency: "USD" });
    expect(cur.ok).toBe(false);
    const unk = await grantTierForPayment({ razorpayOrderId: "nope", razorpayPaymentId: "pay-9", amount: 199900, currency: "INR" });
    expect(unk.ok).toBe(false);
  });

  it("server price table is authoritative (client cannot dictate amount)", () => {
    expect(TIER_PRICES.student).toBe(49900);
    expect(TIER_PRICES.disciple).toBe(199900);
  });
});
