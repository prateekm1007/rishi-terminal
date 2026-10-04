"use client";

// N1 (round 3): the interactive dashboard. All rankings, the Stock of the
// Day, and its QVPS commentary arrive precomputed from the server (RSC
// props, hourly ISR) — the scoring engine and seed dataset never enter
// the client bundle. Live prices and live fundamentals still hydrate
// client-side through the existing hooks.

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useLivePrices, type PriceData } from "@/hooks/useLivePrices";
import {
  aggregateMarketLabel,
  aggregatePresentationState,
  statusColor,
} from "@/lib/pricePresentation";

import { useFundamentals, useBulkFundamentals } from "@/hooks/useFundamentals";
import { useLanguage } from "@/lib/language";
import type { RankedStock, ShortCandidate, StockOfTheDay } from "@/lib/scoring/rankings";
import SeedDataBanner from "@/components/shared/SeedDataBanner"; // R1: honest placeholder-data label
import dynamic from "next/dynamic";

// Z5 (Round 13): the below-fold tail (crypto grid, explore-markets tiles,
// wisdom banner) loads after first paint — every section here renders
// below the hero, market stats, world markets, stock-of-the-day, top
// signals and shorts. The homepage's first-load JS stays lean.
const DashboardTail = dynamic(() => import("./DashboardTail").then(m => m.DashboardTail), { ssr: false });
import { DataValue } from "@/components/DataValue"; // P0-06: provenance for displayed metrics
import { overlaySourced } from "@/lib/types/sourced";

/* ── Constants ─────────────────────────────────────────────── */
// U2: the dashboard's symbol surface moved to lib/dashboardSymbols.ts — the
// server page builds the SSR initial-price snapshot from the SAME list
// (Rule 14). MARKETS (nav tiles) stays here: it is presentation-only.
import { TICKER_SYMS, TOP_CRYPTO, WORLD_MARKETS, STATS } from "@/lib/dashboardSymbols";

const MARKETS = [
  { href:"/forex",       icon:"💱", label:"Forex",        desc:"10 currency pairs" },
  { href:"/commodities", icon:"🥇", label:"Commodities",  desc:"Gold, Oil, Metals" },
  { href:"/bonds",       icon:"📜", label:"Bonds",        desc:"G-Secs & Corporate" },
  { href:"/pulse?tab=macro",       icon:"📡", label:"Economy Plus", desc:"Macro regime & rotation" },
  // Commit O (#18): /compare never existed — the real compare surface is the Lab's Compare tab.
  { href:"/lab",         icon:"⚖️", label:"Compare",     desc:"Side-by-side analysis" },
  
];

/* ── Style Helpers ─────────────────────────────────────────── */

const C = {
  bgVoid:   "#020408",
  bgPage:   "#0A0F1C",
  bgCard:   "rgba(17,24,39,0.85)",
  bgElevated:"rgba(31,41,59,0.6)",
  gold:     "#D4AF37",
  goldLight:"#E8CB6A",
  purple:   "#8B5CF6",
  green:    "#22C55E",
  red:      "#EF4444",
  amber:    "#F59E0B",
  text:     "#F8FAFC",
  textSec:  "#94A3B8",
  textMuted:"var(--text-muted)",
  border:   "rgba(30,41,59,0.8)",
  borderGold:"rgba(212,175,55,0.2)",
};

const serif = '"Cinzel","Playfair Display",Georgia,serif';
const sans  = '"Inter",system-ui,sans-serif';
const mono  = '"JetBrains Mono","Fira Code",monospace';

function card(extra?: object) {
  return {
    background: C.bgCard,
    border: "1px solid " + C.border,
    borderRadius: "16px",
    padding: "20px",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
    ...extra,
  };
}

function scoreColor(s: number) {
  return s >= 80 ? C.green : s >= 65 ? C.amber : C.red;
}

/* ── Sub-Components ────────────────────────────────────────── */

