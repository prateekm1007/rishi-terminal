#!/usr/bin/env node
/**
 * P0-3 production legs (C6) — run AFTER the #341 merge lands on production.
 *
 * Legs:
 *   1. Deploy gate: /api/version sha == the expected merge SHA.
 *   2. NEW-content positive controls (C6: the expected NEW content present):
 *      SBIN's RSC flight payload carries the sector-refusal insights —
 *      Greenblatt lender-formula refusal + the Buffett/Lynch field
 *      inapplicability refusals naming the Banking sector; Graham's
 *      refusal has switched from the placeholder reason to the sector
 *      reason. The pre-fix EY/ROC "Magic Formula: ROC" SBIN insight is
 *      ABSENT.
 *   3. Non-lender positive control: RELIANCE (Energy) keeps its
 *      Greenblatt EY/ROC insight in the flight payload (the gate is a
 *      no-op off the lender vocabulary).
 *   4. Regression SSR legs: /stock/RELIANCE + /stock/SBIN render the
 *      honest NO VERDICT record (P0-1 intact); /stocks 200.
 */
const EXPECTED_SHA = process.argv[2] || '';
const BASE = 'https://rishi-terminal.vercel.app';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const results = [];
  const leg = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  };

  // Leg 1 — deploy gate (poll up to ~5 min for the deploy to land).
  let sha = '';
  for (let i = 0; i < 20; i++) {
    const v = await fetch(`${BASE}/api/version`).then((r) => r.json());
    sha = v.sha || '';
    if (!EXPECTED_SHA || sha === EXPECTED_SHA) break;
    await sleep(15000);
  }
  leg('deploy: /api/version == merge SHA', sha === EXPECTED_SHA, sha);

  // Legs 2-3 — flight-payload probes.
  const sbin = await (await fetch(`${BASE}/stock/SBIN`)).text();
  const rel = await (await fetch(`${BASE}/stock/RELIANCE`)).text();

  leg(
    'SBIN flight: Greenblatt lender-formula refusal present',
    sbin.includes('does not apply to a Banking company') && sbin.includes('Magic Formula'),
  );
  leg(
    'SBIN flight: Buffett OPM inapplicability refusal present',
    sbin.includes('OPM (fields opm) is not applicable to a Banking company'),
  );
  leg(
    'SBIN flight: Lynch FCF inapplicability refusal present',
    sbin.includes('FCF (fields fcf) is not applicable to a Banking company'),
  );
  leg(
    'SBIN flight: Graham refusal switched to the sector reason',
    sbin.includes('not applicable to a Banking company') && sbin.includes('fields ca, tl, de'),
  );
  const oldEy = /Magic Formula: ROC/.test(sbin);
  leg('SBIN flight: the pre-fix EY/ROC insight ABSENT', !oldEy, oldEy ? 'still present' : '');

  leg(
    'RELIANCE flight: Greenblatt EY/ROC insight still present (non-lender positive control)',
    /Magic Formula: ROC/.test(rel),
  );

  // Leg 4 — regression SSR legs.
  leg(
    'RELIANCE SSR: honest NO VERDICT record present',
    /NO VERDICT[^\n<]{0,80}SEED/i.test(rel) || rel.includes('No verdict'),
  );
  leg(
    'SBIN SSR: honest NO VERDICT record present',
    /NO VERDICT[^\n<]{0,80}SEED/i.test(sbin) || sbin.includes('No verdict'),
  );
  const stocks = await fetch(`${BASE}/stocks`);
  leg('/stocks 200', stocks.status === 200, String(stocks.status));

  const fails = results.filter((r) => !r.ok);
  console.log(`\nTOTAL: ${results.length} legs | PASS ${results.length - fails.length} | FAIL ${fails.length}`);
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error('RUNNER ERROR:', e.message);
  process.exit(2);
});
