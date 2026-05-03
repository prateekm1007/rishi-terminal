import { notFound } from "next/navigation";
import { resolveStock } from "../../../lib/consensus/stockResolver";
import { buildConsensus } from "../../../lib/consensus/engine";
import { TOTAL_RISHIS } from "../../../lib/consensus/orchestrator";
import { ConsensusHero } from "../../../components/stock/ConsensusHero";
import { RishiGrid } from "../../../components/stock/RishiGrid";
import { PhilosophyRadar } from "../../../components/stock/PhilosophyRadar";
import { MetricsPanel } from "../../../components/stock/MetricsPanel";
import { BullBearBar } from "../../../components/stock/BullBearBar";
import { ShareButton } from "../../../components/stock/ShareButton";
import { LivePriceWidget } from "../../../components/stock/LivePriceWidget";

interface Props {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { symbol } = await params;
  const stock = resolveStock(symbol);
  if (!stock) return { title: "Stock Not Found — Rishi Terminal" };
  
  const report = buildConsensus(stock);
  
  return {
    title: `${stock.name} (${stock.symbol}) — Rishi Consensus: ${report.consensus}/100`,
    description: `19-Rishi philosophical analysis of ${stock.name}. ${report.category}. Deep-dive into quality, value, growth and moat perspectives.`,
    openGraph: {
      title: `${stock.name} — Rishi Terminal`,
      description: `Consensus: ${report.consensus}/100 · ${report.category}`,
    },
  };
}

export default async function StockDeepDivePage({ params }: Props) {
  const { symbol } = await params;
  const stock = resolveStock(symbol);
  if (!stock) notFound();

  const report = buildConsensus(stock);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* Terminal Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          
          <p className="text-xs font-mono text-zinc-600 mb-3">
            <a href="/" className="hover:text-zinc-400 transition-colors">RISHI TERMINAL</a>
            <span className="mx-2">›</span>
            <a href="/screener" className="hover:text-zinc-400 transition-colors">SCREENER</a>
            <span className="mx-2">›</span>
            <span className="text-zinc-400">{stock.symbol}</span>
          </p>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-cinzel text-3xl text-zinc-100 tracking-wide">
                {stock.name}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
                <span className="font-mono text-zinc-400">{stock.symbol}</span>
                <span className="text-zinc-700">·</span>
                <span className="font-mono text-zinc-400">{stock.exchange}</span>
                <span className="text-zinc-700">·</span>
                <span className="font-mono text-zinc-400">{stock.sector}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <LivePriceWidget symbol={stock.symbol} staticPrice={stock.price} />
              <ShareButton stock={stock} consensus={report.consensus} />
            </div>
          </div>

          {/* Data Freshness Indicator */}
          <div className="mt-4 pt-3 border-t border-zinc-800">
            <p className="text-xs font-mono text-zinc-600">
              Fundamental data as of Jan 2025 · Prices updated daily
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        <ConsensusHero
          consensus={report.consensus}
          category={report.category}
          tension={report.tension}
          tensionSpread={report.tensionSpread}
          totalRishis={TOTAL_RISHIS}
          weightedBy={report.weightedBy}
        />

        <BullBearBar topBull={report.topBull} topBear={report.topBear} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PhilosophyRadar scores={report.scores} />
          <MetricsPanel stock={stock} />
        </div>

        <RishiGrid scores={report.scores} />

        <div className="border-t border-zinc-800 pt-6">
          <p className="text-xs font-mono text-zinc-600 leading-relaxed">
            Philosophical analysis only. Not financial advice. Scores are deterministic and based on publicly available data.
          </p>
        </div>

      </div>
    </main>
  );
}