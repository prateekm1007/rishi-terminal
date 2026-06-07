'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { NEWS_FEED } from '../../../data/news';

function impactColor(impact: string) {
  if (impact === 'POSITIVE') return '#10B981';
  if (impact === 'NEGATIVE') return '#EF4444';
  return '#818CF8';
}

function regionColor(r: string) {
  if (r === 'INDIA')  return '#F59E0B';
  if (r === 'GLOBAL') return '#818CF8';
  return '#10B981';
}

function regionFlag(r: string) {
  if (r === 'INDIA')  return '🇮🇳';
  if (r === 'GLOBAL') return '🌍';
  return '🪙';
}

function timeAgoLabel(min: number) {
  if (min < 60)   return `${min} minutes ago`;
  if (min < 1440) return `${Math.floor(min / 60)} hours ago`;
  return `${Math.floor(min / 1440)} days ago`;
}

export default function NewsStory() {
  const { id } = useParams();
  const news = NEWS_FEED.find(n => n.id === id);

  if (!news) {
    return (
      <div style={{ fontFamily:'JetBrains Mono, monospace', background:'#050508', color:'#E2E8F0', minHeight:'100vh', padding:40, textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:16 }}>📭</div>
        <div style={{ fontSize:16, color:'#475569', marginBottom:20 }}>Story not found</div>
        <Link href="/news" style={{ color:'#F59E0B', textDecoration:'none', fontSize:12 }}>← Back to News</Link>
      </div>
    );
  }

  const related = NEWS_FEED.filter(n =>
    n.id !== news.id && (
      n.category === news.category ||
      n.region   === news.region   ||
      n.tags.some(t => news.tags.includes(t))
    )
  ).slice(0, 4);

  return (
    <div style={{ fontFamily:'JetBrains Mono, monospace', background:'#050508', color:'#E2E8F0', minHeight:'100vh', padding:24 }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap"/>

      <div style={{ maxWidth:900, margin:'0 auto' }}>

        {/* BACK */}
        <Link href="/news" style={{ color:'#F59E0B', textDecoration:'none', fontSize:11, display:'inline-block', marginBottom:24 }}>
          ← Back to Market Intelligence
        </Link>

        {/* BADGES */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
          <span style={{ fontSize:9, color:regionColor(news.region), background:`${regionColor(news.region)}15`, border:`1px solid ${regionColor(news.region)}40`, borderRadius:4, padding:'3px 10px', fontWeight:700 }}>
            {regionFlag(news.region)} {news.region}
          </span>
          <span style={{ fontSize:9, color:'#64748B', background:'#09090F', border:'1px solid #1E293B', borderRadius:4, padding:'3px 10px' }}>
            {news.category} · {news.subCategory}
          </span>
          <span style={{ fontSize:9, color:impactColor(news.impact), background:`${impactColor(news.impact)}15`, border:`1px solid ${impactColor(news.impact)}30`, borderRadius:4, padding:'3px 10px', fontWeight:700 }}>
            {news.impact === 'POSITIVE' ? '▲ BULLISH IMPACT' : news.impact === 'NEGATIVE' ? '▼ BEARISH IMPACT' : '→ NEUTRAL IMPACT'}
          </span>
          {news.isBreaking && (
            <span style={{ fontSize:9, color:'#EF4444', background:'#EF444420', border:'1px solid #EF444440', borderRadius:4, padding:'3px 10px', fontWeight:700 }}>
              🚨 BREAKING NEWS
            </span>
          )}
          {news.isTrending && (
            <span style={{ fontSize:9, color:'#F59E0B', background:'#F59E0B15', border:'1px solid #F59E0B30', borderRadius:4, padding:'3px 10px', fontWeight:700 }}>
              🔥 TRENDING
            </span>
          )}
        </div>

        {/* HEADLINE */}
        <h1 style={{ fontFamily:'Georgia, serif', fontSize:24, color:'#F1F5F9', fontWeight:700, lineHeight:1.4, marginBottom:16, margin:'0 0 16px 0' }}>
          {news.headline}
        </h1>

        {/* META */}
        <div style={{ display:'flex', gap:16, alignItems:'center', marginBottom:24, flexWrap:'wrap', paddingBottom:16, borderBottom:'1px solid #1E293B' }}>
          <span style={{ fontSize:11, color:'#475569' }}>📡 {news.source}</span>
          <span style={{ fontSize:11, color:'#334155' }}>🕐 {news.time} · {timeAgoLabel(news.minutesAgo)}</span>
        </div>

        {/* IMPACT BANNER */}
        <div style={{ background:`${impactColor(news.impact)}10`, border:`1px solid ${impactColor(news.impact)}30`, borderLeft:`4px solid ${impactColor(news.impact)}`, borderRadius:8, padding:'14px 18px', marginBottom:24 }}>
          <div style={{ fontSize:9, color:impactColor(news.impact), letterSpacing:2, fontWeight:700, marginBottom:6 }}>
            MARKET IMPACT ANALYSIS
          </div>
          <div style={{ fontSize:12, color:'#94A3B8', lineHeight:1.6 }}>
            {news.impact === 'POSITIVE'
              ? 'This news is expected to have a positive impact on related stocks and sectors. Monitor for buying opportunities.'
              : news.impact === 'NEGATIVE'
              ? 'This news may create selling pressure on related stocks. Exercise caution and review your positions.'
              : 'This news is broadly neutral. Market reaction may be limited but monitor for any secondary effects.'}
          </div>
        </div>

        {/* ARTICLE BODY */}
        <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:28, marginBottom:24 }}>
          <div style={{ fontSize:15, color:'#CBD5E1', lineHeight:1.9, fontFamily:'Georgia, serif', marginBottom:20 }}>
            {news.summary}
          </div>

          {/* EXTENDED ANALYSIS — built from summary context */}
          <div style={{ borderTop:'1px solid #1E293B', paddingTop:20, marginTop:4 }}>
            <div style={{ fontSize:11, color:'#475569', letterSpacing:2, marginBottom:14, fontWeight:600 }}>RISHI TERMINAL ANALYSIS</div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12, marginBottom:20 }}>
              {[
                { label:'Category',    value: news.category,                                  color:'#94A3B8' },
                { label:'Sub-Topic',   value: news.subCategory,                               color:'#94A3B8' },
                { label:'Market Impact', value: news.impact,                                  color: impactColor(news.impact) },
                { label:'Region',      value: news.region,                                    color: regionColor(news.region) },
                { label:'Story Age',   value: timeAgoLabel(news.minutesAgo),                  color:'#64748B' },
                { label:'Source',      value: news.source,                                    color:'#64748B' },
              ].map(m => (
                <div key={m.label} style={{ background:'#050508', borderRadius:6, padding:'10px 12px' }}>
                  <div style={{ fontSize:8, color:'#334155', letterSpacing:1, marginBottom:4 }}>{m.label.toUpperCase()}</div>
                  <div style={{ fontSize:12, color:m.color, fontWeight:600 }}>{m.value}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize:11, color:'#475569', letterSpacing:2, marginBottom:10, fontWeight:600 }}>RELATED TAGS</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {news.tags.map(tag => (
                <span key={tag} style={{ fontSize:10, color:'#F59E0B', background:'#F59E0B10', border:'1px solid #F59E0B20', borderRadius:4, padding:'4px 10px' }}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* WHAT TO WATCH */}
        <div style={{ background:'#09090F', border:'1px solid #1E293B', borderRadius:12, padding:20, marginBottom:24 }}>
          <div style={{ fontSize:11, color:'#F59E0B', letterSpacing:2, fontWeight:600, marginBottom:14 }}>👁️ WHAT TO WATCH NEXT</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              `Monitor ${news.tags[0] || 'related stocks'} for price reaction in next trading session`,
              `Watch for follow-up announcements from ${news.source} and other media`,
              `Check FII/DII activity data for institutional response to this news`,
              `Review sector-wide impact — ${news.subCategory} stocks may see correlated moves`,
            ].map((point, i) => (
              <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <span style={{ color:'#F59E0B', fontSize:12, marginTop:1 }}>▸</span>
                <span style={{ fontSize:11, color:'#94A3B8', lineHeight:1.6 }}>{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RELATED NEWS */}
        {related.length > 0 && (
          <div>
            <div style={{ fontSize:11, color:'#475569', letterSpacing:2, fontWeight:600, marginBottom:16 }}>📰 RELATED STORIES</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {related.map(r => (
                <Link key={r.id} href={`/news/${r.id}`}
                  style={{ display:'block', background:'#09090F', border:'1px solid #1E293B', borderLeft:`3px solid ${impactColor(r.impact)}`, borderRadius:8, padding:'14px 16px', textDecoration:'none', transition:'all 0.2s' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'flex-start' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
                        <span style={{ fontSize:8, color:regionColor(r.region), fontWeight:700 }}>{regionFlag(r.region)} {r.region}</span>
                        <span style={{ fontSize:8, color:'#475569' }}>{r.category}</span>
                        {r.isBreaking && <span style={{ fontSize:8, color:'#EF4444', fontWeight:700 }}>🚨 BREAKING</span>}
                      </div>
                      <div style={{ fontSize:12, color:'#E2E8F0', fontWeight:600, lineHeight:1.5, fontFamily:'Georgia, serif' }}>
                        {r.headline}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:9, color:'#334155' }}>{timeAgoLabel(r.minutesAgo)}</div>
                      <div style={{ fontSize:9, color:impactColor(r.impact), marginTop:4, fontWeight:700 }}>
                        {r.impact === 'POSITIVE' ? '▲' : r.impact === 'NEGATIVE' ? '▼' : '→'} {r.impact}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ marginTop:32, paddingTop:16, borderTop:'1px solid #0F172A', textAlign:'center', fontSize:9, color:'#0F172A' }}>
          NOT INVESTMENT ADVICE · EDUCATIONAL SIMULATION · RISHI TERMINAL v4.0
        </div>
      </div>
    </div>
  );
}