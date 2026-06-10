// data/economyPlus/macroData.ta.ts
// Tamil (தமிழ்) version — narrative text in English (awaiting translation)
// Structure and numeric data identical to EN version

// data/economyPlus/macroData.ts
// Seeded macro data — as of January 2025
// All values are realistic approximations of Indian macro conditions

export interface MacroIndicator {
  label: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'flat';
  trendValue: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
  asOf: string;
}

export interface PhilosopherStance {
  philosopher: 'Hayek' | 'Friedman' | 'Keynes';
  emoji: string;
  color: string;
  shortBio: string;
  currentStance: string;
  stanceColor: 'bullish' | 'bearish' | 'neutral' | 'cautious';
  regimeView: string;
  keyWarning: string;
  keyConcernTag?: string;
  sectorImplications?: string[];
  agreement: number; // 0-100 agreement with current policy
  indicators: {
    label: string;
    view: string;
    signal: 'positive' | 'negative' | 'neutral';
  }[];
}

export interface MacroRegime {
  label: string;
  sublabel: string;
  color: string;
  description: string;
  historicalAnalog: string;
  analogPeriod: string;
  implications: string[];
}

export interface CurrencyData {
  pair: string;
  rate: number;
  change: number;
  changePct: number;
  trend: 'strengthening' | 'weakening' | 'stable';
  volatility: 'low' | 'medium' | 'high';
  signal: string;
}

// ── CURRENT MACRO REGIME ────────────────────────────────────────────────
export const MACRO_REGIME: MacroRegime = {
  label: 'Late-Cycle Credit Expansion',
  sublabel: 'Inflationary Undercurrents · Fiscal Pressure · Selective Growth',
  color: '#F59E0B',
  description: 'India is navigating a late-cycle expansion phase — GDP growth remains robust but is increasingly driven by government capex rather than private credit. Inflation has moderated from peaks but remains sticky in food and services. The RBI holds rates while global central banks diverge.',
  historicalAnalog: '2007 India Pre-GFC Expansion',
  analogPeriod: '2006–2008',
  implications: [
    'Quality and capital-light businesses outperform cyclicals',
    'Rate-sensitive sectors face headwinds from prolonged high rates',
    'INR faces depreciation pressure from global dollar strength',
    'Infrastructure and domestic consumption remain resilient',
    'Export-oriented IT faces currency and demand uncertainty',
  ],
};

