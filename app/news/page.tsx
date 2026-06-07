'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NEWS_FEED, TICKER_ITEMS, TRENDING_TOPICS, IPL_TEAMS, CRICKET_LIVE, NewsItem } from '../../data/news';
import { fetchAllNews, LiveNewsItem } from '../../lib/newsApi';
import { useLanguage } from '../../lib/language';
import { useLivePrices } from '../../hooks/useLivePrices';

type Region   = 'ALL' | 'INDIA' | 'GLOBAL' | 'CRYPTO' | 'SPORTS';
type Category = 'All' | 'Markets' | 'Economy' | 'Earnings' | 'Cricket' | 'IPL' | 'Tech' | 'Regulation' | 'Corporate' | 'Crypto';

function timeAgoLabel(min: number) {
  if (min < 1)    return 'just now';
  if (min < 60)   return min + 'm ago';
  if (min < 1440) return Math.floor(min / 60) + 'h ago';
  return Math.floor(min / 1440) + 'd ago';
}

function impactColor(impact: string) {
  if (impact === 'POSITIVE') return '#10B981';
  if (impact === 'NEGATIVE') return '#EF4444';
  return '#818CF8';
}

function impactBg(impact: string) {
  if (impact === 'POSITIVE') return '#10B98115';
  if (impact === 'NEGATIVE') return '#EF444415';
  return '#818CF815';
}

function regionColor(r: string) {
  if (r === 'INDIA')  return '#F59E0B';
  if (r === 'GLOBAL') return '#818CF8';
  if (r === 'SPORTS') return '#10B981';
  return '#A78BFA';
}

function regionFlag(r: string) {
  if (r === 'INDIA')  return 'IN';
  if (r === 'GLOBAL') return 'GL';
  if (r === 'SPORTS') return 'SP';
  return 'CR';
}

