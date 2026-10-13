# Round 56 — PROMPTFOO-CI: the grounded-answers regression eval (CI only)

Founder order (13 Oct 2026): "Next: queued builds — … promptfoo CI scaffold …"
Adoption record: docs/evidence/round55/r55-batch2-adoption-record.md (tier-1 row 6:
"Adopt, CI only (founder condition). Org watch: promptfoo is now part of OpenAI —
re-check the org before each upgrade. Next build: regression evals for grounded
answers + the verifier (stage 4)").

## CI-only, zero spend (the founder's condition, by construction)

- promptfoo NEVER enters package.json — the workflow pins the version
  (`npx --yes promptfoo@0.119.6`), so no runtime dependency exists and none can
  drift in. A dependency-free eval cannot become a runtime surface.
- The provider is the REPO'S OWN VERIFIER: scripts/ci/promptfoo/verifierProvider.ts
  runs lib/ai/evidence.validateGrounding / buildDeterministicVerifiedSurface over
  fixture payloads through tsx (--conditions react-server, the repo's script
  convention). No network, no API key, no model call — the A4 no-model-surface pin
  is untouched.
- Org watch recorded: the workflow header repeats the condition (re-check the
  promptfoo org — now part of OpenAI — before each version bump).

## What the eval gates (the stage-4 contract)

7 cases in scripts/ci/promptfoo/promptfooconfig.yaml:
1. a fully assertion-backed claim grounds; verifiedAnswer is the SERVER-GENERATED
   statement "roe = 12 percent — live (observed/as-of 2026-09-30)" (the model's
   prose never enters the surface);
2. a fabricated evidence id fails closed (grounded=false, empty verifiedAnswer,
   rejection recorded);
3. an unsupported figure (value mismatch) is rejected;
4. evidenceIds alone NEVER ground — mode "context-only" (G3);
5. signed prose with unsigned numbers never grounds (L2 anti-upgrade);
6. the deterministic surface renders one verified statement per typed fact;
7. no typed facts -> the honest null surface (never a fabricated answer).

## Proof (raw outputs in this directory)

- promptfoo-green.txt — `npx --yes promptfoo@0.119.6 eval -c
  scripts/ci/promptfoo/promptfooconfig.yaml --no-cache`: Successes 7, Failures 0,
  Errors 0, Pass Rate 100.00% (exit 0).
- promptfoo-bite-red.txt — the rule-24 bite proof: with the provider deliberately
  laundering grounded states (grounded=true, verifiedAnswer="laundered"), the same
  eval fails 4/7 (Successes 3, Failures 4, Pass Rate 42.86%, exit 1) — the
  fail-closed legs (fabricated id, context-only, anti-upgrade, mismatch) catch it.
  Restored: 7/7 again.

## Workflow

.github/workflows/evals-promptfoo.yml — a SEPARATE file (no ci.yml collision;
B-23 hygiene), paths-filtered to the scaffold + lib/ai/evidence.ts +
itself, with workflow_dispatch. Node 22 (the repo's CI version), npm ci, the
pinned eval command.
