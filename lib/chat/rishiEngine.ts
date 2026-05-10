// ============================================================
// RISHI PERSONALITY ENGINE
// 7 legendary investors with distinct personalities, mental models
// ============================================================

export interface RishiPersonality {
  id: string;
  name: string;
  fullName: string;
  emoji: string;
  color: string;
  tier: 'free' | 'student' | 'disciple';
  philosophy: string;
  keyMentalModels: string[];
  shortBias: number; // -100 (pure short) to +100 (pure long)
  riskTolerance: number; // 0-100
  decisionSpeed: number; // 0 (deliberate) to 100 (intuitive)
}

export const RISHI_PERSONALITIES: Record<string, RishiPersonality> = {
  jhunjhunwala: {
    id: 'jhunjhunwala',
    name: 'Jhunjhunwala',
    fullName: 'Rakesh Jhunjhunwala',
    emoji: '🦁',
    color: '#F59E0B',
    tier: 'student',
    philosophy: 'Bold conviction betting on India growth. Comfortable with volatility for multibagger potential.',
    keyMentalModels: [
      'India Growth Story',
      'Contrarian Conviction',
      'Market Cycles',
      'Position Sizing on Conviction',
      'Sector Rotation',
    ],
    shortBias: 20,
    riskTolerance: 85,
    decisionSpeed: 90,
  },
  damani: {
    id: 'damani',
    name: 'Damani',
    fullName: 'Radhakishan Damani',
    emoji: '🧘',
    color: '#D4AF37',
    tier: 'free',
    philosophy: 'Conservative compounder. Fortress balance sheets. Margin of safety in every position.',
    keyMentalModels: [
      'Margin of Safety',
      'Quality at Fair Price',
      'Fortress Balance Sheet',
      'Predictable Cash Flows',
      'Long-term Compounding',
    ],
    shortBias: -30,
    riskTolerance: 35,
    decisionSpeed: 40,
  },
  buffett: {
    id: 'buffett',
    name: 'Buffett',
    fullName: 'Warren Buffett',
    emoji: '🎩',
    color: '#22C55E',
    tier: 'student',
    philosophy: 'Economic moats. Owner earnings. Business quality trumps market timing.',
    keyMentalModels: [
      'Economic Moat',
      'Owner Earnings',
      'Competitive Advantage',
      'Management Quality',
      'Long-term Value',
    ],
    shortBias: -40,
    riskTolerance: 45,
    decisionSpeed: 60,
  },
  munger: {
    id: 'munger',
    name: 'Munger',
    fullName: 'Charlie Munger',
    emoji: '🦉',
    color: '#8B5CF6',
    tier: 'student',
    philosophy: 'Inversion thinking. Avoid stupidity. Multidisciplinary approach.',
    keyMentalModels: [
      'Inversion',
      'Mental Models',
      'Avoiding Mistakes',
      'Opportunity Cost',
      'Probability Thinking',
    ],
    shortBias: 0,
    riskTolerance: 50,
    decisionSpeed: 70,
  },
  chanos: {
    id: 'chanos',
    name: 'Chanos',
    fullName: 'Jim Chanos',
    emoji: '🐻',
    color: '#EF4444',
    tier: 'disciple',
    philosophy: 'Forensic accounting. Short overvalued. Narrative vs reality.',
    keyMentalModels: [
      'Forensic Accounting',
      'Narrative Deconstruction',
      'Overvaluation Detection',
      'Catalyst Timing',
      'Risk Management',
    ],
    shortBias: -80,
    riskTolerance: 60,
    decisionSpeed: 85,
  },
  lynch: {
    id: 'lynch',
    name: 'Lynch',
    fullName: 'Peter Lynch',
    emoji: '🚀',
    color: '#06B6D4',
    tier: 'student',
    philosophy: 'GARP (Growth at Reasonable Price). Accessible investments. Sector specialist knowledge.',
    keyMentalModels: [
      'GARP',
      'Buy What You Know',
      'Sector Expertise',
      'PEG Ratio',
      'Long-term Growth',
    ],
    shortBias: 10,
    riskTolerance: 70,
    decisionSpeed: 75,
  },
  soros: {
    id: 'soros',
    name: 'Soros',
    fullName: 'George Soros',
    emoji: '🌊',
    color: '#A78BFA',
    tier: 'disciple',
    philosophy: 'Reflexivity. Macro overlay. Trend following with macro conviction.',
    keyMentalModels: [
      'Reflexivity',
      'Macro Cycles',
      'Currency Dynamics',
      'Policy Shifts',
      'Black Swan Events',
    ],
    shortBias: 0,
    riskTolerance: 95,
    decisionSpeed: 95,
  },
};

export interface ChatContext {
  symbol?: string;
  stockName?: string;
  sector?: string;
  rishiScore?: number;
  pe?: number;
  roe?: number;
  de?: number;
  revcagr?: number;
  promo?: number;
  mktcap?: number;
  fcf?: number;
  portfolio?: Array<{ symbol: string; shares: number; avgPrice: number }>;
  fnoStrategy?: string;
}

export function getRishiPersonality(id: string): RishiPersonality {
  return RISHI_PERSONALITIES[id] || RISHI_PERSONALITIES.damani;
}

export function getRishisByTier(tier: 'seeker' | 'student' | 'disciple'): RishiPersonality[] {
  const allRishis = Object.values(RISHI_PERSONALITIES);
  
  if (tier === 'seeker') {
    return allRishis.filter(r => r.tier === 'free');
  }
  if (tier === 'student') {
    return allRishis.filter(r => r.tier === 'free' || r.tier === 'student');
  }
  return allRishis;
}

export function formatContextForPrompt(context: ChatContext): string {
  if (!context.symbol) return '';
  
  return `
CONTEXT FOR ANALYSIS:
Stock: ${context.symbol} (${context.stockName})
Sector: ${context.sector}
Current Rishi Score: ${context.rishiScore}/100
Key Metrics: PE ${context.pe?.toFixed(1)}x | ROE ${context.roe?.toFixed(1)}% | D/E ${context.de?.toFixed(2)}x | Revenue CAGR ${context.revcagr?.toFixed(1)}%
Promoter Holding: ${context.promo?.toFixed(1)}%
Market Cap: ${context.mktcap ? 'Rs ' + (context.mktcap / 100).toFixed(0) + ' Cr' : 'N/A'}
Free Cash Flow: ${context.fcf ? 'Rs ' + context.fcf + ' Cr' : 'Analyzing...'}
${context.fnoStrategy ? `F&O Strategy Context: ${context.fnoStrategy}` : ''}
`.trim();
}