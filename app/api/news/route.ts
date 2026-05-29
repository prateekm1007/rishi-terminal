import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface LiveNewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  category: string;
  subCategory: string;
  time: string;
  minutesAgo: number;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  tags: string[];
  isBreaking: boolean;
  isTrending: boolean;
  region: 'INDIA' | 'GLOBAL' | 'CRYPTO' | 'SPORTS';
  url: string;
  imageUrl?: string;
  pubDate: string;
}

const RSS_FEEDS = [
  { url: 'https://www.moneycontrol.com/rss/latestnews.xml',                     source: 'MoneyControl',      category: 'Markets', region: 'INDIA'  },
  { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', source: 'Economic Times',    category: 'Markets', region: 'INDIA'  },
  { url: 'https://www.business-standard.com/rss/markets-106.rss',               source: 'Business Standard', category: 'Markets', region: 'INDIA'  },
  { url: 'https://www.livemint.com/rss/markets',                                 source: 'Mint',              category: 'Markets', region: 'INDIA'  },
  { url: 'https://feeds.reuters.com/reuters/businessNews',                        source: 'Reuters',           category: 'Economy', region: 'GLOBAL' },
  { url: 'https://www.investing.com/rss/news.rss',                               source: 'Investing.com',     category: 'Markets', region: 'GLOBAL' },
  { url: 'https://cointelegraph.com/rss',                                         source: 'CoinTelegraph',     category: 'Crypto',  region: 'CRYPTO' },
  { url: 'https://coindesk.com/arc/outboundfeeds/rss/',                           source: 'CoinDesk',          category: 'Crypto',  region: 'CRYPTO' },
  { url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml',            source: 'ESPNCricinfo',      category: 'Cricket', region: 'SPORTS' },
  { url: 'https://sports.ndtv.com/cricket/rss',                                   source: 'NDTV Sports',       category: 'Cricket', region: 'SPORTS' },
];

function parseMinutesAgo(pubDate: string): number {
  const pub = new Date(pubDate);
  const now = new Date();
  return Math.floor((now.getTime() - pub.getTime()) / 60000);
}

function detectImpact(text: string): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
  const t = text.toLowerCase();
  const positive = ['surge','rally','gain','jump','rise','high','bull','growth','profit','beat','record','up','strong'];
  const negative = ['crash','fall','drop','plunge','loss','bear','decline','down','weak','miss','slump','cut','ban'];
  const posScore = positive.filter(w => t.includes(w)).length;
  const negScore = negative.filter(w => t.includes(w)).length;
  if (posScore > negScore) return 'POSITIVE';
  if (negScore > posScore) return 'NEGATIVE';
  return 'NEUTRAL';
}

function extractTags(text: string, category: string): string[] {
  const tags: string[] = [category];
  const patterns = ['NIFTY','SENSEX','HDFC','RELIANCE','TCS','BITCOIN','BTC','ETHEREUM','ETH','IPL','CRICKET'];
  const t = text.toUpperCase();
  patterns.forEach(p => { if (t.includes(p)) tags.push(p); });
  return [...new Set(tags)].slice(0, 5);
}

function extractTag(xml: string, tag: string): string {
  // Extract content between XML tags — no dotAll flag, use split instead
  const open = '<' + tag;
  const close = '</' + tag + '>';
  const start = xml.indexOf(open);
  if (start === -1) return '';
  const contentStart = xml.indexOf('>', start);
  if (contentStart === -1) return '';
  const end = xml.indexOf(close, contentStart);
  if (end === -1) return '';
  let content = xml.slice(contentStart + 1, end).trim();
  // Strip CDATA
  if (content.startsWith('<![CDATA[') && content.endsWith(']]>')) {
    content = content.slice(9, content.length - 3).trim();
  }
  // Strip remaining HTML tags
  content = content.replace(/<[^>]+>/g, '').trim();
  return content;
}

async function fetchFeed(feed: typeof RSS_FEEDS[0]): Promise<LiveNewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RishiTerminal/1.0)' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const xml = await res.text();

    // Split on <item> boundaries — no dotAll regex needed
    const parts = xml.split('<item');
    const items: LiveNewsItem[] = [];

    for (let i = 1; i < parts.length && items.length < 8; i++) {
      const chunk = parts[i];
      const closeIdx = chunk.indexOf('</item>');
      const itemXml = closeIdx !== -1 ? chunk.slice(0, closeIdx) : chunk;

      const title   = extractTag(itemXml, 'title');
      const desc    = extractTag(itemXml, 'description').slice(0, 300);
      const pubDate = extractTag(itemXml, 'pubDate') || new Date().toISOString();

      // link is trickier — try extractTag first, then <link> text node pattern
      let link = extractTag(itemXml, 'link');
      if (!link) {
        const linkMatch = itemXml.match(/<link>(https?:\/\/[^<]+)<\/link>/);
        if (linkMatch) link = linkMatch[1].trim();
      }
      if (!link) link = '#';

      if (!title) continue;

      const minutesAgo = parseMinutesAgo(pubDate);
      const impact     = detectImpact(title + ' ' + desc);

      items.push({
        id:          feed.source + '-' + i + '-' + Date.now(),
        headline:    title,
        summary:     desc || title,
        source:      feed.source,
        category:    feed.category,
        subCategory: feed.category,
        time:        new Date(pubDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        minutesAgo:  Math.max(0, minutesAgo),
        impact,
        tags:        extractTags(title + ' ' + desc, feed.category),
        isBreaking:  minutesAgo < 30,
        isTrending:  minutesAgo < 120,
        region:      feed.region as LiveNewsItem['region'],
        url:         link,
        pubDate,
      });
    }

    return items;
  } catch (err) {
    console.error('Feed failed (' + feed.source + '):', err);
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const region = searchParams.get('region');

    const feedsToFetch = region
      ? RSS_FEEDS.filter(f => f.region === region)
      : RSS_FEEDS;

    const results = await Promise.allSettled(feedsToFetch.map(f => fetchFeed(f)));

    const all: LiveNewsItem[] = [];
    results.forEach(r => {
      if (r.status === 'fulfilled') all.push(...r.value);
    });

    all.sort((a, b) => a.minutesAgo - b.minutesAgo);

    return NextResponse.json(
      { news: all, count: all.length, generatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (error) {
    return NextResponse.json(
      { news: [], error: 'Failed to fetch news', detail: String(error) },
      { status: 500 }
    );
  }
}