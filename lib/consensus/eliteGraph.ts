import { Stock } from '../types';
import { RishiScore } from './types';
import { detectArchetype, HISTORICAL_PARALLELS } from '../wisdom/parallels';

// ─── Output Interfaces ────────────────────────────────────────────────────────

export interface DebateEntry {
  rishi: string;
  score: number;
  reasoning: string;
  philosophy: string;
  keyMetric: string;
}

export interface TechnicalEdgeEntry {
  metric: string;
  thisStock: number | string;
  sectorAvg: number | string;
  verdict: 'better' | 'worse' | 'similar';
  insight: string;
}

export interface TimelineEntry {
  rishi: string;
  date: string;
  score: number;
  trigger: string;
  context: string;
  event: 'buy_signal' | 'sell_signal' | 'hold' | 'warning';
}

export interface EliteKnowledgeGraph {
  debate: {
    bulls: DebateEntry[];
    bears: DebateEntry[];
    neutrals: DebateEntry[];
  };
  technicalEdge: TechnicalEdgeEntry[];
  timeline: TimelineEntry[];
  consensus: {
    overall: number;
    bullCount: number;
    bearCount: number;
    neutralCount: number;
  };
}

// ─── Rishi Philosophy Map ─────────────────────────────────────────────────────
// Maps each rishi to their core philosophical lens for generating reasoning

const RISHI_PHILOSOPHY: Record<string, { lens: string; keyFocus: string; signature: string }> = {
  'Buffett':    { lens: 'quality moat',        keyFocus: 'durable competitive advantage',    signature: 'Would I buy this business entirely if I could?' },
  'Graham':     { lens: 'margin of safety',    keyFocus: 'price vs intrinsic value',          signature: 'What is the worst-case liquidation value?' },
  'Lynch':      { lens: 'GARP',                keyFocus: 'PEG ratio and growth visibility',   signature: 'Can I explain this stock in two minutes?' },
  'Munger':     { lens: 'mental models',       keyFocus: 'business quality over price',       signature: 'What are the second-order effects here?' },
  'Damani':     { lens: 'patient compounding', keyFocus: 'essential consumer businesses',     signature: 'Will this business still exist in 20 years?' },
  'Jhunjhunwala': { lens: 'India macro',       keyFocus: 'India growth story participation', signature: 'Is this a proxy for India\'s rising aspirations?' },
  'Soros':      { lens: 'reflexivity',         keyFocus: 'market perception vs reality loop', signature: 'How does the crowd\'s belief change the fundamentals?' },
  'Pabrai':     { lens: 'asymmetric bet',      keyFocus: 'heads I win tails I don\'t lose',  signature: 'What is the downside if I am completely wrong?' },
  'Howard Marks': { lens: 'risk assessment',   keyFocus: 'second-level thinking',             signature: 'What does the consensus miss about this?' },
  'Seth Klarman': { lens: 'deep value',        keyFocus: 'asset-backed margin of safety',    signature: 'What are the hidden assets the market ignores?' },
  'Kacholia':   { lens: 'smallcap discovery', keyFocus: 'undiscovered quality gems',          signature: 'Why hasn\'t the market found this yet?' },
  'Kedia':      { lens: 'momentum value',      keyFocus: 'price action + fundamentals',       signature: 'Is the price confirming or contradicting the thesis?' },
  'Porinju':    { lens: 'contrarian value',    keyFocus: 'out-of-favor businesses',           signature: 'Why does the market hate this and is it wrong?' },
  'Raamdeo':    { lens: 'QGLP framework',      keyFocus: 'Quality Growth Longevity Price',    signature: 'Score this on Quality, Growth, Longevity, Price.' },
  'Nemish':     { lens: 'balance sheet',       keyFocus: 'hidden asset value',                signature: 'What does the balance sheet reveal that P&L hides?' },
  'Basant':     { lens: 'narrative investing', keyFocus: 'sectoral tailwinds + management',   signature: 'What is the business story and who is telling it?' },
  'Philip Fisher': { lens: 'scuttlebutt',      keyFocus: 'management quality and R&D',        signature: 'What do suppliers and competitors say about this?' },
  'Greenblatt': { lens: 'magic formula',       keyFocus: 'earnings yield + ROIC',             signature: 'Is this a good business at a cheap price?' },
  'Templeton':  { lens: 'global contrarian',   keyFocus: 'maximum pessimism entry',           signature: 'Is this hated enough globally for a contrarian bet?' },
  'Schloss':    { lens: 'net-net value',        keyFocus: 'assets below liquidation value',   signature: 'Can I buy the assets for less than they are worth?' },
};

