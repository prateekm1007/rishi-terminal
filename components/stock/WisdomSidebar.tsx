'use client';

import { Stock, RishiScore } from '../../lib/types';

interface WisdomSidebarProps {
  stock: Stock;
  scores: RishiScore[];
}

interface HistoricalParallel {
  companies: string[];
  era: string;
  lesson: string;
  rishis: string[];
  quote: string;
  author: string;
}

const HISTORICAL_PARALLELS: Record<string, HistoricalParallel> = {
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

function detectArchetype(stock: Stock): string | null {
  const { sector, roe, pe, np, revcagr, de, mktcap } = stock;

  // Consumer moat: FMCG/Consumer with high ROE
  if (['FMCG', 'Consumer Goods', 'Retail'].includes(sector) && roe > 20) {
    return 'consumer_moat';
  }

  // Cyclical value trap: Metals/Energy with low PE
  if (['Metals', 'Energy', 'Commodities'].includes(sector) && pe < 10 && pe > 0) {
    return 'cyclical_value';
  }

  // Growth premium: High PE with negative profits
  if (pe > 50 && np < 0) {
    return 'growth_premium';
  }

  // Quality growth: IT/Finance with consistent metrics
  if (['IT', 'Finance', 'Banking'].includes(sector) && roe > 15 && de < 1) {
    return 'quality_growth';
  }

  // Turnaround: Negative ROE or very high D/E
  if (roe < 0 || de > 3) {
    return 'turnaround';
  }

  // Smallcap gem: Market cap < 10000cr, high growth
  if (mktcap < 10000 && revcagr > 20 && roe > 15) {
    return 'smallcap_gem';
  }

  return null;
}

export function WisdomSidebar({ stock, scores }: WisdomSidebarProps) {
  const archetypeKey = detectArchetype(stock);
  
  if (!archetypeKey) {
    return (
      <div className="card-sacred p-6 sticky top-24">
        <div className="text-xs text-muted text-center">
          No historical parallels detected for this profile.
        </div>
      </div>
    );
  }

  const parallel = HISTORICAL_PARALLELS[archetypeKey];
  if (!parallel) return null;

  // Find relevant Rishi scores
  const relevantScores = scores.filter(s => 
    parallel.rishis.some(r => s.name === r)
  );

  return (
    <div className="card-sacred p-6 sticky top-24 space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs text-accent-gold mb-2 tracking-widest font-medium">
          HISTORICAL WISDOM
        </div>
        <h3 className="philosophy-heading text-lg mb-3">
          {parallel.era}
        </h3>
      </div>

      {/* Lesson */}
      <div className="rishi-insight text-sm leading-relaxed">
        {parallel.lesson}
      </div>

      {/* Similar Companies */}
      <div>
        <div className="text-xs text-muted mb-3 font-medium">SIMILAR COMPANIES:</div>
        <div className="space-y-2">
          {parallel.companies.map((company, idx) => (
            <div 
              key={idx}
              className="text-xs text-secondary pl-3 border-l-2 border-accent-gold/30 py-1"
            >
              {company}
            </div>
          ))}
        </div>
      </div>

      {/* Relevant Rishis */}
      <div>
        <div className="text-xs text-muted mb-3 font-medium">RELEVANT RISHIS:</div>
        <div className="flex flex-wrap gap-2">
          {relevantScores.map((score) => (
            <div 
              key={score.name}
              className="px-3 py-1.5 bg-secondary border border-primary rounded-lg text-xs hover:border-accent-gold/50 transition-colors"
              title={score.insight}
            >
              <span className="font-medium">{score.name}</span>
              <span className="text-muted ml-1">({score.score})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quote */}
      <div className="pt-4 border-t border-border-primary">
        <div className="text-xs text-accent-gold mb-2 font-medium">RELATED QUOTE</div>
        <blockquote className="text-xs italic text-secondary leading-relaxed">
          {'"'}{parallel.quote}{'"'}
        </blockquote>
        <div className="text-xs text-muted mt-2">
          — {parallel.author}
        </div>
      </div>

      {/* Archetype Badge */}
      <div className="pt-4 border-t border-border-primary">
        <div className="px-3 py-2 bg-accent-gold/10 border border-accent-gold/30 rounded-lg text-center">
          <div className="text-xs text-accent-gold font-medium">
            {archetypeKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Pattern
          </div>
        </div>
      </div>
    </div>
  );
}