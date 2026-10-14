# Round 56 — RAGAS-CI: the grounded-answers faithfulness harness

Founder order (13 Oct 2026): "Next: queued builds — … ragas harness …"
Adoption record: docs/evidence/round55/r55-batch2-adoption-record.md (tier-2 row 15:
"vibrantlabsai/ragas (Apache-2.0) — faithfulness scores for grounded answers;
repo has moved org, confirm identity before adopting").

## Identity confirmation (the founder's condition — re-verified 2026-10-13)

`GET /repos/explodinggradients/ragas` -> 301 Moved Permanently -> repository id
637924634 -> `vibrantlabsai/ragas`, Apache-2.0, 16,005 stars, pushed 2026-02-24
(matches the round-55 verification). Recorded in the harness docstring.

## Honest modes (the harness never claims what it does not measure)

- `--plumbing` (the CI gate): fixture schema + support math + threshold gate over
  two fixtures — the repo-shaped verified surface (ratio 1.0, pass) and an
  unfaithful answer (ratio 0.0, MUST fail). Zero spend, stdlib-only, deterministic.
  The output line says plainly: "NOT a faithfulness measurement — no judge ran".
- `--judge`: ragas Faithfulness scaffolding (evaluate/faithfulness/
  LangchainLLMWrapper imports verified), requires RAGAS_JUDGE_API_KEY +
  RAGAS_JUDGE_MODEL; without them: BLOCKED, exit 2, no fabricated score.
- `--check-ragas`: the pinned-import gate (version + `from ragas.metrics import
  faithfulness`).

## Proof (raw outputs in this directory)

- ragas-green.txt — plumbing: all 2 fixtures pass, exit 0.
- ragas-bite-red.txt — the rule-24 bite: threshold tampered 0.5 -> 1.1, the
  faithful fixture flips to FAIL ("gate verdict fail != recorded pass"), exit 1;
  restored -> green.
- ragas-import-check.txt — the --check-ragas gate bit on its FIRST run: ragas
  0.4.3 cannot import (see below).

## BLOCKED ON UPSTREAM PACKAGING (the honest disposition, ta.js precedent)

ragas 0.4.3 AND 0.3.9 cannot complete `import ragas` against ANY installable
langchain set (verified 2026-10-13 in a clean venv):
- the chain imports langchain_community.chat_models.vertexai — present only in
  langchain-community <= 0.3.x (which pins langchain-core < 1);
- the chain imports langchain_core.exceptions.ContextOverflowError — present only
  in langchain-core >= 1.4 (probed: 1.6.10 yes, 1.4.5 yes, 1.2.0 no, 1.0.0 no).
No version pair satisfies both; ragas declares its langchain deps unpinned.
FINDING: the current ragas releases are not installable for the faithfulness
import path. The judge leg stays BLOCKED on upstream packaging; --check-ragas is
the gate that flips green the moment vibrantlabsai ships an installable release
(watch the org — the same discipline the founder set for promptfoo/OpenAI).
The CI workflow runs the plumbing gate only; no red-by-impossibility gate is
wired (that would be noise, not a gate).

## FOUNDER DECISION NEEDED (provider, not adoption)

The judge LLM for real faithfulness scores is a provider decision (FD-8 open).
Recommended default: keep the judge leg dormant until the provider-terms check
lands; the plumbing gate runs from today.
