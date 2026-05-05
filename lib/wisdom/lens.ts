import { Stock, RishiScore } from '../types';

export interface RishiLens {
  rishi: string;
  fullName: string;
  philosophy: string;
  focus: string[];
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  icon: string;
  greeting: string;
  pageTitle: (stockName: string) => string;
  metricPriority: string[];
  warningThreshold: (stock: Stock) => string | null;
  opportunitySignal: (stock: Stock) => string | null;
}

/**
 * RISHI LENS DEFINITIONS
 * Each lens completely reframes how the stock is presented
 */
export const RISHI_LENSES: Record<string, RishiLens> = {
  Buffett: {
    rishi: 'Buffett',
    fullName: 'Warren Buffett',
    philosophy: 'Quality Moat Builder',
    focus: ['ROE Sustainability', 'Economic Moat', 'Owner Earnings', 'Management Quality'],
    colorScheme: {
      primary: '#1e40af',
      secondary: '#3b82f6',
      accent: '#60a5fa',
    },
    icon: '👑',
    greeting: 'Through the lens of compounding quality...',
    pageTitle: (stockName) => `${stockName}: A Buffett Quality Analysis`,
    metricPriority: ['roe', 'roce', 'opm', 'fcf', 'promo'],
    warningThreshold: (stock) => {
      if (stock.roe < 15) return '⚠️ Buffett Warning: ROE below 15% — lacks sustainable competitive advantage';
      if (stock.opm < 15) return '⚠️ Buffett Warning: Operating margin too thin — no pricing power moat';
      if (stock.promo < 25) return '⚠️ Buffett Warning: Low promoter holding — management not eating own cooking';
      return null;
    },
    opportunitySignal: (stock) => {
      if (stock.roe > 20 && stock.roce > 20 && stock.opm > 20) {
        return '✓ Buffett Signal: Triple 20 club — rare quality compounder detected';
      }
      if (stock.roe > 25 && stock.promo > 50) {
        return '✓ Buffett Signal: Owner-operator with exceptional returns — investigate deeply';
      }
      return null;
    },
  },

  Graham: {
    rishi: 'Graham',
    fullName: 'Benjamin Graham',
    philosophy: 'Margin of Safety Purist',
    focus: ['P/E Ratio', 'NCAV Discount', 'Debt Levels', 'Current Ratio'],
    colorScheme: {
      primary: '#065f46',
      secondary: '#059669',
      accent: '#10b981',
    },
    icon: '📘',
    greeting: 'Through the lens of mathematical safety...',
    pageTitle: (stockName) => `${stockName}: A Graham Value Analysis`,
    metricPriority: ['pe', 'de', 'ca', 'tl', 'bvps'],
    warningThreshold: (stock) => {
      if (stock.pe > 15) return '⚠️ Graham Warning: P/E above 15 — paying too much for earnings';
      if (stock.de > 0.5) return '⚠️ Graham Warning: D/E above 0.5 — excessive financial risk';
      const currentRatio = stock.ca / Math.max(1, stock.tl);
      if (currentRatio < 1.5) return '⚠️ Graham Warning: Current ratio below 1.5 — liquidity concern';
      return null;
    },
    opportunitySignal: (stock) => {
      const ncav = (stock.ca - stock.tl) / stock.sh;
      if (ncav > stock.price) {
        return '✓ Graham Signal: Trading below NCAV — liquidation value exceeds price!';
      }
      if (stock.pe < 10 && stock.de < 0.3 && stock.roe > 12) {
        return '✓ Graham Signal: Cheap, safe, and profitable — classic defensive value';
      }
      return null;
    },
  },

  Lynch: {
    rishi: 'Lynch',
    fullName: 'Peter Lynch',
    philosophy: 'Growth At Reasonable Price',
    focus: ['EPS Growth', 'Revenue Growth', 'PEG Ratio', 'Story Quality'],
    colorScheme: {
      primary: '#7c2d12',
      secondary: '#ea580c',
      accent: '#f97316',
    },
    icon: '🎯',
    greeting: 'Through the lens of explosive growth...',
    pageTitle: (stockName) => `${stockName}: A Lynch GARP Analysis`,
    metricPriority: ['epscagr', 'revcagr', 'pe', 'roe', 'opm'],
    warningThreshold: (stock) => {
      const peg = stock.pe / Math.max(1, stock.epscagr);
      if (peg > 2) return '⚠️ Lynch Warning: PEG above 2 — growth not justifying price';
      if (stock.epscagr < 10) return '⚠️ Lynch Warning: EPS growth below 10% — not a growth story';
      if (stock.revcagr < 12) return '⚠️ Lynch Warning: Revenue growth slowing — investigate headwinds';
      return null;
    },
    opportunitySignal: (stock) => {
      const peg = stock.pe / Math.max(1, stock.epscagr);
      if (peg < 1 && stock.epscagr > 15) {
        return '✓ Lynch Signal: PEG below 1 with strong growth — classic GARP opportunity';
      }
      if (stock.epscagr > 25 && stock.revcagr > 20) {
        return '✓ Lynch Signal: Explosive growth on both EPS and revenue — potential ten-bagger';
      }
      return null;
    },
  },

  Munger: {
    rishi: 'Munger',
    fullName: 'Charlie Munger',
    philosophy: 'Quality Over Everything',
    focus: ['ROCE', 'Capital Efficiency', 'Competitive Moat', 'Management Rationality'],
    colorScheme: {
      primary: '#581c87',
      secondary: '#9333ea',
      accent: '#a855f7',
    },
    icon: '🧠',
    greeting: 'Through the lens of ruthless rationality...',
    pageTitle: (stockName) => `${stockName}: A Munger Quality Analysis`,
    metricPriority: ['roce', 'roe', 'fcf', 'opm', 'capex'],
    warningThreshold: (stock) => {
      if (stock.roce < 15) return '⚠️ Munger Warning: ROCE below 15% — mediocre capital allocation';
      const fcfMargin = (stock.fcf / stock.rev) * 100;
      if (fcfMargin < 5) return '⚠️ Munger Warning: Weak free cash flow — capital intensive treadmill';
      if (stock.capex / stock.rev > 0.15) return '⚠️ Munger Warning: High capex intensity — not capital-light';
      return null;
    },
    opportunitySignal: (stock) => {
      if (stock.roce > 30 && stock.roe > 25) {
        return '✓ Munger Signal: Exceptional capital efficiency — rare business quality';
      }
      const fcfMargin = (stock.fcf / stock.rev) * 100;
      if (fcfMargin > 15 && stock.opm > 20) {
        return '✓ Munger Signal: High-margin cash machine — investigate for permanent hold';
      }
      return null;
    },
  },

  Damani: {
    rishi: 'Damani',
    fullName: 'Radhakishan Damani',
    philosophy: 'Patient Contrarian',
    focus: ['Working Capital Cycle', 'Cash Flow', 'Debt Avoidance', 'Long Runway'],
    colorScheme: {
      primary: '#92400e',
      secondary: '#d97706',
      accent: '#f59e0b',
    },
    icon: '🏪',
    greeting: 'Through the lens of patient capital...',
    pageTitle: (stockName) => `${stockName}: A Damani Efficiency Analysis`,
    metricPriority: ['ocf', 'fcf', 'de', 'ca', 'tl'],
    warningThreshold: (stock) => {
      if (stock.de > 0.3) return '⚠️ Damani Warning: Any debt is too much debt';
      const wcCycle = (stock.ca - stock.tl) / stock.rev;
      if (wcCycle < 0) return '⚠️ Damani Warning: Negative working capital — eating cash to grow';
      if (stock.ocf < stock.capex) return '⚠️ Damani Warning: OCF below capex — burning cash';
      return null;
    },
    opportunitySignal: (stock) => {
      if (stock.de === 0 && stock.fcf > 0 && stock.ocf > stock.capex * 1.5) {
        return '✓ Damani Signal: Debt-free cash compounder — textbook quality';
      }
      const wcCycle = (stock.ca - stock.tl) / stock.rev;
      if (wcCycle > 0.2 && stock.de < 0.1) {
        return '✓ Damani Signal: Strong working capital, minimal debt — investigate deeply';
      }
      return null;
    },
  },
};

/**
 * Get lens configuration for a Rishi
 */
export function getRishiLens(rishiName: string): RishiLens | null {
  return RISHI_LENSES[rishiName] || null;
}

/**
 * Get available lenses (for UI selector)
 */
export function getAvailableLenses(): RishiLens[] {
  return Object.values(RISHI_LENSES);
}

/**
 * Apply lens to a stock (generate lens-specific analysis)
 */
export function applyLens(stock: Stock, score: RishiScore, lens: RishiLens): {
  warning: string | null;
  opportunity: string | null;
  keyMetrics: Array<{ label: string; value: string | number; priority: boolean }>;
  lensInsight: string;
} {
  const warning = lens.warningThreshold(stock);
  const opportunity = lens.opportunitySignal(stock);

  // Build key metrics based on lens priority
  const keyMetrics = lens.metricPriority.map(key => {
    const value = stock[key as keyof Stock];
    return {
      label: key.toUpperCase(),
      value: typeof value === 'number' ? value : String(value),
      priority: true,
    };
  });

  // Generate lens-specific insight
  const lensInsight = `${lens.fullName} focuses on ${lens.focus.join(', ')}. ${score.insight}`;

  return {
    warning,
    opportunity,
    keyMetrics,
    lensInsight,
  };
}