function SectionHeader({ title, link, linkLabel }: { title: string; link?: string; linkLabel?: string }) {
  const { t } = useLanguage();
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"20px" }}>
      <h2 style={{ fontFamily:serif, fontSize:"20px", fontWeight:700, color:C.text, letterSpacing:"0.01em" }}>
        {title}
      </h2>
      {link && (
        <Link href={link} style={{ color:C.gold, fontSize:"12px", fontWeight:600, fontFamily:sans, letterSpacing:"0.03em" }}>
          {linkLabel ?? t("dashboard2.viewAll")} →
        </Link>
      )}
    </div>
  );
}

function Divider() {
  return (
    <div style={{
      height:"1px", margin:"40px 0",
      background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.3),transparent)",
    }} />
  );
}

/* ── Main Dashboard ────────────────────────────────────────── */

interface DashboardProps {
  /** T13 rankings, computed on the server (single engine, one pass).
   *  U4: empty when the RANKINGS_ENABLED flag is off. */
  rotatingStocks: RankedStock[];
  rotatingShorts: ShortCandidate[];
  /** Deterministic IST-date pick (T13). U4: null when the flag is off. */
  stockOfDay: StockOfTheDay | null;
  /** N1: server-computed QVPS commentary for the daily pick (seed
   *  baseline — the QVPS engine no longer runs client-side). U4: null when
   *  the flag is off. */
  sodCommentary: string | null;
  /** U4 (founder round 7): whether the ranked widgets run at all
   *  (RANKINGS_ENABLED via lib/featureFlags, fail-closed). */
  rankingsEnabled: boolean;
  /** U2 (founder round 7): SSR initial-price snapshot from the server page
   *  (hourly ISR, every value labelled with its own observation time).
   *  The hook hydrates from it and revalidates on mount. */
  initialPrices?: Record<string, PriceData> | null;
}

/** U4 (founder round 7): the honest state shown when RANKINGS_ENABLED is
 *  off. No fake picks, no empty shells — the sections are gone and this
 *  panel says why. */
function RankingsDisabledPanel({ title, note }: { title: string; note: string }) {
  return (
    <div style={{
      marginBottom:"48px",
      background:"rgba(17,24,39,0.6)",
      border:"1px solid rgba(51,65,85,0.5)",
      borderRadius:"14px", padding:"22px 26px",
    }}>
      <div style={{ fontSize:"15px", fontWeight:800, color:C.text, fontFamily:mono, marginBottom:"8px" }}>🚦 {title}</div>
      <div style={{ fontSize:"13px", color:C.textSec, lineHeight:1.7 }}>{note}</div>
    </div>
  );
}

