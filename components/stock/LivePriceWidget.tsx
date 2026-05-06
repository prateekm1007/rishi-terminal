'use client';

import { Stock } from '../../lib/types';
import { useState, useEffect } from 'react';

interface LivePriceWidgetProps {
  stock: Stock;
}

export function LivePriceWidget({ stock }: LivePriceWidgetProps) {
  const [displayPrice, setDisplayPrice] = useState<number>(stock.price);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Ensure price is valid
    if (stock.price && typeof stock.price === 'number') {
      setDisplayPrice(stock.price);
    }

    // Simulate live price updates (remove in production with real API)
    const interval = setInterval(() => {
      const volatility = 0.002; // 0.2% max change
      const change = (Math.random() - 0.5) * 2 * volatility;
      const newPrice = stock.price * (1 + change);
      
      setDisplayPrice(newPrice);
      setPriceChange(change * 100);
    }, 3000);

    return () => clearInterval(interval);
  }, [stock.price]);

  // Guard against undefined
  if (!displayPrice || typeof displayPrice !== 'number') {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 min-w-[200px]">
        <p className="text-xs text-zinc-500 mb-1">LIVE PRICE</p>
        <div className="font-mono text-3xl font-bold text-zinc-100">
          {stock.price?.toFixed(2) || '0.00'}
        </div>
        <p className="text-xs font-mono text-zinc-500 mt-1">
          Static data
        </p>
      </div>
    );
  }

  const isPositive = priceChange >= 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 min-w-[200px]">
      <p className="text-xs text-zinc-500 mb-1">LIVE PRICE</p>
      <div>
        <p className="font-mono text-3xl font-bold text-zinc-100">
          {displayPrice.toLocaleString('en-IN', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          })}
        </p>
        <p className="text-xs font-mono text-zinc-500 mt-1">
          {loading ? (
            <span className="text-yellow-500">Updating...</span>
          ) : (
            <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}% today
            </span>
          )}
        </p>
      </div>
    </div>
  );
}