// ─── Generate reasoning from rishi score components ──────────────────────────

function generateReasoning(score: RishiScore, stock: Stock, stance: 'bull' | 'bear' | 'neutral'): string {
  const p = RISHI_PHILOSOPHY[score.name] || { lens: 'fundamental', keyFocus: 'core metrics', signature: '' };
  const topComp = score.comps.sort((a, b) => b.v - a.v)[0];
  const bottomComp = score.comps.sort((a, b) => a.v - b.v)[0];

  if (stance === 'bull') {
    return `Through my ${p.lens} lens, ${stock.name} shows clear merit. ${topComp ? `The ${topComp.label} scores ${topComp.v}/100 — ${topComp.detail}` : ''}. With ROE of ${stock.roe}% and a PE of ${stock.pe}x, the ${p.keyFocus} argument is compelling. ${score.insight}`;
  } else if (stance === 'bear') {
    return `My ${p.lens} framework raises red flags here. ${bottomComp ? `The ${bottomComp.label} scores only ${bottomComp.v}/100 — ${bottomComp.detail}` : ''}. Focusing on ${p.keyFocus}, the risk-reward does not justify current price. ${score.insight}`;
  } else {
    return `Applying my ${p.lens} approach, ${stock.name} sits at a crossroads. The ${p.keyFocus} picture is mixed — I need more data before committing. ${score.insight}`;
  }
}

function generatePhilosophy(score: RishiScore, stock: Stock, stance: 'bull' | 'bear' | 'neutral'): string {
  const p = RISHI_PHILOSOPHY[score.name] || { lens: 'fundamental', keyFocus: 'core metrics', signature: 'What is the core value here?' };
  return `"${p.signature}" — In ${stock.name}'s case, the answer ${stance === 'bull' ? 'supports' : stance === 'bear' ? 'questions' : 'does not yet confirm'} investment at current levels. My ${p.lens} framework demands ${stance === 'bull' ? 'conviction and position sizing' : stance === 'bear' ? 'patience and margin of safety' : 'more clarity before acting'}.`;
}

function generateKeyMetric(score: RishiScore, stance: 'bull' | 'bear'): string {
  const topComp = stance === 'bull'
    ? score.comps.sort((a, b) => b.v - a.v)[0]
    : score.comps.sort((a, b) => a.v - b.v)[0];
  return topComp?.label || (stance === 'bull' ? 'Strong Fundamentals' : 'Risk Factor');
}

// ─── Technical Edge computation ───────────────────────────────────────────────

