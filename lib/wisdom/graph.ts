import { Stock } from '../types';
import { STOCKS } from '../../data/stocks';

export interface WisdomNode {
  type: 'historical' | 'quote' | 'case_study' | 'parallel' | 'warning' | 'peer';
  title: string;
  content: string;
  source: string;
  relevance: number;
  year?: number;
  rishi?: string;
  metric?: string;
}

export interface WisdomGraph {
  nodes: WisdomNode[];
  connections: string[];
  summary: string;
  relatedStocks: Array<{ symbol: string; name: string; reason: string }>;
}

// ─── HISTORICAL CASE STUDIES DATABASE ─────────────────────────────────────

const CASE_STUDIES: Record<string, WisdomNode[]> = {
  // High ROE + High Growth
  HIGH_QUALITY: [
    {
      type: 'case_study',
      title: 'Asian Paints: The Moat Builder',
      content: 'Asian Paints maintained 25%+ ROE for 2 decades while expanding distribution. Buffett would have loved the consistent quality.',
      source: 'Indian Markets 1990-2010',
      relevance: 95,
      year: 2000,
      rishi: 'Buffett',
    },
    {
      type: 'case_study',
      title: 'HDFC Bank: Compounding Machine',
      content: 'From 10 to 1,600 (2000-2020) through consistent 18% ROE and conservative management. Graham would call it "intelligent speculation".',
      source: 'Indian Banking Revolution',
      relevance: 90,
      year: 2005,
      rishi: 'Munger',
    },
  ],

  // High Debt Warning
  HIGH_DEBT: [
    {
      type: 'warning',
      title: 'Kingfisher Airlines Collapse',
      content: 'D/E ratio crossed 3.5 before bankruptcy. Even great brands can\'t survive financial recklessness.',
      source: 'Indian Aviation Crisis 2012',
      relevance: 85,
      year: 2012,
      rishi: 'Graham',
    },
    {
      type: 'warning',
      title: 'Suzlon Energy Debt Trap',
      content: 'Aggressive expansion funded by debt led to near-collapse. Margin of safety is not optional in cyclical industries.',
      source: 'Renewable Energy Boom-Bust',
      relevance: 80,
      year: 2011,
      rishi: 'Schloss',
    },
  ],

  // High Valuation
  EXPENSIVE: [
    {
      type: 'historical',
      title: 'Infosys 2000: P/E of 120',
      content: 'Even a great company at 120x P/E took 5 years to justify the price. Patience required.',
      source: 'Dotcom Bubble India',
      relevance: 75,
      year: 2000,
      rishi: 'Lynch',
    },
    {
      type: 'quote',
      title: 'Price is What You Pay',
      content: 'No matter how wonderful a business is, it\'s not worth an infinite price.',
      source: 'Warren Buffett, 1992',
      relevance: 90,
      year: 1992,
      rishi: 'Buffett',
    },
  ],

  // Retail Excellence
  RETAIL: [
    {
      type: 'case_study',
      title: 'DMart: The Contrarian Winner',
      content: 'While others chased growth, DMart focused on working capital efficiency. Damani\'s masterpiece.',
      source: 'Indian Retail Revolution',
      relevance: 95,
      year: 2017,
      rishi: 'Damani',
    },
  ],

  // FMCG
  FMCG: [
    {
      type: 'quote',
      title: 'Consumer Moats',
      content: 'Give me a brand that hooks consumers for life, and I\'ll show you a compounder.',
      source: 'Charlie Munger on Consumer Goods',
      relevance: 85,
      rishi: 'Munger',
    },
    {
      type: 'historical',
      title: 'HUL: 50-Year Compounder',
      content: 'Hindustan Unilever returned 20% CAGR (1990-2020) through brand power and distribution. Textbook Lynch GARP.',
      source: 'Indian FMCG History',
      relevance: 90,
      year: 1995,
      rishi: 'Lynch',
    },
  ],

  // Banking
  BANKING: [
    {
      type: 'warning',
      title: 'Yes Bank: Governance Failure',
      content: 'Strong ROE masked aggressive lending. Without governance, numbers lie.',
      source: 'Indian Banking Crisis 2020',
      relevance: 80,
      year: 2020,
      rishi: 'Munger',
    },
  ],

  // Pharma
  PHARMA: [
    {
      type: 'case_study',
      title: 'Sun Pharma: The Acquirer',
      content: 'Built empire through smart M&A and generic formulations. Quality meets value.',
      source: 'Indian Pharma Consolidation',
      relevance: 85,
      year: 2010,
      rishi: 'Lynch',
    },
  ],

  // IT
  IT: [
    {
      type: 'historical',
      title: 'Infosys: The IT Blueprint',
      content: 'Built the template for Indian IT services — offshore delivery, quality processes, listed on NYSE. Created enormous wealth.',
      source: 'Indian IT Revolution 1993–2010',
      relevance: 88,
      year: 1999,
      rishi: 'Lynch',
    },
  ],

  // Energy
  ENERGY: [
    {
      type: 'case_study',
      title: 'Reliance: The Transformation Story',
      content: 'From textiles to petrochemicals to telecom to retail — Reliance reinvented itself every decade.',
      source: 'Indian Corporate Transformation',
      relevance: 85,
      year: 2016,
      rishi: 'Lynch',
    },
  ],

  // Infra
  INFRA: [
    {
      type: 'case_study',
      title: 'Larsen & Toubro: The Infrastructure Backbone',
      content: 'L&T built India\'s infrastructure for 80 years — from bridges to defence to metro systems.',
      source: 'Indian Infrastructure 1945–2024',
      relevance: 82,
      year: 2005,
      rishi: 'Buffett',
    },
  ],

  // Consumer
  CONSUMER: [
    {
      type: 'case_study',
      title: 'Titan: Luxury at Scale',
      content: 'Titan proved Indian consumers would pay premium for branded goods. 22% CAGR over 15 years.',
      source: 'Indian Consumer Boom',
      relevance: 85,
      year: 2005,
      rishi: 'Lynch',
    },
  ],

  // Telecom
  TELECOM: [
    {
      type: 'historical',
      title: 'Jio: Market Disruption',
      content: 'Disrupted 20 years of telecom in 18 months. Showed how capital + vision + execution beats incumbency.',
      source: 'Indian Telecom Revolution 2016',
      relevance: 82,
      year: 2016,
      rishi: 'Lynch',
    },
  ],

  // Paints
  PAINTS: [
    {
      type: 'case_study',
      title: 'Asian Paints Continued Dominance',
      content: 'Distribution network + brand + margin = durable moat. The paint sector\'s quality leader.',
      source: 'Indian Paints Industry',
      relevance: 88,
      year: 2000,
      rishi: 'Buffett',
    },
  ],
};

