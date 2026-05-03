export default function StockLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 bg-zinc-900/80 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse mb-3" />
          <div className="flex items-end justify-between">
            <div>
              <div className="h-8 w-64 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-32 bg-zinc-800 rounded mt-3 animate-pulse" />
            </div>
            <div className="text-right">
              <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-20 bg-zinc-800 rounded mt-2 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Consensus Hero Skeleton */}
        <div className="border border-zinc-800 rounded-lg p-8 bg-zinc-900/50">
          <div className="flex items-start justify-between">
            <div>
              <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse mb-4" />
              <div className="h-20 w-40 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="h-24 w-48 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>

        {/* Bull/Bear + Radar + Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 bg-zinc-900/40 border border-zinc-800 rounded animate-pulse" />
          <div className="h-48 bg-zinc-900/40 border border-zinc-800 rounded animate-pulse" />
        </div>

        {/* Rishi Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-zinc-900/40 border border-zinc-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}