'use client';

// components/dashboard/DashboardTail.tsx — the dashboard's bottom sections
// (CRYPTO grid, EXPLORE MARKETS tiles, RISHI WISDOM banner), extracted in
// Z5 (Round 13) so they load with next/dynamic after first paint instead
// of shipping in the homepage's first-load JS. Everything here sits below
// the fold (the hero, market stats, world markets, stock-of-the-day, top
// signals and shorts render first); the section rhythm and styling are
// unchanged — this is a move, not a redesign.

import { useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language';
import { TOP_CRYPTO } from '@/lib/dashboardSymbols';
import type { PriceData } from '@/hooks/useLivePrices';
import type { RankedStock, ShortCandidate, StockOfTheDay } from '@/lib/scoring/rankings';
import type { FullFundamentals } from '@/hooks/useFundamentals';
import { DataValue } from '@/components/DataValue'; // P0-06: provenance for displayed metrics
import { overlaySourced } from '@/lib/types/sourced';
import SeedDataBanner from '@/components/shared/SeedDataBanner'; // R1: honest placeholder-data label
import { shortRadarStatusLine } from '@/lib/modelStatus'; // round 20: the model-status contract is the ONLY wording source
import { DashboardBrief } from './DashboardBrief'; // INT-C1: the ONE intelligence surface for the day's pick

const C = {
  text:      '#F8FAFC',
  textSec:   '#CBD5E1',
  textMuted: 'var(--text-muted)',
  gold:      '#D4AF37',
  green:     '#22C55E',
  red:       '#EF4444',
  border:    'rgba(212,175,55,0.15)',
};

function scoreColor(s: number) {
  if (s >= 75) return '#22C55E';
  if (s >= 60) return '#D4AF37';
  if (s >= 45) return '#F59E0B';
  return '#EF4444';
}

function fmtINR(n?: number | null): string {
  return typeof n === 'number' && Number.isFinite(n) ? '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—';
}

function RankingsDisabledPanel({ title, note }: { title: string; note: string }) {
  return (
    <div style={{
      background: 'rgba(17,24,39,0.5)', border: '1px dashed rgba(100,116,139,0.4)',
      borderRadius: '16px', padding: '48px 24px', textAlign: 'center', marginBottom: '48px',
    }}>
      <div style={{ fontSize: '28px', marginBottom: '12px' }}>📊</div>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '16px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '12px', color: C.textMuted, maxWidth: '420px', margin: '0 auto', lineHeight: 1.7 }}>{note}</div>
    </div>
  );
}

const serif = 'Cinzel, serif';
const sans  = 'Inter, sans-serif';
const mono  = 'JetBrains Mono, monospace';

const MARKETS = [
  { href: '/forex',            icon: '💱', label: 'Forex',        desc: '10 currency pairs' },
  { href: '/commodities',      icon: '🥇', label: 'Commodities',  desc: 'Gold, Oil, Metals' },
  { href: '/bonds',            icon: '📜', label: 'Bonds',        desc: 'G-Secs & Corporate' },
  { href: '/pulse?tab=macro',  icon: '📡', label: 'Economy Plus', desc: 'Macro regime & rotation' },
  // Commit O (#18): /compare never existed — the real compare surface is the Lab's Compare tab.
  { href: '/lab',              icon: '⚖️', label: 'Compare',      desc: 'Side-by-side analysis' },
];

function card(): React.CSSProperties {
  return {
    background: 'linear-gradient(145deg,rgba(17,24,39,0.9) 0%,rgba(10,15,28,0.95) 100%)',
    border: `1px solid ${C.border}`,
    borderRadius: '16px',
    padding: '22px',
    transition: 'all 0.25s ease',
  };
}

function Divider() {
  return (
    <div style={{
      height: '1px', margin: '40px 0',
      background: 'linear-gradient(90deg,transparent,rgba(212,175,55,0.3),transparent)',
    }} />
  );
}

function SectionHeader({ title, link, linkLabel }: { title: string; link?: string; linkLabel?: string }) {
  const { t } = useLanguage();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
      <h2 style={{ fontFamily: serif, fontSize: '20px', fontWeight: 700, color: C.text, letterSpacing: '0.01em' }}>
        {title}
      </h2>
      {link && (
        <Link href={link} style={{ color: C.gold, fontSize: '12px', fontWeight: 600, fontFamily: sans, letterSpacing: '0.03em' }}>
          {linkLabel ?? t('dashboard2.viewAll')} →
        </Link>
      )}
    </div>
  );
}

