// lib/account/coverage.ts (L5-02) — the user-data coverage registry.
//
// EVERY public table with a user_id column must appear here (the
// enumeration test proves it by parsing lib/db/migrations/*.sql — a new
// table without coverage fails `npx vitest run test/account.delete.test.ts`,
// exactly the founder's acceptance). The same registry drives BOTH
// /api/account/export and /api/account/delete, so coverage is mechanical,
// not aspirational (Constitution 14: one source of truth).
//
// Deletion shape: every listed table is emptied by the account
// deletion through a SCHEMA-LEVEL mechanism that fires on every
// deletion path (the route deletes the auth.users row; Postgres does
// the rest) — either an FK ... ON DELETE CASCADE (directly, or via
// public.users), or, for chat_usage, the BEFORE DELETE trigger
// migration 028 added on public.users (015 had to drop its FK:
// anonymous quota identities are not auth users and cannot satisfy
// a references-auth.users constraint). The live half of the proof is
// scripts/ci/account_erasure_invariants.sql (CI migrations job); the
// static half is test/account.delete.test.ts.

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
  // 015 dropped the FK (anonymous quota identities); 028 restored
  // erasure via the users_erase_chat_usage BEFORE DELETE trigger —
  // the live CI erasure test guards this table by name.
  { table: 'chat_usage', migration: '005_chat_usage.sql', columns: '*', deletion: 'trigger-sweep-via-users' },
  { table: 'screens', migration: '024_screens.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'portfolio_imports', migration: '025_portfolio_import.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'portfolio_positions', migration: '025_portfolio_import.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'alerts_triggers', migration: '027_alerts_v2.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'alerts_events', migration: '027_alerts_v2.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'alerts_rate_limit', migration: '027_alerts_v2.sql', columns: '*', deletion: 'cascade-via-users' },
  { table: 'alerts_preferences', migration: '027_alerts_v2.sql', columns: '*', deletion: 'cascade-via-users' },
];

/** The tables the export reads (everything; the user's own rows only,
 *  decided by RLS through the user-scoped client). */
export function exportableTables(): string[] {
  return USER_DATA_TABLES.map((t) => t.table);
}
