import 'server-only';

import Link from 'next/link';
import { TRACKING_STATUS } from '@/lib/demoState';
import { MoversPanel } from '@/components/dashboard/MoversPanel'; // LIVE-TODAY: the live Top Winners / Losers / Movers view
import { livePickFace } from '@/lib/movers/presentation'; // TODAY-FULL: the live Stock of the Day's rendered face
import type { MoversSnapshot } from '@/lib/movers/types';

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
 *   - verdicts produced today: NONE — the record set is seed data (P0-1:
 *     seed rows show no verdict; the count is a literal 0, not a
 *     computed one pretending to be observed);
 *   - news: TODAY-MOVERS: the live RSS aggregation's ACTUAL state
 *     (lib/news/server — the ONE source the /api/news route also
 *     serves). The real latest headline (publisher · age) when the feed
 *     returned one; the founder's honest empty wording ("No headlines
 *     yet") when it did not — the row reflects the feed, never a
 *     static claim;
 *   - forward-return tracking: not started (DEMO-2, lib/demoState — the
 *     ONE source, shared with the methodology line).
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
}: {
  movers: MoversSnapshot | null;
  latestNews: TodayLatestNews | null;
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

        <div style={{ color: "var(--text-muted)" }}>
          Verdicts produced today: <strong style={{ color: "var(--text-secondary)" }}>none</strong> — the record set is
          illustrative seed data, so no Rishi verdicts are produced (P0-1); the honest record renders on every stock page.
        </div>

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

        <div style={{ color: "var(--text-muted)" }}>
          Forward-return tracking: <strong data-tracking-status style={{ color: "var(--text-secondary)" }}>{TRACKING_STATUS}</strong>{" "}
          — <Link href="/methodology" style={{ color: "var(--text-secondary)", textDecoration: "underline", textDecorationColor: "rgba(148,163,184,0.6)", textUnderlineOffset: 2 }}>methodology</Link> carries the
          same line; it retires when the calibration track begins.
        </div>
      </div>
    </section>
  );
}
