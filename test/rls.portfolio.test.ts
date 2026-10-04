// X3-07 (Round 14) — the portfolio RLS test (static layer).
//
// Same two-layer defence as test/rls.screens.test.ts: the CI "migrations"
// job proves CROSS-USER behaviour on real Postgres
// (scripts/ci/portfolio_rls_invariants.sql); this test pins the policies
// at source level so a future migration that drops one fails
// `npx vitest run` immediately.
//
// Rule 24 bite: on the pre-X3-07 tree this file fails at import (no
// migration 025 exists); recorded in the PR.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve(__dirname, "../lib/db/migrations");
const migration = readFileSync(path.join(MIGRATIONS_DIR, "025_portfolio_imports.sql"), "utf8");
const invariantSql = readFileSync(path.resolve(__dirname, "../scripts/ci/portfolio_rls_invariants.sql"), "utf8");

describe("X3-07 — portfolio tables carry RLS on all tables (acceptance)", () => {
  it("migration 025 creates both tables", () => {
    expect(migration).toMatch(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.portfolio_imports\s*\(/i);
    expect(migration).toMatch(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.portfolio_transactions\s*\(/i);
  });

  it("RLS is enabled on both tables", () => {
    const policies = migration.match(/alter\s+table\s+public\.[a-z_]+\s+enable\s+row\s+level\s+security/gi) ?? [];
    expect(policies.some(p => /portfolio_imports/i.test(p))).toBe(true);
    expect(policies.some(p => /portfolio_transactions/i.test(p))).toBe(true);
  });

  it("every select/insert/delete policy is keyed to auth.uid() = user_id", () => {
    const policies = migration.match(/create\s+policy\s+"portfolio_[a-z]+_(select|insert|delete)_own"[^;]*?;/gi) ?? [];
    for (const table of ["imports", "transactions"]) {
      for (const verb of ["select", "insert", "delete"]) {
        const policy = policies.find(p => p.includes(`portfolio_${table}_${verb}_own`));
        expect(policy, `missing portfolio_${table}_${verb}_own`).toBeDefined();
        expect(policy).toMatch(/auth\.uid\(\)\s*=\s*user_id/);
      }
    }
  });

  it("user_id references the real identity with cascade (GDPR-safe teardown)", () => {
    const refs = migration.match(/user_id\s+uuid\s+not\s+null\s+references\s+auth\.users\(id\)\s+on\s+delete\s+cascade/gi) ?? [];
    expect(refs.length).toBe(2);
  });

  it("the idempotency gate is a DB constraint too (unique per user+hash)", () => {
    expect(migration).toMatch(/unique\s*\(\s*user_id\s*,\s*source_hash\s*\)/i);
  });

  it("the CI invariant script exercises the no-op and the cross-user proof, wired into CI", () => {
    expect(invariantSql).toMatch(/X3-07\.2/); // duplicate source_hash rejected
    expect(invariantSql).toMatch(/X3-07\.3/); // user B sees/deletes nothing
    expect(invariantSql).toMatch(/X3-07\.4/); // anon sees nothing
    const ci = readFileSync(path.resolve(__dirname, "../.github/workflows/ci.yml"), "utf8");
    expect(ci).toContain("portfolio_rls_invariants.sql");
  });
});
