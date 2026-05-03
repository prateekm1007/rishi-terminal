export async function fetchStockPrice(symbol: string): Promise<number | null> {
  const nsSym = `${symbol}.NS`;
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
  } catch {
    // Direct failed, continue to proxies
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
  } catch {
    // Proxy 1 failed
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
  } catch {
    // Proxy 2 failed
  }

  // All methods failed. Return null silently so UI falls back to static price.
  return null;
}

export async function fetchMultipleStocks(symbols: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(
    symbols.map(async (sym) => {
      const p = await fetchStockPrice(sym);
      if (p != null) out[sym] = p;
    })
  );
  return out;
}
