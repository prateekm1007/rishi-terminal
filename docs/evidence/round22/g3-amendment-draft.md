# G3 — proposed Constitution amendment text (DRAFT for founder approval)

> Founder direction 6 (Round-22): "Write the migration and the exact proposed
> Constitution rule-32 amendment text as the PR artifact. Do not apply the
> migration or amend CONSTITUTION.md until the founder comments exactly
> `APPROVED: pg_cron` on the PR."
>
> Numbering note: Appendix A's rule 32 is the credentials rule ("Credentials
> live in two places"). The scheduler rule therefore takes the next free
> number (38) in Article V — renumber as the founder prefers at approval.
> Nothing below is committed to CONSTITUTION.md until that approval.

## Proposed Appendix A, rule 38 — Scheduled warming (Evidence: E4 acceptance 2026-10-07)

**38. Scheduled jobs are registered out-of-band, pinned in-repo, and accepted
only by pre-registered in-session batteries.** A pg_cron job whose command
carries a secret is registered once, out-of-band (rule 34 keeps the secret out
of the repo); its schedule, name, and active state are pinned by a migration so
the live registration is reconciled against the repo, and a migration must
never fabricate an inert job to look registered. A scheduler claim is accepted
only by a pre-registered battery executed while the thing it warms is actually
open: N consecutive scheduled in-session executions (manual dispatch never
counts), a freshness threshold measured over the whole universe, agreement
between the SQL count and the health surface, and positive controls. Off-hours
no-ops prove the wire path, never the schedule.
(Logic: an off-session success and a registered-but-silent job are both green
lights that mean nothing; only in-window scheduled execution can.)

## The migration artifact

`lib/db/migrations/029_quotes_warm_schedule_pin.sql` — pins
`quotes-warm` schedule `7-52/15 3-10 * * 1-5` (UTC, Mon-Fri) + active,
no-ops where pg_cron is absent (CI), never touches the secret-bearing
command, and raises a notice (never a fake job) when the job is not
registered. NOT APPLIED to production until the founder comments exactly
`APPROVED: pg_cron` on the G3 PR.
