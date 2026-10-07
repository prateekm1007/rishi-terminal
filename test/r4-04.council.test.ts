// R4-04 — the Rishi Council view (Round 13).
//
// Acceptance (roadmap): "for each universe stock, the 'what would change'
// values, when substituted, flip that scorer's outcome (verified by
// re-running the scorer)."
//
// The engine (lib/consensus/council.ts) reports a change path ONLY when
// its own re-run of the actual scorer crossed the pass bar — this test
// re-verifies that contract INDEPENDENTLY over the full 916 universe:
// every reported path is re-applied here and the scorer must score a
// pass; every unreported fail must be honestly marked unreachable
// (null), and a null must be TRUE (saturating ALL declared levers must
// still fail — the engine tried exactly that).
//
// Rule 21: the wiring assertions fail on the pre-R4-04 tree (no council
// module existed — file-level failure), recorded in the PR.

import { describe, it, expect } from "vitest";

import { STOCKS } from "../data/stocks";
import { runAllScorers, SCORER_REGISTRY } from "../lib/consensus/orchestrator";
import { buildCouncil, COUNCIL_PASS_BAR, SCORER_LEVERS } from "../lib/consensus/council";

const UNIVERSE = Object.values(STOCKS);

// the name→function map, built EXACTLY like the engine does: call each
// registry fn on a probe record and map by the scorer's published name.
// (NOT by index — runAllScorers SORTS its output, so verdict order ≠
// registry order; the engine's probe-based map is the correct identity.
// The acceptance test's first run used an index zip and FAILED on
// 360ONE/John Templeton — the wrong fn scored 3 — which is exactly the
// kind of false-flip this independent layer exists to catch.)
const NAME_TO_FN = (() => {
  const probe = Object.values(STOCKS)[0];
  const map = new Map<string, (s: typeof probe) => { score: number | null; name: string }>();
  for (const fn of SCORER_REGISTRY) {
    const probeVerdict = (fn as (s: typeof probe) => { score: number | null; name: string })(probe);
    map.set(probeVerdict.name, fn as never);
  }
  return map;
})();

describe("R4-04 — council structure over the universe", () => {
  it(
    "every stock's council is complete and statuses are honest",
    () => {
      for (const stock of UNIVERSE) {
        const council = buildCouncil(stock);
        const verdicts = runAllScorers(stock);

        expect(council.rows).toHaveLength(verdicts.length);
        expect(council.passCount + council.failCount + council.noVerdictCount).toBe(verdicts.length);

        for (let i = 0; i < verdicts.length; i++) {
          const row = council.rows[i];
          const v = verdicts[i];
          expect(row.name).toBe(v.name);
          if (v.score === null) {
            expect(row.status).toBe("no-verdict");
            expect(row.change).toBeUndefined();
          } else if (v.score >= COUNCIL_PASS_BAR) {
            expect(row.status).toBe("pass");
            expect(row.change).toBeUndefined();
            // a pass names its drivers
            expect(row.drivers.length).toBeGreaterThan(0);
          } else {
            expect(row.status).toBe("fail");
            expect(row.drivers.length).toBeGreaterThan(0);
            // a fail ALWAYS carries a disposition: a verified path or honest null
            expect("change" in row).toBe(true);
          }
        }
      }

      // rule 25: the raw count of honest "no lever path" rows is itself
      // evidence — the council does NOT fabricate paths it cannot verify.
    },
    300_000,
  );

  it(
    "THE ACCEPTANCE: every reported 'what would change' flips the scorer when re-run",
    () => {
      let reported = 0;
      let honestNulls = 0;

      for (const stock of UNIVERSE) {
        const council = buildCouncil(stock);
        const verdicts = runAllScorers(stock);
        const byName = new Map(verdicts.map(v => [v.name, v]));

        for (const row of council.rows) {
          if (row.status !== "fail") continue;
          const fn = NAME_TO_FN.get(row.name)!;
          const baseline = byName.get(row.name)!.score;
          expect(baseline).not.toBeNull();
          expect(baseline!).toBeLessThan(COUNCIL_PASS_BAR); // it IS a fail

          if (row.change && row.change.steps.length > 0) {
            reported++;
            // re-apply the SAME path the engine found: single step → the
            // matching lever's apply; cumulative → each lever in order
            const leverEntry = SCORER_LEVERS.find(l => l.name === row.name)!;
            if (row.change.steps.length === 1) {
              // find the lever whose describe matches the reported step
              const lever = leverEntry.levers.find(l => l.describe(stock) === row.change!.steps[0]);
              expect(lever, `engine reported a step no declared lever produced: "${row.change.steps[0]}"`).toBeTruthy();
              const flipped = fn(lever!.apply(stock)).score;
              expect(
                flipped !== null && flipped >= COUNCIL_PASS_BAR,
                `${stock.symbol} ${row.name}: reported change does not flip (got ${flipped})`,
              ).toBe(true);
            } else {
              // cumulative path: replay the engine's exact algorithm —
              // weakest-pillar-first, applied cumulatively, re-running the
              // scorer after each step. The engine reported the FIRST
              // prefix that passed, so the independent replay must pass
              // at exactly the reported length.
              const ordered = [...leverEntry.levers].sort(
                (a, b) => {
                  const va = byName.get(row.name)!.comps.find(c => c.label === a.pillar)?.v ?? 100;
                  const vb = byName.get(row.name)!.comps.find(c => c.label === b.pillar)?.v ?? 100;
                  return va - vb;
                },
              );
              let cur = stock;
              let flippedAt = -1;
              for (let i = 0; i < ordered.length; i++) {
                cur = ordered[i].apply(cur);
                const score = fn(cur).score;
                if (score !== null && score >= COUNCIL_PASS_BAR) {
                  flippedAt = i + 1;
                  break;
                }
              }
              expect(
                flippedAt === row.change.steps.length,
                `${stock.symbol} ${row.name}: engine reported a ${row.change.steps.length}-step path; ` +
                  `independent replay flipped at ${flippedAt === -1 ? "never" : flippedAt}`,
              ).toBe(true);
            }
          } else if (row.change === null) {
            honestNulls++;  // counted; summarized as evidence below
            // the engine claims NO path exists: verify saturating ALL
            // declared levers still fails (the honest-null contract)
            const leverEntry = SCORER_LEVERS.find(l => l.name === row.name)!;
            let cur = stock;
            for (const lever of leverEntry.levers) cur = lever.apply(cur);
            const score = fn(cur).score;
            expect(
              score === null || score < COUNCIL_PASS_BAR,
              `${stock.symbol} ${row.name}: marked unreachable but full saturation passes (${score})`,
            ).toBe(true);
          }
        }
      }

      // the gate must have exercised real material (not vacuous)
      expect(reported).toBeGreaterThan(0);
      // sanity: universe scale actually walked
      expect(UNIVERSE.length).toBeGreaterThan(890);
      // rule 25: the raw count of honest "no lever path" rows is itself
      // evidence — the council does NOT fabricate paths it cannot verify.
      console.log(`[r4-04] honest-null (no lever path) rows across the universe: ${honestNulls}`);
    },
    300_000,
  );

  it("every scorer with a failing verdict has a declared lever table entry (the council cannot be silent)", () => {
    const missing = new Set<string>();
    for (const stock of UNIVERSE) {
      const verdicts = runAllScorers(stock);
      for (const v of verdicts) {
        if (v.score !== null && v.score < COUNCIL_PASS_BAR) {
          if (!SCORER_LEVERS.some(l => l.name === v.name)) missing.add(v.name);
        }
      }
    }
    expect([...missing]).toEqual([]);
  }, 300_000);
});