// ── MACRO INDICATORS ────────────────────────────────────────────────────
export const MACRO_INDICATORS: MacroIndicator[] = [
  {
    label: 'CPI Inflation',
    value: '5.22',
    unit: '%',
    trend: 'down',
    trendValue: '-0.48% from last month',
    signal: 'neutral',
    description: 'Consumer Price Index — headline inflation trending down from 7.4% peak but food inflation remains elevated at 8.7%.',
    asOf: 'Dec 2024',
  },
  {
    label: 'Core CPI',
    value: '3.65',
    unit: '%',
    trend: 'down',
    trendValue: '-0.12% MoM',
    signal: 'bullish',
    description: 'Excludes food and fuel. Core inflation near RBI comfort zone — signals underlying demand not overheating.',
    asOf: 'Dec 2024',
  },
  {
    label: 'WPI Inflation',
    value: '2.37',
    unit: '%',
    trend: 'up',
    trendValue: '+0.21% from Nov',
    signal: 'neutral',
    description: 'Wholesale Price Index — rising due to manufactured goods. Early signal of potential CPI pressure in 2-3 months.',
    asOf: 'Dec 2024',
  },
  {
    label: 'RBI Repo Rate',
    value: '6.50',
    unit: '%',
    trend: 'flat',
    trendValue: 'Unchanged — 6 meets',
    signal: 'neutral',
    description: 'RBI on extended pause. Market pricing 1-2 cuts in H1 2025 if CPI falls below 4.5% sustainably.',
    asOf: 'Jan 2025',
  },
  {
    label: '10Y G-Sec Yield',
    value: '6.78',
    unit: '%',
    trend: 'down',
    trendValue: '-18bps in 30 days',
    signal: 'bullish',
    description: 'Yield softening anticipates rate cuts. Bond market leading the RBI. Spread over repo at 28bps — historically tight.',
    asOf: 'Jan 2025',
  },
  {
    label: 'GDP Growth',
    value: '6.4',
    unit: '% YoY',
    trend: 'down',
    trendValue: 'vs 7.6% prior year',
    signal: 'neutral',
    description: 'Growth moderating but remains among highest globally. Moderation driven by slower private capex and export weakness. Govt capex offsetting.',
    asOf: 'Q2 FY25',
  },
  {
    label: 'M3 Money Supply',
    value: '11.2',
    unit: '% YoY',
    trend: 'up',
    trendValue: '+0.8% from Q2',
    signal: 'neutral',
    description: 'Broad money growth re-accelerating. Above nominal GDP growth — mild monetization signal. Friedman would flag this.',
    asOf: 'Dec 2024',
  },
  {
    label: 'Govt Debt / GDP',
    value: '84.0',
    unit: '%',
    trend: 'up',
    trendValue: '+2.1% from FY23',
    signal: 'bearish',
    description: 'Combined centre + state debt rising. Interest burden consuming 25%+ of govt revenue. Fiscal consolidation progress slowing.',
    asOf: 'FY24',
  },
  {
    label: 'Current Account',
    value: '-1.2',
    unit: '% of GDP',
    trend: 'up',
    trendValue: 'Improving from -2.0%',
    signal: 'bullish',
    description: 'CAD narrowing sharply on software exports and remittances. Comfortable range — reduces INR vulnerability.',
    asOf: 'Q2 FY25',
  },
  {
    label: 'Forex Reserves',
    value: '624',
    unit: 'USD Bn',
    trend: 'down',
    trendValue: '-$18Bn from peak',
    signal: 'neutral',
    description: 'RBI deploying reserves to smooth INR volatility. Still covers ~11 months of imports — comfortable buffer.',
    asOf: 'Jan 2025',
  },
];

