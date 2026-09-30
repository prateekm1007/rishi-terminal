import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Migration drift guard (P0-02 reconciliation).
 *
 * 003 and 004 both carried a "create table if not exists public.financial_quarters"
 * with DIFFERENT column sets. Because "if not exists" makes the second
 * definition a silent no-op, real databases ended up with 003's shape while
 * 004 kept implying a different schema — and 004's trigger referenced a
 * column only its dead shape had, breaking every UPDATE on the live table.
 *
 * Rules enforced here:
 *  1. A table may be CREATEd in only one migration file (extra definitions
 *     must be additive ALTERs, not competing CREATEs).
 *  2. financial_quarters specifically stays single-defined (003) — the file
 *     that live databases and lib/services/ingestion.ts actually agree on.
 *  3. No migration may set a trigger whose function assigns a column
 *     (new.X = ...) that the target table does not have in any migration.
 */

const MIGRATIONS_DIR = join(__dirname, "..", "lib", "db", "migrations");
const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith(".sql")).sort();

interface CreateTable {
  file: string;
  table: string;
  columns: string[];
}

function parseCreateTables(sql: string): { table: string; columns: string[] }[] {
  const out: { table: string; columns: string[] }[] = [];
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\(([\s\S]*?)\)\s*;/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    const body = m[2];
    // top-level split (no nested parens expected in these DDLs except checks)
    const parts = body
      .replace(/\((?:[^()]*)\)/g, "") // strip constraint parens e.g. check (...)
      .split(",")
      .map(p => p.trim())
      .filter(Boolean);
    const columns = parts
      .filter(p => !/^(primary\s+key|unique|constraint|foreign\s+key|check)\b/i.test(p))
      .map(p => p.split(/\s+/)[0].toLowerCase())
      .filter(c => c && !c.startsWith("--"));
    out.push({ table: m[1].toLowerCase(), columns });
  }
  return out;
}

const all: CreateTable[] = files.flatMap(f => {
  const sql = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
  return parseCreateTables(sql).map(ct => ({ file: f, ...ct }));
});

describe("migration files define each table exactly once", () => {
  it("no table is CREATEd in two different migration files", () => {
    const byTable = new Map<string, string[]>();
    for (const ct of all) {
      byTable.set(ct.table, [...(byTable.get(ct.table) ?? []), ct.file]);
    }
    const conflicts = [...byTable.entries()].filter(([, fs]) => new Set(fs).size > 1);
    expect(conflicts).toEqual([]);
  });

  it("financial_quarters is defined once (003) and matches the live column contract", () => {
    const defs = all.filter(ct => ct.table === "financial_quarters");
    expect(defs.map(d => d.file)).toEqual(["003_automation_schema.sql"]);
    // Columns ingestQuarterly (lib/services/ingestion.ts) writes — the
    // reconciliation contract established on 2026-09-30.
    for (const col of [
      "symbol",
      "period",
      "fiscal_year",
      "fiscal_quarter",
      "quarter_end",
      "revenue",
      "net_profit",
      "opm",
      "currency",
      "source",
      "derived",
      "fetched_at",
    ]) {
      expect(defs[0].columns).toContain(col);
    }
    // 004-only dead columns must never come back for this table.
    expect(defs[0].columns).not.toContain("updated_at");
  });

  it("no trigger body assigns a column the target table lacks", () => {
    const columnsByTable = new Map<string, Set<string>>();
    for (const ct of all) columnsByTable.set(ct.table, new Set(ct.columns));

    const problems: string[] = [];
    for (const f of files) {
      const sql = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
      // create trigger <name> ... on [public.]<table> ... execute function <fn>()
      const triggerRe =
        /create\s+(?:or\s+replace\s+)?trigger\s+(\w+)[\s\S]*?on\s+(?:public\.)?(\w+)[\s\S]*?execute\s+function\s+(?:public\.)?(\w+)/gi;
      let t: RegExpExecArray | null;
      while ((t = triggerRe.exec(sql)) !== null) {
        const [, , table, fn] = t;
        // find the function body in the same or any migration file
        const fnRe = new RegExp(
          `function\\s+${fn}\\b[\\s\\S]*?begin([\\s\\S]*?)end\\s*;`,
          "i",
        );
        for (const g of files) {
          const gsql = readFileSync(join(MIGRATIONS_DIR, g), "utf8");
          const fb = fnRe.exec(gsql);
          if (!fb) continue;
          const assigns = [...fb[1].matchAll(/new\.(\w+)\s*=/gi)].map(a => a[1].toLowerCase());
          const cols = columnsByTable.get(table.toLowerCase());
          if (cols) {
            for (const a of assigns) {
              if (!cols.has(a)) {
                problems.push(`${f}: trigger on ${table} (via ${fn}) assigns missing column "${a}"`);
              }
            }
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
