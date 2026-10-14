#!/usr/bin/env python3
"""scripts/ci/ragas/faithfulnessHarness.py — the grounded-answers faithfulness
harness (RAGAS-CI, round 56; the founder's batch-2 adoption record row 15:
"vibrantlabsai/ragas (Apache-2.0): faithfulness scores for grounded answers.
Repo has moved org — confirm identity before adopting").

IDENTITY (the founder's condition, re-verified 2026-10-13):
  explodinggradients/ragas -> HTTP 301 -> repository id 637924634 ->
  vibrantlabsai/ragas, Apache-2.0, 16,005 stars, pushed 2026-02-24.

HONEST MODES (C1 — the harness never claims what it does not measure):

  --plumbing (CI, default)   Fixture-driven validation of the scoring
                             plumbing with a DETERMINISTIC stand-in: the
                             answer's numeric statements are matched
                             against the contexts by exact token support.
                             This is NOT faithfulness — no judge ran. It
                             validates: fixture schema, the support math,
                             and the threshold gate (an unfaithful fixture
                             MUST fail). Exit 0 only when every check
                             holds; any regression exits 1.

  --check-ragas              Asserts the pinned ragas import surface (the
                             version the workflow installs). Catches
                             upstream interface drift — promptfoo's org
                             moved to OpenAI, ragas moved to
                             vibrantlabsai: orgs move, gates must notice.

  --judge                    Judge-backed ragas Faithfulness. BLOCKED on
                             the provider decision (FD-8 open — no judge
                             LLM is approved): requires RAGAS_JUDGE_API_KEY
                             and RAGAS_JUDGE_MODEL. Without them it prints
                             a BLOCKED line and exits 2 (never fakes a
                             score — rule 4).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"
RAGAS_PINNED = "0.4.3"
SUPPORT_THRESHOLD = 0.5

_NUMBER = re.compile(r"-?\d+(?:\.\d+)?")


def numeric_statements(answer: str) -> list[str]:
    """The deterministic stand-in's unit of measure: every number token in
    the answer is a claim that must be supported by a context."""
    return _NUMBER.findall(answer)


def support_ratio(answer: str, contexts: list[str]) -> float:
    """Exact-token support: the fraction of the answer's numeric statements
    that appear in some context. The judge-backed mode replaces this with
    ragas Faithfulness — the ratio semantics (supported/total) are the
    same, which is what makes this a valid plumbing check."""
    statements = numeric_statements(answer)
    if not statements:
        return 1.0
    corpus = "\n".join(contexts)
    supported = sum(1 for s in statements if s in corpus)
    return supported / len(statements)


def load_fixtures() -> list[dict]:
    files = sorted(FIXTURES_DIR.glob("*.json"))
    if not files:
        print(f"BLOCKED: no fixtures found in {FIXTURES_DIR}")
        sys.exit(2)
    fixtures = []
    for f in files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except Exception as e:  # noqa: BLE001 — a malformed fixture IS the failure
            print(f"FAIL: {f.name} is not valid JSON: {e}")
            sys.exit(1)
        for key in ("id", "question", "answer", "contexts", "expected"):
            if key not in data:
                print(f"FAIL: {f.name} missing required key '{key}'")
                sys.exit(1)
        fixtures.append(data)
    return fixtures


def run_plumbing() -> int:
    fixtures = load_fixtures()
    failures = 0
    for fx in fixtures:
        fx_id = fx["id"]
        ratio = support_ratio(fx["answer"], fx["contexts"])
        expected_ratio = fx["expected"].get("support_ratio")
        expected_verdict = fx["expected"].get("verdict")

        if expected_ratio is None or not isinstance(expected_ratio, (int, float)):
            print(f"FAIL: {fx_id} expected.support_ratio missing/invalid")
            failures += 1
            continue

        # The recompute must match the recorded expectation EXACTLY — a
        # change in the extraction/support math without a fixture update
        # is a regression, not a silent drift.
        if abs(ratio - float(expected_ratio)) > 1e-9:
            print(
                f"FAIL: {fx_id} support math drifted: recomputed {ratio} "
                f"!= recorded {expected_ratio}"
            )
            failures += 1
            continue

        verdict = "pass" if ratio >= SUPPORT_THRESHOLD else "fail"
        if verdict != expected_verdict:
            print(
                f"FAIL: {fx_id} gate verdict {verdict} != recorded {expected_verdict} "
                f"(ratio {ratio} vs threshold {SUPPORT_THRESHOLD})"
            )
            failures += 1
            continue

        print(f"ok: {fx_id} ratio={ratio} verdict={verdict}")

    if failures:
        print(f"plumbing: {failures} failure(s) — the gate BITES")
        return 1
    print(
        f"plumbing: all {len(fixtures)} fixtures pass (deterministic stand-in, "
        f"threshold {SUPPORT_THRESHOLD}; NOT a faithfulness measurement — no judge ran)"
    )
    return 0


def run_check_ragas() -> int:
    try:
        import importlib.metadata

        version = importlib.metadata.version("ragas")
    except Exception:  # noqa: BLE001 — PackageNotFoundError and odd installers
        print("FAIL: ragas is not installed — the workflow pins it before this check")
        return 1
    if version != RAGAS_PINNED:
        print(
            f"FAIL: ragas {version} installed, {RAGAS_PINNED} pinned — re-verify the "
            "org (vibrantlabsai) and the interface, then update BOTH pins together"
        )
        return 1
    try:
        import ragas  # noqa: F401

        from ragas.metrics import faithfulness  # noqa: F401
    except Exception as e:  # noqa: BLE001 — interface drift IS the failure
        print(f"FAIL: ragas {version} import surface drifted: {e}")
        return 1
    print(f"ragas import: OK ({version}, faithfulness metric present; org vibrantlabsai)")
    return 0


def run_judge() -> int:
    key = os_environ_get("RAGAS_JUDGE_API_KEY")
    model = os_environ_get("RAGAS_JUDGE_MODEL")
    if not key or not model:
        print(
            "BLOCKED: judge-backed faithfulness needs RAGAS_JUDGE_API_KEY and "
            "RAGAS_JUDGE_MODEL — the judge LLM is a provider decision (FD-8 open). "
            "No score is fabricated in its absence."
        )
        return 2
    try:
        from ragas import evaluate
        from ragas.llms import LangchainLLMWrapper
        from ragas.metrics import faithfulness
    except Exception as e:  # noqa: BLE001
        print(f"FAIL: ragas import surface drifted before the judge run: {e}")
        return 1
    # The judge leg lands with the provider decision (FOUNDER DECISION
    # NEEDED recorded on the workflow). The scaffolding below is the
    # documented entry point — never executed in CI today.
    print("judge mode: scaffolding present; requires the provider decision to run")
    print(f"(evaluate/faithfulness/LangchainLLMWrapper imported; judge model {model})")
    return 0


def os_environ_get(name: str) -> str | None:
    import os

    return os.environ.get(name)


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "--plumbing"
    if mode == "--plumbing":
        return run_plumbing()
    if mode == "--check-ragas":
        return run_check_ragas()
    if mode == "--judge":
        return run_judge()
    print(f"unknown mode {mode}; use --plumbing | --check-ragas | --judge")
    return 2


if __name__ == "__main__":
    sys.exit(main())