// ── PHILOSOPHER STANCES ─────────────────────────────────────────────────
export const PHILOSOPHER_STANCES: PhilosopherStance[] = [
  {
    philosopher: 'Hayek',
    emoji: '🏛️',
    color: '#818CF8',
    shortBio: 'Austrian School · Spontaneous Order · Anti-Intervention',
    currentStance: 'CAUTIOUS',
    stanceColor: 'cautious',
    regimeView: 'Malinvestment cycle building. Government capex distorting capital structure. Private sector crowded out. Boom is artificially prolonged — bust risk rising after 2025.',
    keyWarning: 'Fiscal expansion creates false signals. Infrastructure boom may mask misallocation in rate-sensitive sectors. Watch for credit quality deterioration in 18-24 months.',
    keyConcernTag: 'Malinvestment Risk',
    sectorImplications: [
      'Avoid long-duration infra plays with weak balance sheets',
      'Prefer cash-generative quality over leveraged cyclicals',
      'Watch NBFC/realty for late-cycle credit stress',
      'Be skeptical of subsidy-dependent business models',
    ],
    agreement: 28,
    indicators: [
      { label: 'Govt Capex-Driven Growth', view: 'Artificial boom — not sustainable organic growth', signal: 'negative' },
      { label: 'RBI Rate Pause', view: 'Rates still below natural rate — malinvestment persists', signal: 'negative' },
      { label: 'M3 Re-acceleration', view: 'Credit expansion beyond productive capacity', signal: 'negative' },
      { label: 'Falling Core CPI', view: 'Temporary — monetary distortions will resurface', signal: 'neutral' },
      { label: 'CAD Improvement', view: 'Only positive signal — trade discipline improving', signal: 'positive' },
    ],
  },
  {
    philosopher: 'Friedman',
    emoji: '📊',
    color: '#34D399',
    shortBio: 'Chicago School · Monetarism · Rules-Based Policy',
    currentStance: 'NEUTRAL',
    stanceColor: 'neutral',
    regimeView: 'M3 growth at 11.2% exceeds nominal GDP — mild inflationary pressure in pipeline. RBI policy appropriate but should commit to explicit nominal GDP rule. Rate cuts premature until M3 normalises.',
    keyWarning: 'Monetary policy acts with long and variable lags. The 2022-23 tightening effects still unwinding. Do not cut rates until M3 growth falls below 9% consistently.',
    keyConcernTag: 'Money Supply & Lag Effects',
    sectorImplications: [
      'Favor pricing-power businesses if inflation re-accelerates',
      'Be cautious on rate-sensitive consumption until cuts are real',
      'Financials benefit if inflation stays contained and growth holds',
      'Avoid narratives that ignore monetary transmission lags',
    ],
    agreement: 52,
    indicators: [
      { label: 'M3 at 11.2% YoY', view: 'Above nominal GDP growth — watch carefully', signal: 'negative' },
      { label: 'CPI at 5.22%', view: 'Trending right direction — not yet victory', signal: 'neutral' },
      { label: 'Repo Rate 6.5%', view: 'Appropriate — do not cut prematurely', signal: 'positive' },
      { label: 'Core CPI 3.65%', view: 'Encouraging — monetary transmission working', signal: 'positive' },
      { label: 'Fiscal Deficit', view: 'Fiscal dominance risk to monetary independence', signal: 'negative' },
    ],
  },
  {
    philosopher: 'Keynes',
    emoji: '⚙️',
    color: '#FB923C',
    shortBio: 'Cambridge School · Aggregate Demand · Fiscal Stimulus',
    currentStance: 'BULLISH',
    stanceColor: 'bullish',
    regimeView: 'Government capex is exactly the right medicine. Animal spirits need nurturing — private sector will follow public investment. RBI should cut rates NOW to boost consumption and crowd in private capex.',
    keyWarning: 'The risk is doing too little, not too much. GDP deceleration from 7.6% to 6.4% is early warning. Pre-emptive rate cut of 50bps + continued fiscal spending will re-ignite private investment.',
    keyConcernTag: 'Demand Support',
    sectorImplications: [
      'Overweight domestic demand proxies (banks, consumer, infra)',
      'Rate cuts would re-rate high-quality growth and housing-linked plays',
      'Watch confidence indicators; animal spirits drive momentum',
      'Exports are secondary; domestic multiplier is primary',
    ],
    agreement: 74,
    indicators: [
      { label: 'GDP at 6.4%', view: 'Deceleration requires counter-cyclical response', signal: 'negative' },
      { label: 'Govt Capex', view: 'Multiplier effect working — must continue', signal: 'positive' },
      { label: 'RBI Pause', view: 'Rate cut of 50bps overdue — demand needs support', signal: 'negative' },
      { label: 'Debt/GDP 84%', view: 'Sustainable at current growth rates — not alarming', signal: 'neutral' },
      { label: 'FII Flows Positive', view: 'Global confidence in India story intact', signal: 'positive' },
    ],
  },
];

// ── CURRENCY DATA ────────────────────────────────────────────────────────
export const CURRENCY_DATA: CurrencyData[] = [
  { pair: 'USD/INR', rate: 84.28, change: 0.42, changePct: 0.50, trend: 'weakening', volatility: 'medium', signal: 'INR under mild pressure from dollar strength. RBI defending 84-85 range.' },
  { pair: 'EUR/INR', rate: 87.14, change: -0.18, changePct: -0.21, trend: 'stable', volatility: 'low', signal: 'EUR weakness partially offsetting dollar pressure on INR.' },
  { pair: 'GBP/INR', rate: 106.82, change: 0.28, changePct: 0.26, trend: 'weakening', volatility: 'medium', signal: 'GBP strength driven by UK macro surprise — modest INR impact.' },
  { pair: 'JPY/INR', rate: 0.5421, change: -0.008, changePct: -1.46, trend: 'strengthening', volatility: 'high', signal: 'Yen carry unwind risk — watch for sudden JPY spike hitting EM flows.' },
];

