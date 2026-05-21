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