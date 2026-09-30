import { calculateDisagreementIndex, calculateInstabilityScore, extractOpposingViews } from './disagreementIndex';
import type { PhilosophySignal } from './disagreementIndex';
import type { RishiScore } from '../consensus/types';

export interface EpistemicMetadata {
  disagreementIndex: number;
  disagreementLabel: 'CONSENSUS' | 'MILD_DIVERGENCE' | 'SIGNIFICANT_DIVERGENCE' | 'HIGH_CONFLICT';
  institutionalImplication: string;
  philosophyDivergence: Record<string, {
    score: number;
    signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
    confidence: number;
  }>;
  conflictPairs: Array<{
    philosophy1: string;
    philosophy2: string;
    scoreDelta: number;
    reason: string;
  }>;
  contextualInstability: number;
  knowledgeCoverage: number;
  knowledgeGaps: string[];
  missingPerspectives: string[];
  confidenceInterval: { lower: number; upper: number };
  opposingViews: string[];
  majorityView: string;
  dissidents: string[];
  epistemicWarnings: string[];
}

function rishiScoresToSignals(scores: RishiScore[]): PhilosophySignal[] {
  // Null scores (insufficient data, T11) are excluded rather than signalled.
  return scores
    .filter(s => s.score !== null)
    .map(s => ({
    philosophy: s.full || s.name,
    score: s.score as number,
    confidence: 0.75,
    signal: (
      (s.score as number) >= 80 ? 'STRONG_BUY' :
      (s.score as number) >= 60 ? 'BUY' :
      (s.score as number) >= 50 ? 'HOLD' :
      (s.score as number) >= 35 ? 'SELL' :
      'STRONG_SELL'
    ) as 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL',
    weight: 1,
  }));
}

function getMajoritySignal(scores: RishiScore[]): string {
  const valid = scores.filter(r => r.score !== null).map(r => r.score as number);
  if (valid.length === 0) return 'HOLD';
  const mean = valid.reduce((s, v) => s + v, 0) / valid.length;
  return mean >= 70 ? 'STRONG_BUY' : mean >= 60 ? 'BUY' : mean >= 50 ? 'HOLD' : mean >= 35 ? 'SELL' : 'STRONG_SELL';
}

function findConflictPairs(scores: RishiScore[]) {
  const sorted = [...scores]
    .filter(s => s.score !== null)
    .sort((a, b) => (b.score as number) - (a.score as number));
  if (sorted.length < 2) return [];
  const bull = sorted[0];
  const bear = sorted[sorted.length - 1];
  const delta = Math.abs((bull.score as number) - (bear.score as number));
  if (delta < 20) return [];
  return [{
    philosophy1: bull.full || bull.name,
    philosophy2: bear.full || bear.name,
    scoreDelta: delta,
    reason: `${bull.full || bull.name} sees strong merit while ${bear.full || bear.name} sees significant risk.`,
  }];
}

function generateWarnings(disagreementIndex: number, instability: number, scores: RishiScore[]): string[] {
  const warnings: string[] = [];
  if (disagreementIndex > 0.6) warnings.push('High philosophical disagreement - consider multiple perspectives');
  if (instability > 0.65) warnings.push('Thesis stability is low - conviction levels may shift quickly');
  const spreadVals = scores.map(s => s.score).filter((v): v is number => v !== null && Number.isFinite(v));
  if (spreadVals.length >= 2) {
    const spread = Math.max(...spreadVals) - Math.min(...spreadVals);
    if (spread > 50) warnings.push('Wide score divergence - thesis depends on specific assumptions');
  }
  return warnings;
}

export function buildEpistemicMetadata(scores: RishiScore[]): EpistemicMetadata {
  if (!scores || scores.length === 0) {
    return {
      disagreementIndex: 0,
      disagreementLabel: 'CONSENSUS',
      institutionalImplication: 'Insufficient data for analysis',
      philosophyDivergence: {},
      conflictPairs: [],
      contextualInstability: 0,
      knowledgeCoverage: 0,
      knowledgeGaps: [],
      missingPerspectives: [],
      confidenceInterval: { lower: 0, upper: 100 },
      opposingViews: [],
      majorityView: 'HOLD',
      dissidents: [],
      epistemicWarnings: [],
    };
  }

  const signals = rishiScoresToSignals(scores);
  const disagreementResult = calculateDisagreementIndex(signals);
  const validScores = scores.filter(r => r.score !== null).map(r => r.score as number);
  const majorityMean = validScores.length > 0 ? validScores.reduce((s, v) => s + v, 0) / validScores.length : 0;
  const majorityView = getMajoritySignal(scores);
  const instability = calculateInstabilityScore(signals, disagreementResult.index);

  const philosophyDivergence: Record<string, { score: number; signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL'; confidence: number }> = {};
  signals.forEach((sig) => {
    philosophyDivergence[sig.philosophy] = {
      score: sig.score,
      signal: (sig.signal === 'HOLD' ? 'NEUTRAL' : sig.signal) as 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL',
      confidence: sig.confidence,
    };
  });

  const disagreementLabel: 'CONSENSUS' | 'MILD_DIVERGENCE' | 'SIGNIFICANT_DIVERGENCE' | 'HIGH_CONFLICT' =
    disagreementResult.index < 0.25 ? 'CONSENSUS' :
    disagreementResult.index < 0.45 ? 'MILD_DIVERGENCE' :
    disagreementResult.index < 0.65 ? 'SIGNIFICANT_DIVERGENCE' :
    'HIGH_CONFLICT';

  const dissidents = scores
    .filter(s => s.score !== null && Math.abs(s.score - majorityMean) > 20)
    .map(s => s.full || s.name)
    .slice(0, 3);

  return {
    disagreementIndex: disagreementResult.index,
    disagreementLabel,
    institutionalImplication: `Philosophy disagreement of ${(disagreementResult.index * 100).toFixed(0)}% suggests ${
      disagreementResult.index < 0.3 ? 'high conviction in thesis' :
      disagreementResult.index < 0.6 ? 'mixed perspectives - due diligence recommended' :
      'thesis requires careful validation'
    }`,
    philosophyDivergence,
    conflictPairs: findConflictPairs(scores),
    contextualInstability: instability,
    knowledgeCoverage: 0.75,
    knowledgeGaps: [],
    missingPerspectives: [],
    confidenceInterval: {
      lower: validScores.length > 0 ? Math.round(Math.min(...validScores)) : 0,
      upper: validScores.length > 0 ? Math.round(Math.max(...validScores)) : 100,
    },
    opposingViews: extractOpposingViews(signals, majorityView),
    majorityView,
    dissidents,
    epistemicWarnings: generateWarnings(disagreementResult.index, instability, scores),
  };
}