// ── PHILOSOPHER CONSENSUS CALCULATION ───────────────────────────────────
export function getPhilosopherConsensus(): {
  avgAgreement: number;
  spread: number;
  label: string;
  color: string;
  description: string;
} {
  const agreements = PHILOSOPHER_STANCES.map(p => p.agreement);
  const avg = Math.round(agreements.reduce((a, b) => a + b, 0) / agreements.length);
  const spread = Math.max(...agreements) - Math.min(...agreements);

  let label: string;
  let color: string;
  let description: string;

  if (spread < 15) {
    label = 'Strong Consensus';
    color = '#10B981';
    description = 'All three economists broadly agree on the macro outlook.';
  } else if (spread < 30) {
    label = 'Mild Disagreement';
    color = '#34D399';
    description = 'Minor philosophical differences — core outlook aligned.';
  } else if (spread < 50) {
    label = 'Moderate Division';
    color = '#F59E0B';
    description = 'Meaningful differences in diagnosis and prescription.';
  } else if (spread < 65) {
    label = 'Sharp Disagreement';
    color = '#F97316';
    description = 'Fundamental philosophical conflict on policy direction.';
  } else {
    label = 'Irreconcilable Conflict';
    color = '#EF4444';
    description = 'Diametrically opposed views — regime is at an inflection point.';
  }

  return { avgAgreement: avg, spread, label, color, description };
}
// ── SECTOR ROTATION OUTLOOK ─────────────────────────────────────────────
export interface SectorRotationEntry {
  sector: string;
  icon: string;
  hayek:    { score: number; stance: string; rationale: string };
  friedman: { score: number; stance: string; rationale: string };
  keynes:   { score: number; stance: string; rationale: string };
  consensus: number;   // avg of three scores
  spread:    number;   // max - min
  regimeOutlook: '3M' | '6M' | '12M';
  forwardBias: 'Strong Buy' | 'Accumulate' | 'Neutral' | 'Reduce' | 'Avoid';
  biasColor: string;
  keyMacroDriver: string;
}

