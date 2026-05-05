import { Stock, RishiScore } from '../types';

export interface HistoricalParallel {
  id: string;
  title: string;
  era: string;
  companies: Array<{
    name: string;
    year: string;
    outcome: string;
    returnPct?: number;
  }>;
  lesson: string;
  rishiPerspectives: Array<{
    rishiName: string;
    quote: string;
    reasoning: string;
  }>;
  archetype: string;
  warningLevel?: 'caution' | 'danger' | 'opportunity';
}

export interface RishiQuote {
  rishi: string;
  quote: string;
  context: string;
  source?: string;
}

// Historical parallel database
export const HISTORICAL_PARALLELS: Record<string, HistoricalParallel> = {
  consumer_moat_india: {
    id: 'consumer_moat_india',
    title: 'The Indian Consumer Moat Pattern',
    era: '2005-2015 Consumption Boom',
    companies: [
      { name: 'Titan Company', year: '2010', outcome: '18x return in 10 years', returnPct: 1700 },
      { name: 'Asian Paints', year: '2008', outcome: '12x return in 12 years', returnPct: 1100 },
      { name: 'Nestle India', year: '2005', outcome: '22x return in 15 years', returnPct: 2100 },
      { name: 'Page Industries', year: '2012', outcome: '25x return in 8 years', returnPct: 2400 },
    ],
    lesson: 'Strong brands + patient capital + rising middle class = multi-decade compounders. Quality was expensive then, looks cheap now.',
    rishiPerspectives: [
      {
        rishiName: 'Damani',
        quote: 'I buy businesses that are boring to most but essential to consumers. Then I wait.',
        reasoning: 'Consumer staples with pricing power compound for decades when left undisturbed.',
      },
      {
        rishiName: 'Buffett',
        quote: 'The best business is one with a wide moat that gets wider every year.',
        reasoning: 'Brand equity in consumer goods creates permanent competitive advantages.',
      },
      {
        rishiName: 'Munger',
        quote: 'Waiting helps you as an investor and a lot of people just cannot stand to wait.',
        reasoning: 'These businesses looked expensive on PE but cheap on long-term value creation.',
      },
    ],
    archetype: 'consumer_moat',
    warningLevel: 'opportunity',
  },

  cyclical_value_trap: {
    id: 'cyclical_value_trap',
    title: 'The Commodity Downcycle Trap',
    era: '2018-2020 Metals & Energy Crash',
    companies: [
      { name: 'Tata Steel', year: '2018', outcome: 'PE 4 → 50% loss in 2 years', returnPct: -50 },
      { name: 'Hindalco', year: '2020', outcome: 'PE 6 → stagnant for 3 years', returnPct: -15 },
      { name: 'Vedanta', year: '2019', outcome: 'PE 5 → 40% loss despite buybacks', returnPct: -40 },
      { name: 'Coal India', year: '2018', outcome: 'PE 7 → sideways for 4 years', returnPct: 5 },
    ],
    lesson: 'Low PE in cyclicals is often a trap, not value. Peak earnings create illusion of cheapness. Mean reversion destroys capital.',
    rishiPerspectives: [
      {
        rishiName: 'Graham',
        quote: 'The investor who permits himself to be stampeded by market declines is perversely transforming his basic advantage into a disadvantage.',
        reasoning: 'But Graham also warned: distinguish between permanent value and cyclical peaks.',
      },
      {
        rishiName: 'Howard Marks',
        quote: 'The biggest investing errors come from psychological factors, not informational ones.',
        reasoning: 'Greed makes low PE look safe. In commodities, low PE often means peak cycle.',
      },
      {
        rishiName: 'Munger',
        quote: 'A great business at a fair price is superior to a fair business at a great price.',
        reasoning: 'Cyclical commodity producers are fair businesses at best. Avoid unless deep distress.',
      },
    ],
    archetype: 'cyclical_trap',
    warningLevel: 'danger',
  },

  growth_mania: {
    id: 'growth_mania',
    title: 'The 2021 IPO Mania Collapse',
    era: '2021-2023 Narrative > Fundamentals',
    companies: [
      { name: 'Zomato', year: '2021', outcome: 'Listed 138 → 40 in 18 months', returnPct: -71 },
      { name: 'Paytm', year: '2021', outcome: 'Listed 2150 → 400 in 24 months', returnPct: -81 },
      { name: 'Nykaa', year: '2021', outcome: 'Listed 2018 → 150 in 18 months', returnPct: -93 },
      { name: 'CarTrade', year: '2021', outcome: 'Listed 1618 → 400 in 18 months', returnPct: -75 },
    ],
    lesson: 'Narratives without profits = permanent capital loss. Growth at any price always ends badly. FOMO is not a strategy.',
    rishiPerspectives: [
      {
        rishiName: 'Buffett',
        quote: 'Price is what you pay. Value is what you get.',
        reasoning: 'These were stories priced for perfection. When execution faltered, capital vanished.',
      },
      {
        rishiName: 'Seth Klarman',
        quote: 'Risk is not knowing what you are doing.',
        reasoning: 'Buying unprofitable companies at premium valuations is speculation, not investment.',
      },
      {
        rishiName: 'Graham',
        quote: 'The speculator\'s primary interest lies in anticipating market psychology.',
        reasoning: 'These were pure momentum plays. No margin of safety exists in narrative stocks.',
      },
    ],
    archetype: 'growth_mania',
    warningLevel: 'danger',
  },

  quality_compound: {
    id: 'quality_compound',
    title: 'The Quality Compounder Pattern',
    era: '2010-2024 Software & IT Services',
    companies: [
      { name: 'TCS', year: '2010', outcome: '8x return with dividends', returnPct: 700 },
      { name: 'Infosys', year: '2012', outcome: '6x return despite volatility', returnPct: 500 },
      { name: 'HCL Tech', year: '2015', outcome: '5x return in 9 years', returnPct: 400 },
      { name: 'Persistent', year: '2018', outcome: '12x return in 6 years', returnPct: 1100 },
    ],
    lesson: 'High ROE + zero debt + predictable cash = boring but beautiful. Ignore short-term noise, compound long-term.',
    rishiPerspectives: [
      {
        rishiName: 'Buffett',
        quote: 'Our favorite holding period is forever.',
        reasoning: 'Quality businesses with pricing power and capital efficiency deserve permanent ownership.',
      },
      {
        rishiName: 'Munger',
        quote: 'Over the long term, it is hard for a stock to earn much better than the business earns.',
        reasoning: 'IT services earn 20-30% ROE consistently. Stock returns mirror business quality.',
      },
      {
        rishiName: 'Lynch',
        quote: 'Know what you own and why you own it.',
        reasoning: 'These are simple businesses: talent + client relationships. Easy to understand = easy to hold.',
      },
    ],
    archetype: 'quality_compound',
    warningLevel: 'opportunity',
  },

  turnaround_gamble: {
    id: 'turnaround_gamble',
    title: 'The Turnaround That Never Came',
    era: '2015-2020 Failed Revival Stories',
    companies: [
      { name: 'Reliance Capital', year: '2015', outcome: 'Delisting via insolvency', returnPct: -100 },
      { name: 'YES Bank', year: '2018', outcome: '95% loss before rescue', returnPct: -95 },
      { name: 'Vodafone Idea', year: '2019', outcome: '99% loss from merger high', returnPct: -99 },
      { name: 'Jet Airways', year: '2017', outcome: 'Total wipeout', returnPct: -100 },
    ],
    lesson: 'Turnarounds rarely turn. Management incompetence is sticky. Avoid unless margin of safety is extreme.',
    rishiPerspectives: [
      {
        rishiName: 'Munger',
        quote: 'A great business at a fair price beats a fair business at a great price.',
        reasoning: 'These looked cheap but business quality was terminal. Price alone is not value.',
      },
      {
        rishiName: 'Graham',
        quote: 'The margin of safety is always dependent on the price paid.',
        reasoning: 'Even Graham\'s deep value worked only with asset backing. These had no safety net.',
      },
      {
        rishiName: 'Howard Marks',
        quote: 'Never forget the six-foot-tall man who drowned in the stream that was five feet deep on average.',
        reasoning: 'Average odds mean nothing when downside is total loss. Avoid binary outcomes.',
      },
    ],
    archetype: 'turnaround_trap',
    warningLevel: 'danger',
  },

  smallcap_rocket: {
    id: 'smallcap_rocket',
    title: 'The Undiscovered Gem Pattern',
    era: '2014-2024 Smallcap Outperformance',
    companies: [
      { name: 'IRCTC', year: '2019', outcome: '15x in 2 years post-listing', returnPct: 1400 },
      { name: 'Dixon Technologies', year: '2017', outcome: '45x in 7 years', returnPct: 4400 },
      { name: 'Polycab India', year: '2019', outcome: '8x in 4 years', returnPct: 700 },
      { name: 'Astral Pipes', year: '2016', outcome: '22x in 8 years', returnPct: 2100 },
    ],
    lesson: 'Undiscovered + high growth + capital efficient = explosive. But requires deep research and extreme patience.',
    rishiPerspectives: [
      {
        rishiName: 'Kacholia',
        quote: 'I look for businesses the market has not discovered yet. Then I wait for the discovery.',
        reasoning: 'Information asymmetry in smallcaps creates opportunity. Low coverage = mispricing.',
      },
      {
        rishiName: 'Lynch',
        quote: 'The person that turns over the most rocks wins the game.',
        reasoning: 'These were not secret. They were boring. Most investors never looked.',
      },
      {
        rishiName: 'Pabrai',
        quote: 'Heads I win, tails I do not lose much.',
        reasoning: 'Strong balance sheets + niche moats = asymmetric upside in undiscovered names.',
      },
    ],
    archetype: 'smallcap_gem',
    warningLevel: 'opportunity',
  },
};

