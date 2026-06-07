"use client";

import ShortOfTheDay from "@/components/dashboard/ShortOfTheDay";
import DailyRitualWidget from "@/components/gamification/DailyRitual";
import ProgressBar from "@/components/gamification/ProgressBar";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useLivePrices } from "@/hooks/useLivePrices";

/* â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const TICKER_SYMS = ["NIFTY50","SENSEX","BANK_NIFTY","BTC","ETH","GOLD","SILVER","WTI","USD/INR","SOL"];

const STOCK_OF_DAY = {
  symbol: "TCS", name: "Tata Consultancy Services", sector: "IT",
  consensus: 88, pe: 31.2, pb: 13.4, roe: 48.6, opm: 24.2,
  revenueCAGR: 14.2, eps: 118, marketCap: "14.2L Cr",
  why: "Consistent ROE above 45%, zero debt, world-class capital allocation, and a management team that has compounded earnings at 15%+ for over a decade. Damani would call this a business worth owning forever.",
  rishi: "Damani",
  tag: "Compounding Machine",
};

const TOP_STOCKS = [
  { symbol:"RELIANCE",  name:"Reliance Industries", sector:"Energy",  consensus:82, pe:28.4, roe:14.2 },
  { symbol:"TCS",       name:"Tata Consultancy",    sector:"IT",      consensus:88, pe:31.2, roe:48.6 },
  { symbol:"INFY",      name:"Infosys Ltd",          sector:"IT",      consensus:85, pe:27.8, roe:32.1 },
  { symbol:"HDFCBANK",  name:"HDFC Bank",            sector:"Banking", consensus:79, pe:18.6, roe:16.8 },
  { symbol:"ICICIBANK", name:"ICICI Bank",            sector:"Banking", consensus:83, pe:19.2, roe:17.4 },
  { symbol:"SBIN",      name:"State Bank of India",  sector:"Banking", consensus:74, pe:10.8, roe:14.9 },
];

const TOP_SHORTS = [
  { symbol:"ADANIENT", name:"Adani Enterprises", shortScore:78, reason:"Elevated valuation + governance concerns" },
  { symbol:"ZOMATO",   name:"Zomato Ltd",         shortScore:72, reason:"Negative FCF + PE > 300x" },
  { symbol:"PAYTM",    name:"One97 Comms",        shortScore:81, reason:"Cash burn + regulatory risk" },
];

const TOP_CRYPTO = [
  { symbol:"BTC", name:"Bitcoin",  icon:"â‚¿", color:"#F7931A" },
  { symbol:"ETH", name:"Ethereum", icon:"Îž", color:"#627EEA" },
  { symbol:"SOL", name:"Solana",   icon:"â—Ž", color:"#9945FF" },
  { symbol:"BNB", name:"BNB",      icon:"B", color:"#F0B90B" },
];

const MARKETS = [
  { href:"/forex",       icon:"ðŸ’±", label:"Forex",        desc:"10 currency pairs" },
  { href:"/commodities", icon:"ðŸ¥‡", label:"Commodities",  desc:"Gold, Oil, Metals" },
  { href:"/bonds",       icon:"ðŸ“œ", label:"Bonds",        desc:"G-Secs & Corporate" },
  { href:"/pulse?tab=macro",       icon:"ðŸ“¡", label:"Economy Plus", desc:"Macro regime & rotation" },
  { href:"/compare",     icon:"âš–ï¸", label:"Compare",     desc:"Side-by-side analysis" },
  
];

const STATS = [
  { label:"NIFTY 50",   sym:"NIFTY50",    usd:false },
  { label:"SENSEX",     sym:"SENSEX",     usd:false },
  { label:"BANK NIFTY", sym:"BANK_NIFTY", usd:false },
  { label:"Bitcoin",    sym:"BTC",        usd:true  },
  { label:"Gold / oz",  sym:"GOLD",       usd:true  },
  { label:"USD/INR",    sym:"USD/INR",    usd:false },
];

/* â”€â”€ Style Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
  textMuted:"#64748B",
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

/* â”€â”€ Sub-Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function SectionHeader({ title, link, linkLabel }: { title: string; link?: string; linkLabel?: string }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"20px" }}>
      <h2 style={{ fontFamily:serif, fontSize:"20px", fontWeight:700, color:C.text, letterSpacing:"0.01em" }}>
        {title}
      </h2>
      {link && (
        <Link href={link} style={{ color:C.gold, fontSize:"12px", fontWeight:600, fontFamily:sans, letterSpacing:"0.03em" }}>
          {linkLabel ?? "View All"} â†’
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

/* â”€â”€ Main Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export default function DashboardPage() {
  const allSyms = useMemo(() => [
    ...TICKER_SYMS,
    ...TOP_STOCKS.map(s => s.symbol),
    ...TOP_CRYPTO.map(c => c.symbol),
    STOCK_OF_DAY.symbol,
  ], []);

  const { prices, loading, lastUpdated } = useLivePrices(allSyms);
  const [timeAgo, setTimeAgo] = useState("â€”");

  useEffect(() => {
    if (!lastUpdated) return;
    const update = () => {
      const s = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      setTimeAgo(s < 60 ? s + "s ago" : Math.floor(s / 60) + "m ago");
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const fmtINR = (n?: number) =>
    n ? "" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "â€”";
  const fmtUSD = (n?: number) =>
    n ? "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "â€”";
  const fmtPct = (n?: number) =>
    n != null ? (n >= 0 ? "+" : "") + n.toFixed(2) + "%" : "â€”";
  const upClr = (n?: number): React.CSSProperties =>
    ({ color: (n ?? 0) >= 0 ? C.green : C.red });

  return (
    <div className="page-bg" style={{ minHeight:"100vh", background:"transparent", fontFamily:sans }}>

      {/* â”€â”€ LIVE TICKER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                  {d?.price ? (useUSD ? "$" : "") + d.price.toLocaleString("en-IN",{maximumFractionDigits:2}) : "â€”"}
                </span>
                <span style={{ fontSize:"12px", fontWeight:600, color: up ? C.green : C.red, fontFamily:mono }}>
                  {up ? "â–²" : "â–¼"} {Math.abs(d?.changePercent24h ?? 0).toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* â”€â”€ TOP BAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{
        background:"rgba(5,8,16,0.8)",
        borderBottom:"1px solid rgba(212,175,55,0.06)",
        padding:"8px 32px", backdropFilter:"blur(12px)",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={{ width:"7px",height:"7px",borderRadius:"50%",background:C.green,boxShadow:"0 0 8px rgba(34,197,94,0.7)" }} className="animate-pulse" />
            <span style={{ color:C.green, fontSize:"12px", fontWeight:600, letterSpacing:"0.03em" }}>Live Market Data</span>
          </div>
          <span style={{ color:C.textMuted, fontSize:"11px", fontFamily:mono }}>
            {lastUpdated ? "Updated " + timeAgo : "Connecting..."}
          </span>
        </div>
      </div>

      {/* â”€â”€ PAGE CONTENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ padding:"40px 32px", maxWidth:"1200px", margin:"0 auto", boxSizing:"border-box" }}>

        {/* â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ marginBottom:"48px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"16px", marginBottom:"16px" }}>
            <div style={{
              width:"50px",height:"50px",borderRadius:"14px",flexShrink:0,
              background:"linear-gradient(135deg,rgba(212,175,55,0.2),rgba(139,92,246,0.2))",
              border:"1px solid rgba(212,175,55,0.35)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:"26px",boxShadow:"0 4px 16px rgba(212,175,55,0.15)",
            }}>ðŸ§˜</div>
            <div>
              <h1 style={{
                fontFamily:serif, fontSize:"44px", fontWeight:900, lineHeight:1.1,
                background:"linear-gradient(135deg,#A88B20 0%,#D4AF37 40%,#A78BFA 100%)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                letterSpacing:"-0.01em", margin:0,
              }}>Rishi Terminal</h1>
              <div style={{ color:C.gold, fontSize:"11px", fontWeight:600, letterSpacing:"0.15em", marginTop:"4px", fontFamily:sans }}>
                SACRED INVESTMENT INTELLIGENCE Â· v4.4
              </div>
            </div>
          </div>

          <p style={{ fontSize:"16px", color:C.textSec, maxWidth:"580px", lineHeight:1.8, marginBottom:"28px" }}>
            Wisdom from <span style={{ color:C.gold }}>20 legendary investors</span>. Live prices, dual-mode scoring, short thesis, philosophical insights.
          </p>

          <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
            {[
              { href:"/screener",  label:"ðŸ“Š Screener",   primary:true  },
              { href:"/portfolio", label:"ðŸ’¼ Portfolio",   primary:false },
              { href:"/watchlist", label:"â­ Watchlist",   primary:false },
              { href:"/rishis",    label:"ðŸ§˜ The Rishis",  outline:true  },
              { href:"/news",      label:"ðŸ“° News",        ghost:true    },
              { href:"/compare",   label:"âš–ï¸ Compare",    ghost:true    },
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

        {/* â”€â”€ MARKET STATS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ marginBottom:"48px" }}>
          <SectionHeader title="Market Overview" />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(175px,1fr))", gap:"14px" }}>
            {STATS.map(({ label, sym, usd }) => {
              const d  = prices[sym];
              const up = (d?.changePercent24h ?? 0) >= 0;
              return (
                <div key={sym} style={{ ...card(), padding:"18px" }}>
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
                        {up?"â–²":"â–¼"} {Math.abs(d?.changePercent24h??0).toFixed(2)}%
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Divider />

        {/* â”€â”€ STOCK OF THE DAY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ marginBottom:"48px" }}>
          <SectionHeader title="ðŸŒŸ Stock of the Day" link={"/stock/" + STOCK_OF_DAY.symbol} linkLabel="Full Analysis" />
          <div style={{
            background:"linear-gradient(135deg,rgba(212,175,55,0.08) 0%,rgba(17,24,39,0.9) 40%,rgba(139,92,246,0.05) 100%)",
            border:"1px solid rgba(212,175,55,0.3)",
            borderRadius:"20px", padding:"28px",
            boxShadow:"0 8px 32px rgba(0,0,0,0.4),0 0 40px rgba(212,175,55,0.06)",
          }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"28px", alignItems:"center" }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px" }}>
                  <div>
                    <div style={{ fontFamily:mono, fontSize:"28px", fontWeight:900, color:C.text }}>{STOCK_OF_DAY.symbol}</div>
                    <div style={{ fontSize:"13px", color:C.textMuted, marginTop:"2px" }}>{STOCK_OF_DAY.name}</div>
                  </div>
                  <div style={{
                    background:"rgba(212,175,55,0.15)", border:"1px solid rgba(212,175,55,0.3)",
                    color:C.gold, padding:"6px 14px", borderRadius:"20px",
                    fontSize:"13px", fontWeight:700, flexShrink:0,
                  }}>{STOCK_OF_DAY.tag}</div>
                </div>

                <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"16px" }}>
                  {[
                    { label:"Rishi Score", value: STOCK_OF_DAY.consensus + "/100" },
                    { label:"P/E",         value: STOCK_OF_DAY.pe.toString() },
                    { label:"ROE",         value: STOCK_OF_DAY.roe + "%" },
                    { label:"OPM",         value: STOCK_OF_DAY.opm + "%" },
                  ].map(m => (
                    <div key={m.label} style={{
                      background:"rgba(31,41,59,0.6)", border:"1px solid rgba(51,65,85,0.5)",
                      borderRadius:"8px", padding:"8px 12px", textAlign:"center",
                    }}>
                      <div style={{ fontSize:"10px", color:C.textMuted, fontFamily:sans, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>{m.label}</div>
                      <div style={{ fontSize:"15px", fontWeight:800, color:C.text, fontFamily:mono, marginTop:"2px" }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{
                  background:"rgba(212,175,55,0.04)",
                  borderLeft:"3px solid " + C.gold,
                  borderRadius:"0 8px 8px 0",
                  padding:"12px 16px",
                  fontSize:"13px", color:C.textSec,
                  fontStyle:"italic", lineHeight:1.7,
                  fontFamily:'"Playfair Display",Georgia,serif',
                }}>
                  "{STOCK_OF_DAY.why}"
                </div>
                <div style={{ marginTop:"10px", fontSize:"12px", color:C.textMuted }}>
                  â€” <span style={{ color:C.gold }}>Rishi {STOCK_OF_DAY.rishi}</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize:"22px", fontWeight:800, color:C.text, fontFamily:mono, marginBottom:"6px" }}>
                  {fmtINR(prices[STOCK_OF_DAY.symbol]?.price)}
                </div>
                <div style={{ fontSize:"14px", fontWeight:700, fontFamily:mono, marginBottom:"20px", ...upClr(prices[STOCK_OF_DAY.symbol]?.changePercent24h) }}>
                  {fmtPct(prices[STOCK_OF_DAY.symbol]?.changePercent24h)} today
                </div>

                <div style={{
                  background:"rgba(17,24,39,0.6)", borderRadius:"14px",
                  padding:"16px", border:"1px solid rgba(51,65,85,0.4)",
                  marginBottom:"16px",
                }}>
                  <div style={{ fontSize:"11px", color:C.textMuted, marginBottom:"10px", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                    Rishi Consensus
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                    <span style={{ fontSize:"13px", color:C.green }}>Bulls</span>
                    <span style={{ fontSize:"20px", fontWeight:900, color:C.green, fontFamily:mono }}>{STOCK_OF_DAY.consensus}%</span>
                    <span style={{ fontSize:"13px", color:C.red }}>Bears {100 - STOCK_OF_DAY.consensus}%</span>
                  </div>
                  <div style={{ height:"8px", background:"rgba(239,68,68,0.3)", borderRadius:"4px", overflow:"hidden" }}>
                    <div style={{ height:"100%", width: STOCK_OF_DAY.consensus + "%", background:"linear-gradient(90deg,#16A34A,#22C55E)", borderRadius:"4px" }} />
                  </div>
                </div>

                <Link href={"/stock/" + STOCK_OF_DAY.symbol} style={{
                  display:"block", textAlign:"center", padding:"12px",
                  background:"linear-gradient(135deg,#A88B20,#D4AF37)",
                  borderRadius:"12px", color:"#0A0F1C", fontWeight:700,
                  fontSize:"14px", textDecoration:"none",
                  boxShadow:"0 4px 20px rgba(212,175,55,0.3)",
                }}>
                  View Full Analysis â†’
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* â”€â”€ TOP BUY SIGNALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ marginBottom:"48px" }}>
          <SectionHeader title="ðŸŸ¢ Top Buy Signals" link="/screener" linkLabel="Full Screener" />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))", gap:"14px" }}>
            {TOP_STOCKS.map((stock) => {
              const d  = prices[stock.symbol];
              const up = (d?.changePercent24h ?? 0) >= 0;
              const sc = scoreColor(stock.consensus);
              return (
                <Link href={"/stock/" + stock.symbol} key={stock.symbol} style={{ textDecoration:"none" }}>
                  <div style={{ ...card(), cursor:"pointer" }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(212,175,55,0.4)";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.5),0 0 20px rgba(212,175,55,0.1)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                    }}
                  >
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px" }}>
                      <div>
                        <div style={{ fontSize:"16px",fontWeight:800,color:C.text,fontFamily:mono }}>{stock.symbol}</div>
                        <div style={{ fontSize:"11px",color:C.textMuted,marginTop:"2px",maxWidth:"140px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{stock.name}</div>
                      </div>
                      <div style={{
                        background:sc+"18", border:"1px solid "+sc+"40",
                        color:sc, padding:"3px 10px", borderRadius:"20px",
                        fontSize:"12px", fontWeight:700, fontFamily:mono, flexShrink:0,
                      }}>{stock.consensus}%</div>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                      <div>
                        <div style={{ fontSize:"20px",fontWeight:800,color:C.text,fontFamily:mono }}>
                          {fmtINR(d?.price)}
                        </div>
                        <div style={{ fontSize:"13px",fontWeight:700,marginTop:"3px",fontFamily:mono,...upClr(d?.changePercent24h) }}>
                          {fmtPct(d?.changePercent24h)}
                        </div>
                      </div>
                      <div style={{ textAlign:"right",color:C.textMuted,fontSize:"11px",lineHeight:1.8,fontFamily:mono }}>
                        <div>PE {stock.pe}</div>
                        <div>ROE {stock.roe}%</div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <Divider />

        {/* â”€â”€ SHORT OF THE DAY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ marginBottom:"48px" }}>
          <SectionHeader title="ðŸ”´ Short Radar" />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px,1fr))", gap:"14px" }}>
            {TOP_SHORTS.map(short => (
              <Link href={"/stock/" + short.symbol} key={short.symbol} style={{ textDecoration:"none" }}>
                <div style={{
                  ...card(),
                  background:"linear-gradient(135deg,rgba(239,68,68,0.06),rgba(17,24,39,0.85))",
                  border:"1px solid rgba(239,68,68,0.2)",
                  cursor:"pointer",
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(239,68,68,0.5)";
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(239,68,68,0.2)";
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
                    <div>
                      <div style={{ fontSize:"16px",fontWeight:800,color:C.text,fontFamily:mono }}>{short.symbol}</div>
                      <div style={{ fontSize:"11px",color:C.textMuted,marginTop:"2px" }}>{short.name}</div>
                    </div>
                    <div style={{
                      background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.3)",
                      color:C.red, padding:"3px 10px", borderRadius:"20px",
                      fontSize:"12px", fontWeight:700, fontFamily:mono,
                    }}>ðŸ“‰ {short.shortScore}%</div>
                  </div>
                  <div style={{ fontSize:"12px", color:"#FCA5A5", lineHeight:1.6 }}>
                    âš ï¸ {short.reason}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* â”€â”€ CRYPTO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ marginBottom:"48px" }}>
          <SectionHeader title="â‚¿ Cryptocurrency" link="/crypto" />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(210px,1fr))", gap:"14px" }}>
            {TOP_CRYPTO.map(crypto => {
              const d  = prices[crypto.symbol];
              const up = (d?.changePercent24h ?? 0) >= 0;
              return (
                <Link href={"/crypto/" + crypto.symbol} key={crypto.symbol} style={{ textDecoration:"none" }}>
                  <div style={{ ...card(), cursor:"pointer" }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = crypto.color + "44";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px" }}>
                      <div style={{
                        width:"42px",height:"42px",borderRadius:"50%",
                        background:crypto.color+"18", border:"1px solid "+crypto.color+"33",
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:"18px",fontWeight:900,color:crypto.color,fontFamily:mono,flexShrink:0,
                      }}>{crypto.icon}</div>
                      <div>
                        <div style={{ fontWeight:800,color:C.text,fontFamily:mono,fontSize:"15px" }}>{crypto.symbol}</div>
                        <div style={{ fontSize:"11px",color:C.textMuted }}>{crypto.name}</div>
                      </div>
                    </div>
                    <div style={{ fontSize:"20px",fontWeight:800,color:C.text,fontFamily:mono,marginBottom:"6px" }}>
                      {fmtUSD(d?.price)}
                    </div>
                    <div style={{ fontSize:"13px",fontWeight:700,fontFamily:mono,...upClr(d?.changePercent24h) }}>
                      {fmtPct(d?.changePercent24h)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <Divider />

        {/* â”€â”€ EXPLORE MARKETS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ marginBottom:"48px" }}>
          <SectionHeader title="ðŸŒ All Markets" />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(170px,1fr))", gap:"14px" }}>
            {MARKETS.map(({ href, icon, label, desc }) => (
              <Link href={href} key={href} style={{ textDecoration:"none" }}>
                <div style={{ ...card(), textAlign:"center", padding:"28px 16px", cursor:"pointer" }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(212,175,55,0.4)";
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.5),0 0 20px rgba(212,175,55,0.1)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  }}
                >
                  <div style={{ fontSize:"36px", marginBottom:"12px" }}>{icon}</div>
                  <div style={{ fontSize:"14px",fontWeight:700,color:C.text,marginBottom:"5px",fontFamily:serif }}>{label}</div>
                  <div style={{ fontSize:"11px",color:C.textMuted }}>{desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* â”€â”€ RISHI WISDOM BANNER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{
          background:"linear-gradient(135deg,rgba(212,175,55,0.08) 0%,rgba(17,24,39,0.9) 50%,rgba(139,92,246,0.06) 100%)",
          border:"1px solid rgba(212,175,55,0.25)",
          borderRadius:"24px", padding:"40px",
          boxShadow:"0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(212,175,55,0.08)",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"24px" }}>
            <div style={{ flex:1, minWidth:"260px" }}>
              <h2 style={{
                fontFamily:serif, fontSize:"26px", fontWeight:900,
                background:"linear-gradient(135deg,#D4AF37,#A78BFA)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                marginBottom:"12px",
              }}>
                ðŸ§˜ 20 Legendary Investors
              </h2>
              <p style={{ color:C.textSec, fontSize:"15px", lineHeight:1.8, maxWidth:"480px" }}>
                Buffett, Graham, Lynch, Damani, Jhunjhunwala, Chanos â€” all <span style={{ color:C.gold }}>scoring every stock</span> in real-time. Long and Short thesis. Every day.
              </p>
            </div>
            <div style={{ display:"flex", gap:"12px", flexWrap:"wrap" }}>
              <Link href="/rishis" style={{
                padding:"13px 26px", background:"linear-gradient(135deg,#A88B20,#D4AF37)",
                color:"#0A0F1C", borderRadius:"12px", fontWeight:700, fontSize:"14px",
                textDecoration:"none", boxShadow:"0 4px 20px rgba(212,175,55,0.3)",
              }}>ðŸ§˜ Meet the Rishis</Link>
              <Link href="/pricing" style={{
                padding:"13px 26px",
                background:"rgba(31,41,59,0.7)",
                color:C.text, borderRadius:"12px", fontWeight:600, fontSize:"14px",
                textDecoration:"none", border:"1px solid rgba(51,65,85,0.5)",
              }}>ðŸ’Ž View Plans</Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