export const SECTOR_ROTATION: SectorRotationEntry[] = [
  {
    sector: 'Banking',
    icon: '🏦',
    hayek:    { score: 62, stance: 'Neutral',    rationale: 'Credit expansion healthy if backed by real savings. Watch NPA trajectory.' },
    friedman: { score: 72, stance: 'Accumulate', rationale: 'Rate pause helps NIM stability. Monetisation risk is contained.' },
    keynes:   { score: 80, stance: 'Strong Buy', rationale: 'Anchor of demand stimulus. Rate cut will boost credit and margins.' },
    consensus: 71, spread: 18,
    regimeOutlook: '6M', forwardBias: 'Accumulate', biasColor: '#10B981',
    keyMacroDriver: 'Repo rate trajectory + credit growth',
  },
  {
    sector: 'IT',
    icon: '💻',
    hayek:    { score: 70, stance: 'Accumulate', rationale: 'Capital-light, no debt, high FCF — Hayekian ideal. Global demand uncertainty is the risk.' },
    friedman: { score: 58, stance: 'Neutral',    rationale: 'Dollar strength helps revenues but US slowdown concerns linger.' },
    keynes:   { score: 44, stance: 'Reduce',     rationale: 'Export-oriented; domestic multiplier does not help IT directly.' },
    consensus: 57, spread: 26,
    regimeOutlook: '6M', forwardBias: 'Neutral', biasColor: '#F59E0B',
    keyMacroDriver: 'USD/INR + US enterprise IT spend',
  },
  {
    sector: 'Pharma',
    icon: '💊',
    hayek:    { score: 75, stance: 'Accumulate', rationale: 'Pricing power + export earnings + minimal govt dependency.' },
    friedman: { score: 68, stance: 'Accumulate', rationale: 'Inflation-resistant revenues. Dollar earnings hedge INR weakness.' },
    keynes:   { score: 60, stance: 'Neutral',    rationale: 'Domestic demand stable but not a direct beneficiary of stimulus.' },
    consensus: 68, spread: 15,
    regimeOutlook: '6M', forwardBias: 'Accumulate', biasColor: '#10B981',
    keyMacroDriver: 'USD/INR + US FDA approvals + domestic formulations',
  },
  {
    sector: 'Auto',
    icon: '🚗',
    hayek:    { score: 52, stance: 'Neutral',    rationale: 'Consumer debt-driven cycle. Watch credit quality in auto loans.' },
    friedman: { score: 60, stance: 'Neutral',    rationale: 'Rate cuts would help EMI-driven demand; premature to price in.' },
    keynes:   { score: 82, stance: 'Strong Buy', rationale: 'Animal spirits driver. Rate cut + rural demand revival = re-rating.' },
    consensus: 65, spread: 30,
    regimeOutlook: '6M', forwardBias: 'Accumulate', biasColor: '#10B981',
    keyMacroDriver: 'Rate cuts + rural income + EV policy',
  },
  {
    sector: 'FMCG',
    icon: '🛒',
    hayek:    { score: 68, stance: 'Accumulate', rationale: 'Pricing power and brand moat — resilient in all regimes.' },
    friedman: { score: 72, stance: 'Accumulate', rationale: 'Low inflation environment helps volume recovery. Defensive.' },
    keynes:   { score: 55, stance: 'Neutral',    rationale: 'Rural demand improving but urban discretionary spending muted.' },
    consensus: 65, spread: 17,
    regimeOutlook: '3M', forwardBias: 'Neutral', biasColor: '#F59E0B',
    keyMacroDriver: 'Rural wage growth + food inflation trajectory',
  },
  {
    sector: 'Infrastructure',
    icon: '🏗️',
    hayek:    { score: 28, stance: 'Avoid',      rationale: 'Government capex dependency = malinvestment risk. Long gestation, execution risk.' },
    friedman: { score: 55, stance: 'Neutral',    rationale: 'Productive capex is fine but fiscal crowding-out is a concern.' },
    keynes:   { score: 90, stance: 'Strong Buy', rationale: 'The multiplier is here. Every rupee of govt capex generates 2-3x downstream.' },
    consensus: 58, spread: 62,
    regimeOutlook: '12M', forwardBias: 'Neutral', biasColor: '#F59E0B',
    keyMacroDriver: 'Budget capex allocation + order book visibility',
  },
  {
    sector: 'Realty',
    icon: '🏢',
    hayek:    { score: 22, stance: 'Avoid',      rationale: 'Classic malinvestment sector. Credit-driven boom masks real demand.' },
    friedman: { score: 48, stance: 'Reduce',     rationale: 'Rate-sensitive. No cuts yet = margin pressure on buyers.' },
    keynes:   { score: 75, stance: 'Accumulate', rationale: 'Housing demand is real. Rate cut catalyst is powerful for realty.' },
    consensus: 48, spread: 53,
    regimeOutlook: '6M', forwardBias: 'Neutral', biasColor: '#F59E0B',
    keyMacroDriver: 'Repo rate cuts + affordable housing demand',
  },
  {
    sector: 'Metals',
    icon: '⚙️',
    hayek:    { score: 40, stance: 'Reduce',     rationale: 'China slowdown and commodity price cycles are unpredictable.' },
    friedman: { score: 45, stance: 'Reduce',     rationale: 'Global dollar strength pressures commodity prices.' },
    keynes:   { score: 62, stance: 'Neutral',    rationale: 'Infrastructure push supports domestic steel demand.' },
    consensus: 49, spread: 22,
    regimeOutlook: '6M', forwardBias: 'Reduce', biasColor: '#F97316',
    keyMacroDriver: 'China demand + global commodity cycle + INR',
  },
  {
    sector: 'Energy',
    icon: '⚡',
    hayek:    { score: 55, stance: 'Neutral',    rationale: 'Mixed: renewables distorted by subsidies; O&G has real pricing power.' },
    friedman: { score: 60, stance: 'Neutral',    rationale: 'Energy inflation passthrough creates pricing complexity.' },
    keynes:   { score: 72, stance: 'Accumulate', rationale: 'Renewables are infrastructure — government multiplier applies.' },
    consensus: 62, spread: 17,
    regimeOutlook: '12M', forwardBias: 'Accumulate', biasColor: '#10B981',
    keyMacroDriver: 'Crude oil price + renewables policy + subsidy regime',
  },
  {
    sector: 'Consumer',
    icon: '🛍️',
    hayek:    { score: 65, stance: 'Accumulate', rationale: 'Organic demand-driven — legitimate. Prefer premium over mass market.' },
    friedman: { score: 63, stance: 'Neutral',    rationale: 'Inflation squeeze on real wages is a drag. Monitor carefully.' },
    keynes:   { score: 78, stance: 'Accumulate', rationale: 'Animal spirits and confidence are rising. Discretionary re-rates on cuts.' },
    consensus: 69, spread: 15,
    regimeOutlook: '6M', forwardBias: 'Accumulate', biasColor: '#10B981',
    keyMacroDriver: 'Real wage growth + rate cut sentiment + urban confidence',
  },
];
// ── B: HISTORICAL CORRELATIONS ──────────────────────────────────────────
export interface HistoricalCorrelation {
  id: string;
  title: string;
  condition: string;
  outcome: string;
  winRate: number;
  avgReturn: string;
  instances: number;
  periods: string[];
  regimeMatch: boolean;
  confidence: 'High' | 'Medium' | 'Low';
  confidenceColor: string;
  philosopher: 'Hayek' | 'Friedman' | 'Keynes' | 'All';
  philosopherColor: string;
}