function SkeletonCard() {
  return (
    <div className="card-sacred" style={{ padding: 16, borderLeft: '3px solid var(--border-primary)' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <div style={{ height: 18, width: 48, borderRadius: 4, background: 'var(--bg-secondary)', animation: 'skp 1.4s ease-in-out infinite' }} />
        <div style={{ height: 18, width: 60, borderRadius: 4, background: 'var(--bg-secondary)', animation: 'skp 1.4s ease-in-out infinite 0.1s' }} />
        <div style={{ height: 18, width: 52, borderRadius: 4, background: 'var(--bg-secondary)', animation: 'skp 1.4s ease-in-out infinite 0.2s' }} />
      </div>
      <div style={{ height: 20, width: '85%', borderRadius: 4, background: 'var(--bg-secondary)', marginBottom: 8, animation: 'skp 1.4s ease-in-out infinite 0.1s' }} />
      <div style={{ height: 20, width: '65%', borderRadius: 4, background: 'var(--bg-secondary)', marginBottom: 10, animation: 'skp 1.4s ease-in-out infinite 0.15s' }} />
      <div style={{ height: 13, width: '90%', borderRadius: 4, background: 'var(--bg-secondary)', marginBottom: 6, animation: 'skp 1.4s ease-in-out infinite 0.2s' }} />
      <div style={{ height: 13, width: '70%', borderRadius: 4, background: 'var(--bg-secondary)', marginBottom: 10, animation: 'skp 1.4s ease-in-out infinite 0.25s' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <div style={{ height: 10, width: 60, borderRadius: 4, background: 'var(--bg-secondary)', animation: 'skp 1.4s ease-in-out infinite 0.3s' }} />
        <div style={{ height: 10, width: 10, borderRadius: 4, background: 'var(--bg-secondary)', animation: 'skp 1.4s ease-in-out infinite 0.35s' }} />
        <div style={{ height: 10, width: 40, borderRadius: 4, background: 'var(--bg-secondary)', animation: 'skp 1.4s ease-in-out infinite 0.4s' }} />
      </div>
    </div>
  );
}

function NewsCard({ news, saved, toggleSave, t }: {
  news: NewsItem | LiveNewsItem;
  saved: string[];
  toggleSave: (id: string) => void;
  t: (key: string) => string;
}) {
  const router  = useRouter();
  const isSaved = saved.includes(news.id);

  const handleClick = () => {
    if (news.url && news.url !== '#') {
      window.open(news.url, '_blank', 'noopener,noreferrer');
    } else {
      router.push('/news/' + news.id);
    }
  };

  const impactLabel = news.impact === 'POSITIVE' ? t('news.bullish') : news.impact === 'NEGATIVE' ? t('news.bearish') : t('news.neutral');

  return (
    <div onClick={handleClick} className="card-sacred" style={{ padding: 16, cursor: 'pointer', transition: 'all 0.15s', borderLeft: '3px solid ' + impactColor(news.impact) }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          <span style={{ fontSize: 8, fontFamily: 'monospace', letterSpacing: 1, color: regionColor(news.region), background: regionColor(news.region) + '15', border: '1px solid ' + regionColor(news.region) + '30', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>{regionFlag(news.region)} {news.region}</span>
          <span style={{ fontSize: 8, color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 4, padding: '2px 7px' }}>{news.category}</span>
          <span style={{ fontSize: 8, fontWeight: 700, color: impactColor(news.impact), background: impactBg(news.impact), borderRadius: 4, padding: '2px 7px', letterSpacing: 1 }}>{impactLabel}</span>
        </div>
        <button onClick={e => { e.stopPropagation(); toggleSave(news.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: isSaved ? 'var(--accent-gold)' : 'var(--text-muted)', transition: 'color 0.2s' }}>{isSaved ? '\u2605' : '\u2606'}</button>
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4 }}>{news.headline}</h3>
      {news.summary && news.summary !== news.headline && news.summary.length > 30 && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>{news.summary}</p>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          <span>{news.source}</span>
          <span>&bull;</span>
          <span>{timeAgoLabel(news.minutesAgo)}</span>
        </div>
        {(news as any).tickers && (news as any).tickers.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {((news as any).tickers as string[]).slice(0, 3).map((ticker: string) => (
              <span key={ticker} style={{ fontSize: 9, fontWeight: 700, fontFamily: 'monospace', background: 'var(--accent-gold)' + '20', color: 'var(--accent-gold)', padding: '2px 6px', borderRadius: 3 }}>{ticker}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewsPage() {
  const { t } = useLanguage();
  const [region, setRegion]       = useState<Region>('ALL');
  const [category, setCategory]   = useState<Category>('All');
  const [saved, setSaved]         = useState<string[]>([]);
  const [liveNews, setLiveNews]   = useState<LiveNewsItem[]>([]);
  const [loading, setLoading]     = useState(true);

  const tickerSymbols = useMemo(() => ['BTC', 'ETH', 'GOLD', 'SILVER', 'WTI', 'RELIANCE', 'TCS', 'INFY'], []);
  const { prices } = useLivePrices(tickerSymbols);

  const tickerItems = useMemo(() => {
    return tickerSymbols.map(sym => {
      const livePrice = prices[sym];
      if (!livePrice) return { symbol: sym, price: '--', change: 0 };
      const priceFormatted = sym.startsWith('BTC') || sym.startsWith('ETH')
        ? '$' + livePrice.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : sym === 'GOLD' || sym === 'SILVER' || sym === 'WTI'
        ? '$' + livePrice.price.toFixed(2)
        : '' + livePrice.price.toFixed(2);
      return { symbol: sym, price: priceFormatted, change: livePrice.change || 0 };
    });
  }, [prices, tickerSymbols]);

  useEffect(() => {
    const savedStr = localStorage.getItem('rishi_saved_news');
    if (savedStr) {
      try { setSaved(JSON.parse(savedStr)); }
      catch { setSaved([]); }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLive(silent: boolean = false) {
      if (!silent) setLoading(true);
      try {
        const news = await fetchAllNews();
        if (!cancelled) {
          setLiveNews(news);
          try { localStorage.setItem('rishi.news.cache', JSON.stringify({ ts: Date.now(), news })); } catch {}
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Try localStorage cache first — show instantly
    try {
      const cached = localStorage.getItem('rishi.news.cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - (parsed.ts || 0);
        if (parsed.news && Array.isArray(parsed.news) && parsed.news.length > 0) {
          setLiveNews(parsed.news);
          setLoading(false);
          // Stale? Refresh silently in background
          if (age >= 120000) { loadLive(true); }
          const interval = setInterval(() => loadLive(true), 300000);
          return () => { cancelled = true; clearInterval(interval); };
        }
      }
    } catch {}

    // No cache — show skeleton, fetch fresh
    loadLive(false);
    const interval = setInterval(() => loadLive(true), 300000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const toggleSave = (id: string) => {
    const updated = saved.includes(id) ? saved.filter(s => s !== id) : [...saved, id];
    setSaved(updated);
    localStorage.setItem('rishi_saved_news', JSON.stringify(updated));
  };

  const allNews = liveNews;
  const filtered = allNews
    .filter(n => region === 'ALL' || n.region === region)
    .filter(n => category === 'All' || n.category === category);

  const categories: Category[] = ['All', 'Markets', 'Economy', 'Earnings', 'Cricket', 'IPL', 'Tech', 'Regulation', 'Corporate', 'Crypto'];

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of allNews) {
      if (region !== 'ALL' && n.region !== region) continue;
      counts[n.category] = (counts[n.category] || 0) + 1;
    }
    return counts;
  }, [allNews, region]);

  return (
    <main className="page-container">
      <style jsx>{`
        @keyframes scroll-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes skp { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>

      {/* Live Ticker */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', padding: '10px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 32, animation: 'scroll-ticker 30s linear infinite', whiteSpace: 'nowrap' }}>
          {[...tickerItems, ...tickerItems].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)' }}>{item.symbol}</span>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{item.price}</span>
              <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: item.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="page-header">
        <div className="content-wrapper">
          <div className="page-breadcrumb">
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <span>{t('news.breadcrumb')}</span>
          </div>
          <h1 className="page-title" style={{ color: 'var(--accent-gold)', marginBottom: 8 }}>{t('news.title')}</h1>
          <p className="page-subtitle" style={{ maxWidth: 600 }}>{t('news.subtitle')}</p>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '28px 24px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 8, WebkitOverflowScrolling: 'touch' }}>
          {categories.map(c => {
            const count = c === 'All' ? allNews.length : allNews.filter(n => n.category === c).length;
            if (c !== 'All' && count === 0) return null;
            return (
              <button key={c} onClick={() => setCategory(c)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: category === c ? 700 : 500, border: category === c ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(30,41,59,0.8)', background: category === c ? 'rgba(212,175,55,0.15)' : 'rgba(17,24,39,0.85)', color: category === c ? 'var(--accent-gold)' : 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {c} {count > 0 && <span style={{ opacity: 0.6 }}>({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Skeleton while loading with no cache */}
        {loading && liveNews.length === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* News Grid */}
        {liveNews.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
            {filtered.map(news => <NewsCard key={news.id} news={news} saved={saved} toggleSave={toggleSave} t={t} />)}
          </div>
        )}

        {!loading && filtered.length === 0 && liveNews.length > 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: 14 }}>No news found for selected filters.</div>
        )}
      </div>
    </main>
  );
}
