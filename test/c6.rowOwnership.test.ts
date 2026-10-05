/**
 * C6 (founder Round-16) — user-row ownership at the API boundary.
 *
 * The live C6 flow exposed a real defect: the screens upsert and the
 * portfolio import inserts omitted `user_id`, so RLS's WITH CHECK
 * (auth.uid() = user_id) rejected the NULL owner and the routes 500ed.
 * The tables only went live on 2026-10-05, so no earlier surface had
 * ever exercised these paths.
 *
 * This gate scans app/api/** route sources: every `.insert(` or
 * `.upsert(` whose table is a user-data table (per the L5-02 coverage
 * registry) must place `user_id` in the payload. It failed on the
 * pre-fix code and must keep failing if a future route forgets the owner.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const REPO = path.resolve(__dirname, "..");
// The user-data tables that exist on THIS tree's migrations (001-026).
// When L5-02's lib/account/coverage.ts registry merges, this list should
// be replaced by the registry import (one source of truth).
const USER_TABLES = new Set([
  "users", "alerts", "backtest_results", "badges", "fno_strategies",
  "portfolios", "transactions", "watchlist", "chat_usage", "screens",
  "portfolio_imports", "portfolio_positions",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(path.join(REPO, dir))) {
    const rel = path.join(dir, entry);
    const abs = path.join(REPO, rel);
    if (statSync(abs).isDirectory()) walk(rel, out);
    else if (entry.endsWith("route.ts")) out.push(rel);
  }
  return out;
}

describe("C6 — API routes that write user rows must carry user_id", () => {
  it("scans a non-empty route surface (positive control)", () => {
    const routes = walk("app/api");
    expect(routes.length).toBeGreaterThan(20);
  });

  it("every insert/upsert into a user-data table includes user_id in the payload", () => {
    const offenders: string[] = [];
    for (const rel of walk("app/api")) {
      const src = readFileSync(path.join(REPO, rel), "utf8");
      // Match .from('<table>') ... .insert(/.upsert( blocks in the same
      // statement (the repo's formatting keeps them within ~40 lines).
      const tableRe = /\.from\(['"](\w+)['"]\)\s*\.[\s\S]{0,1200}?\.(insert|upsert)\(/g;
      let m: RegExpExecArray | null;
      while ((m = tableRe.exec(src)) !== null) {
        const table = m[1];
        if (!USER_TABLES.has(table)) continue;
        // The payload is the object literal that follows the paren.
        const after = src.slice(m.index, m.index + 2500);
        if (!/user_id\s*:/.test(after)) {
          offenders.push(`${rel}: .from('${table}') ... .${m[2]}( without user_id`);
        }
      }
    }
    expect(offenders, `routes writing user rows without the owner column:\n${offenders.join("\n")}`).toEqual([]);
  });
});