export const HISTORICAL_CORRELATIONS: HistoricalCorrelation[] = [
  {
    id: 'cpi-pharma',
    title: 'CPI > 5% + Repo Rate Paused → Pharma Outperforms',
    condition: 'CPI above 5% with RBI on extended pause (3+ meetings)',
    outcome: 'Pharma beat Nifty50 by avg 8.4% over next 6 months',
    winRate: 80,
    avgReturn: '+8.4% alpha',
    instances: 5,
    periods: ['2011–12', '2014', '2018–19', '2022', '2023–24'],
    regimeMatch: true,
    confidence: 'High',
    confidenceColor: '#10B981',
    philosopher: 'Hayek',
    philosopherColor: '#818CF8',
  },
  {
    id: 'rate-pause-it',
    title: 'Extended Rate Pause → IT Underperforms vs Banking',
    condition: 'Repo rate unchanged for 4+ consecutive MPC meetings',
    outcome: 'IT underperformed Banking by 6.2% on average over 6M',
    winRate: 75,
    avgReturn: '-6.2% relative',
    instances: 4,
    periods: ['2015–16', '2019', '2021', '2023–24'],
    regimeMatch: true,
    confidence: 'High',
    confidenceColor: '#10B981',
    philosopher: 'Friedman',
    philosopherColor: '#34D399',
  },
  {
    id: 'fiscal-infra',
    title: 'Govt Capex Surge → Infrastructure 12M Outperformance',
    condition: 'Central govt capex grows > 25% YoY for 2+ consecutive years',
    outcome: 'Infrastructure beat Nifty50 by 14.2% over next 12M',
    winRate: 67,
    avgReturn: '+14.2% alpha',
    instances: 3,
    periods: ['2004–06', '2009–11', '2022–24'],
    regimeMatch: true,
    confidence: 'Medium',
    confidenceColor: '#F59E0B',
    philosopher: 'Keynes',
    philosopherColor: '#FB923C',
  },
  {
    id: 'late-cycle-quality',
    title: 'Late-Cycle Regime → Quality Factor Dominates',
    condition: 'GDP decelerates with sticky inflation',
    outcome: 'High-ROE quality beat market by ~11% over 12M',
    winRate: 83,
    avgReturn: '+11% alpha',
    instances: 6,
    periods: ['2007', '2011', '2015', '2018', '2022', '2024'],
    regimeMatch: true,
    confidence: 'High',
    confidenceColor: '#10B981',
    philosopher: 'All',
    philosopherColor: '#D4AF37',
  },
];
// ── C: CURRENCY SENSITIVITY MATRIX ─────────────────────────────────────
export interface CurrencySensitivityEntry {
  sector: string;
  icon: string;
  revenueExposure: 'High USD' | 'Medium USD' | 'Low USD' | 'None';
  costExposure: 'High USD' | 'Medium USD' | 'Low USD' | 'None';
  inrDepreciation1pct: number;
  inrAppreciation1pct: number;
  netBias: 'Benefits from Weak INR' | 'Benefits from Strong INR' | 'Neutral';
  biasColor: string;
  keyExplanation: string;
  examples: string[];
}

