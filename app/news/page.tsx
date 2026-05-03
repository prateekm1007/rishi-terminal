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
  if (min < 60)   return `${min}m ago`;
  if (min < 1440) return `${Math.floor(min / 60)}h ago`;
  return `${Math.floor(min / 1440)}d ago`;
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
  if (r === 'INDIA')  return '🇮🇳';
  if (r === 'GLOBAL') return '🌍';
  if (r === 'SPORTS') return '🏏';
  return '🪙';
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
      router.push(`/news/${news.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background: '#09090F',
        border: `1px solid ${news.isBreaking ? '#EF444430' : '#1E293B'}`,
        borderLeft: `3px solid ${impactColor(news.impact)}`,
        borderRadius: 10,
        padding: 16,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      {/* TOP BADGES */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10, gap:8 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', flex:1 }}>
          <span style={{ fontSize:8, color:regionColor(news.region), background:`${regionColor(news.region)}15`, border:`1px solid ${regionColor(news.region)}30`, borderRadius:4, padding:'2px 7px', fontWeight:700 }}>
            {regionFlag(news.region)} {news.region}
          </span>
          <span style={{ fontSize:8, color:'#64748B', background:'#050508', borderRadius:4, padding:'2px 7px' }}>
            {news.category}
          </span>
          <span style={{ fontSize:8, color:impactColor(news.impact), background:impactBg(news.impact), borderRadius:4, padding:'2px 7px', fontWeight:700 }}>
            {news.impact === 'POSITIVE' ? '▲ BULLISH' : news.impact === 'NEGATIVE' ? '▼ BEARISH' : '→ NEUTRAL'}
          </span>
          {news.isBreaking && (
            <span style={{ fontSize:8, color:'#EF4444', background:'#EF444420', borderRadius:4, padding:'2px 7px', fontWeight:700 }}>🚨 BREAKING</span>
          )}
          {news.isTrending && (
            <span style={{ fontSize:8, color:'#F59E0B', background:'#F59E0B15', borderRadius:4, padding:'2px 7px', fontWeight:700 }}>🔥 HOT</span>
          )}
          {isLive && (
            <span style={{ fontSize:8, color:'#10B981', background:'#10B98115', borderRadius:4, padding:'2px 7px', fontWeight:700 }}>📡 LIVE</span>
          )}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
          <span style={{ fontSize:9, color:'#334155' }}>{timeAgoLabel(news.minutesAgo)}</span>
          <button
            onClick={e => { e.stopPropagation(); toggleSave(news.id); }}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color: isSaved ? '#F59E0B' : '#334155', padding:0 }}>
            {isSaved ? '⭐' : '☆'}
          </button>
        </div>
      </div>

      {/* HEADLINE */}
      <div style={{ fontSize:13, color:'#F1F5F9', fontWeight:600, lineHeight:1.5, marginBottom:8, fontFamily:'Georgia, serif' }}>
        {news.headline}
      </div>

      {/* SUMMARY PREVIEW */}
      <div style={{ fontSize:11, color:'#64748B', lineHeight:1.6, marginBottom:10 }}>
        {news.summary.slice(0, 140)}...
      </div>

      {/* BOTTOM ROW */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {news.tags.slice(0, 4).map(tag => (
            <span key={tag} style={{ fontSize:8, color:'#475569', background:'#0F172A', borderRadius:3, padding:'2px 6px' }}>#{tag}</span>
          ))}
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ fontSize:9, color:'#334155' }}>via {news.source}</span>
          <span style={{ fontSize:9, color: isLive ? '#10B981' : '#F59E0B', border:`1px solid ${isLive ? '#10B98130' : '#F59E0B30'}`, borderRadius:4, padding:'3px 10px' }}>
            {isLive ? 'Open source ↗' : 'Read full →'}
          </span>
        </div>
      </div>
    </div>
  );
}

function CricketLiveWidget() {
  return (
    <div style={{ background:'#09090F', border:'2px solid #10B98130', borderRadius:12, padding:16, marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ fontSize:10, color:'#10B981', letterSpacing:2, fontWeight:700 }}>🏏 LIVE MATCH</div>
        <div style={{ background:'#EF444420', border:'1px solid #EF444440', borderRadius:4, padding:'2px 8px', fontSize:8, color:'#EF4444', fontWeight:700 }}>● LIVE</div>
      </div>
      <div style={{ fontSize:11, color:'#F59E0B', fontWeight:700, marginBottom:6 }}>{CRICKET_LIVE.match}</div>
      <div style={{ fontSize:9, color:'#475569', marginBottom:12 }}>📍 {CRICKET_LIVE.venue}</div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
        <div style={{ background:'#050508', borderRadius:6, padding:'10px 12px' }}>
          <div style={{ fontSize:8, color:'#F59E0B', marginBottom:4, fontWeight:700 }}>🇮🇳 INDIA</div>
          <div style={{ fontSize:16, color:'#F1F5F9', fontWeight:700 }}>{CRICKET_LIVE.india.score}</div>
          <div style={{ fontSize:8, color:'#475569', marginTop:2 }}>({CRICKET_LIVE.india.overs} ov)</div>
          <div style={{ fontSize:9, color:'#94A3B8', marginTop:4 }}>{CRICKET_LIVE.india.batting}</div>
        </div>
        <div style={{ background:'#050508', borderRadius:6, padding:'10px 12px' }}>
          <div style={{ fontSize:8, color:'#64748B', marginBottom:4, fontWeight:700 }}>🦘 AUSTRALIA</div>
          <div style={{ fontSize:16, color:'#F1F5F9', fontWeight:700 }}>{CRICKET_LIVE.australia.score}</div>
          <div style={{ fontSize:8, color:'#475569', marginTop:2 }}>({CRICKET_LIVE.australia.overs} ov)</div>
          <div style={{ fontSize:9, color:'#94A3B8', marginTop:4 }}>{CRICKET_LIVE.australia.batting}</div>
        </div>
      </div>

      <div style={{ background:'#10B98115', border:'1px solid #10B98130', borderRadius:6, padding:'8px 10px', marginBottom:8 }}>
        <div style={{ fontSize:10, color:'#10B981', fontWeight:700 }}>{CRICKET_LIVE.lead}</div>
      </div>
      <div style={{ fontSize:9, color:'#F59E0B', fontStyle:'italic' }}>⚡ {CRICKET_LIVE.lastBall}</div>
    </div>
  );
}

function IPLStandingsWidget() {
  return (
    <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:16, marginBottom:16 }}>
      <div style={{ fontSize:10, color:'#F59E0B', letterSpacing:2, fontWeight:600, marginBottom:14 }}>🏆 IPL 2025 TEAMS</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
        {IPL_TEAMS.map(team => (
          <div key={team.short} style={{ background:'#050508', borderRadius:6, padding:'8px 10px', borderLeft:`2px solid ${team.color}` }}>
            <div style={{ fontSize:11, color:'#F1F5F9', fontWeight:700 }}>{team.emoji} {team.short}</div>
            <div style={{ fontSize:8, color:'#475569', marginTop:2 }}>{team.name.split(' ').slice(-1)[0]}</div>
            <div style={{ fontSize:8, color:'#F59E0B', marginTop:2 }}>🏆 {team.titles} titles</div>
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
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { timeZone:'Asia/Kolkata' }));
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
    // refresh every 5 minutes
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

  // Merge live + static, deduplicate by headline similarity
  const allNews: (NewsItem | LiveNewsItem)[] = liveError || liveNews.length === 0
    ? NEWS_FEED
    : [...liveNews, ...NEWS_FEED.filter(s => !liveNews.some(l => l.headline.slice(0,30) === s.headline.slice(0,30)))];

  const filtered = allNews.filter(n => {
    const matchRegion   = region   === 'ALL'    || n.region   === region;
    const matchCategory = category === 'All'    || n.category === category;
    const matchSearch   = search   === ''
      || n.headline.toLowerCase().includes(search.toLowerCase())
      || n.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
      || n.source.toLowerCase().includes(search.toLowerCase());
    return matchRegion && matchCategory && matchSearch;
  });

  const breaking = filtered.filter(n =>  n.isBreaking);
  const trending = filtered.filter(n => !n.isBreaking &&  n.isTrending);
  const rest     = filtered.filter(n => !n.isBreaking && !n.isTrending);

  const regions:    Region[]   = ['ALL','INDIA','GLOBAL','CRYPTO','SPORTS'];
  const categories: Category[] = ['All','Markets','Economy','Earnings','Cricket','IPL','Tech','Regulation','Corporate','Crypto'];

  const sportsNews = allNews.filter(n => n.region === 'SPORTS');

  return (
    <div style={{ fontFamily:'JetBrains Mono, monospace', background:'#050508', color:'#E2E8F0', minHeight:'100vh' }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap"/>

      {/* SCROLLING TICKER */}
      <div style={{ background:'#09090F', borderBottom:'1px solid #1E293B', padding:'8px 0', overflow:'hidden', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', whiteSpace:'nowrap', transform:`translateX(${tickerPos % 6000}px)`, willChange:'transform' }}>
          {[0, 1, 2].map(ri => (
            <span key={ri}>
              {TICKER_ITEMS.map((item, ii) => (
                <span key={`${ri}-${ii}`} style={{ color:item.color, fontSize:11, marginRight:40, fontWeight:600 }}>
                  {item.text}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding:24, maxWidth:1400, margin:'0 auto' }}>

        {/* HEADER */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <Link href="/" style={{ color:'#F59E0B', textDecoration:'none', fontSize:11, display:'block', marginBottom:8 }}>← Dashboard</Link>
            <div style={{ fontFamily:'Cinzel, Georgia', fontSize:20, color:'#F59E0B', letterSpacing:3, fontWeight:700 }}>📰 MARKET INTELLIGENCE</div>
            <div style={{ fontSize:9, color:'#334155', letterSpacing:2, marginTop:3 }}>LIVE RSS · INDIA · GLOBAL · CRYPTO · CRICKET · IPL</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            {loading ? (
              <div style={{ background:'#F59E0B15', border:'1px solid #F59E0B40', borderRadius:6, padding:'6px 12px', fontSize:10, color:'#F59E0B' }}>
                ⏳ Fetching live news...
              </div>
            ) : (
              <div style={{ background:'#10B98115', border:'1px solid #10B98130', borderRadius:6, padding:'6px 12px', fontSize:10, color:'#10B981' }}>
                ✓ Updated {lastUpdated}
              </div>
            )}
            <div style={{ background:'#EF444415', border:'1px solid #EF444430', borderRadius:6, padding:'6px 12px', fontSize:10, color:'#EF4444', fontWeight:700 }}>
              🔴 LIVE
            </div>
            <button onClick={loadLiveNews}
              style={{ background:'#818CF815', border:'1px solid #818CF840', borderRadius:6, padding:'6px 12px', fontSize:10, color:'#818CF8', cursor:'pointer', fontFamily:'JetBrains Mono, monospace' }}>
              ↺ Refresh
            </button>
            <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:6, padding:'6px 12px', fontSize:10, color:'#475569' }}>
              {allNews.length} stories
            </div>
            <button onClick={() => router.push('/news/saved')}
              style={{ background:'#F59E0B15', border:'1px solid #F59E0B40', borderRadius:6, padding:'6px 12px', fontSize:10, color:'#F59E0B', cursor:'pointer', fontFamily:'JetBrains Mono, monospace' }}>
              ⭐ {saved.length} saved
            </button>
          </div>
        </div>

        {/* LIVE STATUS BAR */}
        {!liveError && !loading && liveNews.length > 0 && (
          <div style={{ background:'#10B98110', border:'1px solid #10B98130', borderRadius:8, padding:'8px 16px', marginBottom:16, display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:10, color:'#10B981', fontWeight:700 }}>📡 LIVE RSS ACTIVE</span>
            <span style={{ fontSize:9, color:'#475569' }}>{liveNews.filter(n => n.region === 'INDIA').length} India</span>
            <span style={{ fontSize:9, color:'#475569' }}>{liveNews.filter(n => n.region === 'GLOBAL').length} Global</span>
            <span style={{ fontSize:9, color:'#475569' }}>{liveNews.filter(n => n.region === 'CRYPTO').length} Crypto</span>
            <span style={{ fontSize:9, color:'#475569' }}>{liveNews.filter(n => n.region === 'SPORTS').length} Sports</span>
            <span style={{ fontSize:9, color:'#334155', marginLeft:'auto' }}>Auto-refreshes every 5 minutes</span>
          </div>
        )}
        {liveError && (
          <div style={{ background:'#F59E0B10', border:'1px solid #F59E0B30', borderRadius:8, padding:'8px 16px', marginBottom:16, display:'flex', gap:12, alignItems:'center' }}>
            <span style={{ fontSize:10, color:'#F59E0B' }}>⚠ Live feeds unavailable — showing curated stories. </span>
            <button onClick={loadLiveNews} style={{ background:'none', border:'1px solid #F59E0B40', borderRadius:4, padding:'3px 10px', color:'#F59E0B', cursor:'pointer', fontSize:9, fontFamily:'JetBrains Mono, monospace' }}>Retry</button>
          </div>
        )}

        {/* SEARCH */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search — RBI, Infosys, Bitcoin, Virat Kohli, IPL..."
          style={{ width:'100%', background:'#09090F', border:'1px solid #1E293B', borderRadius:8, padding:'11px 16px', color:'#E2E8F0', fontSize:12, fontFamily:'JetBrains Mono, monospace', boxSizing:'border-box', outline:'none', marginBottom:14 }}
        />

        {/* REGION TABS */}
        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          {regions.map(r => (
            <button key={r} onClick={() => setRegion(r)}
              style={{ padding:'7px 16px', background: region === r ? `${regionColor(r)}15` : '#09090F', border: region === r ? `1px solid ${regionColor(r)}` : '1px solid #1E293B', borderRadius:6, color: region === r ? regionColor(r) : '#475569', cursor:'pointer', fontSize:10, letterSpacing:1, fontFamily:'JetBrains Mono, monospace' }}>
              {regionFlag(r)} {r}
            </button>
          ))}
        </div>

        {/* CATEGORY PILLS */}
        <div style={{ display:'flex', gap:6, marginBottom:24, flexWrap:'wrap' }}>
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{ padding:'5px 12px', background: category === c ? '#F59E0B15' : '#09090F', border: category === c ? '1px solid #F59E0B' : '1px solid #1E293B', borderRadius:20, color: category === c ? '#F59E0B' : '#475569', cursor:'pointer', fontSize:10, fontFamily:'JetBrains Mono, monospace' }}>
              {c}
            </button>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:24, alignItems:'start' }}>

          {/* LEFT FEED */}
          <div>
            {/* CRICKET LIVE BOX — show when SPORTS or ALL selected */}
            {(region === 'ALL' || region === 'SPORTS') && (
              <CricketLiveWidget />
            )}

            {/* BREAKING */}
            {breaking.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <div style={{ background:'#EF444420', border:'1px solid #EF444450', borderRadius:4, padding:'3px 10px', fontSize:9, color:'#EF4444', fontWeight:700, letterSpacing:2 }}>🚨 BREAKING</div>
                  <div style={{ height:1, flex:1, background:'#EF444420' }}/>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {breaking.map(n => <NewsCard key={n.id} news={n} saved={saved} toggleSave={toggleSave} />)}
                </div>
              </div>
            )}

            {/* TRENDING */}
            {trending.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <div style={{ background:'#F59E0B20', border:'1px solid #F59E0B50', borderRadius:4, padding:'3px 10px', fontSize:9, color:'#F59E0B', fontWeight:700, letterSpacing:2 }}>🔥 TRENDING</div>
                  <div style={{ height:1, flex:1, background:'#F59E0B20' }}/>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {trending.map(n => <NewsCard key={n.id} news={n} saved={saved} toggleSave={toggleSave} />)}
                </div>
              </div>
            )}

            {/* LATEST */}
            {rest.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <div style={{ background:'#818CF820', border:'1px solid #818CF840', borderRadius:4, padding:'3px 10px', fontSize:9, color:'#818CF8', fontWeight:700, letterSpacing:2 }}>📋 LATEST</div>
                  <div style={{ height:1, flex:1, background:'#818CF820' }}/>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {rest.map(n => <NewsCard key={n.id} news={n} saved={saved} toggleSave={toggleSave} />)}
                </div>
              </div>
            )}

            {breaking.length === 0 && trending.length === 0 && rest.length === 0 && (
              <div style={{ textAlign:'center', padding:60, color:'#334155' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
                <div style={{ fontSize:14 }}>No stories match your filters</div>
                <button onClick={() => { setRegion('ALL'); setCategory('All'); setSearch(''); }}
                  style={{ marginTop:16, background:'#F59E0B15', border:'1px solid #F59E0B40', borderRadius:6, padding:'8px 16px', color:'#F59E0B', cursor:'pointer', fontSize:11, fontFamily:'JetBrains Mono, monospace' }}>
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ position:'sticky', top:60 }}>

            {/* CRICKET LIVE SCORE — sidebar version when on non-sports tab */}
            {region !== 'SPORTS' && (
              <div style={{ background:'#09090F', border:'1px solid #10B98130', borderRadius:12, padding:14, marginBottom:16, cursor:'pointer' }}
                onClick={() => setRegion('SPORTS')}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:9, color:'#10B981', fontWeight:700 }}>🏏 LIVE CRICKET</span>
                  <span style={{ fontSize:8, color:'#EF4444', fontWeight:700 }}>● LIVE</span>
                </div>
                <div style={{ fontSize:10, color:'#F59E0B', fontWeight:700, marginBottom:4 }}>India vs Australia</div>
                <div style={{ display:'flex', gap:8 }}>
                  <span style={{ fontSize:12, color:'#F1F5F9', fontWeight:700 }}>🇮🇳 {CRICKET_LIVE.india.score}</span>
                  <span style={{ fontSize:10, color:'#475569' }}>vs</span>
                  <span style={{ fontSize:12, color:'#64748B', fontWeight:700 }}>🦘 {CRICKET_LIVE.australia.score}</span>
                </div>
                <div style={{ fontSize:9, color:'#10B981', marginTop:4 }}>{CRICKET_LIVE.lead}</div>
                <div style={{ fontSize:8, color:'#334155', marginTop:4 }}>Click to see sports news →</div>
              </div>
            )}

            {/* IPL TEAMS */}
            <IPLStandingsWidget />

            {/* TRENDING TOPICS */}
            <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:16, marginBottom:16 }}>
              <div style={{ fontSize:10, color:'#F59E0B', letterSpacing:2, fontWeight:600, marginBottom:14 }}>🔥 TRENDING</div>
              {TRENDING_TOPICS.map((t, i) => (
                <div key={t.topic} onClick={() => setSearch(t.topic.split(' ')[0])}
                  style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #0F172A', cursor:'pointer' }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:10, color:'#334155', width:16 }}>#{i+1}</span>
                    <span style={{ fontSize:11, color:'#94A3B8' }}>{t.topic}</span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:9, color:'#10B981' }}>{t.change}</div>
                    <div style={{ fontSize:8, color:'#334155' }}>{(t.count/1000).toFixed(1)}K</div>
                  </div>
                </div>
              ))}
            </div>

            {/* STATS */}
            <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:16, marginBottom:16 }}>
              <div style={{ fontSize:10, color:'#818CF8', letterSpacing:2, fontWeight:600, marginBottom:14 }}>📊 TODAY&apos;S PULSE</div>
              {[
                { label:'Total',    value: allNews.length.toString(),                                           color:'#F1F5F9',  fn:() => { setRegion('ALL');    setCategory('All'); } },
                { label:'Breaking', value: allNews.filter(n => n.isBreaking).length.toString(),               color:'#EF4444',  fn:() => {} },
                { label:'🇮🇳 India', value: allNews.filter(n => n.region === 'INDIA').length.toString(),       color:'#F59E0B',  fn:() => setRegion('INDIA')  },
                { label:'🌍 Global', value: allNews.filter(n => n.region === 'GLOBAL').length.toString(),      color:'#818CF8',  fn:() => setRegion('GLOBAL') },
                { label:'🪙 Crypto', value: allNews.filter(n => n.region === 'CRYPTO').length.toString(),      color:'#A78BFA',  fn:() => setRegion('CRYPTO') },
                { label:'🏏 Sports', value: allNews.filter(n => n.region === 'SPORTS').length.toString(),      color:'#10B981',  fn:() => setRegion('SPORTS') },
              ].map(s => (
                <div key={s.label} onClick={s.fn}
                  style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #0F172A', cursor:'pointer' }}>
                  <span style={{ fontSize:10, color:'#475569' }}>{s.label}</span>
                  <span style={{ fontSize:11, color:s.color, fontWeight:700 }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* SENTIMENT */}
            <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:16 }}>
              <div style={{ fontSize:10, color:'#10B981', letterSpacing:2, fontWeight:600, marginBottom:14 }}>🎯 NEWS SENTIMENT</div>
              {(() => {
                const pos = allNews.filter(n => n.impact === 'POSITIVE').length;
                const neg = allNews.filter(n => n.impact === 'NEGATIVE').length;
                const neu = allNews.length - pos - neg;
                const total = allNews.length || 1;
                return [
                  { label:'Bullish', pct: Math.round(pos/total*100), color:'#10B981' },
                  { label:'Neutral', pct: Math.round(neu/total*100), color:'#818CF8' },
                  { label:'Bearish', pct: Math.round(neg/total*100), color:'#EF4444' },
                ].map(s => (
                  <div key={s.label} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:10, color:s.color }}>{s.label}</span>
                      <span style={{ fontSize:10, color:'#94A3B8', fontWeight:700 }}>{s.pct}%</span>
                    </div>
                    <div style={{ height:6, background:'#1E293B', borderRadius:3 }}>
                      <div style={{ width:`${s.pct}%`, height:'100%', background:s.color, borderRadius:3 }}/>
                    </div>
                  </div>
                ));
              })()}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}