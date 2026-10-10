/**
 * INT-AUTH-ENV — the auth provider's browser-env fail-closed guard.
 *
 * Defect (found 2026-10-10, on the CI smoke trail): the ROOT-layout
 * AuthProvider called createBrowserClient() UNGUARDED inside its
 * hydration effect. With NEXT_PUBLIC_SUPABASE_* missing (every CI run,
 * every preview, any misconfigured deploy) @supabase/ssr THROWS — an
 * unhandled rejection fired inside the hydration window on EVERY
 * page load, and React's hydration recovery could abort mid-swap,
 * intermittently leaving the SSR tree and the client tree in the DOM
 * together (the two-section tear the smoke suite caught twice on
 * loaded runners). Fail-first: the pin below demands the guard and
 * the honest signed-out resolution — captured FAILING on the
 * pre-fix tree (rule 21).
 *
 * The contract after the fix (C2 — the browser is untrusted, the
 * server is the authority):
 *   - missing browser env => the honest signed-out state (loading
 *     resolves, the tree renders) — NEVER a thrown error;
 *   - an auth-infrastructure failure (getSession rejection) => the
 *     same honest signed-out state — never a fake session;
 *   - a degraded browser auth context grants nothing (the tier is
 *     display-only; the server re-reads it — the T5 note stands).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

describe("INT-AUTH-ENV the root auth provider fails closed on missing browser env", () => {
  const src = () => readFileSync(join(ROOT, "components/auth/AuthProvider.tsx"), "utf8");

  it("createClient() is guarded: a missing-env throw resolves the honest signed-out state, never an unhandled rejection", () => {
    const s = src();
    // the guard exists around client CREATION (not around the whole import —
    // the import itself cannot throw a config error)
    expect(s).toMatch(/try\s*\{[\s\S]*?createClient\(\);[\s\S]*?\}\s*catch/);
    // the catch RESOLVES the loading state (the honest signed-out render)
    // instead of rethrowing or leaving loading=true forever
    const catchBlock = /catch\s*\{([\s\S]*?)\}/.exec(s.slice(s.indexOf("createClient();")))?.[1] ?? "";
    expect(catchBlock).toContain("setLoading(false)");
  });

  it("a getSession infrastructure failure resolves the honest signed-out state (never a fake session, never a crash)", () => {
    const s = src();
    // the session read carries its own catch that resolves loading
    expect(s).toMatch(/getSession\(\)[\s\S]*?\.catch\(\(\)\s*=>\s*\{[\s\S]*?setLoading\(false\)/);
  });

  it("signOut degrades honestly without browser env (nothing to sign out of)", () => {
    const s = src();
    const signOutBlock = s.slice(s.indexOf("signOut: async"));
    expect(signOutBlock).toMatch(/try\s*\{[\s\S]*?createClient\(\)\.auth\.signOut\(\);[\s\S]*?\}\s*catch/);
  });
});
