// lib/newsApi.ts
// Fetches real news from RSS feeds via allorigins proxy (no API key needed)

export interface LiveNewsItem {
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

// RSS FEEDS — all free, no API key
const RSS_FEEDS = [
  // INDIA MARKETS
  { url: 'https://www.moneycontrol.com/rss/latestnews.xml',           source: 'MoneyControl',       category: 'Markets',  region: 'INDIA'  },
  { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', source: 'Economic Times', category: 'Markets',  region: 'INDIA'  },
  { url: 'https://www.business-standard.com/rss/markets-106.rss',    source: 'Business Standard',  category: 'Markets',  region: 'INDIA'  },
  { url: 'https://feeds.feedburner.com/ndtvprofit-latest',            source: 'NDTV Profit',        category: 'Economy',  region: 'INDIA'  },
  { url: 'https://www.livemint.com/rss/markets',                      source: 'Mint',               category: 'Markets',  region: 'INDIA'  },
  // GLOBAL
  { url: 'https://feeds.reuters.com/reuters/businessNews',            source: 'Reuters',            category: 'Economy',  region: 'GLOBAL' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss',              source: 'Bloomberg',          category: 'Markets',  region: 'GLOBAL' },
  { url: 'https://www.investing.com/rss/news.rss',                    source: 'Investing.com',      category: 'Markets',  region: 'GLOBAL' },
  // CRYPTO
  { url: 'https://cointelegraph.com/rss',                             source: 'CoinTelegraph',      category: 'Crypto',   region: 'CRYPTO' },
  { url: 'https://coindesk.com/arc/outboundfeeds/rss/',               source: 'CoinDesk',           category: 'Crypto',   region: 'CRYPTO' },
  // SPORTS / CRICKET
  { url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml',source: 'ESPNCricinfo',       category: 'Cricket',  region: 'SPORTS' },
  { url: 'https://sports.ndtv.com/cricket/rss',                       source: 'NDTV Sports',        category: 'Cricket',  region: 'SPORTS' },
  { url: 'https://www.cricbuzz.com/cricket-news/rss-feeds',           source: 'Cricbuzz',           category: 'Cricket',  region: 'SPORTS' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128818991.cms', source: 'Times of India Sports', category: 'Sports', region: 'SPORTS' },
];

const PROXY = 'https://api.allorigins.win/get?url=';

function parseMinutesAgo(pubDate: string): number {
  const pub = new Date(pubDate);
  const now = new Date();
  return Math.floor((now.getTime() - pub.getTime()) / 60000);
}

function detectImpact(text: string): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
  const t = text.toLowerCase();
  const positive = ['surge','rally','gain','jump','rise','high','bull','growth','profit','beat','record','up','strong','boost'];
  const negative = ['crash','fall','drop','plunge','loss','bear','decline','down','weak','miss','slump','crash','cut','ban'];
  const posScore = positive.filter(w => t.includes(w)).length;
  const negScore = negative.filter(w => t.includes(w)).length;
  if (posScore > negScore) return 'POSITIVE';
  if (negScore > posScore) return 'NEGATIVE';
  return 'NEUTRAL';
}

function extractTags(text: string, category: string): string[] {
  const tags: string[] = [category];
  const stockPatterns = ['NIFTY','SENSEX','HDFC','RELIANCE','TCS','INFY','WIPRO','TITAN','BAJAJ','ADANI','TATA','ICICI','SBI','ONGC'];
  const cryptoPatterns = ['BITCOIN','BTC','ETHEREUM','ETH','SOLANA','SOL','CRYPTO','WEB3','NFT','DEFI'];
  const cricketPatterns = ['IPL','VIRAT','ROHIT','DHONI','BUMRAH','SACHIN','TEST','ODI','T20','WORLD CUP','RCB','MI','CSK','KKR'];
  const t = text.toUpperCase();
  [...stockPatterns, ...cryptoPatterns, ...cricketPatterns].forEach(p => {
    if (t.includes(p)) tags.push(p);
  });
  return [...new Set(tags)].slice(0, 5);
}

function detectBreaking(text: string, minutesAgo: number): boolean {
  const t = text.toLowerCase();
  return minutesAgo < 30 && (
    t.includes('breaking') || t.includes('just in') || t.includes('alert') ||
    t.includes('urgent') || t.includes('live') || t.includes('flash')
  );
}

function detectSportImpact(text: string): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
  const t = text.toLowerCase();
  const win  = ['win','won','victory','beat','triumph','champion','century','wicket','six','four','record'];
  const loss = ['lose','lost','defeat','out','dismissed','injury','retire','ban','suspend'];
  const w = win.filter(w  => t.includes(w)).length;
  const l = loss.filter(l => t.includes(l)).length;
  if (w > l) return 'POSITIVE';
  if (l > w) return 'NEGATIVE';
  return 'NEUTRAL';
}

async function fetchFeed(feed: typeof RSS_FEEDS[0]): Promise<LiveNewsItem[]> {
  try {
    const proxyUrl = `${PROXY}${encodeURIComponent(feed.url)}`;
    const res  = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    const xml  = data.contents;

    const parser  = new DOMParser();
    const doc     = parser.parseFromString(xml, 'text/xml');
    const items   = Array.from(doc.querySelectorAll('item')).slice(0, 8);

    return items.map((item, idx) => {
      const title   = item.querySelector('title')?.textContent?.trim()       || '';
      const desc    = item.querySelector('description')?.textContent?.trim() || '';
      const link    = item.querySelector('link')?.textContent?.trim()        || '#';
      const pubDate = item.querySelector('pubDate')?.textContent?.trim()     || new Date().toISOString();
      const minutesAgo = parseMinutesAgo(pubDate);
      const region  = feed.region as LiveNewsItem['region'];
      const impact  = region === 'SPORTS' ? detectSportImpact(title + ' ' + desc) : detectImpact(title + ' ' + desc);

      // strip html from desc
      const cleanDesc = desc.replace(/<[^>]*>/g, '').slice(0, 300);

      return {
        id:          `${feed.source}-${idx}-${Date.now()}`,
        headline:    title,
        summary:     cleanDesc || title,
        source:      feed.source,
        category:    feed.category,
        subCategory: feed.category,
        time:        new Date(pubDate).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }),
        minutesAgo:  Math.max(0, minutesAgo),
        impact,
        tags:        extractTags(title + ' ' + desc, feed.category),
        isBreaking:  detectBreaking(title, minutesAgo),
        isTrending:  minutesAgo < 120,
        region,
        url:         link,
        pubDate,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchAllNews(): Promise<LiveNewsItem[]> {
  const results = await Promise.allSettled(RSS_FEEDS.map(f => fetchFeed(f)));
  const all: LiveNewsItem[] = [];
  results.forEach(r => {
    if (r.status === 'fulfilled') all.push(...r.value);
  });
  // sort by newest first
  all.sort((a, b) => a.minutesAgo - b.minutesAgo);
  return all;
}

export async function fetchNewsByRegion(region: string): Promise<LiveNewsItem[]> {
  const feeds = RSS_FEEDS.filter(f => f.region === region);
  const results = await Promise.allSettled(feeds.map(f => fetchFeed(f)));
  const all: LiveNewsItem[] = [];
  results.forEach(r => {
    if (r.status === 'fulfilled') all.push(...r.value);
  });
  all.sort((a, b) => a.minutesAgo - b.minutesAgo);
  return all;
}