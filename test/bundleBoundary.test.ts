/**
 * U3 (founder round 7): first-load bundle boundary for auth.
 *
 * Measured evidence (bundle:budget, gzip first-load JS): @supabase/supabase-js
 * contributed ~66 kB to EVERY route's first-load because AuthProvider (root
 * layout) statically imported the browser client. Auth is a post-hydration
 * concern (session starts null + loading=true on the server-rendered HTML
 * either way), so the provider must dynamic-import it — the chunk then loads
 * async after hydration instead of blocking first paint on every page.
 *
 * The dedicated auth surfaces (sign-in, callback) DO need the client up
 * front and keep their static imports — pinned here too, so a future
 * "optimisation" cannot accidentally degrade the auth flows.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO = path.resolve(__dirname, "..");
const authProvider = readFileSync(
  path.join(REPO, "components", "auth", "AuthProvider.tsx"),
  "utf8",
);

describe("U3 — AuthProvider lazy-loads the browser supabase client", () => {
  it("has NO static (top-level) import of the browser client", () => {
    expect(authProvider).not.toMatch(/import\s+\{[^}]*createClient[^}]*\}\s+from\s+['"]@\/lib\/supabase\/client['"]/);
  });

  it("loads it dynamically inside the auth effect and keeps the session contract", () => {
    expect(authProvider).toContain("import('@/lib/supabase/client')");
    expect(authProvider).toContain("auth.getSession()");
    expect(authProvider).toContain("onAuthStateChange");
  });

  it("sign-out also goes through the dynamic client (no static import sneaks back)", () => {
    expect(authProvider).toMatch(/signOut[\s\S]*import\(['"]@\/lib\/supabase\/client['"]\)/);
  });
});

describe("U3 — dedicated auth surfaces keep the eager client", () => {
  for (const page of ["app/auth/signin/page.tsx", "app/auth/callback/page.tsx"]) {
    it(`${page} still imports the client statically`, () => {
      const src = readFileSync(path.join(REPO, page), "utf8");
      expect(src).toMatch(/from\s+['"]@\/lib\/supabase\/client['"]/);
    });
  }
});
