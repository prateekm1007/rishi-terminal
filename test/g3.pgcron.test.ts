/**
 * G3 (founder round 23) — the pg_cron warmer registration artifact.
 *
 * Pins migration 029 to the warmer contract so the registration cannot
 * drift from the endpoint it calls or the workflow schedule it mirrors:
 *   1. jobname 'quotes-warm'; schedule IDENTICAL to the GitHub
 *      workflow's cron (the two must not diverge silently);
 *   2. the command POSTs all 6 slices of the SAME endpoint the
 *      workflow calls, paced with pg_sleep(75), positional-args
 *      http_post (the pg_net 0.20 form the live job needed three
 *      wire-level fixes to reach);
 *   3. the bearer is a PLACEHOLDER — no literal secret may appear
 *      (rule 34; gitleaks is the second net);
 *   4. the registration is idempotent (unschedule before schedule —
 *      never a duplicate scheduler) and fails closed without pg_cron
 *      (the to_regnamespace guard);
 *   5. the CI harness provides the cron stub the migration needs,
 *      and the PR carries the approval gate + the proposed rule-32
 *      amendment text (evidence file) WITHOUT touching CONSTITUTION.md.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO = path.resolve(__dirname, "..");
const MIGRATION = readFileSync(
  path.join(REPO, "lib/db/migrations/029_warmer_pg_cron.sql"), "utf8");
const HARNESS = readFileSync(path.join(REPO, "scripts/ci/pg_harness.sql"), "utf8");
const WORKFLOW = readFileSync(
  path.join(REPO, ".github/workflows/quotes-warm.yml"), "utf8");
const EVIDENCE = readFileSync(
  path.join(REPO, "docs/evidence/round23/g3-scheduler-verification.md"), "utf8");
const CONSTITUTION = readFileSync(path.join(REPO, "CONSTITUTION.md"), "utf8");

const SCHEDULE = "7-52/15 3-10 * * 1-5";

describe("G3 — the pg_cron warmer registration artifact (migration 029)", () => {
  it("registers exactly the quotes-warm job on the workflow's schedule (no drift)", () => {
    expect(MIGRATION).toContain("cron.unschedule('quotes-warm')");
    expect(MIGRATION).toContain("'quotes-warm'");
    expect(MIGRATION).toContain(`'${SCHEDULE}'`);
    const wf = WORKFLOW.match(/cron:\s*"([^"]+)"/);
    expect(wf, "the workflow must declare its cron schedule").not.toBeNull();
    expect(wf![1]).toBe(SCHEDULE);
  });

  it("POSTs all 6 slices of the warmer endpoint, paced like the workflow", () => {
    for (let k = 0; k < 6; k++) {
      expect(MIGRATION).toContain(`?slice=${k}&of=6'`);
    }
    expect(MIGRATION.match(/pg_sleep\(75\);/g)?.length).toBe(5);
    expect(MIGRATION).toContain("https://rishi-terminal.vercel.app/api/ingest/quotes-warm");
    // pg_net 0.20 positional form: (url, body, params, headers, timeout)
    expect(MIGRATION).toMatch(/NULL::jsonb,\s*'\{"Authorization":/);
    expect(MIGRATION).toContain("120000);");
  });

  it("carries ONLY a placeholder bearer — no literal secret (rule 34)", () => {
    const placeholders = MIGRATION.match(/Bearer <QUOTES_WARM_SECRET>/g);
    expect(placeholders?.length).toBe(6);
    // A real bearer token would look like a long opaque string after
    // 'Bearer ' — none may appear anywhere in the migration.
    expect(MIGRATION.match(/Bearer\s+[A-Za-z0-9_\-\.]{8,}(?![>])/g) ?? []).toEqual([]);
  });

  it("is idempotent (unschedule before schedule) and fails closed without pg_cron", () => {
    const unschedulePos = MIGRATION.indexOf("cron.unschedule('quotes-warm')");
    const schedulePos = MIGRATION.indexOf("cron.schedule(");
    expect(unschedulePos).toBeGreaterThan(-1);
    expect(schedulePos).toBeGreaterThan(unschedulePos);
    expect(MIGRATION).toContain("to_regnamespace('cron') IS NULL");
    expect(MIGRATION).toMatch(/RAISE EXCEPTION '029 requires the pg_cron extension/);
  });

  it("the CI harness provides the cron stub the migration needs", () => {
    expect(HARNESS).toContain("CREATE SCHEMA IF NOT EXISTS cron");
    expect(HARNESS).toContain("CREATE TABLE IF NOT EXISTS cron.job");
    expect(HARNESS).toMatch(/FUNCTION cron\.schedule\(p_jobname text, p_schedule text, p_command text\)/);
    expect(HARNESS).toMatch(/FUNCTION cron\.unschedule\(p_jobname text\)/);
    // The stub STORES commands; it must not execute them (no EXECUTE of
    // the command text anywhere in the harness).
    expect(HARNESS).not.toMatch(/EXECUTE\s+(p_command|NEW\.command|command)/i);
  });

  it("the approval gate and rule-32 amendment are recorded WITHOUT amending the constitution", () => {
    // The evidence file carries the gate and the exact proposed text...
    expect(EVIDENCE).toContain("APPROVED: pg_cron");
    expect(EVIDENCE).toContain("Rule 32a");
    // ...and the constitution itself is untouched by this artifact PR:
    // no pg_cron sanction may exist in it yet (the amendment applies
    // only after the founder's approval, in its own PR).
    expect(CONSTITUTION).not.toContain("pg_cron");
    expect(CONSTITUTION).not.toContain("Rule 32a");
  });
});
