"use client";

import { useEffect, useState } from "react";

interface Props {
  symbol: string;
  staticPrice: number;
}

export function LivePriceWidget({ symbol, staticPrice }: Props) {
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Optional: Attempt to fetch live price on client-side
    // For now, this is a placeholder for future enhancement
    // You can uncomment and integrate Finnhub here later
    
    // Example future implementation:
    // setLoading(true);
    // fetchFinnhubQuote(symbol)
    //   .then(quote => quote && setLivePrice(quote.c))
    //   .finally(() => setLoading(false));
  }, [symbol]);

  const displayPrice = livePrice ?? staticPrice;
  const isLive = livePrice !== null;

  return (
    <div className="flex items-center gap-3">
      <div>
        <p className="font-mono text-3xl font-bold text-zinc-100">
          {displayPrice.toLocaleString("en-US")}
        </p>
        <p className="text-xs font-mono text-zinc-500 mt-1">
          {loading ? (
            <span className="animate-pulse">Checking live...</span>
          ) : isLive ? (
            <span className="text-emerald-500">● Live</span>
          ) : (
            <span>Last Close</span>
          )}
        </p>
      </div>
    </div>
  );
}