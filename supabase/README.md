# supabase/

SQL migrations now live in a single canonical folder: `lib/db/migrations/`.

- `001_initial_schema.sql` — core schema + RLS (auth.uid()-keyed policies)
- `002_supabase_auth.sql` — Supabase Auth integration (T5): users.id linked to
  auth.users, handle_new_user trigger, tier write protection
- `003_automation_schema.sql` — nightly automation tables (was
  supabase/automation_schema.sql)
- `004_financial_quarters.sql` — financial_quarters standalone (was
  supabase/financial_quarters.sql; note this table is also defined inside
  003 — see PR drift notes)

Known drift, recorded during reconciliation: `financial_quarters` is defined
in BOTH 003 (line 4) and 004 (line 7). Both use `create table if not exists`,
and 003 is the fuller definition (extra columns: gross_profit,
operating_income, net_margin, ebitda, currency, source, derived). Apply 003
first; 004 is kept only as a record of the standalone script that was run on
the live project. The live database's applied state could not be verified
from this environment (no Supabase credentials) — founder action.
