import 'server-only';

import Link from 'next/link';
import { trackingStatusFor, trackingLineFor } from '@/lib/demoState';
import { MoversPanel } from '@/components/dashboard/MoversPanel'; // LIVE-TODAY: the live Top Winners / Losers / Movers view
import { IndexStripPanel } from '@/components/dashboard/IndexStripPanel'; // INDEXSTRIP: the NIFTY 50 / SENSEX strip (FD-32)
import { livePickFace } from '@/lib/movers/presentation'; // TODAY-FULL: the live Stock of the Day's rendered face
import { verdictsRowText } from '@/lib/verdicts/presentation'; // TODAY-VERDICTS: the verdicts row's ONE face owner
import type { MoversSnapshot } from '@/lib/movers/types';
import type { IndexStripSnapshot } from '@/lib/markets/indexStrip'; // INDEXSTRIP: the strip's snapshot type
import type { TrackingState, VerdictsTodayFace } from '@/lib/verdicts/types';

/** TODAY-MOVERS: the news state the page hands the panel — the
 *  aggregation's top item (source + age disclosed), or null when the
 *  feed returned nothing in its freshness window. */
export interface TodayLatestNews {
  headline: string;
  source: string;
  minutesAgo: number;
}

/**
 * DEMO-4 (founder order, 2026-10-12): the dashboard's "Today" view with
 * an HONEST empty state. LIVE-TODAY (founder order, 2026-10-13): "make
 * the site live. make sure today page on dashboard is fully working.
 * Also add top 5 losers and top 5 winner stocks on dashboard. use
 * Unofficial data scrapers." NSEPERM/TODAY-FULL (founder order,
 * 2026-10-14: "finish and tune it to world class now that we have
 * permission … make sure the full today panel is populated on
 * dashboard") — the panel's rows now render LIVE market state:
 *
 *   - the three movers lists (Winners / Losers / Movers — the
 *     MoversPanel, NSE's licensed endpoint first, the quote-cache
 *     computation behind it, each row source + as-of stamped);
 *   - Stock of the Day: TODAY-FULL — the LIVE pick (the session's
 *     most-traded stock by value, from the same gated pool, disclosed
 *     pool size, per-figure provenance). A raw market fact, NOT a
 *     verdict: no score, no rishi commentary, no advice (P0-1/P0-8
 *     clean — the same raw-display class as the movers rows). The
 *     seed-derived verdict-gated pick this row used to render (and its
 *     N3 banner) is retired HERE only; the ranked trio's own SOD card
 *     in DashboardTail keeps its honest seed-gated semantics;
 *   - verdicts produced today: TODAY-VERDICTS (founder order,
 *     2026-10-14) — the verdicts LEDGER's real state (migration 036):
 *     the count produced today on live fundamentals, the latest
 *     verdict with its data-quality class and transport, the disclosed
 *     candidate set. The empty state keeps the P0-1 honesty (nothing
 *     produced → nothing claimed);
 *   - news: TODAY-MOVERS: the live RSS aggregation's ACTUAL state
 *     (lib/news/server — the ONE source the /api/news route also
 *     serves). The real latest headline (publisher · age) when the feed
 *     returned one; the founder's honest empty wording ("No headlines
 *     yet") when it did not — the row reflects the feed, never a
 *     static claim;
 *   - forward-return tracking: TODAY-VERDICTS — the calibration
 *     track's state derives from the SAME ledger (baselines recorded
 *     per produced verdict): "not started" (DEMO-2, lib/demoState)
 *     until the first baseline lands, then the honest started state
 *     (start date + baseline count + when forward returns become
 *     measurable). One state source (the ledger), one wording source
 *     (lib/demoState) — shared with the methodology page.
 *
 * SERVER component — zero first-load JS (the C9 pairing for the demo LCP
 * budget, ENG-3). The IST date renders from the ISR-baked render time
 * (deterministic per regeneration, the same class as the SOD pick — the
 * page revalidates every 60 s, so the date rotates within a minute of
 * IST midnight).
 */
