"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useLivePrices } from "@/hooks/useLivePrices";

/* ── Constants (Unchanged Business Logic) ── */
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
  { symbol:"INFY",      name:"Infosys Ltd",         sector:"IT",      consensus:85, pe:27.8, roe:32.1 },
  { symbol:"HDFCBANK",  name:"HDFC Bank",           sector:"Banking", consensus:79, pe:18.6, roe:16.8 },
  { symbol:"ICICIBANK", name:"ICICI Bank",          sector:"Banking", consensus:83, pe:19.2, roe:17.4 },
  { symbol:"SBIN",      name:"State Bank of India", sector:"Banking", consensus:74, pe:10.8, roe:14.9 },
];

const TOP_SHORTS = [
  { symbol:"ADANIENT", name:"Adani Enterprises", shortScore:78, reason:"Elevated valuation + governance concerns" },
  { symbol:"ZOMATO",   name:"Zomato Ltd",        shortScore:72, reason:"Negative FCF + PE > 300x" },
  { symbol:"PAYTM",    name:"One97 Comms",       shortScore:81, reason:"Cash burn + regulatory risk" },
];

const STATS = [
  { label:"NIFTY 50",   sym:"NIFTY50",    usd:false },
  { label:"SENSEX",     sym:"SENSEX",     usd:false },
  { label:"BANK NIFTY", sym:"BANK_NIFTY", usd:false },
  { label:"Bitcoin",    sym:"BTC",        usd:true  },
  { label:"Gold / oz",  sym:"GOLD",       usd:true  },
  { label:"USD/INR",    sym:"USD/INR",    usd:false },
];

/* ── Sub-Components ── */
function SectionHeader({ title, link, linkLabel }: { title: string; link?: string; linkLabel?: string }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"24px" }}>
      <h2 style={{ fontFamily:"Inter, sans-serif", fontSize:"18px", fontWeight:500, color:"#fafafa", letterSpacing:"-0.02em" }}>
        {title}
      </h2>
      {link && (
        <Link href={link} style={{ color:"#a1a1aa", fontSize:"13px", fontWeight:400, fontFamily:"Inter, sans-serif", textDecoration:"none", transition:"color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'}>
          {linkLabel ?? "View All"} &rarr;
        </Link>
      )}
    </div>
  );
}