function buildTechnicalEdge(stock: Stock): TechnicalEdgeEntry[] {
  // Sector averages (approximate market data)
  const SECTOR_AVERAGES: Record<string, { pe: number; roe: number; de: number; opm: number; roce: number; revcagr: number }> = {
    'IT':        { pe: 28, roe: 24, de: 0.1, opm: 22, roce: 28, revcagr: 14 },
    'FMCG':      { pe: 45, roe: 30, de: 0.2, opm: 18, roce: 35, revcagr: 10 },
    'Pharma':    { pe: 32, roe: 18, de: 0.3, opm: 20, roce: 20, revcagr: 12 },
    'Banking':   { pe: 16, roe: 14, de: 5.0, opm: 35, roce: 12, revcagr: 15 },
    'Auto':      { pe: 22, roe: 16, de: 0.5, opm: 10, roce: 18, revcagr: 11 },
    'Metals':    { pe: 10, roe: 12, de: 0.8, opm: 12, roce: 14, revcagr: 8  },
    'Energy':    { pe: 14, roe: 14, de: 0.7, opm: 15, roce: 15, revcagr: 9  },
    'Consumer':  { pe: 38, roe: 22, de: 0.3, opm: 14, roce: 25, revcagr: 13 },
    'Realty':    { pe: 25, roe: 12, de: 1.2, opm: 25, roce: 12, revcagr: 20 },
    'Telecom':   { pe: 30, roe: 8,  de: 2.5, opm: 30, roce: 8,  revcagr: 6  },
    'Infra':     { pe: 18, roe: 10, de: 1.0, opm: 12, roce: 10, revcagr: 12 },
    'Finance':   { pe: 20, roe: 15, de: 4.0, opm: 30, roce: 14, revcagr: 16 },
  };

  const avg = SECTOR_AVERAGES[stock.sector] || { pe: 25, roe: 16, de: 0.5, opm: 15, roce: 18, revcagr: 12 };

  const verdict = (val: number, avgVal: number, higherIsBetter: boolean): 'better' | 'worse' | 'similar' => {
    const ratio = val / Math.max(avgVal, 0.01);
    if (higherIsBetter) {
      return ratio > 1.1 ? 'better' : ratio < 0.9 ? 'worse' : 'similar';
    } else {
      return ratio < 0.9 ? 'better' : ratio > 1.1 ? 'worse' : 'similar';
    }
  };

  return [
    {
      metric: 'P/E Ratio',
      thisStock: stock.pe.toFixed(1) + 'x',
      sectorAvg: avg.pe.toFixed(1) + 'x',
      verdict: verdict(stock.pe, avg.pe, false),
      insight: stock.pe < avg.pe
        ? `Trading at a discount to sector. Graham's margin of safety principle applies — cheaper than peers.`
        : stock.pe > avg.pe * 1.3
        ? `Premium valuation demands premium growth. Lynch would check if PEG ratio justifies this PE.`
        : `Fairly valued vs sector. Buffett would look past PE to ROE sustainability.`,
    },
    {
      metric: 'ROE (Return on Equity)',
      thisStock: stock.roe.toFixed(1) + '%',
      sectorAvg: avg.roe.toFixed(1) + '%',
      verdict: verdict(stock.roe, avg.roe, true),
      insight: stock.roe > avg.roe
        ? `Superior capital efficiency. Munger's "wonderful company" test: high ROE = management allocates capital well.`
        : `Below-sector ROE. Buffett's filter: sustained ROE >15% indicates a real competitive moat.`,
    },
    {
      metric: 'Operating Margin',
      thisStock: stock.opm.toFixed(1) + '%',
      sectorAvg: avg.opm.toFixed(1) + '%',
      verdict: verdict(stock.opm, avg.opm, true),
      insight: stock.opm > avg.opm
        ? `Pricing power confirmed. Damani looks for businesses where margins expand without losing customers.`
        : `Margin pressure detected. Lynch would ask: is this temporary or structural compression?`,
    },
    {
      metric: 'Debt / Equity',
      thisStock: stock.de.toFixed(2) + 'x',
      sectorAvg: avg.de.toFixed(2) + 'x',
      verdict: verdict(stock.de, avg.de, false),
      insight: stock.de < 0.3
        ? `Fortress balance sheet. Pabrai's asymmetric bet thesis works best with low-debt companies — less tail risk.`
        : stock.de > avg.de * 1.5
        ? `Elevated leverage amplifies both gains and losses. Seth Klarman demands higher margin of safety here.`
        : `Moderate debt. Acceptable for this sector. Monitor interest coverage ratio.`,
    },
    {
      metric: 'ROCE',
      thisStock: stock.roce.toFixed(1) + '%',
      sectorAvg: avg.roce.toFixed(1) + '%',
      verdict: verdict(stock.roce, avg.roce, true),
      insight: stock.roce > 20
        ? `Excellent capital deployment. Raamdeo's QGLP framework scores this high on the "Q" (Quality) dimension.`
        : `ROCE below benchmark. Greenblatt's magic formula requires high ROIC — this would not make his screen.`,
    },
    {
      metric: 'Revenue CAGR',
      thisStock: (stock.revcagr || 0).toFixed(1) + '%',
      sectorAvg: avg.revcagr.toFixed(1) + '%',
      verdict: verdict(stock.revcagr || 0, avg.revcagr, true),
      insight: (stock.revcagr || 0) > avg.revcagr
        ? `Faster than sector growth. Lynch's GARP approach: growth above sector + reasonable PE = compelling opportunity.`
        : `Growing slower than peers. Basant would check if management has a credible acceleration plan.`,
    },
  ];
}

