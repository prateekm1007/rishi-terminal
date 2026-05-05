import { Stock } from '../types';

export interface WisdomNode {
  type: 'historical' | 'quote' | 'case_study' | 'parallel' | 'warning';
  title: string;
  content: string;
  source: string;
  relevance: number; // 0-100
  year?: number;
  rishi?: string;
}

export interface WisdomGraph {
  nodes: WisdomNode[];
  connections: string[];
  summary: string;
}

/**
 * HISTORICAL CASE STUDIES DATABASE
 * Real companies, real lessons, real Rishi insights
 */
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
};

/**
 * RISHI QUOTES DATABASE
 */
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

/**
 * Generate wisdom graph for a stock
 */
export function generateWisdomGraph(stock: Stock): WisdomGraph {
  const nodes: WisdomNode[] = [];

  // 1. Add sector-specific case studies
  if (CASE_STUDIES[stock.sector.toUpperCase()]) {
    nodes.push(...CASE_STUDIES[stock.sector.toUpperCase()]);
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

  // 5. Add sector-specific insights
  if (stock.sector === 'Retail') {
    nodes.push(...CASE_STUDIES.RETAIL);
  }
  if (stock.sector === 'FMCG') {
    nodes.push(...CASE_STUDIES.FMCG);
  }
  if (stock.sector === 'Banking') {
    nodes.push(...CASE_STUDIES.BANKING);
  }
  if (stock.sector === 'Pharma') {
    nodes.push(...CASE_STUDIES.PHARMA);
  }

  // 6. Add relevant Rishi quotes
  // Filter quotes by relevance to stock characteristics
  if (stock.pe < 15 && stock.roe > 15) {
    // Value + Quality = Graham + Buffett quotes
    nodes.push(
      RISHI_QUOTES.find(q => q.rishi === 'Graham')!,
      RISHI_QUOTES.find(q => q.title === 'Time is the Friend of Quality')!
    );
  } else if (stock.pe > 30) {
    // Expensive = Price warnings
    nodes.push(RISHI_QUOTES.find(q => q.title === 'Price vs Value')!);
  }

  // Always add patience quote
  nodes.push(RISHI_QUOTES.find(q => q.title === 'The Waiting Game')!);

  // 7. Remove duplicates and sort by relevance
  const unique = Array.from(new Map(nodes.map(n => [n.title, n])).values());
  const sorted = unique.sort((a, b) => b.relevance - a.relevance);

  // 8. Take top 6-8 most relevant
  const final = sorted.slice(0, 8);

  // 9. Generate connections
  const connections = [
    `This stock shares traits with ${final.filter(n => n.type === 'case_study').length} historical cases`,
    `${final.filter(n => n.type === 'warning').length} warning signals from past market cycles`,
    `${final.filter(n => n.type === 'quote').length} relevant Rishi insights`,
  ].filter(c => !c.startsWith('0'));

  // 10. Generate summary
  const summary = final.length > 0
    ? `Found ${final.length} wisdom nodes connecting ${stock.name} to historical patterns, Rishi philosophy, and market lessons.`
    : `Building wisdom graph for ${stock.name}. More connections will appear as the knowledge base grows.`;

  return {
    nodes: final,
    connections,
    summary,
  };
}