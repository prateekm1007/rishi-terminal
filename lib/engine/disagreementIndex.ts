export interface PhilosophySignal {
  philosophy: string;
  score: number;
  confidence: number;
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  weight: number;
}

export interface DisagreementResult {
  index: number;
  label: string;
  scoreStdDev: number;
  signalEntropy: number;
  signalDistribution: Record<string, number>;
  maxDeviation: number;
}

export function calculateDisagreementIndex(
  signals: PhilosophySignal[]
): DisagreementResult {
  if (!signals || signals.length === 0) {
    return { index: 0, label: 'NO DATA', scoreStdDev: 0, signalEntropy: 0, signalDistribution: {}, maxDeviation: 0 };
  }
  if (signals.length === 1) {
    return { index: 0, label: 'PERFECT CONSENSUS', scoreStdDev: 0, signalEntropy: 0, signalDistribution: { [signals[0].signal]: 1 }, maxDeviation: 0 };
  }

  const totalWeight = signals.reduce((s, p) => s + (p.weight || 1), 0);
  const normalized = signals.map(p => ({ ...p, normalizedWeight: (p.weight || 1) / totalWeight }));
  const weightedMean = normalized.reduce((sum, p) => sum + p.score * p.normalizedWeight, 0);
  const mean = signals.reduce((s, p) => s + p.score, 0) / signals.length;
  const variance = signals.reduce((s, p) => s + Math.pow(p.score - mean, 2), 0) / signals.length;
  const scoreStdDev = Math.sqrt(variance);
  const maxDeviation = Math.max(...signals.map(p => Math.abs(p.score - weightedMean)));

  const signalCounts = signals.reduce((acc, p) => {
    acc[p.signal] = (acc[p.signal] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const maxEntropy = Math.log2(5);
  const entropy = Object.values(signalCounts).reduce((e, count) => {
    const p = count / signals.length;
    return p > 0 ? e - p * Math.log2(p) : e;
  }, 0);
  const normalizedEntropy = entropy / maxEntropy;

  const index = Math.min(1, Math.max(0,
    0.40 * Math.min(1, scoreStdDev / 50) +
    0.40 * normalizedEntropy +
    0.20 * Math.min(1, maxDeviation / 75)
  ));

  const label =
    index < 0.15 ? 'STRONG CONSENSUS' :
    index < 0.30 ? 'CONSENSUS' :
    index < 0.50 ? 'MODERATE DISAGREEMENT' :
    index < 0.70 ? 'HIGH DISAGREEMENT' :
    'EXTREME DISAGREEMENT';

  return { index, label, scoreStdDev, signalEntropy: normalizedEntropy, signalDistribution: signalCounts, maxDeviation };
}

export function calculateInstabilityScore(
  signals: PhilosophySignal[],
  disagreementIndex: number,
  recentSignalChanges: number = 0
): number {
  if (!signals || signals.length === 0) return 0;
  const avgConfidence = signals.reduce((s, p) => s + p.confidence, 0) / signals.length;
  return Math.min(1,
    disagreementIndex * 0.6 +
    (1 - avgConfidence) * 0.25 +
    Math.min(0.15, recentSignalChanges * 0.05)
  );
}

export function extractOpposingViews(
  signals: PhilosophySignal[],
  majoritySignal: string
): string[] {
  const majority = majoritySignal.includes('BUY') ? 'buy' :
                   majoritySignal.includes('SELL') ? 'sell' : 'hold';
  return signals
    .filter(p => {
      const isBuy = p.signal.includes('BUY');
      const isSell = p.signal.includes('SELL');
      if (majority === 'buy') return isSell;
      if (majority === 'sell') return isBuy;
      return isBuy || isSell;
    })
    .map(p => `${p.philosophy}: ${p.signal} at score ${p.score.toFixed(0)} (confidence ${(p.confidence * 100).toFixed(0)}%)`)
    .slice(0, 5);
}