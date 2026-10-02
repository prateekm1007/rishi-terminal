// scripts/evalChat.ts — the eval:chat CLI harness (Coder Directions §6).
//
// Runs the deterministic golden set (test/fixtures/eval-chat/golden.ts)
// and prints a per-case + per-category matrix with an honest summary.
// Exit 1 on ANY expectation failure.
//
// Kinds executed here: grounding | tool | router (scripted fetch, no
// network, deterministic). Route-kind cases (unauthenticated / quota /
// oversized / forged-persona ugly paths) need the route handler's module
// mocks and are executed by CI in test/evalChat.golden.test.ts — this CLI
// reports them as CI-delegated, never as "passed here".
//
// Run: npm run eval:chat  (= tsx --conditions react-server scripts/evalChat.ts)

import { GOLDEN_CASES } from "../test/fixtures/eval-chat/golden";
import {
  runGroundingCase,
  runToolCase,
  runRouterCase,
  type CaseFailure,
} from "./evalChatRunner";

async function main(): Promise<number> {
  const routeCases = GOLDEN_CASES.filter(c => c.kind === "route");
  const runnable = GOLDEN_CASES.filter(c => c.kind !== "route");

  const results: Array<{ id: string; category: string; kind: string; ok: boolean; failures: CaseFailure[] }> = [];

  for (const c of runnable) {
    try {
      const failures =
        c.kind === "grounding" ? await runGroundingCase(c)
        : c.kind === "tool" ? await runToolCase(c)
        : await runRouterCase(c);
      results.push({ id: c.id, category: c.category, kind: c.kind, ok: failures.length === 0, failures });
    } catch (e) {
      results.push({
        id: c.id, category: c.category, kind: c.kind, ok: false,
        failures: [{ id: c.id, expectation: "executor", detail: e instanceof Error ? e.message : String(e) }],
      });
    }
  }

  // ── report ────────────────────────────────────────────────────────────
  const width = 76;
  console.log("=".repeat(width));
  console.log("eval:chat — golden set report (Coder Directions §6 / roadmap R4-02)");
  console.log("=".repeat(width));

  const byCategory = new Map<string, { total: number; ok: number; ci: number; fail: number }>();
  for (const r of results) {
    const b = byCategory.get(r.category) ?? { total: 0, ok: 0, ci: 0, fail: 0 };
    b.total += 1;
    if (r.ok) b.ok += 1;
    else b.fail += 1;
    byCategory.set(r.category, b);
  }
  for (const c of routeCases) {
    const b = byCategory.get(c.category) ?? { total: 0, ok: 0, ci: 0, fail: 0 };
    b.total += 1;
    b.ci += 1;
    byCategory.set(c.category, b);
  }

  let failed = 0;
  for (const r of results) {
    if (r.ok) {
      console.log(`  PASS  ${r.id.padEnd(10)} [${r.kind}/${r.category}]`);
    } else {
      failed += 1;
      console.log(`  FAIL  ${r.id.padEnd(10)} [${r.kind}/${r.category}]`);
      for (const f of r.failures) {
        console.log(`        - ${f.expectation}: ${f.detail}`);
      }
    }
  }
  for (const c of routeCases) {
    console.log(`  CI    ${c.id.padEnd(10)} [route/${c.category}] → verified by test/evalChat.golden.test.ts`);
  }

  console.log("-".repeat(width));
  console.log("Category coverage:");
  for (const [cat, b] of [...byCategory.entries()].sort((a, x) => x[1].total - a[1].total)) {
    const parts = [
      b.ok > 0 ? `${b.ok} passed here` : null,
      b.ci > 0 ? `${b.ci} CI-verified` : null,
    ].filter(Boolean);
    console.log(`  ${cat.padEnd(28)} ${b.total} case(s): ${parts.join(", ")}${b.fail > 0 ? "  ← FAILURES" : ""}`);
  }
  console.log("-".repeat(width));
  console.log(
    `Total: ${GOLDEN_CASES.length} golden cases · ` +
    `${results.length} executed here (${results.filter(r => r.ok).length} passed, ${failed} failed) · ` +
    `${routeCases.length} CI-delegated (route kinds) · ` +
    `${byCategory.size} categories`,
  );
  console.log("=".repeat(width));
  return failed === 0 ? 0 : 1;
}

main()
  .then(code => process.exit(code))
  .catch(e => {
    console.error("eval:chat crashed:", e);
    process.exit(1);
  });
