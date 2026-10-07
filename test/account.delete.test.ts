/**
 * L5-02 (founder Round-16 C7) — the privacy-delete ENUMERATION test,
 * strengthened in G1 (founder round 23) to model the constraint and
 * trigger LIFECYCLE across the migration chain.
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
 *
 * G1 strengthening (why): the original cascade test matched a
 * `REFERENCES ... ON DELETE CASCADE` clause ANYWHERE in the concatenated
 * SQL, so migration 015's `ALTER TABLE chat_usage DROP CONSTRAINT
 * chat_usage_user_id_fkey` was invisible — the test passed vacuously
 * while live account deletion had silently stopped erasing chat_usage
 * (caught live by scripts/ci/account_deletion_invariants.sql in PR #229;
 * fixed by migration 028's SECURITY DEFINER purge trigger on auth.users).
 * The parser below walks the migrations IN ORDER and models adds AND
 * drops, so the end-state it asserts is the end-state Postgres builds —
 * the static half now fails on the same defect class the live half does.
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

interface MigrationFile {
  file: string;
  sql: string;
}

function readMigrationsInOrder(): MigrationFile[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((file) => ({ file, sql: readFileSync(path.join(MIGRATIONS_DIR, file), "utf8") }));
}

/**
 * Model the FK-cascade end-state the way Postgres builds it: walk the
 * migrations in filename order, record every FK ... ON DELETE CASCADE
 * clause that references (auth.)users(id), and remove the ones a later
 * DROP CONSTRAINT takes out. Inline CREATE TABLE FKs get Postgres's
 * default constraint name (<table>_<column>_fkey), which is how 015
 * managed to drop 005's clause by name. Within one file, events apply
 * in textual order (002 drops users_id_fkey and re-adds it a few lines
 * later — separate per-regex passes would misapply that).
 */
function liveFkCascadeTables(): Map<string, { via: string; constraint: string; migration: string }> {
  const live = new Map<string, { via: string; constraint: string; migration: string }>();
  type Event = { pos: number; apply: () => void };
  for (const { file, sql } of readMigrationsInOrder()) {
    const events: Event[] = [];
    let m: RegExpExecArray | null;
    // (a) inline: CREATE TABLE t (... user_id UUID ... REFERENCES [auth.]users (id) ON DELETE CASCADE ...)
    const createRe = /CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\);/g;
    while ((m = createRe.exec(sql)) !== null) {
      const table = m[1];
      const body = m[2];
      const pos = m.index;
      const fk = /\buser_id\s+(?:UUID|uuid|TEXT|text)\b[^,]*?REFERENCES\s+(auth\.)?users\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i.exec(body);
      if (fk) {
        const via = fk[1] ? "auth.users" : "users";
        const constraint = `${table}_user_id_fkey`;
        events.push({ pos, apply: () => live.set(table, { via, constraint, migration: file }) });
      }
    }
    // (b) explicit: ALTER TABLE t ADD CONSTRAINT name FOREIGN KEY (user_id|id) REFERENCES [auth.]users (id) ON DELETE CASCADE
    const addRe = /ALTER\s+TABLE\s+(?:public\.)?(\w+)\s*\n?\s*ADD\s+CONSTRAINT\s+(\w+)\s*FOREIGN\s+KEY\s*\(\s*(?:user_id|id)\s*\)\s*REFERENCES\s+(auth\.)?users\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/gi;
    while ((m = addRe.exec(sql)) !== null) {
      const table = m[1];
      const constraint = m[2];
      const via = m[4] ? "auth.users" : "users";
      const pos = m.index;
      events.push({ pos, apply: () => live.set(table, { via, constraint, migration: file }) });
    }
    // (c) drops: ALTER TABLE t DROP CONSTRAINT [IF EXISTS] name
    const dropRe = /ALTER\s+TABLE\s+(?:public\.)?(\w+)\s*\n?\s*DROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?(\w+)/gi;
    while ((m = dropRe.exec(sql)) !== null) {
      const table = m[1];
      const constraint = m[2];
      const pos = m.index;
      events.push({
        pos,
        apply: () => {
          for (const [t, entry] of live) {
            if (entry.constraint === constraint && (t === table || entry.constraint.startsWith(`${table}_`))) {
              live.delete(t);
            }
          }
        },
      });
    }
    events.sort((a, b) => a.pos - b.pos).forEach((e) => e.apply());
  }
  return live;
}

