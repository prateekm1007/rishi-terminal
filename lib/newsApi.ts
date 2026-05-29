// lib/newsApi.ts
// Thin client wrapper around /api/news (server-side RSS aggregator).
// Do NOT do RSS parsing here — the server handles it via app/api/news/route.ts

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

export async function fetchAllNews(): Promise<LiveNewsItem[]> {
  try {
    const res = await fetch('/api/news', {
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return (data.news as LiveNewsItem[]) || [];
  } catch (err) {
    console.error('[newsApi] fetchAllNews failed:', err);
    return [];
  }
}

export async function fetchNewsByRegion(region: string): Promise<LiveNewsItem[]> {
  try {
    const res = await fetch('/api/news?region=' + encodeURIComponent(region), {
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return (data.news as LiveNewsItem[]) || [];
  } catch (err) {
    console.error('[newsApi] fetchNewsByRegion failed:', err);
    return [];
  }
}