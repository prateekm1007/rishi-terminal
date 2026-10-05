/**
 * L5-02 (founder Round-16 C7) — the privacy-delete ENUMERATION test.
 *
 * Founder acceptance, verbatim: "test enumerates every public table with
 * a user_id column from information_schema and asserts each is covered by
 * export and delete; a new table without coverage fails the test."
 *
 * The vitest runner has no Postgres, so the enumeration here parses the
 * CANONICAL schema source (lib/db/migrations/*.sql — Constitution 14's
 * one-migrations-folder rule) with the same semantics an
 * information_schema query would have. The LIVE information_schema half
 * runs on the CI Postgres (scripts/ci/rls_invariants.sql, L5-02 block),
 * and this test additionally asserts that block's table list equals the
 * TypeScript registry — three sources, one mechanically-verified truth.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { USER_DATA_TABLES } from "../lib/account/coverage";

const REPO = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(REPO, "lib/db/migrations");

/** Enumerate every table created with a user_id column, migration-file
 *  by migration-file — the static equivalent of
 *  `select table_name from information_schema.columns where
 *   column_name = 'user_id' and table_schema = 'public'`. */
function enumerateUserIdTables(): Array<{ table: string; migration: string }> {
  const out: Array<{ table: string; migration: string }> = [];
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const createRe = /CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = createRe.exec(sql)) !== null) {
      const rest = sql.slice(m.index + m[0].length);
      const end = rest.search(/\n\);/);
      if (end === -1) continue;
      const body = rest.slice(0, end);
      if (/^\s*user_id\s+(?:UUID|uuid|TEXT|text)\b/m.test(body)) {
        out.push({ table: m[1], migration: file });
      }
    }
  }
  return out;
}

/** The users table itself (no user_id column — it IS the user) is
 *  covered by definition: export reads it, delete removes it. */
const EXPECTED_SELF_TABLE = "users";

describe("L5-02 — every user-data table is covered by export and delete", () => {
  it("enumerates the user_id tables (not vacuous — positive control)", () => {
    const tables = enumerateUserIdTables();
    expect(tables.length).toBeGreaterThanOrEqual(10);
    expect(tables.map((t) => t.table)).toContain("screens");
    expect(tables.map((t) => t.table)).toContain("chat_usage");
  });

  it("every enumerated table is in the coverage registry (new table without coverage FAILS)", () => {
    const registry = new Set(USER_DATA_TABLES.map((t) => t.table));
    const missing = enumerateUserIdTables().filter((t) => !registry.has(t.table));
    expect(
      missing,
      `user_id tables missing from lib/account/coverage.ts (add them so export/delete cover them): ${missing
        .map((t) => `${t.table} (${t.migration})`)
        .join(", ")}`,
    ).toEqual([]);
  });

  it("the registry has no stale entries (every entry is a real migrated table)", () => {
    const enumerated = new Set(enumerateUserIdTables().map((t) => t.table));
    enumerated.add(EXPECTED_SELF_TABLE);
    const stale = USER_DATA_TABLES.filter((t) => !enumerated.has(t.table));
    expect(stale, `registry entries that match no migrated table: ${stale.map((t) => t.table).join(", ")}`).toEqual([]);
  });

  it("every cascade claim is backed by an ON DELETE CASCADE FK in the migrations", () => {
    const allSql = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"))
      .join("\n");
    for (const entry of USER_DATA_TABLES) {
      if (entry.table === EXPECTED_SELF_TABLE) continue; // cascades from auth.users (002)
      expect(
        allSql,
        `${entry.table} claims ${entry.deletion} but no FOREIGN KEY ... ON DELETE CASCADE mentions it`,
      ).toMatch(new RegExp(`${entry.table}\\b[\\s\\S]*?REFERENCES (?:auth\\.)?users\\s*\\(id\\)\\s+ON DELETE CASCADE`, "m"));
    }
    // The account row itself: public.users cascades from auth.users.
    expect(allSql).toMatch(/ALTER TABLE users[\s\S]*?FOREIGN KEY \(id\) REFERENCES auth\.users \(id\) ON DELETE CASCADE/);
  });

  it("the export and delete routes are driven by the registry (coverage is mechanical)", () => {
    const exportRoute = readFileSync(
      path.join(REPO, "app/api/account/export/route.ts"), "utf8");
    const deleteRoute = readFileSync(
      path.join(REPO, "app/api/account/delete/route.ts"), "utf8");
    for (const route of [exportRoute, deleteRoute]) {
      expect(route).toContain("USER_DATA_TABLES");
    }
    // The export loops the registry (not a hand-picked subset).
    expect(exportRoute).toMatch(/for\s*\(const\s*\{ table \}\s*of\s*USER_DATA_TABLES\)/);
  });

  it("the CI Postgres L5-02 block lists exactly the registry tables", () => {
    const invariants = readFileSync(path.join(REPO, "scripts/ci/rls_invariants.sql"), "utf8");
    const block = invariants.slice(invariants.indexOf("L5-02:"));
    const m = block.match(/L5_02_EXPECTED\s+text\[\]\s*:=\s*array\[([^\]]*)\]/);
    expect(m, "the L5-02 invariants block must declare its expected-table array").not.toBeNull();
    const sqlList = (m?.[1] ?? "")
      .split(",")
      .map((s) => s.trim().replace(/^'|"|'$/g, ""))
      .filter(Boolean)
      .sort();
    const registryList = USER_DATA_TABLES.map((t) => t.table).sort();
    expect(sqlList).toEqual(registryList);
  });
});
