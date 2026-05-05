import { Stock } from '../types';
import { RishiScore } from '../consensus/types';

export interface RishiLens {
  rishi: string;
  full: string;
  pageTitle: (stockName: string) => string;
  philosophy: string;
  focusMetrics: string[];
}

export interface LensAnalysis {
  verdict: string;
  keyMetrics: Array<{ metric: string; value: string; assessment: string }>;
  risks: string[];
  opportunities: string[];
  quote: string;
}

const LENSES: Record<string, RishiLens> = {
  buffett: {
    rishi: 'Buffett',
    full: 'Warren Buffett',
    pageTitle: (n) => `${n} Through Buffett's Eyes`,
    philosophy: 'Quality moats + owner earnings + management integrity',
    focusMetrics: ['ROE', 'OPM', 'Promoter Holding', 'ROCE'],
  },
  graham: {
    rishi: 'Graham',
    full: 'Benjamin Graham',
    pageTitle: (n) => `${n} - Graham Value Analysis`,
    philosophy: 'Margin of safety + NCAV + P/E discipline',
    focusMetrics: ['P/E', 'P/B', 'Current Ratio', 'D/E'],
  },
  damani: {
    rishi: 'Damani',
    full: 'Radhakishan Damani',
    pageTitle: (n) => `${n} - Damani Patient Capital View`,
    philosophy: 'Consumer moats + extreme patience + low debt',
    focusMetrics: ['Sector', 'Brand Strength', 'ROE', 'D/E'],
  },
};

export function getRishiLens(rishiName: string): RishiLens | null {
  return LENSES[rishiName.toLowerCase()] || null;
}

export function applyLens(stock: Stock, score: RishiScore, lens: RishiLens): LensAnalysis {
  const keyMetrics = lens.focusMetrics.map(metric => {
    switch (metric) {
      case 'ROE':
        return {
          metric: 'Return on Equity',
          value: `${stock.roe}%`,
          assessment: stock.roe > 20 ? 'Excellent' : stock.roe > 15 ? 'Good' : 'Weak',
        };
      case 'P/E':
        return {
          metric: 'Price to Earnings',
          value: `${stock.pe}x`,
          assessment: stock.pe < 15 ? 'Attractive' : stock.pe < 25 ? 'Fair' : 'Expensive',
        };
      case 'D/E':
        return {
          metric: 'Debt to Equity',
          value: stock.de.toFixed(2),
          assessment: stock.de < 0.5 ? 'Conservative' : stock.de < 1 ? 'Moderate' : 'High',
        };
      case 'ROCE':
        return {
          metric: 'Return on Capital Employed',
          value: `${stock.roce}%`,
          assessment: stock.roce > 20 ? 'Strong moat' : stock.roce > 12 ? 'Decent' : 'Weak',
        };
      default:
        return { metric, value: 'N/A', assessment: 'N/A' };
    }
  });

  const risks: string[] = [];
  const opportunities: string[] = [];

  if (stock.de > 1) risks.push('High leverage - monitor refinancing risk');
  if (stock.roe < 12) risks.push('Low returns - competitive pressure visible');
  if (stock.pe > 40) risks.push('Rich valuation - limited margin of safety');

  if (stock.fcf > stock.np * 0.8) opportunities.push('Strong free cash flow generation');
  if (stock.promo > 50) opportunities.push('High promoter confidence');
  if (stock.epscagr > 15) opportunities.push('Earnings momentum intact');

  return {
    verdict: score.insight,
    keyMetrics,
    risks: risks.length ? risks : ['No major red flags under this lens'],
    opportunities: opportunities.length ? opportunities : ['Limited upside catalysts visible'],
    quote: getQuote(lens.rishi),
  };
}

function getQuote(rishi: string): string {
  const quotes: Record<string, string> = {
    Buffett: 'Price is what you pay. Value is what you get.',
    Graham: 'The investor\'s chief problem—and his worst enemy—is likely to be himself.',
    Damani: 'Patience is the investor\'s greatest virtue. Let compounding do the work.',
  };
  return quotes[rishi] || 'Discipline beats emotion.';
}