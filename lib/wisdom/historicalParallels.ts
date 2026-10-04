// A1 (Round 14): the historical-parallels dataset and the archetype
// detector used by the stock page's wisdom rail. Moved VERBATIM out of
// components/stock/WisdomSidebar.tsx — they lived inline in a client
// component, which shipped the whole dataset to every browser on every
// stock page. The stock page now runs the detector on the SERVER (per
// regeneration) and hands the resolved parallel to the rail as a prop —
// the rendered HTML is unchanged, the client bundle is lighter.
//
// Rule 14 note: lib/wisdom/parallels.ts carries a DIFFERENT parallels
// dataset with different detection rules (used by eliteGraph/graph and
// pinned by test/y4.nullNotZero.test.ts). Unifying the two changes what
// renders — that is a product decision, flagged in the A1 PR, not
// silently taken here.

import { Stock } from '../types';

export interface HistoricalParallel {
  companies: string[];
  era: string;
  lesson: string;
  rishis: string[];
  quote: string;
  author: string;
}

export const HISTORICAL_PARALLELS: Record<string, HistoricalParallel> = {
  consumer_moat: {
    companies: ['Titan (2010)', 'Asian Paints (2008)', 'Nestle India (2005)'],
    era: '2005-2015 India Consumption Boom',
    lesson: 'Brand moats combined with patient capital created generational wealth. Companies with pricing power and loyal customers compounded at 25%+ for a decade.',
    rishis: ['Damani', 'Buffett', 'Munger'],
    quote: 'The best businesses are those where the customer cannot do without you.',
    author: 'Radhakishan Damani',
  },
  cyclical_value: {
    companies: ['Tata Steel (2018)', 'Hindalco (2020)', 'Vedanta (2019)'],
    era: 'Commodity Downcycle 2018-2020',
    lesson: 'Low P/E ratios in cyclical industries often signal deteriorating fundamentals, not bargains. Wait for the cycle to turn before deploying capital.',
    rishis: ['Graham', 'Marks', 'Klarman'],
    quote: 'Price is what you pay, value is what you get - but in cyclicals, both move together.',
    author: 'Howard Marks',
  },
  growth_premium: {
    companies: ['Zomato (2021)', 'Paytm (2021)', 'Nykaa (2021)'],
    era: 'IPO Mania 2021',
    lesson: 'Narratives without profits are speculative bets, not investments. The market eventually demands profitability, regardless of growth rates.',
    rishis: ['Buffett', 'Munger', 'Klarman'],
    quote: 'Beware of geeks bearing formulas.',
    author: 'Warren Buffett',
  },
  quality_growth: {
    companies: ['HDFC Bank (2005)', 'TCS (2010)', 'Infosys (2008)'],
    era: 'India Services Export Boom',
    lesson: 'Quality companies with sustainable competitive advantages justify premium valuations. Consistent execution over decades creates wealth.',
    rishis: ['Buffett', 'Lynch', 'Raamdeo'],
    quote: 'Time is the friend of the wonderful business, the enemy of the mediocre.',
    author: 'Warren Buffett',
  },
  turnaround: {
    companies: ['Tata Motors (2016)', 'Yes Bank (2020)', 'Suzlon (2018)'],
    era: 'Corporate Turnaround Attempts',
    lesson: 'Turnarounds rarely turn. Broken business models and weak balance sheets usually stay broken despite management promises.',
    rishis: ['Lynch', 'Munger', 'Klarman'],
    quote: 'Turnarounds seldom turn.',
    author: 'Peter Lynch',
  },
  smallcap_gem: {
    companies: ['Dixon (2018)', 'IRCTC (2019)', 'Avenue Supermarts (2017)'],
    era: 'Smallcap Discovery Phase',
    lesson: 'Undiscovered smallcaps with strong fundamentals and honest management can deliver multibagger returns as the market recognizes value.',
    rishis: ['Kacholia', 'Porinju', 'Basant'],
    quote: 'The best investment opportunities are found where others are not looking.',
    author: 'Ashish Kacholia',
  },
};

export function detectArchetype(stock: Stock): string | null {
  const { sector, roe, pe, np, revcagr, de, mktcap } = stock;
  if (['FMCG', 'Consumer', 'Retail'].includes(sector) && roe > 20) return 'consumer_moat';
  if (['Metals', 'Energy'].includes(sector) && pe < 10 && pe > 0) return 'cyclical_value';
  if (pe > 50 && np < 0) return 'growth_premium';
  // Y4 (Round 12): Banking removed — a bank is not an IT-services
  // compounder, and the seed's bank D/E 0 (placeholder) made the old
  // IT-plus-Banking rule match on fabricated cleanliness. Banks (and
  // anything else unmatched) show NO analog rather than a wrong one.
  if (sector === 'IT' && roe > 15 && de < 1) return 'quality_growth';
  if (roe < 0 || de > 3) return 'turnaround';
  if (mktcap < 10000 && revcagr > 20 && roe > 15) return 'smallcap_gem';
  return null;
}