// Detect archetype based on stock characteristics
export function detectArchetype(stock: Stock): string {
  const { sector, pe, roe, de, np, epscagr, opm, mktcap } = stock;

  // Consumer moat: FMCG/Consumer + high ROE + strong margins
  if (['FMCG', 'Consumer'].includes(sector) && roe > 20 && opm > 15) {
    return 'consumer_moat';
  }

  // Cyclical trap: Metals/Energy + low PE + high debt
  if (['Metals', 'Energy', 'Mining'].includes(sector) && pe < 10 && de > 0.5) {
    return 'cyclical_trap';
  }

  // Growth mania: High PE + negative profits
  if (pe > 50 && np < 0) {
    return 'growth_mania';
  }

  // Quality compound: IT/Pharma + high ROE + low debt
  if (['IT', 'Pharma'].includes(sector) && roe > 18 && de < 0.3) {
    return 'quality_compound';
  }

  // Turnaround gamble: Negative profits + high debt
  if (np < 0 && de > 1.5) {
    return 'turnaround_trap';
  }

  // Smallcap rocket: Small cap + high growth + good margins
  if (mktcap < 50000 && epscagr > 20 && opm > 12) {
    return 'smallcap_gem';
  }

  return 'quality_compound'; // Default
}

// Map archetype to parallel
const ARCHETYPE_TO_PARALLEL: Record<string, string> = {
  consumer_moat: 'consumer_moat_india',
  cyclical_trap: 'cyclical_value_trap',
  growth_mania: 'growth_mania',
  quality_compound: 'quality_compound',
  turnaround_trap: 'turnaround_gamble',
  smallcap_gem: 'smallcap_rocket',
};

