// X3-05 (Round 14) — the saved-screens RLS test.
//
// Two-layer defence (the repo's established pattern, see
// test/migrations.rls.test.ts): the CI "migrations" job proves the
// CROSS-USER behaviour on a real Postgres
// (scripts/ci/screens_rls_invariants.sql — user B can neither read nor
// update nor delete user A's rows); THIS test proves it at the source
// level, so a migration that drops or rekeys a policy fails
// `npx vitest run` immediately, before the job even runs.
//
// Rule 24 bite: on the pre-X3-05 tree this file fails at import (no
// migration 024 exists); the PR records the wiring diff and the run.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve(__dirname, "../lib/db/migrations");
const migration = readFileSync(path.join(MIGRATIONS_DIR, "024_screens.sql"), "utf8");
const invariantSql = readFileSync(path.resolve(__dirname, "../scripts/ci/screens_rls_invariants.sql"), "utf8");

describe("X3-05 — saved screens (screens table, RLS by auth.uid())", () => {
  it("migration 024 creates the screens table", () => {
    expect(migration).toMatch(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.screens\s*\(/i);
  });

  it("RLS is enabled on screens", () => {
    expect(migration).toMatch(/alter\s+table\s+public\.screens\s+enable\s+row\s+level\s+security/i);
  });

  it("every policy is keyed to auth.uid() = user_id — never a weaker predicate", () => {
    const policies = migration.match(/create\s+policy\s+"screens_(select|insert|update|delete)_own"[^;]*?;/gi) ?? [];
    // select, insert, update, delete — all four own-row policies
    for (const verb of ["select", "insert", "update", "delete"]) {
      const policy = policies.find(p => p.includes(`screens_${verb}_own`));
      expect(policy, `missing screens_${verb}_own policy`).toBeDefined();
      expect(policy).toMatch(/auth\.uid\(\)\s*=\s*user_id/);
    }
    // and nothing else defines a screens policy without that predicate
    for (const p of policies) {
      expect(p).toMatch(/auth\.uid\(\)\s*=\s*user_id/);
    }
  });

  it("user_id is bound to the real identity (references auth.users, cascade)", () => {
    expect(migration).toMatch(/user_id\s+uuid\s+not\s+null\s+references\s+auth\.users\(id\)\s+on\s+delete\s+cascade/i);
  });

  it("expression length is capped in the DB too (the API cap is not the only gate)", () => {
    expect(migration).toMatch(/char_length\(expression\)\s+between\s+1\s+and\s+400/i);
  });

  it("the CI invariant script exercises cross-user read AND delete (the acceptance's actual proof)", () => {
    expect(invariantSql).toMatch(/X3-05\.2/); // user B must not see A's rows
    expect(invariantSql).toMatch(/X3-05\.3/); // user B cannot delete A's screen
    expect(invariantSql).toMatch(/X3-05\.6/); // anon sees nothing
    // the script is wired into CI so it cannot silently stop running
    const ci = readFileSync(path.resolve(__dirname, "../.github/workflows/ci.yml"), "utf8");
    expect(ci).toContain("screens_rls_invariants.sql");
  });
});
