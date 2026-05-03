import Link from 'next/link';

export default function StockNotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-orange-500 text-sm font-mono mb-3">404</p>
        <h2 className="font-cinzel text-3xl text-zinc-100 mb-4">
          Stock Not Found
        </h2>
        <p className="text-zinc-400 mb-8">
          This symbol doesn’t exist in our current universe of 100+ stocks.
        </p>
        <Link 
          href="/screener" 
          className="inline-block px-6 py-2 border border-zinc-700 hover:bg-zinc-900 rounded font-mono text-sm transition-colors"
        >
          Go to Screener
        </Link>
      </div>
    </div>
  );
}