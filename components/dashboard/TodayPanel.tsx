import 'server-only';

import Link from 'next/link';
import type { StockOfTheDay } from '@/lib/scoring/rankings';
import { TRACKING_STATUS } from '@/lib/demoState';
import SeedDataBanner from '@/components/shared/SeedDataBanner'; // N3: the panel's SOD pick is seed-derived — the mandatory label
import { MoversPanel } from '@/components/dashboard/MoversPanel'; // LIVE-TODAY: the live Top Winners / Top Losers view
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
 * Unofficial data scrapers." — the panel now carries the LIVE market
 * view (the MoversPanel: NSE's movers endpoint / the quote-cache
 * computation, each row source + as-of stamped) while the parts that
 * are NOT live yet stay honestly labelled:
 *
 *   - the deterministic IST-date Stock of the Day (when the rankings
 *     flag is on and a verdict-allowed pick exists — U4/P0-1 semantics
 *     ride the prop: the page passes null when there is nothing, and
 *     this panel renders the honest "no pick" state, never a fabricated
 *     subject) — still seed-derived, still banner-labelled;
 *   - verdicts produced today: NONE — the record set is seed data (P0-1:
 *     seed rows show no verdict; the count is a literal 0, not a
 *     computed one pretending to be observed);
 *   - news: TODAY-MOVERS (founder order, 2026-10-13): the live RSS
 *     aggregation's ACTUAL state (lib/news/server — the ONE source the
 *     /api/news route also serves). The real latest headline (publisher
 *     · age) when the feed returned one; the founder's honest empty
 *     wording ("No headlines yet") when it did not — the row reflects
 *     the feed, never a static claim;
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
  stockOfDay,
  movers,
  latestNews,
}: {
  stockOfDay: StockOfTheDay | null;
  movers: MoversSnapshot | null;
  latestNews: TodayLatestNews | null;
}) {
  const istDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

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

      {/* LIVE-TODAY: the live market view — Top 5 Winners / Top 5 Losers,
          every row source + as-of stamped (FD-15 wording), the derivation
          line disclosing how the list was produced. */}
      <MoversPanel movers={movers} />

      {/* N3: the SOD pick is seed-derived — the same mandatory label the
          ranked trio carries in DashboardTail (a client component rendered
          inside this server tree is fine in Next 16). */}
      <div style={{ marginTop: 14 }}>
        <SeedDataBanner suffix="deterministic daily pick, IST calendar day" />
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 12, fontSize: 13, lineHeight: 1.6 }}>
        {stockOfDay ? (
          <div>
            <span style={{ color: "var(--text-secondary)" }}>Stock of the Day: </span>
            <Link
              href={`/stock/${stockOfDay.symbol}`}
              data-today-sod
              style={{ color: "var(--accent-gold)", textDecoration: "none", fontWeight: 600 }}
            >
              {stockOfDay.symbol}
            </Link>
            <span style={{ color: "var(--text-muted)" }}> — {stockOfDay.name} (deterministic IST pick)</span>
          </div>
        ) : (
          <div data-today-sod-empty style={{ color: "var(--text-muted)" }}>
            Stock of the Day: — no verdict-allowed pick exists (rankings find nothing to rank on the current record set)
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
