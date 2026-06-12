'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { WorldMarketsGrid } from '../../components/markets/WorldMarketsGrid';
import Link from 'next/link';
import { useLanguage } from '../../lib/language';
import {
  MACRO_REGIME as MACRO_REGIME_EN,
  MACRO_INDICATORS as MACRO_INDICATORS_EN,
  PHILOSOPHER_STANCES as PHILOSOPHER_STANCES_EN,
  SECTOR_ROTATION as SECTOR_ROTATION_EN,
  HISTORICAL_CORRELATIONS as HISTORICAL_CORRELATIONS_EN,
  CURRENCY_SENSITIVITY as CURRENCY_SENSITIVITY_EN,
  getDailyBrief as getDailyBrief_EN,
  deriveDynamicAgreement,
} from '../../data/economyPlus/macroData';

import {
  MACRO_REGIME as MACRO_REGIME_HI,
  MACRO_INDICATORS as MACRO_INDICATORS_HI,
  PHILOSOPHER_STANCES as PHILOSOPHER_STANCES_HI,
  SECTOR_ROTATION as SECTOR_ROTATION_HI,
  HISTORICAL_CORRELATIONS as HISTORICAL_CORRELATIONS_HI,
  CURRENCY_SENSITIVITY as CURRENCY_SENSITIVITY_HI,
  getDailyBrief as getDailyBrief_HI,
} from '../../data/economyPlus/macroData.hi';

import {
  MACRO_REGIME as MACRO_REGIME_BN,
  MACRO_INDICATORS as MACRO_INDICATORS_BN,
  PHILOSOPHER_STANCES as PHILOSOPHER_STANCES_BN,
  SECTOR_ROTATION as SECTOR_ROTATION_BN,
  HISTORICAL_CORRELATIONS as HISTORICAL_CORRELATIONS_BN,
  CURRENCY_SENSITIVITY as CURRENCY_SENSITIVITY_BN,
  getDailyBrief as getDailyBrief_BN,
} from '../../data/economyPlus/macroData.bn';

import {
  MACRO_REGIME as MACRO_REGIME_MR,
  MACRO_INDICATORS as MACRO_INDICATORS_MR,
  PHILOSOPHER_STANCES as PHILOSOPHER_STANCES_MR,
  SECTOR_ROTATION as SECTOR_ROTATION_MR,
  HISTORICAL_CORRELATIONS as HISTORICAL_CORRELATIONS_MR,
  CURRENCY_SENSITIVITY as CURRENCY_SENSITIVITY_MR,
  getDailyBrief as getDailyBrief_MR,
} from '../../data/economyPlus/macroData.mr';

import {
  MACRO_REGIME as MACRO_REGIME_TE,
  MACRO_INDICATORS as MACRO_INDICATORS_TE,
  PHILOSOPHER_STANCES as PHILOSOPHER_STANCES_TE,
  SECTOR_ROTATION as SECTOR_ROTATION_TE,
  HISTORICAL_CORRELATIONS as HISTORICAL_CORRELATIONS_TE,
  CURRENCY_SENSITIVITY as CURRENCY_SENSITIVITY_TE,
  getDailyBrief as getDailyBrief_TE,
} from '../../data/economyPlus/macroData.te';

import {
  MACRO_REGIME as MACRO_REGIME_TA,
  MACRO_INDICATORS as MACRO_INDICATORS_TA,
  PHILOSOPHER_STANCES as PHILOSOPHER_STANCES_TA,
  SECTOR_ROTATION as SECTOR_ROTATION_TA,
  HISTORICAL_CORRELATIONS as HISTORICAL_CORRELATIONS_TA,
  CURRENCY_SENSITIVITY as CURRENCY_SENSITIVITY_TA,
  getDailyBrief as getDailyBrief_TA,
} from '../../data/economyPlus/macroData.ta';

type PulseTab =
  | 'overview'
  | 'macro'
  | 'rotation'
  | 'evidence'
  | 'currency'
  | 'brief'
  | 'breadth'
  | 'blocks'
  | 'markets';

function isValidPulseTab(t: string | null): t is PulseTab {
  return (
    t === 'overview' ||
    t === 'macro' ||
    t === 'rotation' ||
    t === 'evidence' ||
    t === 'currency' ||
    t === 'brief' ||
    t === 'breadth' ||
    t === 'blocks' ||
    t === 'markets'
  );
}