export function TodayPanel({
  movers,
  latestNews,
  verdicts,
  tracking,
  indices,
}: {
  movers: MoversSnapshot | null;
  latestNews: TodayLatestNews | null;
  verdicts: VerdictsTodayFace | null;
  tracking: TrackingState | null;
  indices: IndexStripSnapshot | null;
}) {
  const istDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const pick = movers?.pick ? livePickFace(movers.pick) : null;

  return (
    <section
      data-today-panel
      className="card-unified"
      style={{
        padding: 20,
        marginTop: 24,
        border: "1px solid rgba(212,175,55,0.2)",
      }}
      aria-label="Today"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--accent-gold)", margin: 0 }}>Today</h2>
        <span data-today-date style={{ fontSize: 12, color: "var(--text-muted)" }}>{istDate} IST</span>
      </div>

      {/* LIVE-TODAY: the live market view — Top 5 Winners / Top 5 Losers /
          Top 5 Movers, every row source + as-of stamped (FD-15 wording),
          the derivation line disclosing how the list was produced. */}
      {/* INDEXSTRIP (FD-32): the NIFTY 50 / SENSEX strip — per-row source
          and as-of stamped (the founder's "Source: BSE" requirement), the
          honest empty slot when a leg has no observation. */}
      <IndexStripPanel indices={indices} />

      <MoversPanel movers={movers} />

      <div style={{ display: "grid", gap: 8, marginTop: 14, fontSize: 13, lineHeight: 1.6 }}>
        {/* TODAY-FULL: the LIVE Stock of the Day — the session's
            most-traded stock by value. Real market data, disclosed pool
            and provenance, explicitly NOT a verdict (the ranked trio's
            seed-gated SOD semantics live in DashboardTail, untouched). */}
        {pick && movers?.pick ? (
          <div data-today-sod-row>
            <span style={{ color: "var(--text-secondary)" }}>Stock of the Day: </span>
            {pick.href ? (
              <Link
                href={pick.href}
                data-today-sod
                style={{ color: "var(--accent-gold)", textDecoration: "none", fontWeight: 600 }}
              >
                {pick.symbol}
              </Link>
            ) : (
              <span data-today-sod style={{ color: "var(--accent-gold)", fontWeight: 600 }}>
                {pick.symbol}
              </span>
            )}
            <span style={{ color: "var(--text-muted)" }}>
              {" — "}
              {pick.name ?? "untracked symbol"} · {pick.priceText} {pick.changeText} · {pick.turnoverText} traded
              today — the session&apos;s most-traded stock by value (live market data, not a verdict)
            </span>
            <span
              data-today-sod-attribution
              style={{ display: "block", fontSize: 10.5, color: "var(--text-muted)" }}
            >
              {pick.attribution} · top of {movers.pick.universeObserved} tracked symbols with today&apos;s
              session data
            </span>
          </div>
        ) : (
          <div data-today-sod-empty style={{ color: "var(--text-muted)" }}>
            Stock of the Day: — no live pick yet (today&apos;s session has not produced ranked market data;
            nothing is estimated in the meantime)
          </div>
        )}

        {/* TODAY-VERDICTS: the verdicts row renders the LEDGER's real
            state — the count produced today on live fundamentals (the
            P0-1 gate refuses seed-mixed records upstream, so a rendered
            verdict is live/delayed by construction), the latest verdict
            with its class and transport, the disclosed candidate set.
            Empty ledger → the honest P0-1 wording, nothing estimated. */}
        {verdicts && verdicts.count > 0 ? (
          <div data-today-verdicts-row style={{ color: "var(--text-muted)" }}>
            Verdicts produced today:{" "}
            <strong style={{ color: "var(--text-secondary)" }} data-today-verdicts-count>
              {verdicts.count}
            </strong>{" "}
            — {verdictsRowText(verdicts)}
          </div>
        ) : (
          <div data-today-verdicts-empty style={{ color: "var(--text-muted)" }}>
            Verdicts produced today: <strong style={{ color: "var(--text-secondary)" }}>none</strong> — the record set is
            illustrative seed data, so no Rishi verdicts are produced (P0-1); the honest record renders on every stock page.
          </div>
        )}

        {/* TODAY-MOVERS: the news row renders the live aggregation's
            ACTUAL state — the real headline (source + age) when the feed
            returned one, the founder's honest empty wording when it did
            not. Both states link to /news. */}
        {latestNews ? (
          <div style={{ color: "var(--text-muted)" }}>
            News:{" "}
            <Link href="/news" style={{ color: "var(--text-secondary)", textDecoration: "underline", textDecorationColor: "rgba(148,163,184,0.6)", textUnderlineOffset: 2 }}>
              {latestNews.headline}
            </Link>{" "}
            <span style={{ color: "var(--text-muted)" }}>
              — {latestNews.source} · {latestNews.minutesAgo < 60 ? `${latestNews.minutesAgo} min ago` : `${Math.floor(latestNews.minutesAgo / 60)} h ago`}
            </span>
          </div>
        ) : (
          <div style={{ color: "var(--text-muted)" }}>
            News: <Link href="/news" style={{ color: "var(--text-secondary)", textDecoration: "underline", textDecorationColor: "rgba(148,163,184,0.6)", textUnderlineOffset: 2 }}>No headlines yet</Link>{" "}
            — the live feed returned nothing in its freshness window.
          </div>
        )}

        {/* TODAY-VERDICTS: the tracking row derives from the SAME ledger
            the verdicts row reads (one state source): the not-started
            literal until the first baseline is recorded, the honest
            started state after — the wording is owned by lib/demoState
            (one wording source, shared with the methodology page). */}
        <div style={{ color: "var(--text-muted)" }}>
          Forward-return tracking:{" "}
          <strong data-tracking-status style={{ color: "var(--text-secondary)" }}>
            {trackingStatusFor(tracking)}
          </strong>{" "}
          ({trackingLineFor(tracking)}) —{" "}
          <Link href="/methodology" style={{ color: "var(--text-secondary)", textDecoration: "underline", textDecorationColor: "rgba(148,163,184,0.6)", textUnderlineOffset: 2 }}>methodology</Link> carries the
          same line; forward-return measurements begin after the next session close.
        </div>
      </div>
    </section>
  );
}
