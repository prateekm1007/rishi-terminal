'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NEWS_FEED, TICKER_ITEMS, TRENDING_TOPICS, IPL_TEAMS, CRICKET_LIVE, NewsItem } from '../../data/news';
import { fetchAllNews, LiveNewsItem } from '../../lib/newsApi';

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

function NewsCard({ news, saved, toggleSave }: {
  news: NewsItem | LiveNewsItem;
  saved: string[];
  toggleSave: (id: string) => void;
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
      {/* TOP BADGES */}
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
            borderRadius: 4, padding: '2px 7px',
          }}>
            {news.impact === 'POSITIVE' ? 'BULLISH' : news.impact === 'NEGATIVE' ? 'BEARISH' : 'NEUTRAL'}
          </span>
          {news.isBreaking && (
            <span style={{ fontSize: 8, color: '#EF4444', background: '#EF444420', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
              BREAKING
            </span>
          )}
          {news.isTrending && (
            <span style={{ fontSize: 8, color: '#F59E0B', background: '#F59E0B15', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
              HOT
            </span>
          )}
          {isLive && (
            <span style={{ fontSize: 8, color: '#10B981', background: '#10B98115', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
              LIVE
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {timeAgoLabel(news.minutesAgo)}
          </span>
          <button
            onClick={e => { e.stopPropagation(); toggleSave(news.id); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, color: isSaved ? '#F59E0B' : 'var(--text-muted)', padding: 0,
            }}
          >
            {isSaved ? '★' : '☆'}
          </button>
        </div>
      </div>

      {/* HEADLINE */}
      <div style={{
        fontSize: 13, color: 'var(--text-primary)', fontWeight: 600,
        lineHeight: 1.5, marginBottom: 8,
      }}>
        {news.headline}
      </div>

      {/* SUMMARY */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 10 }}>
        {news.summary.slice(0, 140)}...
      </div>

      {/* TAGS + SOURCE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {news.tags.slice(0, 4).map(tag => (
            <span key={tag} style={{
              fontSize: 8, color: 'var(--text-muted)',
              background: 'var(--bg-secondary)', borderRadius: 3, padding: '2px 6px',
              fontFamily: 'monospace',
            }}>
              #{tag}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>via {news.source}</span>
          <span style={{
            fontSize: 9,
            color: isLive ? '#10B981' : '#F59E0B',
            border: '1px solid ' + (isLive ? '#10B98130' : '#F59E0B30'),
            borderRadius: 4, padding: '3px 10px',
          }}>
            {isLive ? 'Open source →' : 'Read full →'}
          </span>
        </div>
      </div>
    </div>
  );
}

function CricketLiveWidget() {
  return (
    <div className="card-sacred" style={{ padding: 16, marginBottom: 16, borderLeft: '3px solid #10B981' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#10B981', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' }}>
          LIVE MATCH
        </div>
        <div style={{
          background: '#EF444420', border: '1px solid #EF444440',
          borderRadius: 4, padding: '2px 8px', fontSize: 8, color: '#EF4444', fontWeight: 700,
        }}>
          LIVE
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700, marginBottom: 6 }}>{CRICKET_LIVE.match}</div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 12 }}>{CRICKET_LIVE.venue}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '10px 12px' }}>
          <div style={{ fontSize: 8, color: '#F59E0B', marginBottom: 4, fontWeight: 700 }}>INDIA</div>
          <div style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'monospace' }}>
            {CRICKET_LIVE.india.score}
          </div>
          <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>({CRICKET_LIVE.india.overs} ov)</div>
          <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 4 }}>{CRICKET_LIVE.india.batting}</div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '10px 12px' }}>
          <div style={{ fontSize: 8, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700 }}>AUSTRALIA</div>
          <div style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'monospace' }}>
            {CRICKET_LIVE.australia.score}
          </div>
          <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>({CRICKET_LIVE.australia.overs} ov)</div>
          <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 4 }}>{CRICKET_LIVE.australia.batting}</div>
        </div>
      </div>

      <div style={{
        background: '#10B98115', border: '1px solid #10B98130',
        borderRadius: 6, padding: '8px 10px', marginBottom: 8,
      }}>
        <div style={{ fontSize: 10, color: '#10B981', fontWeight: 700 }}>{CRICKET_LIVE.lead}</div>
      </div>
      <div style={{ fontSize: 9, color: '#F59E0B', fontStyle: 'italic' }}>{CRICKET_LIVE.lastBall}</div>
    </div>
  );
}

function IPLStandingsWidget() {
  return (
    <div className="card-sacred" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{
        fontSize: 10, color: '#F59E0B', letterSpacing: 2,
        fontWeight: 600, marginBottom: 14, fontFamily: 'monospace',
      }}>
        IPL 2025 TEAMS
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {IPL_TEAMS.map(team => (
          <div key={team.short} style={{
            background: 'var(--bg-secondary)', borderRadius: 6,
            padding: '8px 10px', borderLeft: '2px solid ' + team.color,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 700 }}>
              {team.short}
            </div>
            <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>
              {team.name.split(' ').slice(-1)[0]}
            </div>
            <div style={{ fontSize: 8, color: '#F59E0B', marginTop: 2 }}>
              {team.titles} titles
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NewsPage() {
  const [region,      setRegion]      = useState<Region>('ALL');
  const [category,    setCategory]    = useState<Category>('All');
  const [search,      setSearch]      = useState('');
  const [saved,       setSaved]       = useState<string[]>([]);
  const [tickerPos,   setTickerPos]   = useState(0);
  const [liveNews,    setLiveNews]    = useState<LiveNewsItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [liveError,   setLiveError]   = useState(false);

  const router = useRouter();

  const loadLiveNews = useCallback(async () => {
    try {
      setLoading(true);
      const news = await fetchAllNews();
      if (news.length > 0) {
        setLiveNews(news);
        setLiveError(false);
      } else {
        setLiveError(true);
      }
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));
    } catch {
      setLiveError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const sv = localStorage.getItem('rishi_saved_news');
    if (sv) setSaved(JSON.parse(sv));
    loadLiveNews();
    const refresh = setInterval(loadLiveNews, 5 * 60 * 1000);
    return () => clearInterval(refresh);
  }, [loadLiveNews]);

  useEffect(() => {
    const ticker = setInterval(() => setTickerPos(p => p - 1), 30);
    return () => clearInterval(ticker);
  }, []);

  const toggleSave = (id: string) => {
    const updated = saved.includes(id) ? saved.filter(s => s !== id) : [...saved, id];
    setSaved(updated);
    localStorage.setItem('rishi_saved_news', JSON.stringify(updated));
  };

  const allNews: (NewsItem | LiveNewsItem)[] = liveError || liveNews.length === 0
    ? NEWS_FEED
    : [...liveNews, ...NEWS_FEED.filter(s => !liveNews.some(l => l.headline.slice(0, 30) === s.headline.slice(0, 30)))];

  const filtered = allNews.filter(n => {
    const matchRegion   = region   === 'ALL' || n.region   === region;
    const matchCategory = category === 'All' || n.category === category;
    const matchSearch   = search   === ''
      || n.headline.toLowerCase().includes(search.toLowerCase())
      || n.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
      || n.source.toLowerCase().includes(search.toLowerCase());
    return matchRegion && matchCategory && matchSearch;
  });

  const breaking = filtered.filter(n =>  n.isBreaking);
  const trending = filtered.filter(n => !n.isBreaking &&  n.isTrending);
  const rest     = filtered.filter(n => !n.isBreaking && !n.isTrending);

  const regions:    Region[]   = ['ALL', 'INDIA', 'GLOBAL', 'CRYPTO', 'SPORTS'];
  const categories: Category[] = ['All', 'Markets', 'Economy', 'Earnings', 'Cricket', 'IPL', 'Tech', 'Regulation', 'Corporate', 'Crypto'];

  return (
    <main className="page-container">

      {/* Ticker */}
      <div style={{
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)',
        padding: '8px 0', overflow: 'hidden', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{
          display: 'flex', whiteSpace: 'nowrap',
          transform: 'translateX(' + (tickerPos % 6000) + 'px)',
          willChange: 'transform',
        }}>
          {[0, 1, 2].map(ri => (
            <span key={ri}>
              {TICKER_ITEMS.map((item, ii) => (
                <span key={ri + '-' + ii} style={{
                  color: item.color, fontSize: 11, marginRight: 40,
                  fontWeight: 600, fontFamily: 'monospace',
                }}>
                  {item.text}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > NEWS'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 28, color: '#F59E0B', letterSpacing: 3 }}>
                Market Intelligence
              </h1>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginTop: 3, fontFamily: 'monospace' }}>
                LIVE RSS · INDIA · GLOBAL · CRYPTO · CRICKET · IPL
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {loading ? (
                <div style={{
                  background: '#F59E0B15', border: '1px solid #F59E0B40',
                  borderRadius: 6, padding: '6px 12px', fontSize: 10, color: '#F59E0B',
                }}>
                  Fetching live...
                </div>
              ) : (
                <div style={{
                  background: '#10B98115', border: '1px solid #10B98130',
                  borderRadius: 6, padding: '6px 12px', fontSize: 10, color: '#10B981',
                }}>
                  Updated {lastUpdated}
                </div>
              )}
              <div style={{
                background: '#EF444415', border: '1px solid #EF444430',
                borderRadius: 6, padding: '6px 12px', fontSize: 10, color: '#EF4444', fontWeight: 700,
              }}>
                LIVE
              </div>
              <button onClick={loadLiveNews} style={{
                background: '#818CF815', border: '1px solid #818CF840',
                borderRadius: 6, padding: '6px 12px', fontSize: 10, color: '#818CF8',
                cursor: 'pointer', fontFamily: 'monospace',
              }}>
                Refresh
              </button>
              <div style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                borderRadius: 6, padding: '6px 12px', fontSize: 10, color: 'var(--text-muted)',
                fontFamily: 'monospace',
              }}>
                {allNews.length} stories
              </div>
              <button onClick={() => router.push('/news/saved')} style={{
                background: '#F59E0B15', border: '1px solid #F59E0B40',
                borderRadius: 6, padding: '6px 12px', fontSize: 10, color: '#F59E0B',
                cursor: 'pointer', fontFamily: 'monospace',
              }}>
                ★ {saved.length} saved
              </button>
            </div>
          </div>

          {/* Live Status */}
          {!liveError && !loading && liveNews.length > 0 && (
            <div style={{
              background: '#10B98110', border: '1px solid #10B98130',
              borderRadius: 8, padding: '8px 16px', marginBottom: 16,
              display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 10, color: '#10B981', fontWeight: 700, fontFamily: 'monospace' }}>
                LIVE RSS ACTIVE
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                {liveNews.filter(n => n.region === 'INDIA').length} India
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                {liveNews.filter(n => n.region === 'GLOBAL').length} Global
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                {liveNews.filter(n => n.region === 'CRYPTO').length} Crypto
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                {liveNews.filter(n => n.region === 'SPORTS').length} Sports
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                Auto-refreshes every 5 minutes
              </span>
            </div>
          )}

          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search — RBI, Infosys, Bitcoin, Virat Kohli, IPL..."
            style={{
              width: '100%', background: 'var(--bg-card)',
              border: '1px solid var(--border-primary)', borderRadius: 8,
              padding: '11px 16px', color: 'var(--text-primary)',
              fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box',
              outline: 'none', marginBottom: 14,
            }}
          />

          {/* Region Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {regions.map(r => (
              <button key={r} onClick={() => setRegion(r)} style={{
                padding: '7px 16px',
                background: region === r ? regionColor(r) + '15' : 'var(--bg-card)',
                border: region === r ? '1px solid ' + regionColor(r) : '1px solid var(--border-primary)',
                borderRadius: 6,
                color: region === r ? regionColor(r) : 'var(--text-muted)',
                cursor: 'pointer', fontSize: 10, letterSpacing: 1, fontFamily: 'monospace',
              }}>
                {regionFlag(r)} {r}
              </button>
            ))}
          </div>

          {/* Category Pills */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{
                padding: '5px 12px',
                background: category === c ? '#F59E0B15' : 'var(--bg-card)',
                border: category === c ? '1px solid #F59E0B' : '1px solid var(--border-primary)',
                borderRadius: 20,
                color: category === c ? '#F59E0B' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: 10, fontFamily: 'monospace',
              }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '28px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

          {/* LEFT FEED */}
          <div>
            {(region === 'ALL' || region === 'SPORTS') && <CricketLiveWidget />}

            {breaking.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    background: '#EF444420', border: '1px solid #EF444450',
                    borderRadius: 4, padding: '3px 10px', fontSize: 9, color: '#EF4444',
                    fontWeight: 700, letterSpacing: 2, fontFamily: 'monospace',
                  }}>
                    BREAKING
                  </div>
                  <div style={{ height: 1, flex: 1, background: '#EF444420' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {breaking.map(n => <NewsCard key={n.id} news={n} saved={saved} toggleSave={toggleSave} />)}
                </div>
              </div>
            )}

            {trending.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    background: '#F59E0B20', border: '1px solid #F59E0B50',
                    borderRadius: 4, padding: '3px 10px', fontSize: 9, color: '#F59E0B',
                    fontWeight: 700, letterSpacing: 2, fontFamily: 'monospace',
                  }}>
                    TRENDING
                  </div>
                  <div style={{ height: 1, flex: 1, background: '#F59E0B20' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {trending.map(n => <NewsCard key={n.id} news={n} saved={saved} toggleSave={toggleSave} />)}
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    background: '#818CF820', border: '1px solid #818CF840',
                    borderRadius: 4, padding: '3px 10px', fontSize: 9, color: '#818CF8',
                    fontWeight: 700, letterSpacing: 2, fontFamily: 'monospace',
                  }}>
                    LATEST
                  </div>
                  <div style={{ height: 1, flex: 1, background: '#818CF820' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {rest.map(n => <NewsCard key={n.id} news={n} saved={saved} toggleSave={toggleSave} />)}
                </div>
              </div>
            )}

            {breaking.length === 0 && trending.length === 0 && rest.length === 0 && (
              <div className="card-sacred" style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No stories match your filters</div>
                <button
                  onClick={() => { setRegion('ALL'); setCategory('All'); setSearch(''); }}
                  style={{
                    marginTop: 16, background: '#F59E0B15', border: '1px solid #F59E0B40',
                    borderRadius: 6, padding: '8px 16px', color: '#F59E0B', cursor: 'pointer',
                    fontSize: 11, fontFamily: 'monospace',
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ position: 'sticky', top: 60 }}>
            {region !== 'SPORTS' && (
              <div
                className="card-sacred"
                style={{ padding: 14, marginBottom: 16, cursor: 'pointer', borderLeft: '3px solid #10B981' }}
                onClick={() => setRegion('SPORTS')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 9, color: '#10B981', fontWeight: 700, fontFamily: 'monospace' }}>
                    LIVE CRICKET
                  </span>
                  <span style={{ fontSize: 8, color: '#EF4444', fontWeight: 700 }}>LIVE</span>
                </div>
                <div style={{ fontSize: 10, color: '#F59E0B', fontWeight: 700, marginBottom: 4 }}>
                  India vs Australia
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'monospace' }}>
                    IND {CRICKET_LIVE.india.score}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>vs</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, fontFamily: 'monospace' }}>
                    AUS {CRICKET_LIVE.australia.score}
                  </span>
                </div>
                <div style={{ fontSize: 9, color: '#10B981', marginTop: 4 }}>{CRICKET_LIVE.lead}</div>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 4 }}>Click to see sports news →</div>
              </div>
            )}

            <IPLStandingsWidget />

            {/* Trending Topics */}
            <div className="card-sacred" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{
                fontSize: 10, color: '#F59E0B', letterSpacing: 2,
                fontWeight: 600, marginBottom: 14, fontFamily: 'monospace',
              }}>
                TRENDING
              </div>
              {TRENDING_TOPICS.map((t, i) => (
                <div
                  key={t.topic}
                  onClick={() => setSearch(t.topic.split(' ')[0])}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 16, fontFamily: 'monospace' }}>
                      #{i + 1}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.topic}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: '#10B981' }}>{t.change}</div>
                    <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{(t.count / 1000).toFixed(1)}K</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="card-sacred" style={{ padding: 16 }}>
              <div style={{
                fontSize: 10, color: '#818CF8', letterSpacing: 2,
                fontWeight: 600, marginBottom: 14, fontFamily: 'monospace',
              }}>
                TODAY'S PULSE
              </div>
              {[
                { label: 'Total',    value: allNews.length.toString(),                                 color: 'var(--text-primary)', fn: () => { setRegion('ALL'); setCategory('All'); } },
                { label: 'Breaking', value: allNews.filter(n => n.isBreaking).length.toString(),       color: '#EF4444',              fn: () => {} },
                { label: 'India',    value: allNews.filter(n => n.region === 'INDIA').length.toString(), color: '#F59E0B',              fn: () => setRegion('INDIA') },
                { label: 'Global',   value: allNews.filter(n => n.region === 'GLOBAL').length.toString(), color: '#818CF8',              fn: () => setRegion('GLOBAL') },
                { label: 'Crypto',   value: allNews.filter(n => n.region === 'CRYPTO').length.toString(), color: '#A78BFA',              fn: () => setRegion('CRYPTO') },
                { label: 'Sports',   value: allNews.filter(n => n.region === 'SPORTS').length.toString(), color: '#10B981',              fn: () => setRegion('SPORTS') },
              ].map(s => (
                <div
                  key={s.label}
                  onClick={s.fn}
                  style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '6px 0', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</span>
                  <span style={{ fontSize: 11, color: s.color, fontWeight: 700, fontFamily: 'monospace' }}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

    </main>
  );
}