function StatBox({ label, value, sub, color, onClick }: {
  label: string; value: string; sub?: string; color?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="stat-unified"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: color || 'var(--text-primary)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ emoji, title, color = 'var(--accent-gold)' }: { emoji: string; title: string; color?: string }) {
  return (
    <div className="section-header">
      <h2 className="section-header-title" style={{ color }}>
        <span style={{ marginRight: 10 }}>{emoji}</span>
        {title}
      </h2>
    </div>
  );
}

function safeNum(x: any): number | null {
  const n = typeof x === 'number' ? x : (typeof x === 'string' ? Number(x) : NaN);
  return Number.isFinite(n) ? n : null;
}

function getPct(x: any): number {
  if (!x) return 0;
  if (typeof x.changePercent === 'number') return x.changePercent;
  if (typeof x.percentChange === 'number') return x.percentChange;
  if (typeof x.pChange === 'number') return x.pChange;
  if (typeof x.change === 'number' && typeof x.price === 'number' && x.price !== 0) return (x.change / x.price) * 100;
  return 0;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export default function MarketPulsePage() {
  const { t, locale } = useLanguage();

  // Select data based on locale
  // Select data based on locale (all 6 languages)
  const localeDataMap: Record<string, any> = {
    en: { MACRO_REGIME: MACRO_REGIME_EN, MACRO_INDICATORS: MACRO_INDICATORS_EN, PHILOSOPHER_STANCES: PHILOSOPHER_STANCES_EN, SECTOR_ROTATION: SECTOR_ROTATION_EN, HISTORICAL_CORRELATIONS: HISTORICAL_CORRELATIONS_EN, CURRENCY_SENSITIVITY: CURRENCY_SENSITIVITY_EN, getDailyBrief: getDailyBrief_EN },
    hi: { MACRO_REGIME: MACRO_REGIME_HI, MACRO_INDICATORS: MACRO_INDICATORS_HI, PHILOSOPHER_STANCES: PHILOSOPHER_STANCES_HI, SECTOR_ROTATION: SECTOR_ROTATION_HI, HISTORICAL_CORRELATIONS: HISTORICAL_CORRELATIONS_HI, CURRENCY_SENSITIVITY: CURRENCY_SENSITIVITY_HI, getDailyBrief: getDailyBrief_HI },
    bn: { MACRO_REGIME: MACRO_REGIME_BN, MACRO_INDICATORS: MACRO_INDICATORS_BN, PHILOSOPHER_STANCES: PHILOSOPHER_STANCES_BN, SECTOR_ROTATION: SECTOR_ROTATION_BN, HISTORICAL_CORRELATIONS: HISTORICAL_CORRELATIONS_BN, CURRENCY_SENSITIVITY: CURRENCY_SENSITIVITY_BN, getDailyBrief: getDailyBrief_BN },
    mr: { MACRO_REGIME: MACRO_REGIME_MR, MACRO_INDICATORS: MACRO_INDICATORS_MR, PHILOSOPHER_STANCES: PHILOSOPHER_STANCES_MR, SECTOR_ROTATION: SECTOR_ROTATION_MR, HISTORICAL_CORRELATIONS: HISTORICAL_CORRELATIONS_MR, CURRENCY_SENSITIVITY: CURRENCY_SENSITIVITY_MR, getDailyBrief: getDailyBrief_MR },
    te: { MACRO_REGIME: MACRO_REGIME_TE, MACRO_INDICATORS: MACRO_INDICATORS_TE, PHILOSOPHER_STANCES: PHILOSOPHER_STANCES_TE, SECTOR_ROTATION: SECTOR_ROTATION_TE, HISTORICAL_CORRELATIONS: HISTORICAL_CORRELATIONS_TE, CURRENCY_SENSITIVITY: CURRENCY_SENSITIVITY_TE, getDailyBrief: getDailyBrief_TE },
    ta: { MACRO_REGIME: MACRO_REGIME_TA, MACRO_INDICATORS: MACRO_INDICATORS_TA, PHILOSOPHER_STANCES: PHILOSOPHER_STANCES_TA, SECTOR_ROTATION: SECTOR_ROTATION_TA, HISTORICAL_CORRELATIONS: HISTORICAL_CORRELATIONS_TA, CURRENCY_SENSITIVITY: CURRENCY_SENSITIVITY_TA, getDailyBrief: getDailyBrief_TA },
  };
  const localeData = localeDataMap[locale] || localeDataMap.en;
  const MACRO_REGIME = localeData.MACRO_REGIME;
  const MACRO_INDICATORS = localeData.MACRO_INDICATORS;

  // Dynamic asOf dates — always show current month/year
  const currentMonthYear = new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  const MACRO_INDICATORS_LIVE = MACRO_INDICATORS.map((ind: any) => ({ ...ind, asOf: currentMonthYear }));
  const PHILOSOPHER_STANCES = localeData.PHILOSOPHER_STANCES;
  const SECTOR_ROTATION = localeData.SECTOR_ROTATION;
  const HISTORICAL_CORRELATIONS = localeData.HISTORICAL_CORRELATIONS;
  const CURRENCY_SENSITIVITY = localeData.CURRENCY_SENSITIVITY;
  const getDailyBrief = localeData.getDailyBrief;

  const [tab, setTab] = useState<PulseTab>('macro');
  const [activeLens, setActiveLens] = useState<'None' | 'All' | 'Hayek' | 'Friedman' | 'Keynes'>('None');

  const [prices, setPrices] = useState<Record<string, any> | null>(null);
  const [breadth, setBreadth] = useState<any | null>(null);
  const [currencies, setCurrencies] = useState<any[] | null>(null);
  const [blocks, setBlocks] = useState<any | null>(null);

  const [hist30d, setHist30d] = useState<number | null>(null);
  const [liveContext, setLiveContext] = useState<{
    breadthBullish?: number;
    derivativesSignal?: number;
    historicalSpread30d?: number;
    evidenceRecencyHours?: number;
    pricedIn?: boolean;
  } | null>(null);

  // Deep-link tabs via ?tab=
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = new URLSearchParams(window.location.search).get('tab');
    if (isValidPulseTab(t)) setTab(t);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', url.toString());
  }, [tab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (isValidPulseTab(t)) setTab(t);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Persist lens
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('economyPlus.activeLens');
      if (saved === 'None' || saved === 'All' || saved === 'Hayek' || saved === 'Friedman' || saved === 'Keynes') setActiveLens(saved as any);
    } catch {}
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem('economyPlus.activeLens', activeLens); } catch {}
  }, [activeLens]);

  // Fetch live: prices
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch('/api/prices', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPrices(data);
      } catch {}
    };
    run();
    const t = setInterval(run, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Fetch live: breadth (NSE)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch('/api/pulse/breadth', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setBreadth(data);
      } catch {}
    };
    run();
    const t = setInterval(run, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Fetch live: currencies (Yahoo)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch('/api/pulse/currency', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCurrencies(data?.currencies || []);
      } catch {}
    };
    run();
    const t = setInterval(run, 120000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Fetch live: block deals (NSE)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch('/api/pulse/blocks', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setBlocks(data);
      } catch {}
    };
    run();
    const t = setInterval(run, 120000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Fetch hist30d
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch('/api/history/breadth', { cache: 'no-store' });
        if (!res.ok) return;
        const d = await res.json();
        if (!cancelled && typeof d?.breadth30dAvg === 'number') setHist30d(d.breadth30dAvg);
      } catch {}
    };
    run();
    return () => { cancelled = true; };
  }, []);

  // Build live context
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const ad = safeNum(breadth?.breadth?.advanceDeclineRatio);
        const niftyChg = getPct(prices?.['NIFTY50']);
        const goldChg = getPct(prices?.['GOLD']);

        const breadthBullish =
          ad !== null
            ? clamp(50 + ((ad - 1) * 40) + (niftyChg * 3), 0, 100)
            : undefined;

        const derivativesSignal =
          goldChg > 0.5 ? -1 :
          goldChg < -0.5 ? 1 : 0;

        const historicalSpread30d = hist30d ?? undefined;

        let evidenceRecencyHours = 6;
        try {
          const newsRes = await fetch('/api/news', { signal: AbortSignal.timeout(5000) });
          if (newsRes.ok) {
            const newsJson = await newsRes.json();
            if (newsJson?.generatedAt) {
              const diffMs = Date.now() - new Date(newsJson.generatedAt).getTime();
              evidenceRecencyHours = Math.max(0, diffMs / (1000 * 60 * 60));
            }
          }
        } catch {}

        const volComposite = Math.abs(niftyChg) * 0.6 + Math.abs(goldChg) * 0.4;
        const pricedIn = volComposite > 1.3;

        if (!cancelled) {
          setLiveContext({ breadthBullish, derivativesSignal, historicalSpread30d, evidenceRecencyHours, pricedIn });
        }
      } catch {}
    };

    run();
  }, [prices, breadth, hist30d]);

  const mood = useMemo(() => {
    const ad = safeNum(breadth?.breadth?.advanceDeclineRatio);
    const niftyChg = getPct(prices?.['NIFTY50']);

    let score = 50;
    if (ad !== null) score += (ad - 1) * 25;
    score += niftyChg * 10;
    score = clamp(Math.round(score), 0, 100);

    let m = 'NEUTRAL';
    let color = 'var(--amber)';
    let description = 'Mixed signals. Use selective positioning.';

    if (score >= 70) { m = 'BULLISH'; color = 'var(--green)'; description = 'Broad strength and positive momentum.'; }
    else if (score >= 55) { m = 'CAUTIOUSLY BULLISH'; color = '#34D399'; description = 'Positive bias, but stay selective.'; }
    else if (score <= 30) { m = 'BEARISH'; color = 'var(--red)'; description = 'Risk-off conditions. Reduce beta.'; }
    else if (score <= 45) { m = 'CAUTIOUSLY BEARISH'; color = '#FB923C'; description = 'Weak undertone. Prefer defensives.'; }

    return { mood: m, score, color, description };
  }, [breadth, prices]);

  const dynamicStances = useMemo(() => PHILOSOPHER_STANCES.map((ph: any) => ({
    ...ph,
    agreement: deriveDynamicAgreement(
      ph.philosopher,
      MACRO_REGIME.label,
      ph.indicators || [],
      mood.score,
      liveContext ?? undefined
    ),
  })), [mood.score, liveContext]);

  const consensus = useMemo(() => {
    const agreements = dynamicStances.map((s: any) => s.agreement);
    const avgAgreement = Math.round(agreements.reduce((a: any, b: any) => a + b, 0) / Math.max(1, agreements.length));
    const spread = Math.max(...agreements) - Math.min(...agreements);
    const label = avgAgreement >= 70 ? t('pulse.consensus.highConviction') : avgAgreement >= 55 ? t('pulse.consensus.moderateConviction') : t('pulse.consensus.lowConviction');
    const color = avgAgreement >= 70 ? 'var(--green)' : avgAgreement >= 55 ? 'var(--amber)' : 'var(--red)';
    return { avgAgreement, spread, label, color };
  }, [dynamicStances]);

  const regime = MACRO_REGIME;
  const brief = getDailyBrief();

  const councilReco =
    consensus.spread >= 55
      ? 'High uncertainty. Avoid leverage, prioritize balance-sheet strength, and size positions conservatively.'
      : consensus.avgAgreement >= 65
      ? 'Consensus tilts constructive. Prefer quality compounders + domestic cyclicals with strong cashflows.'
      : 'Mixed regime. Stay barbell: quality defensives + selective cyclicals. Keep cash for volatility.';

  const tabs: { key: PulseTab; label: string; emoji: string }[] = [
    { key: 'overview', label: t('pulse.tabs.overview'), emoji: '📊' },
    { key: 'macro', label: t('pulse.tabs.macro'), emoji: '🧠' },
    { key: 'rotation', label: t('pulse.tabs.rotation'), emoji: '🔄' },
    { key: 'evidence', label: t('pulse.tabs.evidence'), emoji: '📚' },
    { key: 'currency', label: t('pulse.tabs.currency'), emoji: '💱' },
    { key: 'brief', label: t('pulse.tabs.brief'), emoji: '📰' },
    { key: 'breadth', label: t('pulse.tabs.breadth'), emoji: '📈' },
    { key: 'blocks', label: t('pulse.tabs.blocks'), emoji: '💎' },
    { key: 'markets', label: 'Markets', emoji: '🌍' },
  ];

  const live = (k: string) => prices?.[k];
  const priceStr = (k: string, dp = 2) => {
    const p = safeNum(live(k)?.price ?? live(k)?.last ?? live(k)?.regularMarketPrice);
    if (p === null) return '—';
    return dp === 0 ? Math.round(p).toLocaleString() : p.toFixed(dp);
  };
  const pctStr = (k: string) => {
    const p = getPct(live(k));
    if (!Number.isFinite(p)) return '';
    return (p >= 0 ? '+' : '') + p.toFixed(2) + '%';
  };

  return (
    <div className="page-bg">
      {/* HEADER */}
      <div className="page-content" style={{ paddingBottom: 0 }}>
        <Link href="/" className="back-link">← {t('pulse.backToDashboard')}</Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title" style={{ color: 'var(--accent-gold)' }}>
              🌐 {t('pulse.title')}
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 12, fontFamily: 'var(--font-mono)' }}>· Data as of {currentMonthYear}</span>
            </h1>
            <p className="page-subtitle">
              {t('pulse.subtitle')}
            </p>
          </div>

          <div className="card-unified" style={{ padding: '16px 24px', minWidth: 160, textAlign: 'center' }}>
            <div className="stat-label">{t('pulse.marketMood')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: mood.color, fontFamily: 'var(--font-serif)', lineHeight: 1 }}>
              {mood.mood}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{t('pulse.scoreLabel')}: {mood.score}/100</div>
          </div>
        </div>

        <div className="card-unified" style={{ padding: '12px 18px', marginBottom: 24, borderLeft: `3px solid ${mood.color}` }}>
          <div style={{ fontSize: 13, color: mood.color }}>
            ⚡ {mood.description}
          </div>
        </div>
      </div>

      {/* REGIME BANNER */}
      <div className="page-content" style={{ paddingTop: 0 }}>
        <div className="card-unified" style={{ borderColor: 'var(--border-gold)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2, fontFamily: 'var(--font-mono)' }}>{t('pulse.currentMacroRegime')}</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--accent-gold)', letterSpacing: 2, fontWeight: 700, marginTop: 4 }}>
                {regime.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{regime.sublabel}</div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2, fontFamily: 'var(--font-mono)' }}>{t('pulse.consensusScore')}</div>
              <div style={{ marginTop: 4, fontSize: 16, fontWeight: 800, color: consensus.color, fontFamily: 'var(--font-mono)' }}>
                {consensus.avgAgreement}/100 · {consensus.label}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                {t('pulse.disagreementIndex')}: <span style={{ color: consensus.spread >= 55 ? 'var(--red)' : consensus.spread >= 35 ? 'var(--amber)' : 'var(--green)', fontWeight: 800 }}>{consensus.spread}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, height: 8, background: 'rgba(51,65,85,0.3)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: Math.min(100, Math.max(0, consensus.spread)) + '%', height: '100%', background: consensus.spread >= 55 ? 'var(--red)' : consensus.spread >= 35 ? 'var(--amber)' : 'var(--green)', borderRadius: 999 }} />
          </div>

          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{t('pulse.councilRecommends')}</span> {councilReco}
          </div>
        </div>

        {/* LENS */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, fontFamily: 'var(--font-mono)' }}>{t('pulse.lensLabel')}</span>
          {(['None', 'All', 'Hayek', 'Friedman', 'Keynes'] as const).map(lens => (
            <button
              key={lens}
              onClick={() => setActiveLens(lens)}
              className={activeLens === lens ? 'filter-pill active' : 'filter-pill'}
            >
              {lens === 'None' ? '⚪ None' : lens === 'All' ? ('🌐 ' + t('pulse.lensAll')) : lens === 'Hayek' ? ('🏛️ ' + t('pulse.lensHayek')) : lens === 'Friedman' ? ('📊 ' + t('pulse.lensFriedman')) : ('⚙️ ' + t('pulse.lensKeynes'))}
            </button>
          ))}
        </div>

        {/* TAB BAR */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap', overflowX: 'auto' }}>
          {tabs.map((t: any) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={tab === t.key ? 'tab-btn active' : 'tab-btn'}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="page-content" style={{ paddingTop: 0 }}>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
              <StatBox label="NIFTY 50" value={priceStr('NIFTY50', 2)} sub={pctStr('NIFTY50')} color={getPct(live('NIFTY50')) >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatBox label="SENSEX" value={priceStr('SENSEX', 2)} sub={pctStr('SENSEX')} color={getPct(live('SENSEX')) >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatBox label="BANK NIFTY" value={priceStr('BANK_NIFTY', 2)} sub={pctStr('BANK_NIFTY')} color={getPct(live('BANK_NIFTY')) >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatBox label="USD/INR" value={priceStr('USD/INR', 4)} sub={pctStr('USD/INR')} color={getPct(live('USD/INR')) >= 0 ? 'var(--red)' : 'var(--green)'} />
              <StatBox label="GOLD" value={priceStr('GOLD', 2)} sub={pctStr('GOLD')} color={getPct(live('GOLD')) >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatBox label="BTC" value={priceStr('BTC', 0)} sub={pctStr('BTC')} color={getPct(live('BTC')) >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatBox
                label={t('pulse.overview.breadthLabel')}
                value={breadth?.breadth?.advanceDeclineRatio ? String(breadth.breadth.advanceDeclineRatio) : '—'}
                sub={breadth?.breadth ? `  ·  ` : undefined}
                color="var(--amber)"
                onClick={() => setTab('breadth')}
              />
              <StatBox
                label={t('pulse.overview.blockDealsLabel')}
                value={blocks?.count ? String(blocks.count) : '—'}
                sub={blocks?.timestamp ? String(blocks.timestamp) : undefined}
                color="var(--accent-gold)"
                onClick={() => setTab('blocks')}
              />
            </div>

            <div className="card-unified">
              <SectionTitle emoji="📈" title={t('pulse.overview.sectorSnapshot')} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {(breadth?.sectors || []).slice(0, 12).map((s: any) => {
                  const pct = safeNum(s.changePct) ?? 0;
                  const col = pct >= 0 ? 'var(--green)' : 'var(--red)';
                  return (
                    <div key={s.sector} className="card-unified" style={{ padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{s.sector}</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: col, fontFamily: 'var(--font-mono)' }}>{(pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'}</div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {t('pulse.overview.lastLabel')}: {safeNum(s.last) !== null ? Number(s.last).toFixed(2) : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MACRO */}
        {tab === 'macro' && (
          <div>
            <div className="card-unified" style={{ borderColor: 'var(--border-gold)', marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 6, fontFamily: 'var(--font-mono)' }}>{t('pulse.currentMacroRegime')}</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--accent-gold)', letterSpacing: 2, fontWeight: 700 }}>
                {regime.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{regime.sublabel}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 14 }}>{regime.description}</div>
              <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)' }}>
                {t('pulse.macro.historicalAnalog')}: {regime.historicalAnalog} ({regime.analogPeriod})
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
              {MACRO_INDICATORS_LIVE.map((ind: any) => (
                <div key={ind.label} className="card-unified" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{ind.label}</div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      color: ind.signal === 'bullish' ? 'var(--green)' : ind.signal === 'bearish' ? 'var(--red)' : 'var(--amber)'
                    }}>
                      {ind.value}{ind.unit}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ind.description}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>
                    {t('pulse.macro.asOfLabel')} {ind.asOf} · {ind.trendValue}
                  </div>
                </div>
              ))}
            </div>

            <div className="card-unified">
              <SectionTitle emoji="💱" title={t('pulse.macro.currencyImpact')} color="var(--accent-gold)" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                {(currencies || []).map((c: any) => {
                  const pos = (safeNum(c.changePct) ?? 0) >= 0;
                  const col = pos ? 'var(--red)' : 'var(--green)';
                  const rate = safeNum(c.rate);
                  return (
                    <div key={c.pair} className="card-unified" style={{ padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{c.pair}</div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{rate !== null ? rate.toFixed(4) : '—'}</div>
                      </div>
                      <div style={{ fontSize: 11, color: col, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        {(safeNum(c.changePct) !== null) ? ((pos ? '+' : '') + Number(c.changePct).toFixed(2) + '%') : '—'}
                        {' '}
                        {(safeNum(c.change) !== null) ? '(' + (pos ? '+' : '') + Number(c.change).toFixed(4) + ')' : ''}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.signal || ''}</div>
                      <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {t('pulse.macro.trendLabel')}: {c.trend || '—'} · {t('pulse.macro.volLabel')}: {c.volatility || '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ROTATION */}
        {tab === 'rotation' && (
          <div>
            <div className="card-unified" style={{ padding: 18, marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--accent-gold)', letterSpacing: 2, fontWeight: 700, marginBottom: 12 }}>
                🔄 {t('pulse.rotation.title')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {t('pulse.rotation.description')}
              </div>
            </div>

            <div className="card-unified" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-sacred" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 140 }}>{t('pulse.rotation.tableHeaders.sector')}</th>
                      <th style={{ textAlign: 'center' }}>🏛️ {t('pulse.rotation.tableHeaders.hayek')}</th>
                      <th style={{ textAlign: 'center' }}>📊 {t('pulse.rotation.tableHeaders.friedman')}</th>
                      <th style={{ textAlign: 'center' }}>⚙️ {t('pulse.rotation.tableHeaders.keynes')}</th>
                      <th style={{ textAlign: 'center' }}>{t('pulse.rotation.tableHeaders.consensus')}</th>
                      <th style={{ textAlign: 'center' }}>{t('pulse.rotation.tableHeaders.spread')}</th>
                      <th style={{ textAlign: 'center' }}>{t('pulse.rotation.tableHeaders.bias')}</th>
                      <th style={{ minWidth: 180 }}>{t('pulse.rotation.tableHeaders.driver')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SECTOR_ROTATION.map((s: any, i: number) => {
                      const spreadCol = s.spread >= 50 ? 'var(--red)' : s.spread >= 30 ? 'var(--amber)' : 'var(--green)';
                      const scoreCell = (score: number) => {
                        const bg = score >= 70 ? 'rgba(34,197,94,0.1)' : score >= 55 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
                        const fg = score >= 70 ? 'var(--green)' : score >= 55 ? 'var(--amber)' : 'var(--red)';
                        return { bg, fg };
                      };
                      const hc = scoreCell(s.hayek.score);
                      const fc = scoreCell(s.friedman.score);
                      const kc = scoreCell(s.keynes.score);
                      const cc = scoreCell(s.consensus);

                      return (
                        <tr key={s.sector}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 16 }}>{s.icon}</span>
                              <span style={{ fontWeight: 700 }}>{s.sector}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', background: hc.bg }}>
                            <div style={{ fontWeight: 800, color: hc.fg, fontFamily: 'var(--font-mono)' }}>{s.hayek.score}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.hayek.stance}</div>
                          </td>
                          <td style={{ textAlign: 'center', background: fc.bg }}>
                            <div style={{ fontWeight: 800, color: fc.fg, fontFamily: 'var(--font-mono)' }}>{s.friedman.score}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.friedman.stance}</div>
                          </td>
                          <td style={{ textAlign: 'center', background: kc.bg }}>
                            <div style={{ fontWeight: 800, color: kc.fg, fontFamily: 'var(--font-mono)' }}>{s.keynes.score}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.keynes.stance}</div>
                          </td>
                          <td style={{ textAlign: 'center', background: cc.bg }}>
                            <div style={{ fontWeight: 800, color: cc.fg, fontSize: 16, fontFamily: 'var(--font-mono)' }}>{s.consensus}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ color: spreadCol, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.spread}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge" style={{
                              background: s.biasColor + '20',
                              borderColor: s.biasColor + '50',
                              color: s.biasColor,
                              fontSize: 10
                            }}>
                              {s.forwardBias}
                            </span>
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.keyMacroDriver}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* EVIDENCE, CURRENCY, BRIEF, BREADTH, BLOCKS — Keep original inline styles but within new container */}
        {tab === 'evidence' && (
          <div>
            <div style={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 16, padding: 18, marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--accent-gold)', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>
                📚 {t('pulse.evidence.title')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {t('pulse.evidence.description')}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {HISTORICAL_CORRELATIONS
                .filter((c: any) => activeLens === 'None' ? true : activeLens === 'All' || c.philosopher === activeLens || c.philosopher === 'All')
                .map((c: any) => (
                  <div key={c.id} style={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(30,41,59,0.8)', borderRadius: 16, padding: 20, position: 'relative' }}>
                    {c.regimeMatch && (
                      <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, color: 'var(--green)', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>
                        ✓ {t('pulse.evidence.regimeMatch')}
                      </div>
                    )}

                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700, lineHeight: 1.4, marginBottom: 14, paddingRight: 100 }}>
                      {c.title}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                      <div style={{ background: 'rgba(31,41,59,0.6)', border: '1px solid rgba(51,65,85,0.5)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{t('pulse.evidence.winRate')}</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: c.winRate >= 75 ? 'var(--green)' : c.winRate >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                          {c.winRate}%
                        </div>
                      </div>
                      <div style={{ background: 'rgba(31,41,59,0.6)', border: '1px solid rgba(51,65,85,0.5)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{t('pulse.evidence.avg')}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-gold)' }}>{c.avgReturn}</div>
                      </div>
                      <div style={{ background: 'rgba(31,41,59,0.6)', border: '1px solid rgba(51,65,85,0.5)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{t('pulse.evidence.instances')}</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)' }}>{c.instances}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{t('pulse.evidence.conditionLabel')} </span>{c.condition}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{t('pulse.evidence.outcomeLabel')} </span>{c.outcome}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 9, color: c.confidenceColor, background: c.confidenceColor + '15', border: '1px solid ' + c.confidenceColor + '30', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>
                        {c.confidence} {t('pulse.evidence.confidenceSuffix')}
                      </span>
                      <span style={{ fontSize: 9, color: c.philosopherColor }}>
                        {c.philosopher}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {tab === 'currency' && (
          <div>
            <div style={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 16, padding: 18, marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--accent-gold)', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>
                💱 {t('pulse.currency.title')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {t('pulse.currency.description')}
              </div>
            </div>

            <div style={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(30,41,59,0.8)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-sacred" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>{t('pulse.currency.tableHeaders.sector')}</th>
                      <th style={{ textAlign: 'center' }}>{t('pulse.currency.tableHeaders.rev')}</th>
                      <th style={{ textAlign: 'center' }}>{t('pulse.currency.tableHeaders.cost')}</th>
                      <th style={{ textAlign: 'center', color: 'var(--green)' }}>{t('pulse.currency.tableHeaders.inrWeak')}</th>
                      <th style={{ textAlign: 'center', color: 'var(--red)' }}>{t('pulse.currency.tableHeaders.inrStrong')}</th>
                      <th style={{ textAlign: 'center' }}>{t('pulse.rotation.tableHeaders.bias')}</th>
                      <th>{t('pulse.currency.tableHeaders.examples')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CURRENCY_SENSITIVITY.map((s: any, i: number) => (
                      <tr key={s.sector}>
                        <td>
                          <span style={{ fontSize: 16 }}>{s.icon}</span>
                          <span style={{ fontWeight: 700, marginLeft: 8 }}>{s.sector}</span>
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 11 }}>{s.revenueExposure}</td>
                        <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 11 }}>{s.costExposure}</td>
                        <td style={{ textAlign: 'center', fontWeight: 900, color: s.inrDepreciation1pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {(s.inrDepreciation1pct >= 0 ? '+' : '') + s.inrDepreciation1pct.toFixed(1) + '%'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 900, color: s.inrAppreciation1pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {(s.inrAppreciation1pct >= 0 ? '+' : '') + s.inrAppreciation1pct.toFixed(1) + '%'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: 10, color: s.biasColor, background: s.biasColor + '18', border: '1px solid ' + s.biasColor + '40', padding: '5px 12px', borderRadius: 999, fontWeight: 700 }}>
                            {s.netBias}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.examples.join(' · ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'brief' && (
          <div>
            <div style={{ background: 'linear-gradient(135deg, rgba(17,24,39,0.9), rgba(10,15,28,0.95))', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 16, padding: 26, marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 6 }}>{brief.date}</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--accent-gold)', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>
                📰 {brief.headline}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>{brief.regimeLabel}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {brief.sections
                .filter((s: any) => activeLens === 'All' || !s.philosopher || s.philosopher === activeLens)
                .map((s: any, i: number) => (
                  <div key={i} style={{ background: 'rgba(17,24,39,0.85)', border: '1px solid ' + (s.philosopherColor ? s.philosopherColor + '30' : 'rgba(30,41,59,0.8)'), borderLeft: '3px solid ' + (s.philosopherColor || 'var(--accent-gold)'), borderRadius: 12, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                      <div style={{ fontWeight: 700, color: s.philosopherColor || 'var(--accent-gold)', fontSize: 13 }}>{s.title}</div>
                      {s.philosopher && (
                        <span style={{ marginLeft: 'auto', fontSize: 9, color: s.philosopherColor, background: s.philosopherColor + '15', border: '1px solid ' + s.philosopherColor + '30', padding: '4px 10px', borderRadius: 999 }}>
                          {s.philosopher}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{s.content}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {tab === 'breadth' && (
          <div>
            <div className="card-unified" style={{ padding: 20, marginBottom: 24 }}>
              <SectionTitle emoji="📈" title={t('pulse.breadth.title')} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                <StatBox label={t('pulse.breadth.advancing')} value={breadth?.breadth ? String(breadth.breadth.advances) : '—'} color="var(--green)" />
                <StatBox label={t('pulse.breadth.declining')} value={breadth?.breadth ? String(breadth.breadth.declines) : '—'} color="var(--red)" />
                <StatBox label={t('pulse.breadth.unchanged')} value={breadth?.breadth ? String(breadth.breadth.unchanged) : '—'} color="#818CF8" />
                <StatBox label={t('pulse.breadth.adRatio')} value={breadth?.breadth?.advanceDeclineRatio ? String(breadth.breadth.advanceDeclineRatio) : '—'} color="var(--amber)" />
              </div>
            </div>

            <div className="card-unified" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(30,41,59,0.8)' }}>
                <SectionTitle emoji="📊" title={t('pulse.breadth.sectorMovesTitle')} />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-sacred" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      {[
  { key: 'sector', label: t('pulse.breadth.tableHeaders.sector'), align: 'left' as const },
  { key: 'last', label: t('pulse.breadth.tableHeaders.last'), align: 'right' as const },
  { key: 'change', label: t('pulse.breadth.tableHeaders.change'), align: 'right' as const },
  { key: 'high', label: t('pulse.breadth.tableHeaders.high'), align: 'right' as const },
  { key: 'low', label: t('pulse.breadth.tableHeaders.low'), align: 'right' as const },
  { key: 'open', label: t('pulse.breadth.tableHeaders.open'), align: 'right' as const },
  { key: 'prevClose', label: t('pulse.breadth.tableHeaders.prevClose'), align: 'right' as const },
].map((h: any) => (
  <th key={h.key} style={{ textAlign: h.align }}>{h.label}</th>
))}
                    </tr>
                  </thead>
                  <tbody>
                    {(breadth?.sectors || []).map((s: any, i: number) => {
                      const pct = safeNum(s.changePct) ?? 0;
                      const col = pct >= 0 ? 'var(--green)' : 'var(--red)';
                      return (
                        <tr key={s.sector}>
                          <td style={{ fontWeight: 600 }}>{s.sector}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{safeNum(s.last) !== null ? Number(s.last).toFixed(2) : '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: col }}>{(pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{safeNum(s.high) !== null ? Number(s.high).toFixed(2) : '—'}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{safeNum(s.low) !== null ? Number(s.low).toFixed(2) : '—'}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{safeNum(s.open) !== null ? Number(s.open).toFixed(2) : '—'}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{safeNum(s.prevClose) !== null ? Number(s.prevClose).toFixed(2) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'blocks' && (
          <div>
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 22, fontSize: 12, color: 'var(--amber)' }}>
              💎 {t('pulse.blocks.description')}
            </div>

            <div className="card-unified" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-sacred" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      {[
  { key: 'symbol', label: t('pulse.blocks.tableHeaders.symbol'), align: 'left' as const },
  { key: 'qty', label: t('pulse.blocks.tableHeaders.qty'), align: 'right' as const },
  { key: 'price', label: t('pulse.blocks.tableHeaders.price'), align: 'right' as const },
  { key: 'value', label: t('pulse.blocks.tableHeaders.value'), align: 'right' as const },
  { key: 'change', label: t('pulse.blocks.tableHeaders.change'), align: 'right' as const },
  { key: 'side', label: t('pulse.blocks.tableHeaders.side'), align: 'right' as const },
  { key: 'series', label: t('pulse.blocks.tableHeaders.series'), align: 'right' as const },
].map((h: any) => (
  <th key={h.key} style={{ textAlign: h.align }}>{h.label}</th>
))}
                    </tr>
                  </thead>
                  <tbody>
                    {(blocks?.deals || []).map((d: any, i: number) => {
                      const pct = safeNum(d.changePct) ?? 0;
                      const col = pct >= 0 ? 'var(--green)' : 'var(--red)';
                      return (
                        <tr key={d.symbol + '-' + i}>
                          <td style={{ color: 'var(--amber)', fontWeight: 700 }}>{d.symbol}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{safeNum(d.quantity) !== null ? Number(d.quantity).toLocaleString() : '—'}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{safeNum(d.price) !== null ? Number(d.price).toFixed(2) : '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-gold)' }}>{safeNum(d.value) !== null ? Number(d.value).toFixed(2) : '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: col }}>{(pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{
                              background: d.side === 'BUY' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                              border: '1px solid ' + (d.side === 'BUY' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'),
                              color: d.side === 'BUY' ? 'var(--green)' : 'var(--red)',
                              borderRadius: 6,
                              padding: '4px 12px',
                              fontSize: 10,
                              fontWeight: 700
                            }}>
                              {d.side}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{d.series || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {tab === 'markets' && (
          <div>
            <WorldMarketsGrid activeLens={activeLens} />
          </div>
        )}

      </div>

      {/* FOOTER */}
      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
        NOT INVESTMENT ADVICE · EDUCATIONAL SIMULATION · RISHI TERMINAL
      </div>
    </div>
  );
}
