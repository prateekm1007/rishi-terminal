// lib/account/coverage.ts (L5-02) — the user-data coverage registry.
//
// EVERY public table with a user_id column must appear here (the
// enumeration test proves it by parsing lib/db/migrations/*.sql — a new
// table without coverage fails `npx vitest run test/account.delete.test.ts`,
// exactly the founder's acceptance). The same registry drives BOTH
// /api/account/export and /api/account/delete, so coverage is mechanical,
// not aspirational (Constitution 14: one source of truth).
//
// Deletion shape: every listed table cascades from auth.users(id) ON
// DELETE CASCADE (directly, or via public.users) — the delete route
// removes the auth user and Postgres empties every row below. The
// cascade claim is asserted per table by the test (FK clause present).

export interface UserDataTable {
  /** Table name as created in lib/db/migrations. */
  table: string;
  /** The migration file that created it (for the test's error message). */
  migration: string;
  /** Columns the export includes; '*' = all (the export is complete by
   *  construction — DPDP data-portability). */
  columns: '*';
  /** How the row disappears on account deletion. */
  deletion: 'cascade-via-users' | 'cascade-via-auth-users' | 'trigger-sweep-via-users';
}

export const USER_DATA_TABLES: UserDataTable[] = [
  { table: 'users', migration: '001_initial_schema.sql', columns: '*', deletion: 'cascade-via-auth-users' },
  { table: 'alerts', migration: '001_initial_schema.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'backtest_results', migration: '001_initial_schema.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'badges', migration: '001_initial_schema.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'fno_strategies', migration: '001_initial_schema.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'portfolios', migration: '001_initial_schema.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'transactions', migration: '001_initial_schema.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'watchlist', migration: '001_initial_schema.sql', columns: '*', deletion: 'cascade-via-users' },
  // chat_usage: the FK to auth.users was deliberately dropped by
  // migration 015 (the quota identity may be an anonymous uuidv5 of the
  // client IP, which no FK can represent). Erasure coverage is
  // re-established at the database layer by migration 028's purge
  // trigger on auth.users; the live CI erasure invariant
  // (scripts/ci/account_deletion_invariants.sql) pins the behavior, and
  // the deletion mode below names the mechanism that actually fires
  // (rule 2: names describe behavior — the FK cascade claim became
  // textually false when 015 dropped the constraint).
  { table: 'chat_usage', migration: '005_chat_usage.sql', columns: '*', deletion: 'trigger-sweep-via-users' },
  { table: 'screens', migration: '024_screens.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'portfolio_imports', migration: '025_portfolio_import.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'portfolio_positions', migration: '025_portfolio_import.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'alerts_triggers', migration: '027_alerts_v2.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'alerts_events', migration: '027_alerts_v2.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'alerts_rate_limit', migration: '027_alerts_v2.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'alerts_preferences', migration: '027_alerts_v2.sql', columns: '*', deletion: 'cascade-via-users' },
  // 031 (INT-A6): the per-user, per-symbol last-visit cursor — the
  // honest supplier of changeSince's `since` cutoff (see
  // docs/intelligence/changeSince.md). User-private data (024
  // screens-class RLS); erasure via the inline FK cascade.
  { table: 'user_visit_state', migration: '031_user_visit_state.sql', columns: '*', deletion: 'cascade-via-users' },
];

/** The tables the export reads (everything; the user's own rows only,
 *  decided by RLS through the user-scoped client). */
export function exportableTables(): string[] {
  return USER_DATA_TABLES.map((t) => t.table);
}