// ─── Timeline generation ──────────────────────────────────────────────────────

function buildTimeline(scores: RishiScore[], stock: Stock): TimelineEntry[] {
  const today = new Date();
  const events: TimelineEntry[] = [];

  // Take top 8 rishis (mix of high and low scorers for interest)
  const selected = [
    ...scores.filter(s => s.score >= 75).slice(0, 3),
    ...scores.filter(s => s.score >= 55 && s.score < 75).slice(0, 3),
    ...scores.filter(s => s.score < 55).slice(0, 2),
  ];

  selected.forEach((rishi, idx) => {
    const daysAgo = (idx + 1) * 25;
    const eventDate = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const dateStr = eventDate.toISOString().split('T')[0];
    const eventType: TimelineEntry['event'] =
      rishi.score >= 80 ? 'buy_signal' :
      rishi.score >= 60 ? 'hold' :
      rishi.score >= 45 ? 'warning' :
      'sell_signal';

    const p = RISHI_PHILOSOPHY[rishi.name] || { lens: 'fundamental', keyFocus: 'metrics', signature: '' };
    const topComp = rishi.comps.sort((a, b) => b.v - a.v)[0];

    const contextMap: Record<TimelineEntry['event'], string> = {
      buy_signal: `${rishi.full} model triggers BUY. ${p.lens} score: ${rishi.score}/100. Primary driver: ${topComp?.label || 'overall quality'}. ${topComp?.detail || rishi.insight}`,
      hold:       `${rishi.full} model signals HOLD. Score of ${rishi.score} — not cheap enough to buy aggressively, not expensive enough to exit. ${p.keyFocus} remains acceptable.`,
      warning:    `${rishi.full} model issues CAUTION. Score ${rishi.score}/100 — ${p.keyFocus} deteriorating. Requires fresh catalyst before re-entry.`,
      sell_signal:`${rishi.full} model triggers REDUCE. Score ${rishi.score}/100 — ${p.lens} framework no longer supports current valuation. Risk-reward unfavorable.`,
    };

    events.push({
      rishi: rishi.full,
      date: dateStr,
      score: rishi.score,
      trigger: topComp?.label || p.keyFocus,
      context: contextMap[eventType],
      event: eventType,
    });
  });

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ─── Main Builder ─────────────────────────────────────────────────────────────

export function buildEliteKnowledgeGraph(
  stock: Stock,
  scores: RishiScore[]
): EliteKnowledgeGraph {

  // Sort scores high to low
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  const bullScores   = sorted.filter(s => s.score >= 70);
  const bearScores   = sorted.filter(s => s.score < 50).reverse();
  const neutralScores = sorted.filter(s => s.score >= 50 && s.score < 70);

  // Build debate entries
  const bulls: DebateEntry[] = bullScores.slice(0, 5).map(s => ({
    rishi: s.full,
    score: s.score,
    reasoning: generateReasoning(s, stock, 'bull'),
    philosophy: generatePhilosophy(s, stock, 'bull'),
    keyMetric: generateKeyMetric(s, 'bull'),
  }));

  const bears: DebateEntry[] = bearScores.slice(0, 5).map(s => ({
    rishi: s.full,
    score: s.score,
    reasoning: generateReasoning(s, stock, 'bear'),
    philosophy: generatePhilosophy(s, stock, 'bear'),
    keyMetric: generateKeyMetric(s, 'bear'),
  }));

  const neutrals: DebateEntry[] = neutralScores.slice(0, 3).map(s => ({
    rishi: s.full,
    score: s.score,
    reasoning: generateReasoning(s, stock, 'neutral'),
    philosophy: generatePhilosophy(s, stock, 'neutral'),
    keyMetric: s.comps[0]?.label || 'Watching',
  }));

  // Technical edge vs sector
  const technicalEdge = buildTechnicalEdge(stock);

  // Timeline
  const timeline = buildTimeline(scores, stock);

  // Consensus counts
  const bullCount    = bullScores.length;
  const bearCount    = bearScores.length;
  const neutralCount = neutralScores.length;
  const overall      = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / Math.max(scores.length, 1));

  return {
    debate: { bulls, bears, neutrals },
    technicalEdge,
    timeline,
    consensus: { overall, bullCount, bearCount, neutralCount },
  };
}