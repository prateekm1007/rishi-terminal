import { validateSymbol, sanitizeSymbol, checkRateLimit } from './security';

export async function fetchStockPrice(symbol: string): Promise<number | null> {
  // Security: Validate and sanitize input
  if (!validateSymbol(symbol)) {
    console.error(`Invalid symbol: ${symbol}`);
    return null;
  }
  
  // Security: Check rate limit
  if (!checkRateLimit()) {
    console.warn('Rate limit exceeded. Please wait before making more requests.');
    return null;
  }
  
  const sanitized = sanitizeSymbol(symbol);
  const nsSym = `${sanitized}.NS`;
  const directUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(nsSym)}`;

  const extract = (data: any) => {
    const r = data?.quoteResponse?.result?.[0];
    const p = r?.regularMarketPrice ?? r?.regularMarketPreviousClose;
    return typeof p === 'number' ? p : null;
  };

  // 1. Try direct
  try {
    const resp = await fetch(directUrl);
    if (resp.ok) {
      const data = await resp.json();
      const val = extract(data);
      if (val) return val;
    }
  } catch (err) {
    console.warn('Direct fetch failed, trying proxies...');
  }

  // 2. Try Proxy 1 (allorigins)
  try {
    const proxy1 = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
    const resp = await fetch(proxy1);
    if (resp.ok) {
      const data = await resp.json();
      const val = extract(data);
      if (val) return val;
    }
  } catch (err) {
    console.warn('Proxy 1 failed, trying proxy 2...');
  }

  // 3. Try Proxy 2 (corsproxy.io)
  try {
    const proxy2 = `https://corsproxy.io/?${encodeURIComponent(directUrl)}`;
    const resp = await fetch(proxy2);
    if (resp.ok) {
      const data = await resp.json();
      const val = extract(data);
      if (val) return val;
    }
  } catch (err) {
    console.warn('All fetch methods failed');
  }

  return null;
}

export async function fetchMultipleStocks(symbols: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  
  // Security: Validate all symbols first
  const validSymbols = symbols.filter(validateSymbol);
  
  await Promise.all(
    validSymbols.map(async (sym) => {
      const p = await fetchStockPrice(sym);
      if (p != null) out[sym] = p;
    })
  );
  return out;
}