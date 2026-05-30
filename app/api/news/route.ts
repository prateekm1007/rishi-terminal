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
  pubDate: string;
}

// Fresh-only RSS feeds. Includes direct feeds + Google News RSS query feeds.
// No API key, no payment, no quota. Age filter below removes stale feed entries.
const RSS_FEEDS = [
  // INDIA: Markets, Economy, Earnings, Corporate, Tech, Regulation
  { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', source: 'Economic Times', category: 'Markets', region: 'INDIA' },
  { url: 'https://www.livemint.com/rss/markets', source: 'Mint Markets', category: 'Markets', region: 'INDIA' },
  { url: 'https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms', source: 'ET Economy', category: 'Economy', region: 'INDIA' },
  { url: 'https://www.livemint.com/rss/economy', source: 'Mint Economy', category: 'Economy', region: 'INDIA' },
  { url: 'https://economictimes.indiatimes.com/news/company/corporate-trends/rssfeeds/13357270.cms', source: 'ET Corporate', category: 'Corporate', region: 'INDIA' },
  { url: 'https://www.livemint.com/rss/companies', source: 'Mint Companies', category: 'Earnings', region: 'INDIA' },
  { url: 'https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms', source: 'ET Tech', category: 'Tech', region: 'INDIA' },

  { url: 'https://news.google.com/rss/search?q=India%20stock%20market%20Nifty%20Sensex%20when:1d&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google India Markets', category: 'Markets', region: 'INDIA' },
  { url: 'https://news.google.com/rss/search?q=RBI%20SEBI%20India%20economy%20inflation%20GDP%20when:1d&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google India Economy', category: 'Economy', region: 'INDIA' },
  { url: 'https://news.google.com/rss/search?q=India%20company%20earnings%20quarterly%20results%20when:1d&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google Earnings', category: 'Earnings', region: 'INDIA' },
  { url: 'https://news.google.com/rss/search?q=SEBI%20RBI%20regulation%20markets%20India%20when:1d&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google Regulation', category: 'Regulation', region: 'INDIA' },
  { url: 'https://news.google.com/rss/search?q=India%20corporate%20business%20companies%20when:1d&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google Corporate', category: 'Corporate', region: 'INDIA' },
  { url: 'https://news.google.com/rss/search?q=India%20technology%20startups%20AI%20IT%20when:1d&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google Tech', category: 'Tech', region: 'INDIA' },

  // GLOBAL: Markets, Economy, Commodities/Forex mapped to Markets
  { url: 'https://www.investing.com/rss/news.rss', source: 'Investing News', category: 'Markets', region: 'GLOBAL' },
  { url: 'https://www.investing.com/rss/stock_market_news.rss', source: 'Investing Stocks', category: 'Markets', region: 'GLOBAL' },
  { url: 'https://www.investing.com/rss/economy.rss', source: 'Investing Economy', category: 'Economy', region: 'GLOBAL' },
  { url: 'https://www.investing.com/rss/commodities.rss', source: 'Investing Commodities', category: 'Markets', region: 'GLOBAL' },
  { url: 'https://www.investing.com/rss/forex_market_news.rss', source: 'Investing Forex', category: 'Markets', region: 'GLOBAL' },

  { url: 'https://news.google.com/rss/search?q=global%20markets%20stocks%20economy%20when:1d&hl=en-US&gl=US&ceid=US:en', source: 'Google Global Markets', category: 'Markets', region: 'GLOBAL' },
  { url: 'https://news.google.com/rss/search?q=Federal%20Reserve%20inflation%20GDP%20global%20economy%20when:1d&hl=en-US&gl=US&ceid=US:en', source: 'Google Global Economy', category: 'Economy', region: 'GLOBAL' },
  { url: 'https://news.google.com/rss/search?q=gold%20oil%20commodities%20market%20when:1d&hl=en-US&gl=US&ceid=US:en', source: 'Google Commodities', category: 'Markets', region: 'GLOBAL' },

  // CRYPTO
  { url: 'https://cointelegraph.com/rss', source: 'CoinTelegraph', category: 'Crypto', region: 'CRYPTO' },
  { url: 'https://coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk', category: 'Crypto', region: 'CRYPTO' },
  { url: 'https://cointelegraph.com/rss/tag/bitcoin', source: 'CT Bitcoin', category: 'Crypto', region: 'CRYPTO' },
  { url: 'https://cointelegraph.com/rss/tag/ethereum', source: 'CT Ethereum', category: 'Crypto', region: 'CRYPTO' },
  { url: 'https://news.google.com/rss/search?q=bitcoin%20ethereum%20crypto%20market%20when:1d&hl=en-US&gl=US&ceid=US:en', source: 'Google Crypto', category: 'Crypto', region: 'CRYPTO' },

  // SPORTS / CRICKET / IPL
  { url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml', source: 'ESPNCricinfo', category: 'Cricket', region: 'SPORTS' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128818991.cms', source: 'TOI Sports', category: 'Cricket', region: 'SPORTS' },
  { url: 'https://economictimes.indiatimes.com/news/sports/rssfeeds/1564431.cms', source: 'ET Sports', category: 'Cricket', region: 'SPORTS' },
  { url: 'https://news.google.com/rss/search?q=India%20cricket%20BCCI%20match%20when:1d&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google Cricket', category: 'Cricket', region: 'SPORTS' },
  { url: 'https://news.google.com/rss/search?q=IPL%20cricket%20RCB%20MI%20CSK%20KKR%20when:1d&hl=en-IN&gl=IN&ceid=IN:en', source: 'Google IPL', category: 'IPL', region: 'SPORTS' },
];

const MAX_AGE_MINUTES = 48 * 60;

function parseMinutesAgo(pubDate: string): number {
  try {
    const pub = new Date(pubDate);
    if (isNaN(pub.getTime())) return 99999;
    return Math.floor((Date.now() - pub.getTime()) / 60000);
  } catch {
    return 99999;
  }
}

function fixMojibake(s: string): string {
  // UTF-8 sequences misread as Latin-1 (common in RSS feeds)
  // Curly apostrophe / right single quote U+2019 (0xE2 0x80 0x99)
  s = s.replace(/\u00e2\u0080\u0099/g, '\u2019');  // â€™ → '
  s = s.replace(/â\u0080\u0099/g, '\u2019');
  s = s.replace(/â€™/g, '\u2019');
  // Left single quote U+2018 (0xE2 0x80 0x98)
  s = s.replace(/\u00e2\u0080\u0098/g, '\u2018');
  s = s.replace(/â€˜/g, '\u2018');
  // Left double quote U+201C (0xE2 0x80 0x9C)
  s = s.replace(/\u00e2\u0080\u009c/g, '\u201c');
  s = s.replace(/â€œ/g, '\u201c');
  // Right double quote U+201D (0xE2 0x80 0x9D)
  s = s.replace(/\u00e2\u0080\u009d/g, '\u201d');
  s = s.replace(/â€/g, '\u201d');
  // En dash U+2013 (0xE2 0x80 0x93)
  s = s.replace(/\u00e2\u0080\u0093/g, '\u2013');
  s = s.replace(/â€"/g, '\u2013');
  // Em dash U+2014 (0xE2 0x80 0x94)
  s = s.replace(/\u00e2\u0080\u0094/g, '\u2014');
  s = s.replace(/â€"/g, '\u2014');
  // Ellipsis U+2026 (0xE2 0x80 0xA6)
  s = s.replace(/\u00e2\u0080\u00a6/g, '\u2026');
  s = s.replace(/â€¦/g, '\u2026');
  // Indian Rupee U+20B9 (0xE2 0x82 0xB9)
  s = s.replace(/\u00e2\u0082\u00b9/g, '\u20b9');
  s = s.replace(/â¹/g, '\u20b9');
  // Euro U+20AC (0xE2 0x82 0xAC)
  s = s.replace(/\u00e2\u0082\u00ac/g, '\u20ac');
  s = s.replace(/â¬/g, '\u20ac');
  // Bullet U+2022 (0xE2 0x80 0xA2)
  s = s.replace(/\u00e2\u0080\u00a2/g, '\u2022');
  // Trademark U+2122 (0xE2 0x84 0xA2)
  s = s.replace(/\u00e2\u0084\u00a2/g, '\u2122');
  // Registered U+00AE (0xC2 0xAE)
  s = s.replace(/\u00c2\u00ae/g, '\u00ae');
  // Copyright U+00A9 (0xC2 0xA9)
  s = s.replace(/\u00c2\u00a9/g, '\u00a9');
  // Non-breaking space (0xC2 0xA0)
  s = s.replace(/\u00c2\u00a0/g, ' ');
  // Degree U+00B0 (0xC2 0xB0)
  s = s.replace(/\u00c2\u00b0/g, '\u00b0');
  // Pound U+00A3 (0xC2 0xA3)
  s = s.replace(/\u00c2\u00a3/g, '\u00a3');
  // Yen U+00A5 (0xC2 0xA5)
  s = s.replace(/\u00c2\u00a5/g, '\u00a5');

  // Fallback: strip remaining lone â, Â, Ã sequences that are unrecognised mojibake
  s = s.replace(/â[^\w\s]/g, '\'');
  s = s.replace(/Â\s*/g, '');
  s = s.replace(/Ã\S*/g, '');

  return s;
}

function decodeHtml(input: string): string {
  // Step 1: fix UTF-8 mojibake first
  let result = fixMojibake(input);

  // Step 2: decode named HTML entities
  result = result
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Curly quotes (named)
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8220;/g, '\u201c')
    .replace(/&#8221;/g, '\u201d')
    // Dashes
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8212;/g, '\u2014')
    // Ellipsis
    .replace(/&#8230;/g, '\u2026')
    // Currency
    .replace(/&#8377;/g, '\u20b9')
    .replace(/&#x20B9;/gi, '\u20b9')
    .replace(/&#8364;/g, '\u20ac')
    .replace(/&#163;/g, '\u00a3')
    .replace(/&#165;/g, '\u00a5')
    .replace(/&#36;/g, '$')
    // Symbols
    .replace(/&#8226;/g, '\u2022')
    .replace(/&#169;/g, '\u00a9')
    .replace(/&#174;/g, '\u00ae')
    .replace(/&#8482;/g, '\u2122')
    .replace(/&#176;/g, '\u00b0');

  // Step 3: generic numeric entity decoder (catches anything above missed)
  result = result.replace(/&#(\d+);/g, (_m: string, dec: string) => {
    const code = parseInt(dec, 10);
    return (code > 31 && code < 1114111) ? String.fromCodePoint(code) : '';
  });

  // Step 4: hex entity decoder
  result = result.replace(/&#x([0-9A-Fa-f]+);/g, (_m: string, hex: string) => {
    const code = parseInt(hex, 16);
    return (code > 31 && code < 1114111) ? String.fromCodePoint(code) : '';
  });

  return result.trim();
}

function extractTag(xml: string, tag: string): string {
  const open = '<' + tag;
  const close = '</' + tag + '>';
  const start = xml.indexOf(open);
  if (start === -1) return '';
  const contentStart = xml.indexOf('>', start);
  if (contentStart === -1) return '';
  const end = xml.indexOf(close, contentStart);
  if (end === -1) return '';

  let content = xml.slice(contentStart + 1, end).trim();

  if (content.startsWith('<![CDATA[') && content.endsWith(']]>')) {
    content = content.slice(9, content.length - 3).trim();
  }

  content = decodeHtml(content);

  content = content
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return content;
}

function detectImpact(text: string): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
  const t = text.toLowerCase();
  const pos = ['surge','rally','gain','jump','rise','high','bull','growth','profit','beat','record','strong','boost','recover','up','win','victory','buy'];
  const neg = ['crash','fall','drop','plunge','loss','bear','decline','down','weak','miss','slump','cut','ban','risk','warn','concern','sell','fear'];
  const ps = pos.filter(w => t.includes(w)).length;
  const ns = neg.filter(w => t.includes(w)).length;
  if (ps > ns) return 'POSITIVE';
  if (ns > ps) return 'NEGATIVE';
  return 'NEUTRAL';
}

function extractTags(text: string, category: string): string[] {
  const tags: string[] = [category];
  const patterns = [
    'NIFTY','SENSEX','HDFC','RELIANCE','TCS','INFOSYS','WIPRO','ADANI','TATA',
    'BITCOIN','BTC','ETHEREUM','ETH','SOLANA','SOL','CRYPTO',
    'IPL','CRICKET','VIRAT','ROHIT','RCB','MI','CSK',
    'RBI','SEBI','FED','GDP','INFLATION','CPI',
    'GOLD','SILVER','OIL','CRUDE','AI','TECH'
  ];
  const t = text.toUpperCase();
  patterns.forEach(p => {
    if (t.includes(p)) tags.push(p);
  });
  return [...new Set(tags)].slice(0, 6);
}

function headlineKey(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .join(' ');
}

async function fetchFeed(feed: typeof RSS_FEEDS[0]): Promise<LiveNewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      signal: AbortSignal.timeout(7000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RishiTerminal/1.0; +https://rishi-terminal.vercel.app)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

        const xmlBuf = await res.arrayBuffer();
    let xml = new TextDecoder('utf-8').decode(xmlBuf);
    xml = fixMojibake(xml);
    const parts = xml.split('<item');    const items: LiveNewsItem[] = [];

    for (let i = 1; i < parts.length; i++) {
      const chunk = parts[i];
      const closeIdx = chunk.indexOf('</item>');
      const itemXml = closeIdx !== -1 ? chunk.slice(0, closeIdx) : chunk;

      const title = extractTag(itemXml, 'title');
      const desc = extractTag(itemXml, 'description').slice(0, 350);
      const pubDate = extractTag(itemXml, 'pubDate') || extractTag(itemXml, 'dc:date');

      let link = extractTag(itemXml, 'link');
      if (!link) {
        const hrefMatch = itemXml.match(/href=["']([^"']+)["']/);
        if (hrefMatch) link = hrefMatch[1];
      }
      if (!link) link = '#';

      if (!title || title.length < 5) continue;

      const minutesAgo = parseMinutesAgo(pubDate);

      // Hard stale filter: never return old articles.
      if (minutesAgo > MAX_AGE_MINUTES) continue;

      const impact = detectImpact(title + ' ' + desc);

      items.push({
        id: feed.source.replace(/\s/g, '-') + '-' + i + '-' + Date.now(),
        headline: fixMojibake(title),
        summary: fixMojibake(desc || title),
        source: feed.source,
        category: feed.category,
        subCategory: feed.category,
        time: new Date(pubDate || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        minutesAgo: Math.max(0, minutesAgo),
        impact,
        tags: extractTags(title + ' ' + desc, feed.category),
        isBreaking: minutesAgo < 30,
        isTrending: minutesAgo < 180,
        region: feed.region as LiveNewsItem['region'],
        url: link,
        pubDate: pubDate || new Date().toISOString(),
      });

      if (items.length >= 12) break;
    }

    return items;
  } catch (err) {
    console.error('Feed failed (' + feed.source + '):', String(err));
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

    const seen = new Set<string>();
    const all: LiveNewsItem[] = [];

    results.forEach(r => {
      if (r.status !== 'fulfilled') return;

      r.value.forEach(item => {
        const key = headlineKey(item.headline);
        if (!key || seen.has(key)) return;
        seen.add(key);
        all.push(item);
      });
    });

    all.sort((a, b) => a.minutesAgo - b.minutesAgo);

    return NextResponse.json(
      {
        news: all,
        count: all.length,
        generatedAt: new Date().toISOString(),
        maxAgeHours: MAX_AGE_MINUTES / 60,
        feedCount: feedsToFetch.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { news: [], error: 'Failed to fetch news', detail: String(error) },
      { status: 500 }
    );
  }
}