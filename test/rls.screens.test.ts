/**
 * X3-05 (Round 14 A6) — saved screens RLS acceptance (source level).
 *
 * Roadmap acceptance: "user A cannot read/update/delete user B's
 * screens." The BEHAVIORAL proof runs on real Postgres in the CI
 * migrations job (scripts/ci/rls_invariants.sql, X3-05 blocks: two
 * simulated users, SET ROLE authenticated + request.jwt.claim.sub, the
 * cross-user SELECT/UPDATE/DELETE each RAISE). This file is the static
 * half that runs in `npx vitest run` everywhere: it proves the
 * migration ships the exact policies that make those blocks pass, and
 * that the API layer reaches Postgres through the user-scoped client —
 * never the service role — so RLS is the enforcer, not this code.
 *
 * Constitution 24 (a gate that cannot fail is theatre): the CI SQL
 * blocks were verified to fail with the policies dropped; this file's
 * assertions fail if a policy loses its auth.uid() predicate or the
 * routes switch to the admin client.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = readFileSync(
  path.join(ROOT, 'lib/db/migrations/024_screens.sql'),
  'utf8',
);

describe('X3-05 rls.screens — migration ships ownership-scoped RLS', () => {
  it('creates the screens table with a user_id column', () => {
    expect(MIGRATION).toMatch(/CREATE TABLE screens \(/i);
    expect(MIGRATION).toMatch(/user_id UUID NOT NULL REFERENCES users\(id\) ON DELETE CASCADE/i);
  });

  it('enables row level security on screens', () => {
    expect(MIGRATION).toMatch(/ALTER TABLE screens ENABLE ROW LEVEL SECURITY/i);
  });

  it('scopes SELECT to auth.uid() = user_id for authenticated only', () => {
    expect(MIGRATION).toMatch(
      /CREATE POLICY screens_select ON screens FOR SELECT TO authenticated\s+USING \(auth\.uid\(\) = user_id\)/i,
    );
  });

  it('scopes INSERT with CHECK (auth.uid() = user_id)', () => {
    expect(MIGRATION).toMatch(
      /CREATE POLICY screens_insert ON screens FOR INSERT TO authenticated\s+WITH CHECK \(auth\.uid\(\) = user_id\)/i,
    );
  });

  it('scopes UPDATE with both USING and WITH CHECK', () => {
    expect(MIGRATION).toMatch(
      /CREATE POLICY screens_update ON screens FOR UPDATE TO authenticated\s+USING \(auth\.uid\(\) = user_id\)\s+WITH CHECK \(auth\.uid\(\) = user_id\)/i,
    );
  });

  it('scopes DELETE with USING (auth.uid() = user_id)', () => {
    expect(MIGRATION).toMatch(
      /CREATE POLICY screens_delete ON screens FOR DELETE TO authenticated\s+USING \(auth\.uid\(\) = user_id\)/i,
    );
  });

  it('creates NO policy that omits the ownership predicate (fail-closed review)', () => {
    const policies = MIGRATION.match(/CREATE POLICY[^;]+;/g) ?? [];
    expect(policies.length).toBeGreaterThanOrEqual(4);
    for (const p of policies) {
      expect(p).toMatch(/auth\.uid\(\) = user_id/);
    }
  });

  it('indexes the user_id access path', () => {
    expect(MIGRATION).toMatch(/CREATE INDEX idx_screens_user ON screens\(user_id\)/i);
  });

  it('enforces one name per user', () => {
    expect(MIGRATION).toMatch(/UNIQUE \(user_id, name\)/i);
  });
});

describe('X3-05 rls.screens — the API layer never bypasses RLS', () => {
  const ROUTES = [
    'app/api/screens/route.ts',
    'app/api/screens/[id]/route.ts',
  ] as const;

  it.each(ROUTES)('%s uses the user-scoped client, never the service role', (rel) => {
    const src = readFileSync(path.join(ROOT, rel), 'utf8');
    expect(src).toMatch(/createClient\(\)/);
    expect(src).not.toMatch(/getAdminSupabase/);
    expect(src).not.toMatch(/service_role/i);
  });

  it('no route inserts/updates screens with a client-supplied user_id', () => {
    // The user_id is set by the database policy (WITH CHECK), never
    // copied from the request body — the upsert deliberately sends only
    // (name, query).
    for (const rel of ROUTES) {
      const src = readFileSync(path.join(ROOT, rel), 'utf8');
      const inserts = src.match(/\.upsert\([\s\S]{0,200}?\)/g) ?? [];
      for (const up of inserts) {
        expect(up).not.toMatch(/user_id/);
      }
    }
  });
});