// ─── RISHI QUOTES DATABASE ─────────────────────────────────────────────────

const RISHI_QUOTES: WisdomNode[] = [
  {
    type: 'quote',
    title: 'The Margin of Safety',
    content: 'The three most important words in investing: Margin. Of. Safety.',
    source: 'Benjamin Graham',
    relevance: 100,
    rishi: 'Graham',
  },
  {
    type: 'quote',
    title: 'Time is the Friend of Quality',
    content: 'Time is the friend of the wonderful company, the enemy of the mediocre.',
    source: 'Warren Buffett',
    relevance: 95,
    rishi: 'Buffett',
  },
  {
    type: 'quote',
    title: 'Price vs Value',
    content: 'Price is what you pay. Value is what you get.',
    source: 'Warren Buffett',
    relevance: 100,
    rishi: 'Buffett',
  },
  {
    type: 'quote',
    title: 'The Waiting Game',
    content: 'The stock market is a device for transferring money from the impatient to the patient.',
    source: 'Warren Buffett',
    relevance: 90,
    rishi: 'Buffett',
  },
  {
    type: 'quote',
    title: 'Know What You Own',
    content: 'Never invest in a business you cannot understand.',
    source: 'Peter Lynch',
    relevance: 85,
    rishi: 'Lynch',
  },
];

// ─── GENERATE WISDOM GRAPH ─────────────────────────────────────────────────

