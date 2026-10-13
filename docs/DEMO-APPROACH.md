# DEMO-APPROACH — superseded: the founder's direction (13 October 2026)

> **STATUS: SUPERSEDED.** The option analysis below (#410, 12 Oct 2026) is
> archived as the decision record's history. The founder's 13 October
> direction supersedes it in full — **the demo record-class build is
> stopped** and will not be started. No `/demo` route, no `demo` record
> class, no fictional company, no seed-verdict surface of any kind.

## The founder's direction, verbatim (13 Oct 2026)

> "no hypothetical company, we use everything real"

> "we will tell them the truth"

And the scope sentence delivered with it:

> The investor demo uses real companies, filings-based fundamentals with
> source, page and date, and no prices.

## What this means (the binding interpretation)

1. **No fictional instrument.** Option A's `DEMO INDUSTRIES LIMITED` and
   the P0-1 `demo` record-class amendment it needed are **dead**. The
   guardrail stands unamended: seed verdicts on real companies are never
   shown, and now no fictional company is created to route around it
   either.
2. **Everything on the demo path is real.** Real companies, real filings,
   real surfaces, real labels. The demo walks the actual product — the
   same pages an investor would open the day after the demo.
3. **Fundamentals are filings-based, with full provenance.** Every
   fundamental shown on the demo path cites its source document, the page
   in that document, and the document's date. No uncited number renders;
   a value we cannot cite does not appear.
4. **No prices.** The exchange-data licence is pending, so the demo shows
   no price, no price-derived score, and no price-based verdict. The
   honest labels ("Licence pending", "no consensus exists yet") stay —
   telling the investors the truth includes telling them exactly what is
   licensed and what is not, and why.
5. **The truth is the story.** Where the product is empty, the demo shows
   the honest empty state and says so. This is the Option-B discipline
   from the archived proposal, now the whole demo — plus filings-based
   fundamentals with citations, which is new scope the archived options
   did not have.

## What the founder needs to confirm (the checkboxes)

The founder's order leaves **scope and companies pending my proposal**:

1. **Scope — what the demo walks** (my proposed default):
   search → a real company's page → the honest record with filings-based
   fundamentals (each value: source, page, date) → the Rishi roster with
   the scorer-generated formulas → the Today view → the news surface →
   the watchlist. The licence-pending labels are shown and explained in
   one sentence, not hidden.
2. **Companies — which real companies** (my proposed default): a small
   set of large caps with current English annual reports and clean filing
   trails — **RELIANCE, TCS, INFOSYS, ITC, HDFC Bank** — chosen so the
   fundamentals are all citable from public annual reports and quarterly
   results the investors in the room can recognize. The filings-based
   fundamentals for these names are built as their own verified dataset
   (each row: company, metric, value, source document, page, date) —
   that build is the round-56+ work, sized by how many companies the
   founder confirms.
3. **The demo script date** stays as scheduled: rehearsal 21 Oct, demo
   22 Oct, freeze 20 Oct 18:00 IST.

## What this supersedes, explicitly

- The §3A "demo record class that produces verdicts from seed data" —
  **stopped, not paused.** Any future verdict-display demo requires
  licensed live data (Option D's trigger), not a new record class.
- The §6 build order (13–18 Oct) — replaced by the filings-provenance
  build: the cited-fundamentals dataset + the surface that renders
  citations, sized to the confirmed company list.
- The FD-6 rider (RishiCouncil revive for the demo's flip-expand leg) —
  no longer demo-blocked; it remains a product decision on its own merit.

## Timeline on record (unchanged)

20 Oct 18:00 IST freeze; 21 Oct rehearsal; 22 Oct demo, **from main,
probe green**.

---

# ARCHIVED — the #410 proposal (12 Oct 2026), for the record

# DEMO-APPROACH — the written proposal the founder asked for by 14 October

Status: PROPOSAL — no `/demo` route is built, nothing here ships until the
founder writes the decision (the standing guardrail: "Do not build any demo
that shows seed verdicts on real companies. Build `/demo` only after your
written decision on the approach."). This document exists to make that
decision a checkbox, not an essay.

---

## 1. The ask, verbatim

> "What I need from you: 1. The demo approach. This is the critical one, and
> I need it by 14 October to keep the freeze on 20 October."

And the two guardrails that bind it:

> "Do not build any demo that shows seed verdicts on real companies."

> "9. Build /demo only after your written decision on the approach."

Timeline on record: 20 Oct 18:00 IST freeze; 21 Oct rehearsal; 22 Oct demo,
**from main, probe green**.

## 2. The constraint set (what makes this hard)

1. **No licensed market data yet.** Production carries the DELIV-2 licence
   labels ("Licence pending", 4 occurrences on /stock/SBIN at 5455fd2,
   probe-verified). Intraday quotes come from the browser-warmed cache at
   best; fundamentals are seed.
2. **P0-1: seed rows show no verdicts.** `verdictsAllowed(dq)` in
   `lib/dataQuality.ts` permits verdict surfaces only on `live` or `delayed`
   records. Every real symbol today is `seed` → every verdict surface
   renders the honest no-verdict record. This is correct product behavior,
   verified by the demo spec (6/6 green against the public URL, #403).
3. **The council interactions need verdicts to exist.** Of the five demo
   interactions, search and watchlist work fully; the verdict view shows the
   honest record; dissent-expand is unreachable on seed data (the RishiGrid
   never mounts); flip-expand targets the dead RishiCouncil view (zero
   importers — revive-or-reword is a separate open founder decision, FD-6).
4. **What DOES work end-to-end on real companies today:** search, the
   honest stock record (key metrics, peer comparison, licence labels), the
   Today view (#391), the screener on sourced ratios, watchlists, and the
   CHAT-ONLY Rishi surfaces — 20 scored personas plus Chanos, each stating
   the scorer-generated formula (#401), licence-labelled, no live-data
   claims.

## 3. The options

### Option A — one fictional instrument, fully labelled (RECOMMENDED — superseded 13 Oct)

A single hypothetical company — e.g. `DEMO INDUSTRIES LIMITED (DEMO)`, a
fictional ISIN, a fictional sector — carrying a **complete illustrative
record**: labelled fundamentals, the full 20-Rishi council verdict, pillar
breakdowns, dissent, the ranked trio. Every surface on that instrument
renders a persistent banner: **"ILLUSTRATIVE — FICTIONAL COMPANY. All
figures are invented for demonstration. Not investment advice."** The demo
path then performs all five interactions on the one instrument where they
are real code paths.

- **Honesty:** the guardrail forbids seed verdicts *on real companies*. A
  fictional company with an unmissable banner fabricates nothing — it is a
  labelled thought experiment, the same status the persona chat already
  carries. C1/C3 (label data by what it is) are satisfied by construction.
- **Requires a founder-sanctioned P0-1 amendment:** a new record class
  `demo` (not `live`, not `delayed`, not `seed`) for which
  `verdictsAllowed` returns true **only when the demo banner contract is
  pinned by tests** — the P0-1 gate for every real symbol stays untouched,
  and the demo spec gains a leg asserting that no real symbol can ever
  carry the `demo` class (a registry-checked whitelist of exactly one
  fictional symbol).
- **Build cost:** ~2 focused days inside the freeze window (record class +
  banner + one seed row + spec legs). The scoring pipeline, the council
  grid, the dissent/flip handlers all exist — this wires them to one
  clearly-marked row.
- **Risk:** the demo class is a new way to be wrong. Mitigations: the class
  is grantable only via the registry whitelist (server-side), the banner is
  pinned at the record root, and the probe gains a leg: `DEMO` banner
  present on the demo symbol, absent on every real symbol.

### Option B — the honest empty-state walkthrough (zero build)

Demo what production actually is: search a real company → the honest
no-verdict record with licence labels → the Rishi Wisdom tab's honest state
→ chat with the personas (the one fully-working surface) → the Today view →
watchlist. Exactly the path `test/demo/demo-path.spec.ts` already pins,
6/6 green against the public URL.

- **Honesty:** total. Nothing to label because nothing is claimed.
- **Cost:** zero build; the spec is the rehearsal script.
- **Risk:** it demonstrates the *integrity* of the product, not its
  *value* — the council's verdict work never appears. If the audience
  needs to see "what does a Rishi verdict look like", this option cannot
  show it.

### Option C — historical replay on a real company (NOT RECOMMENDED)

Reconstruct a well-documented historical moment for a real ticker from
public-domain sources. Rejected: it is seed verdicts on a real company with
extra steps — the guardrail's letter and spirit both bite, the sourcing
burden is real, and every figure needs a citation the demo would then have
to display.

### Option D — wait for the licence (NOT A PLAN)

If licensed live data lands before 22 Oct, options A and B both improve
automatically (the spec flips with the data contract). But the licence is
FD-blocked and outside our control; the demo cannot hinge on it.

## 4. Recommendation (superseded 13 Oct)

**A + B, one path:** the demo runs on the live site (probe green, from
main, per the standing plan), walks the REAL honest product first (search →
real company → honest record → Rishi chat → Today view → watchlist — Option
B), then switches to `DEMO INDUSTRIES` for the one thing the honest path
cannot show: the full council verdict record, dissent, and the ranked trio
— everything under the fictional-company banner (Option A). The narrative
writes itself: "this is what the product is today, honestly — and this is
what it becomes the day licensed data lands, which you can tell because the
banner disappears, not because we say so."

## 5. What the founder needs to decide (the checkboxes — superseded 13 Oct)

1. **Approve option A+B** (or pick B-only: zero build, integrity-only story).
2. **Sanction the P0-1 `demo` record-class amendment** as scoped in §3A
   (fictional-symbol whitelist, server-side grant, banner pinned, probe leg).
3. **The venue** — live site recommended (already on record); rehearsal 21 Oct.
4. **FD-6 rides along if A is approved:** the flip-expand leg needs the dead
   RishiCouncil view either revived or reworded out of the demo path —
   revive recommended (it is the most demo-worthy interaction: "every Rishi
   states what would change their mind").

## 6. If approved: the build order (13–18 Oct, inside the freeze window) — superseded 13 Oct

| Day | Work |
|-----|------|
| 13–14 Oct | The `demo` record class + registry whitelist + banner contract + RED tests |
| 14–15 Oct | The DEMO seed row (fundamentals, 20 verdicts, dissent, trio) + spec legs |
| 15–16 Oct | RishiCouncil revive (FD-6) or the reword decision applied |
| 16–17 Oct | Probe legs (banner on DEMO, absent on real symbols) + full battery |
| 18 Oct | Dry run on a preview deployment + the demo script rehearsed |
| 19 Oct | Slack; 20 Oct 18:00 IST freeze holds either way |

## 7. Fallbacks (superseded 13 Oct)

- If the founder picks B-only: no build; the rehearsal walks the existing
  spec; this document is archived as the decision record.
- If the licence lands before 22 Oct: the A+B path still works verbatim —
  the DEMO banner simply becomes the contrast that proves the real pages
  are live (licence labels gone, observation lines fresh).
- If neither A nor B is viable on the day: the 21 Oct rehearsal surfaces it
  with a day to adapt; the freeze rule (demo-path fixes only after 20 Oct)
  already anticipates this.