/**
 * Model the erasure-trigger end-state: which tables does the LIVE set
 * of BEFORE DELETE triggers on users (public.users or auth.users — the
 * 028 purge trigger lives on auth.users, the exact root GoTrue deletes)
 * sweep? Returns the swept table names (parsed from the trigger
 * functions' bodies).
 */
function liveUserDeleteSweepTables(): Set<string> {
  const swept = new Set<string>();
  const migrations = readMigrationsInOrder();
  // function name -> body (CREATE [OR REPLACE] FUNCTION ... RETURNS trigger
  // [LANGUAGE plpgsql [SECURITY DEFINER [SET search_path = x]]] AS $tag$ body $tag$)
  const fnBodies = new Map<string, string>();
  for (const { sql } of migrations) {
    const fnRe = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)\s*\([^)]*\)\s*RETURNS\s+trigger\s+LANGUAGE\s+plpgsql(?:\s+SECURITY\s+DEFINER)?(?:\s+SET\s+search_path\s*=\s*\w+)?\s+AS\s+\$(\w*)\$([\s\S]*?)\$\2\$/gi;
    let m: RegExpExecArray | null;
    while ((m = fnRe.exec(sql)) !== null) {
      fnBodies.set(m[1], m[3]);
    }
  }
  const liveTriggers = new Map<string, string>(); // trigger name -> function name
  for (const { sql } of migrations) {
    // Positional order within a file (028 DROPs its own trigger for
    // idempotency BEFORE re-creating it — per-regex passes would
    // misapply that, exactly like 002's users_id_fkey drop-and-add).
    type TrigEvent = { pos: number; apply: () => void };
    const events: TrigEvent[] = [];
    let m: RegExpExecArray | null;
    const trigRe = /CREATE\s+TRIGGER\s+(\w+)\s+BEFORE\s+DELETE\s+ON\s+(?:auth\.|public\.)?users\s+FOR\s+EACH\s+ROW\s+EXECUTE\s+FUNCTION\s+(?:public\.)?(\w+)/gi;
    while ((m = trigRe.exec(sql)) !== null) {
      const name = m[1];
      const fn = m[2];
      const pos = m.index;
      events.push({ pos, apply: () => liveTriggers.set(name, fn) });
    }
    const dropRe = /DROP\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?(\w+)\s+ON\s+(?:auth\.|public\.)?users/gi;
    while ((m = dropRe.exec(sql)) !== null) {
      const name = m[1];
      const pos = m.index;
      events.push({ pos, apply: () => liveTriggers.delete(name) });
    }
    events.sort((a, b) => a.pos - b.pos).forEach((e) => e.apply());
  }
  for (const fn of liveTriggers.values()) {
    const body = fnBodies.get(fn) ?? "";
    for (const t of body.matchAll(/DELETE\s+FROM\s+public\.(\w+)\s+WHERE\s+user_id\s*=\s*OLD\.id/gi)) {
      swept.add(t[1]);
    }
  }
  return swept;
}

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

  it("every deletion claim is backed by a LIVE mechanism at the END of the migration chain (G1: models DROP CONSTRAINT)", () => {
    const fkLive = liveFkCascadeTables();
    const swept = liveUserDeleteSweepTables();
    const problems: string[] = [];
    for (const entry of USER_DATA_TABLES) {
      if (entry.deletion === "cascade-via-users" || entry.deletion === "cascade-via-auth-users") {
        if (!fkLive.has(entry.table)) {
          problems.push(
            `${entry.table} claims ${entry.deletion} but no FK ... ON DELETE CASCADE survives the whole chain ` +
              `(a 015-style DROP CONSTRAINT counts — the original CREATE clause is not the end state). ` +
              `Restore erasure (FK, or a 028-style purge trigger + 'trigger-sweep-via-users').`,
          );
        }
      } else if (entry.deletion === "trigger-sweep-via-users") {
        if (!swept.has(entry.table)) {
          problems.push(
            `${entry.table} claims trigger-sweep-via-users but no live BEFORE DELETE trigger on users ` +
              `deletes from it (CREATE TRIGGER missing, or a later DROP TRIGGER removed it).`,
          );
        }
      } else {
        problems.push(`${entry.table} has unknown deletion mode ${String(entry.deletion)}`);
      }
    }
    expect(problems, problems.join(" | ")).toEqual([]);
  });

  it("chat_usage erasure is mechanically present (G1 explicit — the 015/028 defect class)", () => {
    // The founder named this table explicitly. It must be in the
    // registry, claimed as trigger-swept (015 dropped the FK — a
    // cascade claim is textually false against the live schema), and
    // actually swept by a live trigger (the live CI test asserts the
    // behavior itself).
    const entry = USER_DATA_TABLES.find((t) => t.table === "chat_usage");
    expect(entry, "chat_usage must stay in the coverage registry").toBeDefined();
    expect(entry?.deletion).toBe("trigger-sweep-via-users");
    expect(liveUserDeleteSweepTables().has("chat_usage"), "the live users-delete trigger set must sweep chat_usage").toBe(true);
    // And the stale FK claim is really gone live: 015's drop must be
    // the end state (the vacuous-pass trap this test used to fall into).
    expect(liveFkCascadeTables().has("chat_usage"), "chat_usage must NOT claim a live FK cascade (015 dropped it)").toBe(false);
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

  it("the LIVE CI Postgres erasure invariant is wired into CI and exercises every registry table (G1)", () => {
    const invariantSql = readFileSync(
      path.join(REPO, "scripts/ci/account_deletion_invariants.sql"), "utf8");
    const ci = readFileSync(path.join(REPO, ".github/workflows/ci.yml"), "utf8");
    // CI runs it AFTER the L5-02 equality block (its fixture-coverage
    // sweep is meaningful only once registry == live schema is proven).
    const rlsPos = ci.indexOf("scripts/ci/rls_invariants.sql");
    const erasePos = ci.indexOf("scripts/ci/account_deletion_invariants.sql");
    expect(erasePos, "the G1 live erasure invariant must be wired into the CI migrations job").toBeGreaterThan(-1);
    expect(erasePos).toBeGreaterThan(rlsPos);
    // Every registry table appears in the invariant (fixture + zero
    // assertion), chat_usage explicitly per the founder's direction.
    for (const entry of USER_DATA_TABLES) {
      expect(invariantSql).toContain(entry.table);
    }
    // The erase is the auth-user delete — the database-level effect of
    // the supported deletion mechanism (auth.admin.deleteUser).
    expect(invariantSql).toMatch(/DELETE FROM auth\.users WHERE id/);
    // The completeness sweeps are information_schema-derived live (no
    // second hand-maintained table list may exist).
    expect(invariantSql).toMatch(/information_schema\.columns/);
    // The unauthorized ugly path must include the ERASURE ROOT itself:
    // an authenticated session must not be able to delete auth.users
    // (asserted denial), not only other users' rows through RLS.
    expect(invariantSql).toMatch(/G1-ROOT/);
    // The chat_usage erasure root fix (028) exists: migration 015
    // dropped the FK (anonymous quota identities), 028 re-established
    // erasure coverage with the purge trigger on auth.users.
    const eraseMigration = readdirSync(MIGRATIONS_DIR).filter((f) => f.includes("chat_usage_erase"));
    expect(eraseMigration, "exactly one chat_usage erasure migration expected").toEqual(["028_chat_usage_erase.sql"]);
  });
});