export function generateWisdomGraph(stock: Stock): WisdomGraph {
  const nodes: WisdomNode[] = [];

  // 1. Add sector-specific case studies
  const sectorKey = stock.sector.toUpperCase();
  const sectorCaseStudies: Record<string, string> = {
    'FMCG': 'FMCG',
    'RETAIL': 'RETAIL',
    'BANKING': 'BANKING',
    'PHARMA': 'PHARMA',
    'IT': 'IT',
    'ENERGY': 'ENERGY',
    'INFRA': 'INFRA',
    'CONSUMER': 'CONSUMER',
    'TELECOM': 'TELECOM',
    'PAINTS': 'PAINTS',
  };

  if (sectorCaseStudies[sectorKey]) {
    const key = sectorCaseStudies[sectorKey] as keyof typeof CASE_STUDIES;
    if (CASE_STUDIES[key]) {
      nodes.push(...CASE_STUDIES[key]);
    }
  }

  // 2. Add quality-based parallels
  if (stock.roe >= 20 && stock.roce >= 20) {
    nodes.push(...CASE_STUDIES.HIGH_QUALITY);
  }

  // 3. Add debt warnings if applicable
  if (stock.de > 1.5) {
    nodes.push(...CASE_STUDIES.HIGH_DEBT);
  }

  // 4. Add valuation warnings if expensive
  if (stock.pe > 40) {
    nodes.push(...CASE_STUDIES.EXPENSIVE);
  }

  // 5. Add relevant Rishi quotes
  if (stock.pe < 15 && stock.roe > 15) {
    const grahamQuote = RISHI_QUOTES.find(q => q.rishi === 'Graham');
    const buffettQuote = RISHI_QUOTES.find(q => q.title === 'Time is the Friend of Quality');
    if (grahamQuote) nodes.push(grahamQuote);
    if (buffettQuote) nodes.push(buffettQuote);
  } else if (stock.pe > 30) {
    const priceQuote = RISHI_QUOTES.find(q => q.title === 'Price vs Value');
    if (priceQuote) nodes.push(priceQuote);
  }

  // Always add patience quote
  const patienceQuote = RISHI_QUOTES.find(q => q.title === 'The Waiting Game');
  if (patienceQuote) nodes.push(patienceQuote);

  // 6. Remove duplicates and sort by relevance
  const unique = Array.from(new Map(nodes.map(n => [n.title, n])).values());
  const sorted = unique.sort((a, b) => b.relevance - a.relevance);

  // 7. Take top 7
  const final = sorted.slice(0, 7);

  // 8. Find related stocks
  const relatedStocks = findRelatedStocks(stock);

  // 9. Build connections
  const caseCount = final.filter(n => n.type === 'case_study' || n.type === 'historical').length;
  const warnCount = final.filter(n => n.type === 'warning').length;
  const quoteCount = final.filter(n => n.type === 'quote').length;

  const connections: string[] = [];
  if (caseCount > 0) connections.push(`${caseCount} historical case stud${caseCount === 1 ? 'y' : 'ies'} matched`);
  if (warnCount > 0) connections.push(`${warnCount} warning signal${warnCount === 1 ? '' : 's'} from past cycles`);
  if (quoteCount > 0) connections.push(`${quoteCount} Rishi insight${quoteCount === 1 ? '' : 's'} selected`);
  if (relatedStocks.length > 0) connections.push(`${relatedStocks.length} related stocks identified`);

  const summary =
    final.length > 0
      ? `${final.length} wisdom nodes connecting ${stock.name} to market history, Rishi philosophy, and sector lessons.`
      : `Building wisdom graph for ${stock.name}. More connections appear as the knowledge base grows.`;

  return {
    nodes: final,
    connections,
    summary,
    relatedStocks,
  };
}

// ─── HELPER: FIND RELATED STOCKS ───────────────────────────────────────────

function findRelatedStocks(
  stock: Stock
): Array<{ symbol: string; name: string; reason: string }> {
  const related: Array<{ symbol: string; name: string; reason: string }> = [];

  const allStocks = Object.values(STOCKS);

  for (const s of allStocks) {
    if (s.symbol === stock.symbol) continue;

    // Same sector, similar metrics
    if (s.sector === stock.sector) {
      const roeDiff = Math.abs(s.roe - stock.roe);
      const peDiff = Math.abs(s.pe - stock.pe);

      if (roeDiff < 8 && peDiff < 12) {
        related.push({
          symbol: s.symbol,
          name: s.name,
          reason: `Same sector (${stock.sector}), similar ROE and valuation`,
        });
      }
    }

    // Similar quality profile (different sector)
    if (
      s.sector !== stock.sector &&
      Math.abs(s.roe - stock.roe) < 5 &&
      Math.abs(s.roce - stock.roce) < 5
    ) {
      related.push({
        symbol: s.symbol,
        name: s.name,
        reason: `Similar quality profile — ROE ${s.roe}%, ROCE ${s.roce}%`,
      });
    }

    if (related.length >= 4) break;
  }

  return related.slice(0, 4);
}