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

function NewsCard({ news, saved, toggleSave, t }: {
  news: NewsItem | LiveNewsItem;
  saved: string[];
  toggleSave: (id: string) => void;
  t: (key: string) => string;
}) {
  const router  = useRouter();
  const isSaved = saved.includes(news.id);
  const isLive  = !!(news as LiveNewsItem).pubDate && news.url !== '#';

  const handleClick = () => {
    if (isLive && news.url && news.url !== '#') {
      window.open(news.url, '_blank', 'noopener,noreferrer');
    } else {
      router.push('/news/' + news.id);
    }
  };

  const impactLabel = news.impact === 'POSITIVE' ? t('news.bullish') : news.impact === 'NEGATIVE' ? t('news.bearish') : t('news.neutral');

  return (
    <div
      onClick={handleClick}
      className="card-sacred"
      style={{
        padding: 16,
        cursor: 'pointer',
        transition: 'all 0.15s',
        borderLeft: '3px solid ' + impactColor(news.impact),
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          <span style={{
            fontSize: 8, fontFamily: 'monospace', letterSpacing: 1,
            color: regionColor(news.region),
            background: regionColor(news.region) + '15',
            border: '1px solid ' + regionColor(news.region) + '30',
            borderRadius: 4, padding: '2px 7px', fontWeight: 700,
          }}>
            {regionFlag(news.region)} {news.region}
          </span>
          <span style={{
            fontSize: 8, color: 'var(--text-muted)',
            background: 'var(--bg-secondary)', borderRadius: 4, padding: '2px 7px',
          }}>
            {news.category}
          </span>
          <span style={{
            fontSize: 8, fontWeight: 700,
            color: impactColor(news.impact),
            background: impactBg(news.impact),
            borderRadius: 4, padding: '2px 7px', letterSpacing: 1,
          }}>
            {impactLabel}
          </span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); toggleSave(news.id); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 18, color: isSaved ? 'var(--accent-gold)' : 'var(--text-muted)',
            transition: 'color 0.2s',
          }}
        >
          {isSaved ? 'â˜…' : 'â˜†'}
        </button>
      </div>

      <h3 style={{
        fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
        marginBottom: 8, lineHeight: 1.4,
      }}>
        {news.headline}
      </h3>

      <p style={{
        fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10,
      }}>
        {news.summary}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          <span>{news.source}</span>
          <span>â€¢</span>
          <span>{timeAgoLabel(news.minutesAgo)}</span>
        </div>
        {(news as any).tickers && (news as any).tickers.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {((news as any).tickers as string[]).slice(0, 3).map((ticker: string) => (
              <span key={ticker} style={{
                fontSize: 9, fontWeight: 700, fontFamily: 'monospace',
                background: 'var(--accent-gold)' + '20',
                color: 'var(--accent-gold)',
                padding: '2px 6px', borderRadius: 3,
              }}>
                {ticker}
              </span>
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
  const [loading, setLoading]     = useState(false);

  // Live ticker prices
  const tickerSymbols = useMemo(() => ['BTC', 'ETH', 'GOLD', 'SILVER', 'WTI', 'RELIANCE', 'TCS', 'INFY'], []);
  const { prices } = useLivePrices(tickerSymbols);

  const tickerItems = useMemo(() => {
    return tickerSymbols.map(sym => {
      const livePrice = prices[sym];
      if (!livePrice) return { symbol: sym, price: 'â€”', change: 0 };
      
      const priceFormatted = sym.startsWith('BTC') || sym.startsWith('ETH') 
        ? '$' + livePrice.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : sym === 'GOLD' || sym === 'SILVER' || sym === 'WTI'
        ? '$' + livePrice.price.toFixed(2)
        : '' + livePrice.price.toFixed(2);

      return {
        symbol: sym,
        price: priceFormatted,
        change: livePrice.change || 0,
      };
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
    async function loadLive() {
      setLoading(true);
      const news = await fetchAllNews();
      setLiveNews(news);
      setLoading(false);
    }
    loadLive();
    const interval = setInterval(loadLive, 300000);
    return () => clearInterval(interval);
  }, []);

  const toggleSave = (id: string) => {
    const updated = saved.includes(id) ? saved.filter(s => s !== id) : [...saved, id];
    setSaved(updated);
    localStorage.setItem('rishi_saved_news', JSON.stringify(updated));
  };

  const allNews = [...liveNews, ...NEWS_FEED];
  const filtered = allNews
    .filter(n => region === 'ALL' || n.region === region)
    .filter(n => category === 'All' || n.category === category);

  const regions: Region[]     = ['ALL', 'INDIA', 'GLOBAL', 'CRYPTO', 'SPORTS'];
  const categories: Category[] = ['All', 'Markets', 'Economy', 'Earnings', 'Cricket', 'IPL', 'Tech', 'Regulation', 'Corporate', 'Crypto'];

  return (
    <main className="page-container">
      {/* Live Ticker */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-primary)',
        padding: '10px 0',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          gap: 32,
          animation: 'scroll-ticker 30s linear infinite',
          whiteSpace: 'nowrap',
        }}>
          {[...tickerItems, ...tickerItems].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)' }}>
                {item.symbol}
              </span>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                {item.price}
              </span>
              <span style={{
                fontSize: 10,
                fontFamily: 'monospace',
                fontWeight: 700,
                color: item.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
              }}>
                {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <span>{t('news.breadcrumb')}</span>
          </div>

          <h1 className="philosophy-heading" style={{ fontSize: 36, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 8 }}>
            {t('news.title')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.6 }}>
            {t('news.subtitle')}
          </p>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '28px 24px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {regions.map(r => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: region === r ? 700 : 400,
                  border: region === r ? 'none' : '1px solid var(--border-primary)',
                  background: region === r ? regionColor(r) + '30' : 'var(--bg-card)',
                  color: region === r ? regionColor(r) : 'var(--text-muted)',
                  fontFamily: 'monospace',
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 4,
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: category === c ? 700 : 400,
                  border: '1px solid var(--border-primary)',
                  background: category === c ? 'var(--accent-gold)' + '20' : 'var(--bg-card)',
                  color: category === c ? 'var(--accent-gold)' : 'var(--text-muted)',
                  fontFamily: 'monospace',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* News Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
          {filtered.map(news => (
            <NewsCard key={news.id} news={news} saved={saved} toggleSave={toggleSave} t={t} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
            No news found for selected filters.
          </div>
        )}
      </div>
    </main>
  );
}
