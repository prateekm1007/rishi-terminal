'use client';

import { useEffect } from 'react';

export default function StockError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Stock page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-red-500 text-sm font-mono mb-3">ERROR</p>
        <h2 className="font-cinzel text-2xl text-zinc-100 mb-4">
          Something went wrong
        </h2>
        <p className="text-zinc-400 text-sm mb-8">
          We couldn’t load the Rishi analysis for this stock.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 border border-zinc-700 hover:bg-zinc-900 rounded font-mono text-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}