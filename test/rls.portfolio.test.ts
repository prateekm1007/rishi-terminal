/**
 * X3-07 (Round 14 A6) — portfolio RLS acceptance (source level).
 *
 * Roadmap acceptance: "RLS on all tables" (portfolio_imports,
 * portfolio_positions). The BEHAVIORAL proof runs on real Postgres in
 * the CI migrations job (scripts/ci/rls_invariants.sql X3-07 blocks);
 * this file pins the migration's policies and the route layer's client
 * choice, and fails if either regresses.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = readFileSync(
  path.join(ROOT, 'lib/db/migrations/025_portfolio_import.sql'),
  'utf8',
);

describe('X3-07 rls.portfolio — migration ships ownership-scoped RLS on both tables', () => {
  const TABLES = ['portfolio_imports', 'portfolio_positions'] as const;

  it.each(TABLES)('%s: created with user_id FK + RLS enabled + user index', (t) => {
    expect(MIGRATION).toMatch(new RegExp(`CREATE TABLE ${t} \\(`, 'i'));
    expect(MIGRATION).toMatch(new RegExp(`user_id UUID NOT NULL REFERENCES users\\(id\\) ON DELETE CASCADE`, 'i'));
    expect(MIGRATION).toMatch(new RegExp(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`, 'i'));
    expect(MIGRATION).toMatch(new RegExp(`CREATE INDEX idx_${t}_user ON ${t}\\(user_id\\)`, 'i'));
  });

  it.each(TABLES)('%s: SELECT scoped by auth.uid() = user_id', (t) => {
    expect(MIGRATION).toMatch(
      new RegExp(`CREATE POLICY ${t}_select ON ${t} FOR SELECT TO authenticated\\s+USING \\(auth\\.uid\\(\\) = user_id\\)`, 'i'),
    );
  });

  it.each(TABLES)('%s: INSERT scoped by WITH CHECK (auth.uid() = user_id)', (t) => {
    expect(MIGRATION).toMatch(
      new RegExp(`CREATE POLICY ${t}_insert ON ${t} FOR INSERT TO authenticated\\s+WITH CHECK \\(auth\\.uid\\(\\) = user_id\\)`, 'i'),
    );
  });

  it.each(TABLES)('%s: DELETE scoped by USING (auth.uid() = user_id)', (t) => {
    expect(MIGRATION).toMatch(
      new RegExp(`CREATE POLICY ${t}_delete ON ${t} FOR DELETE TO authenticated\\s+USING \\(auth\\.uid\\(\\) = user_id\\)`, 'i'),
    );
  });

  it('positions are insert/delete only (no update policy — corrections re-import)', () => {
    expect(MIGRATION).not.toMatch(/CREATE POLICY portfolio_positions_update/i);
  });

  it('NO policy omits the ownership predicate (fail-closed review)', () => {
    const policies = MIGRATION.match(/CREATE POLICY[^;]+;/g) ?? [];
    expect(policies.length).toBeGreaterThanOrEqual(6);
    for (const p of policies) {
      expect(p).toMatch(/auth\.uid\(\) = user_id/);
    }
  });

  it('idempotency constraint: one import per user per content hash', () => {
    expect(MIGRATION).toMatch(/UNIQUE \(user_id, content_hash\)/i);
  });

  it('positions unique per import + symbol', () => {
    expect(MIGRATION).toMatch(/UNIQUE \(import_id, symbol\)/i);
  });
});

describe('X3-07 rls.portfolio — the API layer never bypasses RLS', () => {
  const ROUTES = [
    'app/api/portfolio/import/route.ts',
    'app/api/portfolio/summary/route.ts',
  ] as const;

  it.each(ROUTES)('%s uses the user-scoped client, never the service role', (rel) => {
    const src = readFileSync(path.join(ROOT, rel), 'utf8');
    expect(src).toMatch(/createClient\(\)/);
    expect(src).not.toMatch(/getAdminSupabase/);
    expect(src).not.toMatch(/service_role/i);
  });

  it('the import route never writes a client-supplied user_id', () => {
    const src = readFileSync(path.join(ROOT, 'app/api/portfolio/import/route.ts'), 'utf8');
    const inserts = [...src.matchAll(/\.insert\(\s*([\s\S]*?)\s*\)/g)];
    expect(inserts.length).toBeGreaterThanOrEqual(2);
    for (const m of inserts) {
      expect(m[1]).not.toMatch(/user_id\s*:/);
    }
  });
});
