# Round-46 intake — the founder's integrity & legal audit (2026-10-11)

The founder delivered a full-product audit (P0 integrity/legal, P1 methodology
and maths, P1 market data, P1 claims/copy/leaks, P1 broken states, P2 design)
with a 20-item re-audit tracker scoring 6.5/20. Directive: **read the
constitution first, English only, clear every P0 before starting new work,
send evidence (screenshots, test output, deployed commit SHAs) per fix.**

This file is the intake record: production ground truth at intake, the P0
triage, the execution order, and the escalations. The canonical program
ledger lives in `docs/INTELLIGENCE_ROADMAP.md` §6 (round-46 section).

## 1. Production ground truth at intake (rule 1 — measured, 2026-10-11 05:19Z)

```
$ curl -s https://rishi-terminal.vercel.app/api/version
{"sha":"d824ed9c970ce5ede84e7f415848a965e759cfba","now":"2026-10-11T05:19:39.441Z","node":"v24.21.0"}

$ curl -s -o /tmp/prod-stock.html -w "stock HTTP %{http_code} bytes %{size_download}" \
    https://rishi-terminal.vercel.app/stock/RELIANCE
stock HTTP 200 bytes 186406

$ grep -c "Rishi Intelligence" /tmp/prod-stock.html   → 0
$ grep -c "Resolving intelligence" /tmp/prod-stock.html → 0
```

The audit's checklist item 19 ("Rishi Intelligence resolves — ❌, shows
'Resolving intelligence…' on SBIN") was observed against the **pre-#331**
production build. The dossier segment was removed by the founder's round-45
order (PR #331, merged `d824ed9c970c`, deployed, C6-verified —
`docs/evidence/round45/c1-removal.md`); the intake probes above confirm the
current production stock page carries zero occurrences. Item 19 is MOOT on
the current deploy; no new work is owed for it.

## 2. P0 triage (the founder's numbering — permanent IDs)

| ID | Founder finding (scope) | Founder's fix direction | Status |
|---|---|---|---|
| P0-1 | Verdicts run on placeholder data the site itself calls illustrative: /stocks footer says "all fundamentals … are illustrative placeholders" beside a STRONG BUY tile (77); SBIN/RELIANCE show "v2.0 · HIGH Data" beside "illustrative seed inputs"; nearly every PE/ROE is a whole number | Add `dataQuality` (live, delayed, seed, missing). Seed rows show NO verdict, and the badge reads from that field | PENDING |
| P0-2 | Zeros scored as facts: KWALITY (0.0x PE, 0.0% ROE) scores 76; DFL 73, EASEMYTRIP 72, DISH 71, ESAFSFB/HCC/NSLNISP/RENUKA/UTKARSHBNK/WATERBASE 69; SBIN D/E 0.00 is a seed zero six Rishis pass on while Nemish Shah returns no verdict on the same input | Use null, never 0, and return no_verdict on missing inputs | PENDING |
| P0-3 | Banks scored on non-bank metrics: SBIN scored on D/E, OPM 42%, FCF, Price/NCAV 69.62x, current ratio 1.13 while the page says D/E/OPM/FCF are hidden for banks; Greenblatt methodology says it does not apply to banks, yet SBIN passes it at 66 | Add a sector gate to all 20 scorers | PENDING |
| P0-4 | Passes with missed targets: SBIN Greenblatt passes at 66 (EY 7.9% vs >10%, ROC 13.2% vs >25%); SBIN Kacholia passes at 75 (growth 24% vs >25%); RELIANCE Buffett passes at 64 (OPM 18% vs >20%); RELIANCE Kacholia passes at 68 (ROCE 16% vs >20%) | Fail these, or label them "pass with exceptions" | PENDING |
| P0-5 | Two verdicts on one page contradict: RELIANCE "Classic Value Opportunity" (70) beside "Avoid · REDUCE" (QVPS 44); SBIN "High Conviction Quality" (80) beside "Fair · HOLD" (57) | One headline verdict, with the divergence explained in one sentence | PENDING |
| P0-6 | Buy/sell wording throughout: STRONG BUY, Long/Short tags, REDUCE, Avoid, "Value Plays", "Pharma Short Mode", "Growth Trap Mode" | Use framework-fit wording such as "15+ of 20 frameworks agree". Counsel review before public launch | PENDING (counsel review = FOUNDER DECISION NEEDED, see §4) |
| P0-7 | Real people presented as sources: /rishis quote under Rakesh Jhunjhunwala's name with no source on a page calling personas fictional; /crypto "Michael Saylor philosophies"; /commodities names Jim Rogers, Rick Rule, Daniel Yergin; RELIANCE commentary "As Graham would remind us – the first rule of investing is: do not lose money" (line usually attributed to Buffett) | Remove real-name quotes and attributions, label personas "simulated", correct the attribution | PENDING |
| P0-8 | Price sourcing and "live" claims conflict: stock pages label "Delayed · Yahoo Finance (unofficial)"; disclaimers cite unofficial NSE/Yahoo endpoints; /pricing promises "live prices"; dashboard says "Observation time not disclosed" | Show a source and as-of time on every price, and drop "live" unless the data is licensed | PENDING (licensing = FOUNDER DECISION NEEDED, see §4) |

Dependency-ordered execution (one item = one PR, C7): **P0-1 → P0-2 → P0-3 →
P0-4 → P0-5 → P0-6 → P0-7 → P0-8.** P0-1 first because every later verdict
item renders through the same surfaces it gates; P0-2 before P0-3/P0-4
because the no-verdict-on-missing-inputs vocabulary is the mechanism those
gates return through. The P1/P2 items stay QUEUED behind all eight P0s per
the founder's directive; their full ledger is the founder's audit message
(cross-referenced in the PR thread of this intake) and will be worked after
the P0 program clears.

## 3. Retirement policy (rule 23) declared in advance

P0-1 changes pinned behavior: tests that assert verdict scores/labels render
from seed data will fail. They are not silently deleted — each retirement or
re-pin names the founder audit order ("P0-1: seed rows show no verdict,
2026-10-11") in its commit message and in the evidence file for that round.

## 4. Escalations (rule 31 — not coder decisions)

- **FOUNDER DECISION NEEDED (P0-6, counsel review):** the founder's audit
  says "Get counsel review before public launch, as the roadmap says."
  Counsel engagement is outside coder authority. Recommended default: keep
  the wording remediation (framework-fit, no buy/sell) unblocked and treat
  "public launch" as gated on counsel sign-off; the product remains in its
  current non-launch state until then.
- **FOUNDER DECISION NEEDED (P0-8, data licensing):** "drop 'live' unless
  the data is licensed" — the drop is founder-ordered and coder-executable
  now; re-adding any "live" claim requires proof of a license, which is a
  founder procurement decision. Recommended default: strip the claims, keep
  the honest "Delayed · <source> (unofficial)" labels with as-of times.
- Both escalations are logged here and in the intake PR thread per C10;
  unblocked work continues (C10 decision protocol).