function fmtUSD(v?: number | null): string {
  return typeof v === 'number' && Number.isFinite(v) ? '$' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—';
}
function fmtPct(v?: number | null): string {
  return typeof v === 'number' && Number.isFinite(v) ? (v >= 0 ? '+' : '') + v.toFixed(2) + '%' : '—';
}
function upClr(v?: number | null): React.CSSProperties {
  return { color: typeof v === 'number' && v >= 0 ? '#22C55E' : '#EF4444' };
}

interface TailProps {
  prices: Record<string, PriceData>;
  rankingsEnabled: boolean;
  stockOfDay: StockOfTheDay | null;
  sodCommentary: string | null;
  sodFund: FullFundamentals | null | undefined;
  rotatingStocks: RankedStock[];
  rotatingShorts: ShortCandidate[];
  buyFund: Record<string, FullFundamentals>;
}

export function DashboardTail({ prices, rankingsEnabled, stockOfDay, sodCommentary, sodFund, rotatingStocks, rotatingShorts, buyFund }: TailProps) {
  const { t } = useLanguage();
  const wisdomBanner = useMemo(() => ({
    background: 'linear-gradient(135deg,rgba(212,175,55,0.08) 0%,rgba(17,24,39,0.9) 50%,rgba(139,92,246,0.06) 100%)',
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: '24px',
    padding: '40px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(212,175,55,0.08)',
  }), []);

  return (
    <>

      {/* U4: the ranked trio (Stock of the Day / Top Buy Signals / Short
        Radar) exists only when the RANKINGS_ENABLED flag is on. Off →
        one honest disabled panel; the ranking engine never ran. */}
      {rankingsEnabled && stockOfDay ? (<>
      {/* ── STOCK OF THE DAY ─────────────────────────────── */}
      <div style={{ marginBottom:"48px" }}>
        <SectionHeader title={"🌟 " + t("dashboard2.sections.stockOfTheDay")} link={"/stock/" + stockOfDay.symbol} linkLabel={t("dashboard2.fullAnalysis")} />
        <SeedDataBanner suffix="deterministic daily pick, IST calendar day" />
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
                <div style={{ fontFamily:mono, fontSize:"28px", fontWeight:900, color:C.text }}>{stockOfDay.symbol}</div>
                <div style={{ fontSize:"13px", color:C.textMuted, marginTop:"2px" }}>{stockOfDay.name}</div>
              </div>
              <div style={{
                background:"rgba(212,175,55,0.15)", border:"1px solid rgba(212,175,55,0.3)",
                color:C.gold, padding:"6px 14px", borderRadius:"20px",
                fontSize:"13px", fontWeight:700, flexShrink:0,
              }}>{stockOfDay.tag}</div>
            </div>

            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"16px" }}>
              {[
                { label:t("dashboard2.rishiScore"), value: <DataValue sourced={{ value: stockOfDay.consensus, source: "seed", asOf: null }} format={v => v + "/100"} /> },
                { label:"P/E", value: <DataValue sourced={overlaySourced({ value: null, source: "seed", asOf: null }, sodFund?.pe, sodFund?.source, sodFund?.lastUpdated ?? null, "pe")} digits={1} unit="x" /> },
                { label:"ROE", value: <DataValue sourced={overlaySourced({ value: null, source: "seed", asOf: null }, sodFund?.roe, sodFund?.source, sodFund?.lastUpdated ?? null, "roe")} digits={1} unit="%" /> },
                { label:"OPM", value: <DataValue sourced={overlaySourced({ value: null, source: "seed", asOf: null }, sodFund?.opm, sodFund?.source, sodFund?.lastUpdated ?? null, "opm")} digits={1} unit="%" /> },
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
              &quot;{sodCommentary}&quot;
            </div>
            <div style={{ marginTop:"10px", fontSize:"12px", color:C.textMuted }}>
              — <span style={{ color:C.gold }}>Rishi {stockOfDay.rishi}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize:"22px", fontWeight:800, color:C.text, fontFamily:mono, marginBottom:"6px" }}>
              {fmtINR(prices[stockOfDay.symbol]?.price)}
            </div>
            <div style={{ fontSize:"14px", fontWeight:700, fontFamily:mono, marginBottom:"20px", ...upClr(prices[stockOfDay.symbol]?.changePercent24h) }}>
              {fmtPct(prices[stockOfDay.symbol]?.changePercent24h)} {t("dashboard2.todaySuffix")}
            </div>

            <div style={{
              background:"rgba(17,24,39,0.6)", borderRadius:"14px",
              padding:"16px", border:"1px solid rgba(51,65,85,0.4)",
              marginBottom:"16px",
            }}>
              <div style={{ fontSize:"11px", color:C.textMuted, marginBottom:"10px", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                {t("dashboard2.rishiConsensus")}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                <span style={{ fontSize:"13px", color:C.green }}>{t("dashboard2.bulls")}</span>
                <span style={{ fontSize:"20px", fontWeight:900, color:C.green, fontFamily:mono }}>{stockOfDay.consensus}%</span>
                <span style={{ fontSize:"13px", color:C.red }}>{t("dashboard2.bears")} {100 - stockOfDay.consensus}%</span>
              </div>
              <div style={{ height:"8px", background:"rgba(239,68,68,0.3)", borderRadius:"4px", overflow:"hidden" }}>
                <div style={{ height:"100%", width: stockOfDay.consensus + "%", background:"linear-gradient(90deg,#16A34A,#22C55E)", borderRadius:"4px" }} />
              </div>
            </div>

            <Link href={"/stock/" + stockOfDay.symbol} style={{
              display:"block", textAlign:"center", padding:"12px",
              background:"linear-gradient(135deg,#A88B20,#D4AF37)",
              borderRadius:"12px", color:"#0A0F1C", fontWeight:700,
              fontSize:"14px", textDecoration:"none",
              boxShadow:"0 4px 20px rgba(212,175,55,0.3)",
            }}>
              {t("dashboard2.viewFullAnalysis")} →
            </Link>
          </div>
        </div>
        </div>
      </div>

      {/* INT-C1: the dashboard brief — the ONE intelligence surface
          (/api/intelligence) for the server-resolved pick, rendered
          through the A8 primitives. No subject here → no brief (the
          disabled panel above already explains the ranked trio). */}
      <DashboardBrief subject={stockOfDay.symbol} />

      {/* ── TOP BUY SIGNALS ───────────────────────────────── */}
      <div style={{ marginBottom:"48px" }}>
        <SectionHeader title={"🟢 " + t("dashboard2.sections.topBuySignals")} link="/stocks" linkLabel={t("dashboard2.fullScreener")} />
        <SeedDataBanner suffix="ranked by Rishi consensus among data-quality-OK stocks" />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))", gap:"14px" }}>
        {rotatingStocks.map((stock) => {
          const d  = prices[stock.symbol];
          const up = (d?.changePercent24h ?? 0) >= 0;
          const sc = stock.consensus === null ? "var(--text-muted)" : scoreColor(stock.consensus); // T11: null = insufficient data
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
                    {/* Round-5 audit (finding 22): null handling unified with
                        the Stock of the Day card — a zero P/E means "not
                        meaningful" and renders as an em dash, never "PE 0". */}
                    <div>{t("dashboard2.peLabel")} {(() => { const pe = buyFund[stock.symbol]?.pe ?? stock.pe; return pe > 0 ? pe : "—"; })()}</div>
                    <div>{t("dashboard2.roeLabel")} {(() => { const roe = buyFund[stock.symbol]?.roe ?? stock.roe; return roe !== 0 ? roe + "%" : "—"; })()}</div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
        </div>
      </div>

      <Divider />

      {/* ── SHORT OF THE DAY ──────────────────────────────── */}
      <div style={{ marginBottom:"48px" }}>
        <SectionHeader title={"🔴 " + t("dashboard2.sections.shortRadar")} />
        <SeedDataBanner suffix={shortRadarStatusLine()} />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px,1fr))", gap:"14px" }}>
        {rotatingShorts.map(short => (
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
                  // Round-5 audit (finding 21): this is the QVPS short-mode
                  // SCORE (0-100), not a percentage — the raw float rendered
                  // as "16.05% / 15.759% / 15.75%" with an unexplained unit.
                }}>📉 {short.shortScore.toFixed(1)}/100</div>
              </div>
              <div style={{ fontSize:"12px", color:"#FCA5A5", lineHeight:1.6 }}>
                ⚠️ {short.reason}
              </div>
            </div>
          </Link>
        ))}
        </div>
      </div>
      </>) : (
        <RankingsDisabledPanel
        title={t("dashboard2.rankingsDisabled")}
        note={t("dashboard2.rankingsDisabledNote")}
        />
      )}

            {/* ── CRYPTO ────────────────────────────────────────── */}
      <div style={{ marginBottom: '48px' }}>
        <SectionHeader title={'₿ ' + t('dashboard2.sections.cryptocurrency')} link='/crypto' />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px,1fr))', gap: '14px' }}>
          {TOP_CRYPTO.map(crypto => {
            const d = prices[crypto.symbol];
            const up = (d?.changePercent24h ?? 0) >= 0;
            return (
              <Link href={'/crypto/' + crypto.symbol} key={crypto.symbol} style={{ textDecoration: 'none' }}>
                <div style={{ ...card(), cursor: 'pointer' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = crypto.color + '44';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '50%',
                      background: crypto.color + '18', border: '1px solid ' + crypto.color + '33',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: 900, color: crypto.color, fontFamily: mono, flexShrink: 0,
                    }}>{crypto.icon}</div>
                    <div>
                      <div style={{ fontWeight: 800, color: C.text, fontFamily: mono, fontSize: '15px' }}>{crypto.symbol}</div>
                      <div style={{ fontSize: '11px', color: C.textMuted }}>{crypto.name}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: C.text, fontFamily: mono, marginBottom: '6px' }}>
                    {fmtUSD(d?.price)}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: mono, ...upClr(d?.changePercent24h) }}>
                    {fmtPct(d?.changePercent24h)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div style={{
        height: '1px', margin: '40px 0',
        background: 'linear-gradient(90deg,transparent,rgba(212,175,55,0.3),transparent)',
      }} />

      {/* ── EXPLORE MARKETS ───────────────────────────────── */}
      <div style={{ marginBottom: '48px' }}>
        <SectionHeader title={'🌐 ' + t('dashboard2.sections.allMarkets')} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: '14px' }}>
          {MARKETS.map(({ href, icon, label, desc }) => (
            <Link href={href} key={href} style={{ textDecoration: 'none' }}>
              <div style={{ ...card(), textAlign: 'center', padding: '28px 16px', cursor: 'pointer' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,175,55,0.4)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.5),0 0 20px rgba(212,175,55,0.1)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>{icon}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '5px', fontFamily: serif }}>{href === '/forex' ? t('nav.forex') : href === '/commodities' ? t('nav.commodities') : href === '/bonds' ? t('nav.bonds') : href.startsWith('/pulse') ? t('nav.economyPlus') : href === '/lab' ? t('nav.compare') : label}</div>
                <div style={{ fontSize: '11px', color: C.textMuted }}>{href === '/forex' ? t('dashboard.markets.forexDesc') : href === '/commodities' ? t('dashboard.markets.commoditiesDesc') : href === '/bonds' ? t('dashboard.markets.bondsDesc') : href.startsWith('/pulse') ? t('dashboard.markets.economyPlusDesc') : href === '/lab' ? t('dashboard.markets.compareDesc') : desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── RISHI WISDOM BANNER ───────────────────────────── */}
      <div style={wisdomBanner}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <h2 style={{
              fontFamily: serif, fontSize: '26px', fontWeight: 900,
              background: 'linear-gradient(135deg,#D4AF37,#A78BFA)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: '12px',
            }}>
              🧘 {t('dashboard2.wisdom.title')}
            </h2>
            <p style={{ color: C.textMuted, fontSize: '15px', lineHeight: 1.8, maxWidth: '480px' }}>
              {t('dashboard2.wisdom.body')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href='/rishis' style={{
              padding: '13px 26px', background: 'linear-gradient(135deg,#A88B20,#D4AF37)',
              color: '#0A0F1C', borderRadius: '12px', fontWeight: 700, fontSize: '14px',
              textDecoration: 'none', boxShadow: '0 4px 20px rgba(212,175,55,0.3)',
            }}>🧘 Meet the Rishis</Link>
            {/* Commit M4 (free access): the "View Plans" CTA is gone —
                there are no plans. Every feature is free. */}
          </div>
        </div>
      </div>

    </>
  );
}