export default function DashboardClient({ rotatingStocks, rotatingShorts, stockOfDay, sodCommentary, rankingsEnabled, initialPrices }: DashboardProps) {
  const { t } = useLanguage();

  const allSyms = useMemo(() => [
    ...TICKER_SYMS,
    ...rotatingStocks.map(s => s.symbol),
    ...rotatingShorts.map(s => s.symbol),
    ...WORLD_MARKETS.map(m => m.sym),
    ...TOP_CRYPTO.map(c => c.symbol),
    ...(stockOfDay ? [stockOfDay.symbol] : []),
  ], [rotatingStocks, rotatingShorts, stockOfDay]);

  const { prices, loading, lastUpdated, observedAt } = useLivePrices(allSyms, 60000, initialPrices);

  // Round 9 (directive 14 — dashboard provenance): the badge is DERIVED from
  // the actual entry statuses via the shared presentation contract. The old
  // behavior — a green "Live Market Data" badge whenever a fetch had
  // happened (keyed off the browser fetch time) — is exactly the defect this
  // replaces: a fetch is not a freshness claim.
  const tickerEntries = Object.values(prices);
  const marketState = aggregatePresentationState(tickerEntries);
  const marketLabel = tickerEntries.length > 0 ? aggregateMarketLabel(tickerEntries) : null;
  // U4: no pick when rankings are off — the empty symbol skips the fetch.
  const { fundamentals: sodFund } = useFundamentals(stockOfDay?.symbol ?? "");
  const { fundamentals: buyFund, loading: buyFundLoading } = useBulkFundamentals(rotatingStocks.map(s => s.symbol));

  const [timeAgo, setTimeAgo] = useState("—");

  useEffect(() => {
    // Round 9: the "updated …" clock keys off the SERVER-disclosed
    // observation time (observedAt) — never the browser fetch time. No
    // disclosed observation → no clock ("—"), not a fabricated age.
    if (!observedAt) return;
    const update = () => {
      const s = Math.floor((Date.now() - observedAt.getTime()) / 1000);
            setTimeAgo(s < 60 ? (s + t("dashboard.timeAgoSecondsSuffix")) : (Math.floor(s / 60) + t("dashboard.timeAgoMinutesSuffix")));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [observedAt, t]);

  // G6: null (unobserved) renders '—' / neutral — never a fabricated 0 or 0.00%.
  const fmtINR = (n?: number | null) =>
    n ? "" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—";
  const fmtUSD = (n?: number | null) =>
    n ? "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—";
  const fmtPct = (n?: number | null) =>
    n != null ? (n >= 0 ? "+" : "") + n.toFixed(2) + "%" : "—";
  const upClr = (n?: number | null): React.CSSProperties =>
    ({ color: n == null ? C.textMuted : n >= 0 ? C.green : C.red });

  return (
    <div className="page-bg" style={{ minHeight:"100vh", background:"transparent", fontFamily:sans }}>

      {/* ── LIVE TICKER ────────────────────────────────────── */}
      <div style={{
        background:"rgba(2,4,8,0.97)",
        borderBottom:"1px solid rgba(212,175,55,0.12)",
        overflow:"hidden", padding:"10px 0",
        boxShadow:"0 4px 20px rgba(0,0,0,0.4)",
      }}>
        <div className="animate-ticker" style={{ whiteSpace:"nowrap", display:"flex" }}>
          {[...TICKER_SYMS, ...TICKER_SYMS].map((sym, i) => {
            const d = prices[sym];
            const up = (d?.changePercent24h ?? 0) >= 0;
            const useUSD = ["BTC","ETH","SOL","BNB","GOLD","SILVER","WTI"].includes(sym);
            return (
              <span key={i} style={{
                display:"inline-flex", alignItems:"center", gap:"10px",
                padding:"0 24px", borderRight:"1px solid rgba(212,175,55,0.08)",
                flexShrink:0,
              }}>
                <span style={{ color:C.textMuted, fontSize:"11px", fontWeight:700, letterSpacing:"0.08em", fontFamily:mono }}>{sym}</span>
                <span style={{ color:C.text, fontWeight:700, fontSize:"13px", fontFamily:mono }}>
                  {d?.price ? (useUSD ? "$" : "") + d.price.toLocaleString("en-IN",{maximumFractionDigits:2}) : "—"}
                </span>
                {/* Round-5 audit (finding 9): a missing quote used to render
                    "▼ 0.00%" — a fabricated direction and magnitude. No
                    data -> no arrow, no number. */}
                <span style={{ fontSize:"12px", fontWeight:600, color: up ? C.green : C.red, fontFamily:mono }}>
                  {d?.changePercent24h == null ? "—" : `${up ? "▲" : "▼"} ${Math.abs(d.changePercent24h).toFixed(2)}%`}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* ── TOP BAR ────────────────────────────────────────── */}
      <div style={{
        background:"rgba(5,8,16,0.8)",
        borderBottom:"1px solid rgba(212,175,55,0.06)",
        padding:"8px 32px", backdropFilter:"blur(12px)",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            {/* Round 9 (directive 14): the badge state is DERIVED from the
                entries' provenance statuses (aggregateMarketLabel —
                conservative: the stalest usable tile sets the word, and a
                delayed transport downgrades LIVE to DELAYED). It renders only
                once quotes exist; before that the bar says what is true. */}
            {marketLabel ? (
              <>
                <div style={{ width:"7px",height:"7px",borderRadius:"50%",background:statusColor(marketState),boxShadow:`0 0 8px ${marketState === "live" ? "rgba(34,197,94,0.7)" : "rgba(100,116,139,0.5)"}` }} className={marketState === "live" ? "animate-pulse" : undefined} />
                <span style={{ color:statusColor(marketState), fontSize:"12px", fontWeight:600, letterSpacing:"0.03em" }}>{marketLabel}</span>
              </>
            ) : (
              /* X3 (Round 11): before any quote exists the bar says what is
                 true — no price is available yet — never "Connecting…". */
              <span style={{ color:C.textMuted, fontSize:"12px", fontWeight:600, letterSpacing:"0.03em" }}>{t("dashboard.priceUnavailable")}</span>
            )}
          </div>
          <span style={{ color:C.textMuted, fontSize:"11px", fontFamily:mono }}>
            {/* Round 9: the age keys off the SERVER observation time; no
                disclosed observation → an honest dash, never a fabricated
                "updated Ns" off the fetch clock. */}
            {observedAt ? (t("dashboard.updatedPrefix") + timeAgo) : (marketLabel ? "—" : t("dashboard.priceUnavailable"))}
          </span>
        </div>
      </div>

      {/* ── PAGE CONTENT ───────────────────────────────────── */}
      <div style={{ padding:"40px 32px", maxWidth:"1200px", margin:"0 auto", boxSizing:"border-box" }}>

        {/* ── HERO ─────────────────────────────────────────── */}
        <div style={{ marginBottom:"48px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"16px", marginBottom:"16px" }}>
            <div style={{
              width:"50px",height:"50px",borderRadius:"14px",flexShrink:0,
              background:"linear-gradient(135deg,rgba(212,175,55,0.2),rgba(139,92,246,0.2))",
              border:"1px solid rgba(212,175,55,0.35)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:"26px",boxShadow:"0 4px 16px rgba(212,175,55,0.15)",
            }}>🧘</div>
            <div>
              <h1 style={{
                fontFamily:serif, fontSize:"44px", fontWeight:900, lineHeight:1.1,
                background:"linear-gradient(135deg,#A88B20 0%,#D4AF37 40%,#A78BFA 100%)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                letterSpacing:"-0.01em", margin:0,
              }}>Rishi Terminal</h1>
              <div style={{ color:C.gold, fontSize:"11px", fontWeight:600, letterSpacing:"0.15em", marginTop:"4px", fontFamily:sans }}>
                {t("dashboard.heroTagline")}
              </div>
            </div>
          </div>

          <p style={{ fontSize:"16px", color:C.textSec, maxWidth:"580px", lineHeight:1.8, marginBottom:"28px" }}>
            {t("dashboard.heroWisdomPrefix")}<span style={{ color:C.gold }}>{t("dashboard.heroWisdomHighlight")}</span>{t("dashboard.heroWisdomSuffix")}
          </p>

          <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
            {[
              { href:"/screener",  label:"📊 " + t("nav.screener"),   primary:true  },
              // Commit O (#18): /portfolio, /watchlist and /compare were dead
              // links (routes never existed) — the real surfaces live in the
              // Portfolio Lab (/lab, public since Commit N).
              { href:"/lab",       label:"💼 " + t("nav.portfolio"),  primary:false },
              { href:"/lab",       label:"⭐ " + t("nav.watchlist"),  primary:false },
              { href:"/rishis",    label:"🧘 " + t("nav.allRishis"), outline:true  },
              { href:"/news",      label:"📰 " + t("nav.news"),       ghost:true    },
              { href:"/lab",       label:"⚖️ " + t("nav.compare"),    ghost:true    },
            ].map(b => (
              <Link key={b.href} href={b.href} style={{
                display:"inline-flex", alignItems:"center", gap:"6px",
                padding:"10px 20px", borderRadius:"10px",
                fontWeight: b.primary ? 700 : 600, fontSize:"14px",
                fontFamily:sans, textDecoration:"none",
                background: b.primary
                  ? "linear-gradient(135deg,#A88B20,#D4AF37)"
                  : b.outline
                  ? "transparent"
                  : b.ghost
                  ? "transparent"
                  : "rgba(31,41,59,0.7)",
                color: b.primary ? "#0A0F1C" : b.outline ? C.gold : b.ghost ? C.textMuted : C.text,
                border: b.primary
                  ? "none"
                  : b.outline
                  ? "1px solid rgba(212,175,55,0.4)"
                  : "1px solid rgba(51,65,85,0.4)",
                boxShadow: b.primary ? "0 4px 20px rgba(212,175,55,0.3)" : "none",
              }}>
                {b.label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── MARKET STATS ─────────────────────────────────── */}
        <div style={{ marginBottom:"48px" }}>
          <SectionHeader title="Market Overview" />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(175px,1fr))", gap:"14px" }}>
            {STATS.map(({ label, sym, usd }) => {
              const d  = prices[sym];
              const up = (d?.changePercent24h ?? 0) >= 0;
              return (
                <Link href="/pulse/markets" key={sym} style={{ textDecoration:"none" }}>
                  <div style={{ ...card(), padding:"18px", cursor:"pointer" }}>
                  <div style={{ fontSize:"10px",fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"12px",fontFamily:sans }}>
                    {label}
                  </div>
                  {loading ? (
                    <div className="skeleton" style={{ height:"28px", marginBottom:"8px" }} />
                  ) : (
                    <>
                      <div style={{ fontSize:"22px",fontWeight:800,color:C.text,fontFamily:mono,marginBottom:"6px",lineHeight:1 }}>
                        {usd ? fmtUSD(d?.price) : fmtINR(d?.price)}
                      </div>
                      <div style={{ fontSize:"13px",fontWeight:700,fontFamily:mono,...upClr(d?.changePercent24h) }}>
                        {d?.changePercent24h != null ? `${up?"▲":"▼"} ${Math.abs(d.changePercent24h).toFixed(2)}%` : "—"}
                      </div>
                    </>
                  )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <Divider />

        {/* ── WORLD MARKETS ────────────────────────────────── */}
        <div style={{ marginBottom:"48px" }}>
          <Link href="/pulse?tab=markets" style={{ textDecoration:"none" }}><SectionHeader title="🌍 World Markets →" /></Link>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(175px,1fr))", gap:"14px" }}>
            {WORLD_MARKETS.map(({ label, sym }) => {
              const d  = prices[sym];
              const up = (d?.changePercent24h ?? 0) >= 0;
              return (
                <Link href="/pulse?tab=markets" key={sym} style={{ textDecoration:"none" }}><div style={{ ...card(), padding:"18px", cursor:"pointer" }}>
                  <div style={{ fontSize:"10px",fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"12px",fontFamily:sans }}>
                    {label}
                  </div>
                  {loading ? (
                    <div className="skeleton" style={{ height:"28px", marginBottom:"8px" }} />
                  ) : (
                    <>
                      <div style={{ fontSize:"22px",fontWeight:800,color:C.text,fontFamily:mono,marginBottom:"6px",lineHeight:1 }}>
                        {d?.price ? d.price.toLocaleString("en-US",{maximumFractionDigits:2}) : "—"}
                      </div>
                      <div style={{ fontSize:"13px",fontWeight:700,fontFamily:mono,...upClr(d?.changePercent24h) }}>
                        {d?.changePercent24h != null ? `${up?"▲":"▼"} ${Math.abs(d.changePercent24h).toFixed(2)}%` : "—"}
                      </div>
                    </>
                  )}
                </div>
                </Link>
              );
            })}
          </div>
        </div>

        <Divider />

        {/* Z5: below-fold tail — crypto, explore markets, wisdom banner (dynamic) */}
        <DashboardTail
            prices={prices}
            rankingsEnabled={rankingsEnabled}
            stockOfDay={stockOfDay}
            sodCommentary={sodCommentary}
            sodFund={sodFund}
            rotatingStocks={rotatingStocks}
            rotatingShorts={rotatingShorts}
            buyFund={buyFund}
          />

      </div>
    </div>
  );
}