export function getHistoricalParallel(stock: Stock): HistoricalParallel | null {
  const archetype = detectArchetype(stock);
  const parallelId = ARCHETYPE_TO_PARALLEL[archetype];
  return HISTORICAL_PARALLELS[parallelId] || null;
}

// Get relevant Rishi quotes for this stock
export function getRelevantQuotes(stock: Stock, scores: RishiScore[]): RishiQuote[] {
  const parallel = getHistoricalParallel(stock);
  if (!parallel) return [];

  return parallel.rishiPerspectives.map(p => ({
    rishi: p.rishiName,
    quote: p.quote,
    context: p.reasoning,
    source: parallel.title,
  }));
}

// Find similar stocks by consensus agreement
export function findSimilarStocks(
  stock: Stock,
  consensus: number,
  allStocks: Record<string, Stock>,
  limit = 5
): Array<{ symbol: string; name: string; consensusDiff: number }> {
  const similar: Array<{ symbol: string; name: string; consensusDiff: number }> = [];

  Object.values(allStocks).forEach(s => {
    if (s.symbol === stock.symbol) return;
    if (s.sector !== stock.sector) return;

    // Calculate consensus for peer (lightweight - you'd cache this in production)
    const peerConsensus = Math.round((s.roe + s.roce + (100 - s.de * 10)) / 3);
    const diff = Math.abs(consensus - peerConsensus);

    if (diff < 15) {
      similar.push({
        symbol: s.symbol,
        name: s.name,
        consensusDiff: diff,
      });
    }
  });

  return similar
    .sort((a, b) => a.consensusDiff - b.consensusDiff)
    .slice(0, limit);
}