export const CURRENCY_SENSITIVITY: CurrencySensitivityEntry[] = [
  { sector:'IT', icon:'💻', revenueExposure:'High USD', costExposure:'Low USD', inrDepreciation1pct: 1.8, inrAppreciation1pct:-1.8, netBias:'Benefits from Weak INR', biasColor:'#10B981', keyExplanation:'Export-heavy revenue, INR costs.', examples:['TCS','INFY','HCLTECH','WIPRO'] },
  { sector:'Pharma', icon:'💊', revenueExposure:'High USD', costExposure:'Medium USD', inrDepreciation1pct: 1.2, inrAppreciation1pct:-1.2, netBias:'Benefits from Weak INR', biasColor:'#10B981', keyExplanation:'Export revenues with API import offset.', examples:['SUNPHARMA','DRREDDY',"DIVISLAB"] },
  { sector:'Auto', icon:'🚗', revenueExposure:'Low USD', costExposure:'Medium USD', inrDepreciation1pct:-0.8, inrAppreciation1pct: 0.8, netBias:'Benefits from Strong INR', biasColor:'#EF4444', keyExplanation:'Imported components raise costs when INR weakens.', examples:['MARUTI','M&M','BAJAJ-AUTO'] },
  { sector:'FMCG', icon:'🛒', revenueExposure:'None', costExposure:'Medium USD', inrDepreciation1pct:-0.6, inrAppreciation1pct: 0.6, netBias:'Benefits from Strong INR', biasColor:'#EF4444', keyExplanation:'Palm oil/crude derivatives are USD-linked inputs.', examples:['HINDUNILVR','NESTLEIND','BRITANNIA'] },
  { sector:'Banking', icon:'🏦', revenueExposure:'None', costExposure:'None', inrDepreciation1pct:-0.3, inrAppreciation1pct: 0.3, netBias:'Benefits from Strong INR', biasColor:'#EF4444', keyExplanation:'FX impacts via flows, risk premium, and rates.', examples:['HDFCBANK','ICICIBANK','SBIN'] },
];
// ── E: DAILY BRIEF ───────────────────────────────────────────────────────
export interface DailyBriefSection {
  title: string;
  icon: string;
  content: string;
  philosopher?: 'Hayek' | 'Friedman' | 'Keynes';
  philosopherColor?: string;
}

