/**
 * INT-A6 substrate — the user_visit_state migration + coverage
 * registration, pinned to the pre-registration
 * (docs/intelligence/changeSince.md, "Substrate pre-registration"
 * section — committed BEFORE the migration existed).
 *
 * Fail-first: every assertion here was observed RED on a tree without
 * migration 031 / the registry entry / the CI wiring, then GREEN after
 * the implementation commit. test/account.delete.test.ts already fails
 * an unregistered user_id table mechanically; these tests pin the A6
 * exact contract on top (the exact entry, the exact migration shape,
 * the exact three-sources-one-truth wiring).
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { USER_DATA_TABLES } from "../lib/account/coverage";

const REPO = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(REPO, "lib/db/migrations");
const MIGRATION = "031_user_visit_state.sql";
const MIGRATION_PATH = path.join(MIGRATIONS_DIR, MIGRATION);

function requireMigration(): string {
  expect(
    existsSync(MIGRATION_PATH),
    `${MIGRATION} must exist in lib/db/migrations (the ONE migrations folder)`,
  ).toBe(true);
  return readFileSync(MIGRATION_PATH, "utf8");
}

describe("INT-A6 substrate — user_visit_state pre-registered contract", () => {
  it("the coverage registry carries the exact pre-registered entry", () => {
    const entry = USER_DATA_TABLES.find((t) => t.table === "user_visit_state");
    expect(
      entry,
      "user_visit_state must be registered in lib/account/coverage.ts (export + delete coverage)",
    ).toBeDefined();
    expect(entry?.migration).toBe(MIGRATION);
    expect(entry?.columns).toBe("*");
    expect(entry?.deletion).toBe("cascade-via-users");
  });

  it("migration 031 exists and sorts after 030 (one migrations folder, chain order)", () => {
    requireMigration();
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
    expect(files.indexOf(MIGRATION)).toBeGreaterThan(
      files.indexOf("030_observation_state_log.sql"),
    );
  });

  it("the migration matches the pre-registered closed schema", () => {
    const sql = requireMigration();
    expect(sql).toMatch(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?user_visit_state\s*\(/);
    // The inline cascade clause, exactly as the L5-02 end-state parser
    // requires it (no comma between user_id and REFERENCES — a 015-style
    // later DROP must never be able to silently own this clause).
    expect(sql).toMatch(/user_id UUID NOT NULL REFERENCES users\(id\) ON DELETE CASCADE/);
    expect(sql).toMatch(/symbol TEXT NOT NULL CHECK \(length\(trim\(symbol\)\) BETWEEN 1 AND 32\)/);
    expect(sql).toMatch(/last_visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/);
    expect(sql).toMatch(/created_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/);
    expect(sql).toMatch(/updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/);
    expect(sql).toMatch(/UNIQUE \(user_id, symbol\)/);
    // Pre-registered deviation from 024: NO separate user_id index —
    // the UNIQUE btree already leads with user_id.
    expect(sql).not.toMatch(/CREATE INDEX[^;]*\buser_id\s*\)/);
  });

  it("the migration uses the 024 screens RLS class exactly (user-private data)", () => {
    const sql = requireMigration();
    expect(sql).toMatch(
      /ALTER TABLE (?:public\.)?user_visit_state ENABLE ROW LEVEL SECURITY/,
    );
    for (const pol of ["select", "insert", "update", "delete"]) {
      expect(
        sql,
        `missing policy user_visit_state_${pol}`,
      ).toMatch(
        new RegExp(
          `CREATE POLICY user_visit_state_${pol} ON (?:public\\.)?user_visit_state FOR ${pol.toUpperCase()} TO authenticated`,
          "i",
        ),
      );
    }
    const policyBlock = sql.slice(sql.indexOf("ENABLE ROW LEVEL SECURITY"));
    const scoped = (policyBlock.match(/auth\.uid\(\) = user_id/g) ?? []).length;
    expect(scoped, "all four policies must be user-scoped").toBeGreaterThanOrEqual(4);
    // updated_at maintenance reuses 024's touch_updated_at — the
    // function is defined ONCE in the chain (rule 14: one definition).
    expect(sql).toMatch(
      /CREATE TRIGGER user_visit_state_touch_updated_at\s+BEFORE UPDATE ON (?:public\.)?user_visit_state\s+FOR EACH ROW EXECUTE FUNCTION touch_updated_at\(\)/,
    );
    expect(sql).not.toMatch(/CREATE (?:OR REPLACE )?FUNCTION touch_updated_at/);
  });

  it("the live CI L5-02 array includes the table (three sources, one truth)", () => {
    const invariants = readFileSync(path.join(REPO, "scripts/ci/rls_invariants.sql"), "utf8");
    const m = invariants.match(/L5_02_EXPECTED\s+text\[\]\s*:=\s*array\[([^\]]*)\]/);
    expect(m, "the L5-02 block must declare its expected-table array").not.toBeNull();
    const sqlList = (m?.[1] ?? "")
      .split(",")
      .map((s) => s.trim().replace(/^'|"|'$/g, ""))
      .filter(Boolean);
    expect(sqlList).toContain("user_visit_state");
  });

  it("the live erasure invariant fixtures the table (G1)", () => {
    const invariantSql = readFileSync(
      path.join(REPO, "scripts/ci/account_deletion_invariants.sql"),
      "utf8",
    );
    expect(invariantSql).toContain("user_visit_state");
    expect(invariantSql).toMatch(/INSERT INTO user_visit_state \(user_id, symbol\)/);
  });

  it("rls_invariants.sql carries the behavioral RLS block for the table (X3-05 style)", () => {
    const invariants = readFileSync(path.join(REPO, "scripts/ci/rls_invariants.sql"), "utf8");
    expect(invariants).toMatch(/X3-05b: user_visit_state/);
  });

  it("enumeration positive control: the migration parses as a user_id table the registry covers", () => {
    const sql = requireMigration();
    const createRe = /CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(/g;
    let found: string | null = null;
    let m: RegExpExecArray | null;
    while ((m = createRe.exec(sql)) !== null) {
      const rest = sql.slice(m.index + m[0].length);
      const end = rest.search(/\n\);/);
      if (end === -1) continue;
      const body = rest.slice(0, end);
      if (/^\s*user_id\s+(?:UUID|uuid|TEXT|text)\b/m.test(body)) found = m[1];
    }
    expect(found).toBe("user_visit_state");
    expect(USER_DATA_TABLES.map((t) => t.table)).toContain("user_visit_state");
  });
});
