/**
 * Commit M5 — the free-access session contract.
 *
 * The legacy resolveTier() (seeker/student/disciple + expiry downgrade)
 * is GONE: the founder decision of 2026-10-02 made every feature free,
 * so there is no tier policy left to resolve. What must now hold:
 *
 *   - SessionUser carries ONE access state: 'free' — no tier field.
 *   - The DATABASE row's legacy tier columns (whatever they hold, however
 *     fresh the expiry) cannot influence the session: they are not even
 *     selected. DB tier MUST NOT control current feature access.
 *   - Authentication stays strict: no session -> null -> 401 upstream.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: "user-1", email: "founder@example.com" } },
      }),
    },
  }),
}));

const selectSpy = vi.fn();
vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    from: (table: string) => {
      if (table !== "users") throw new Error(`unexpected table: ${table}`);
      return {
        select: selectSpy,
        upsert: () => ({ select: selectSpy }),
      };
    },
  }),
}));

import { getSessionUser, requireSessionUser } from "@/lib/auth/session";

/** Simulate the DB row the legacy schema still stores. */
function dbRow(row: Record<string, unknown> | null): void {
  selectSpy.mockReset();
  // The select chain: .select(cols).eq(id).maybeSingle()
  selectSpy.mockReturnValue({
    eq: () => ({ maybeSingle: async () => ({ data: row }) }),
    // The upsert chain: .upsert(...).select(cols).maybeSingle()
    maybeSingle: async () => ({ data: row }),
  });
}

beforeEach(() => {
  dbRow({ id: "user-1", email: "founder@example.com" });
});

describe("M5 — free-access session model", () => {
  it("a legacy DB row with tier='disciple' + future expiry yields access 'free' and NO tier", async () => {
    dbRow({
      id: "user-1",
      email: "founder@example.com",
      tier: "disciple",
      tier_expires_at: new Date(Date.now() + 365 * 86400_000).toISOString(),
    });
    const user = await getSessionUser();
    expect(user).not.toBeNull();
    expect(user!.access).toBe("free");
    expect((user as unknown as Record<string, unknown>).tier).toBeUndefined();
    expect((user as unknown as Record<string, unknown>).tierExpiresAt).toBeUndefined();
  });

  it("a legacy DB row with tier='seeker' yields the SAME access state", async () => {
    dbRow({ id: "user-1", email: "founder@example.com", tier: "seeker", tier_expires_at: null });
    const user = await getSessionUser();
    expect(user!.access).toBe("free");
  });

  it("the session read does not even SELECT the legacy tier columns", async () => {
    await getSessionUser();
    // The selected projection is the proof: tier / tier_expires_at must not
    // be part of the query, so the boundary cannot leak them back in.
    expect(selectSpy).toHaveBeenCalledWith("id, email");
  });

  it("requireSessionUser returns the same user (identity requirement unchanged)", async () => {
    const user = await requireSessionUser();
    expect(user.id).toBe("user-1");
    expect(user.access).toBe("free");
  });

  it("a missing users row is created defensively (account state, not entitlement)", async () => {
    dbRow(null);
    // upsert path also selects only id/email
    const user = await getSessionUser();
    expect(user).not.toBeNull();
    expect(user!.access).toBe("free");
  });
});

describe("M5 — resolveTier is gone (the policy cannot return)", () => {
  it("lib/auth/session exports no tier-resolution function", async () => {
    const mod = (await import("@/lib/auth/session")) as unknown as Record<string, unknown>;
    expect(typeof mod.resolveTier).toBe("undefined");
    expect(typeof (mod as { Tier?: unknown }).Tier).toBe("undefined");
  });
});