/* ── Main Dashboard ── */
export default function DashboardPage() {
  const allSyms = useMemo(() => [
    ...TICKER_SYMS,
    ...TOP_STOCKS.map(s => s.symbol),
    STOCK_OF_DAY.symbol,
  ], []);

  const { prices, loading, lastUpdated } = useLivePrices(allSyms);
  const [timeAgo, setTimeAgo] = useState("—");

  useEffect(() => {
    if (!lastUpdated) return;
    const update = () => {
      const s = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      setTimeAgo(s < 60 ? "Just now" : Math.floor(s / 60) + "m ago");
    };
    update();
    const t = setInterval(update, 10000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const fmtINR = (n?: number) => n ? "" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—";
  const fmtUSD = (n?: number) => n ? "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—";
  const fmtPct = (n?: number) => n != null ? (n >= 0 ? "+" : "") + n.toFixed(2) + "%" : "—";
  const upClr = (n?: number) => (n ?? 0) >= 0 ? "#22c55e" : "#ef4444";

  return (
    <div style={{ minHeight:"100vh", background: "#09090b", fontFamily:"Inter, sans-serif" }}>

      {/* ── LIVE TICKER STRIP ── */}
      <div style={{
        background:"transparent",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        overflow:"hidden", padding:"10px 0",
      }}>
        <div className="animate-ticker" style={{ whiteSpace:"nowrap", display:"flex" }}>
          {[...TICKER_SYMS, ...TICKER_SYMS].map((sym, i) => {
            const d = prices[sym];
            const up = (d?.changePercent24h ?? 0) >= 0;
            const useUSD = ["BTC","ETH","SOL","BNB","GOLD","SILVER","WTI"].includes(sym);
            return (
              <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:"12px", padding:"0 24px", flexShrink:0 }}>
                <span style={{ color:"#71717a", fontSize:"12px", fontWeight:500 }}>{sym}</span>
                <span style={{ color:"#e4e4e7", fontSize:"13px", fontWeight:500 }}>
                  {d?.price ? (useUSD ? "$" : "") + d.price.toLocaleString("en-IN",{maximumFractionDigits:2}) : "—"}
                </span>
                <span style={{ fontSize:"12px", fontWeight:500, color: upClr(d?.changePercent24h) }}>
                  {up ? "▲" : "▼"} {Math.abs(d?.changePercent24h ?? 0).toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <div style={{ padding:"48px 40px", maxWidth:"1200px", margin:"0 auto", boxSizing:"border-box" }}>

        {/* ── HERO ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"48px" }}>
          <div>
            <div style={{ color:"#71717a", fontSize:"13px", fontWeight:500, letterSpacing:"0.05em", marginBottom:"8px" }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
            </div>
            <h1 style={{ fontSize:"36px", fontWeight:400, color:"#fff", letterSpacing:"-0.03em", margin:0 }}>
              Market Overview
            </h1>
          </div>
          
          <div style={{ display:"flex", alignItems:"center", gap:"8px", color:"#71717a", fontSize:"12px" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e", opacity: 0.8 }} />
            {lastUpdated ? `Live · ${timeAgo}` : "Connecting..."}
          </div>
        </div>

        {/* ── NAVIGATION PILLS ── */}
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"56px" }}>
          {[
            { href:"/screener",  label:"Screener" },
            { href:"/lab",       label:"Portfolio Lab" },
            { href:"/news",      label:"News" },
            { href:"/pulse",     label:"Economy" },
            { href:"/compare",   label:"Compare" },
          ].map(b => (
            <Link key={b.href} href={b.href} style={{
              display:"inline-flex", alignItems:"center",
              padding:"8px 16px", borderRadius:"6px",
              fontWeight: 400, fontSize:"13px", color: "#e4e4e7",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              textDecoration:"none", transition:"all 0.15s ease",
            }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}>
              {b.label}
            </Link>
          ))}
        </div>

        {/* ── MAJOR INDICES GRID ── */}
        <div style={{ marginBottom:"64px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px,1fr))", gap:"16px" }}>
            {STATS.map(({ label, sym, usd }) => {
              const d  = prices[sym];
              const up = (d?.changePercent24h ?? 0) >= 0;
              return (
                <div key={sym} className="card" style={{ padding:"20px", display:"flex", flexDirection:"column", gap:"12px" }}>
                  <div style={{ fontSize:"12px",fontWeight:500,color:"#a1a1aa" }}>{label}</div>
                  {loading ? (
                    <div className="skeleton" style={{ height:"28px", width:"80%" }} />
                  ) : (
                    <div>
                      <div style={{ fontSize:"24px",fontWeight:400,color:"#fff",letterSpacing:"-0.02em",lineHeight:1.1,marginBottom:"8px" }}>
                        {usd ? fmtUSD(d?.price) : fmtINR(d?.price)}
                      </div>
                      <div style={{ fontSize:"13px",fontWeight:500,color:upClr(d?.changePercent24h) }}>
                        {up?"▲":"▼"} {Math.abs(d?.changePercent24h??0).toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── STOCK OF THE DAY ── */}
        <div style={{ marginBottom:"64px" }}>
          <SectionHeader title="Highlight" link={"/stock/" + STOCK_OF_DAY.symbol} linkLabel="Analysis" />
          <div className="card" style={{ padding:"32px", display:"flex", gap:"32px", flexWrap:"wrap" }}>
            <div style={{ flex: "1 1 300px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px" }}>
                <div style={{ fontSize:"32px", fontWeight:500, color:"#fff", letterSpacing:"-0.02em" }}>{STOCK_OF_DAY.symbol}</div>
                <div style={{ background:"rgba(255,255,255,0.06)", color:"#e4e4e7", padding:"4px 10px", borderRadius:"4px", fontSize:"11px", fontWeight:500 }}>
                  {STOCK_OF_DAY.tag}
                </div>
              </div>
              <div style={{ fontSize:"14px", color:"#a1a1aa", lineHeight:1.6 }}>
                {STOCK_OF_DAY.why}
              </div>
            </div>
            
            <div style={{ display:"flex", gap:"16px", flexWrap:"wrap", alignItems:"center" }}>
              {[
                { label:"Rishi Score", value: STOCK_OF_DAY.consensus },
                { label:"P/E", value: STOCK_OF_DAY.pe },
                { label:"ROE", value: STOCK_OF_DAY.roe + "%" }
              ].map(m => (
                <div key={m.label} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.04)", borderRadius:"8px", padding:"16px 20px", minWidth:"100px" }}>
                  <div style={{ fontSize:"11px", color:"#71717a", marginBottom:"8px" }}>{m.label}</div>
                  <div style={{ fontSize:"20px", fontWeight:400, color:"#fff" }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