export function getDailyBrief(): { date: string; headline: string; regimeLabel: string; sections: DailyBriefSection[] } {
  const d = new Date();
  const dateStr = d.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  return {
    date: dateStr,
    headline: 'Late-Cycle Expansion Persists — Quality Over Momentum',
    regimeLabel: 'Late-Cycle Credit Expansion · Moderate Philosopher Division',
    sections: [
      { title:'Macro Pulse', icon:'🌐', content:'CPI trends lower but sticky components remain. RBI is paused. M3 is re-accelerating — a lagged risk signal.' },
      { title:'Hayek Warns', icon:'🏛️', philosopher:'Hayek', philosopherColor:'#818CF8', content:'Fiscal dominance can distort capital allocation. Watch leverage and credit quality.' },
      { title:'Friedman Watches', icon:'📊', philosopher:'Friedman', philosopherColor:'#34D399', content:'Money supply > nominal GDP matters. Policy lags are long and variable.' },
      { title:'Keynes Urges Action', icon:'⚙️', philosopher:'Keynes', philosopherColor:'#FB923C', content:'Demand support sustains animal spirits. Multipliers matter.' },
      { title:'Sector Spotlight', icon:'🔭', content:'Banking/Consumer strong. Infrastructure most divided. Quality dominates late-cycle regimes.' },
      { title:'Risk Radar', icon:'⚠️', content:'Food inflation rebound, USD strength, and fiscal slippage are top watchpoints.' },
    ],
  };
}

// ── Dynamic philosopher agreement scoring ─────────────────────────────
export function deriveDynamicAgreement(
  philosopher: string,
  regimeLabel: string,
  indicators: { signal: string }[],
  moodScore?: number,
  liveContext?: { breadthBullish?: number; fiiNetCr?: number; derivativesSignal?: number; historicalSpread30d?: number; evidenceRecencyHours?: number; pricedIn?: boolean }
): number {
  const positives = indicators.filter(i => i.signal === 'positive').length;
  const negatives = indicators.filter(i => i.signal === 'negative').length;

  // Base score from indicators
  let score = 50 + ((positives - negatives) * 10);
  
  // Phase 2: Live context scoring
  if (liveContext) {
    if (liveContext.breadthBullish !== undefined) {
      score += liveContext.breadthBullish > 60 ? 8 : liveContext.breadthBullish < 40 ? -8 : 0;
    }
    if (liveContext.fiiNetCr !== undefined) {
      score += liveContext.fiiNetCr > 2000 ? 6 : liveContext.fiiNetCr < -2000 ? -6 : 0;
    }
    if (liveContext.derivativesSignal !== undefined) {
      score += liveContext.derivativesSignal > 0 ? 5 : liveContext.derivativesSignal < 0 ? -5 : 0;
    }
  }

  // Phase 3: Historical spread deviation
  if (liveContext?.historicalSpread30d !== undefined && liveContext?.breadthBullish !== undefined) {
    const dev = liveContext.breadthBullish - liveContext.historicalSpread30d;
    score += dev > 10 ? 5 : dev < -10 ? -5 : 0;
  }

  // Phase 3: Evidence recency
  if (liveContext?.evidenceRecencyHours !== undefined) {
    score += liveContext.evidenceRecencyHours < 6 ? 5 : liveContext.evidenceRecencyHours > 48 ? -4 : 0;
  }

  // Phase 3: Priced-in dampener
  if (liveContext?.pricedIn === true) {
    score = Math.round(score * 0.75);
  }


  const regime = (regimeLabel || '').toUpperCase();

  // Regime-aware tweak (deterministic)
  if (regime.includes('LATE-CYCLE')) {
    if (philosopher === 'Hayek') score += 10;
    if (philosopher === 'Keynes') score -= 6;
  }

  // Mood-aware tweak (~ -12..+12)
  if (typeof moodScore === 'number') {
    const delta = Math.round((moodScore - 50) / 4);
    if (philosopher === 'Keynes') score += delta;
    if (philosopher === 'Hayek') score -= delta;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
