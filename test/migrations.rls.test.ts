/**
 * N2 (round 3) — every table created by lib/db/migrations must end up
 * with ENABLE ROW LEVEL SECURITY.
 *
 * This is the static half of the defence: the CI "migrations" job
 * proves the invariants on a real Postgres (scripts/ci/rls_invariants.sql);
 * this test proves it at the source level, so a future migration that
 * adds a table without RLS fails `npx vitest run` immediately — before
 * the job even runs.
 *
 * The table list is DERIVED from the migration files (never
 * hand-written): we parse every `create table [if not exists]` and every
 * `enable row level security`, walk the migrations in filename order
 * (001 → 010 → …) and require every created table to be RLS-enabled by
 * the end of the chain. An explicit allow-list with a written reason is
 * the only escape hatch (Constitution 23: no silent exceptions).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve(__dirname, "../lib/db/migrations");

/**
 * Tables that are knowingly created without RLS. Each entry needs a
 * reason and a migration that will fix it. Empty as of 010 — N2 closed
 * the last four gaps (financial_annual, ingestion_log, rishi_snapshots,
 * signal_history).
 */
const RLS_EXEMPT: Record<string, string> = {};

function readMigrations(): { file: string; sql: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((file) => ({ file, sql: readFileSync(path.join(MIGRATIONS_DIR, file), "utf8") }));
}

function stripSqlComments(sql: string): string {
  // Remove `-- line` comments so commented-out DDL is not parsed as real.
  return sql.replace(/--[^\n]*/g, "");
}

function createdTables(sql: string): string[] {
  const out: string[] = [];
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) out.push(m[1].toLowerCase());
  return out;
}

function rlsEnabledTables(sql: string): string[] {
  const out: string[] = [];
  const re = /alter\s+table\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+enable\s+row\s+level\s+security/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) out.push(m[1].toLowerCase());
  return out;
}

function rlsDisabledTables(sql: string): string[] {
  const out: string[] = [];
  const re = /alter\s+table\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+disable\s+row\s+level\s+security/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) out.push(m[1].toLowerCase());
  return out;
}

describe("N2 — migrations leave no table without row-level security", () => {
  it("the migrations folder is non-empty and parsable", () => {
    const migrations = readMigrations();
    expect(migrations.length).toBeGreaterThanOrEqual(10);
    // The audited chain must be present, in order, by filename.
    const expected = [
      "001_initial_schema.sql",
      "002_supabase_auth.sql",
      "003_automation_schema.sql",
      "004_financial_quarters.sql",
      "005_chat_usage.sql",
      "006_score_engine_version.sql",
      "007_grant_tier_rpc.sql",
      "008_chat_usage_atomic.sql",
      "009_phase6_provider_cache.sql",
      "010_rls_hardening.sql",
    ];
    expect(migrations.map((m) => m.file)).toEqual(expect.arrayContaining(expected));
    for (const { sql } of migrations) {
      expect(typeof sql).toBe("string");
      expect(sql.length).toBeGreaterThan(0);
    }
  });

  it("every created table has ENABLE ROW LEVEL SECURITY by the end of the chain", () => {
    const enabled = new Set<string>();
    const disabled = new Set<string>();
    const created = new Set<string>();

    for (const { file, sql } of readMigrations()) {
      const clean = stripSqlComments(sql);
      for (const t of createdTables(clean)) created.add(t);
      for (const t of rlsEnabledTables(clean)) enabled.add(t);
      for (const t of rlsDisabledTables(clean)) disabled.add(t);
      // This simple model assumes tables are never dropped (verified by
      // the assertion below), so the enabled-set only ever grows.
      expect(/drop\s+table\b/i.test(sql), `${file} must not DROP TABLE (breaks the RLS model here)`).toBe(false);
    }

    expect(disabled.size, "no migration may DISABLE RLS").toBe(0);

    const missing: string[] = [];
    for (const t of created) {
      if (!enabled.has(t) && !(t in RLS_EXEMPT)) missing.push(t);
    }
    expect(
      missing,
      `tables created without ENABLE ROW LEVEL SECURITY (add RLS in the same migration, or extend RLS_EXEMPT with a written reason): ${missing.join(", ")}`,
    ).toEqual([]);

    // The allow-list must not go stale: every entry refers to a real table.
    for (const t of Object.keys(RLS_EXEMPT)) {
      expect(created.has(t), `RLS_EXEMPT entry '${t}' matches no created table`).toBe(true);
    }
  });

  it("N2 hardening migration 010 covers the four audited tables", () => {
    const files = readMigrations();
    const n2 = files.find((f) => f.file.startsWith("010_"));
    expect(n2, "lib/db/migrations/010_rls_hardening.sql exists").toBeDefined();
    const sql = stripSqlComments(n2!.sql);
    for (const t of ["financial_annual", "ingestion_log", "rishi_snapshots", "signal_history"]) {
      expect(
        rlsEnabledTables(sql).includes(t),
        `010 enables RLS on ${t}`,
      ).toBe(true);
      expect(
        new RegExp(`revoke\\s+all\\s+on\\s+public\\.${t}\\s+from\\s+anon,\\s+authenticated`, "i").test(sql),
        `010 revokes direct grants on ${t} from anon and authenticated`,
      ).toBe(true);
    }
    // Append-only trigger applies to UPDATE and DELETE for every role.
    expect(/before\s+update\s+or\s+delete\s+on\s+public\.rishi_snapshots/i.test(sql)).toBe(true);
  });
});
