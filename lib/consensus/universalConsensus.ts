import type { UniversalAsset } from '../types/asset';
import type { RishiScore } from './types';
import { weightedAverage } from './weights';
import type { CryptoAsset } from '../../data/crypto';
import type { CommodityData } from '../../data/markets';

// Import crypto scorers
import { scoreBitcoinMaximalist } from '../scorers/crypto/bitcoin';
import { scoreMichaelSaylor } from '../scorers/crypto/michaelsaylor';
import { scoreEthereumProtocol } from '../scorers/crypto/ethereum';
import { scoreDeFiYieldFarmer } from '../scorers/crypto/defi';
import { scoreSatoshiBodhi } from '../scorers/crypto/satoshibodhi';

// Import commodity scorers
import { scoreGoldRishi } from '../scorers/commodity/gold';
import { scoreSilverRishi } from '../scorers/commodity/silver';
import { scoreCrudeRishi } from '../scorers/commodity/crude';
import { scoreJimRogers } from '../scorers/commodity/jimrogers';
import { scoreDanielYergin } from '../scorers/commodity/danielyergin';
import { scoreRickRule } from '../scorers/commodity/rickrule';

// Import forex scorers
import { scoreGeorgeSoros } from '../scorers/forex/soros';
import { scoreRayDalio } from '../scorers/forex/dalio';
import { scoreDruckenmiller } from '../scorers/forex/druckenmiller';
import { scorePaulTudorJones } from '../scorers/forex/paultudjones';

export interface UniversalConsensusResult {
  asset: UniversalAsset;
  scores: RishiScore[];
  consensus: number;
  category: string;
  tension: string;
  tensionSpread: number;
  weightedBy: string;
  topBull?: RishiScore;
  topBear?: RishiScore;
}

function categorize(score: number): string {
  if (score >= 85) return "Legendary Opportunity";
  if (score >= 75) return "High Conviction";
  if (score >= 65) return "Strong Signal";
  if (score >= 55) return "Moderate Opportunity";
  if (score >= 45) return "Neutral Zone";
  if (score >= 35) return "Caution Advised";
  return "Avoid - Low Conviction";
}

function analyzeTension(scores: RishiScore[]): { label: string; spread: number } {
  if (scores.length < 2) return { label: "Insufficient Data", spread: 0 };
  const vals = scores.map(s => s.score);
  const spread = Math.max(...vals) - Math.min(...vals);
  
  let label: string;
  if (spread < 15) label = "Strong Consensus";
  else if (spread < 30) label = "Moderate Divergence";
  else if (spread < 50) label = "Philosophical Tension";
  else label = "Deep Conflict";
  
  return { label, spread };
}

export function buildUniversalConsensus(asset: UniversalAsset): UniversalConsensusResult {
  let scores: RishiScore[] = [];

  // Guard: only score if metadata exists and is properly typed
  if (!asset.metadata) {
    return {
      asset,
      scores: [],
      consensus: 50,
      category: "Analysis in progress",
      tension: "Awaiting data",
      tensionSpread: 0,
      weightedBy: "Universal Rishi System v1.0",
    };
  }

  switch (asset.category) {
    case 'crypto': {
      const crypto = asset.metadata as CryptoAsset;
      // Guard: ensure crypto has all required fields
      if (crypto.symbol && typeof crypto.price === 'number' && typeof crypto.change24h === 'number') {
        scores = runCryptoScorers(crypto);
      }
      break;
    }
    case 'commodity': {
      const commodity = asset.metadata as CommodityData;
      if (commodity.symbol && typeof commodity.price === 'number') {
        scores = runCommodityScorers(commodity);
      }
      break;
    }
    case 'forex': {
      const forex = asset.metadata as CommodityData;
      if (forex.symbol && typeof forex.price === 'number') {
        scores = runForexScorers(forex);
      }
      break;
    }
    case 'bond':
      // Bond scorers not yet implemented
      break;
    case 'stock':
      // Stock scoring handled elsewhere
      break;
  }

  const consensus = scores.length > 0 ? weightedAverage(scores) : 50;
  const { label: tension, spread: tensionSpread } = analyzeTension(scores);

  return {
    asset,
    scores,
    consensus,
    category: categorize(consensus),
    tension,
    tensionSpread,
    weightedBy: "Universal Rishi System v1.0",
    topBull: scores[0],
    topBear: scores[scores.length - 1],
  };
}

function runCryptoScorers(crypto: CryptoAsset): RishiScore[] {
  try {
    const scorers = [
      () => scoreBitcoinMaximalist(crypto),
      () => scoreMichaelSaylor(crypto),
      () => scoreEthereumProtocol(crypto),
      () => scoreDeFiYieldFarmer(crypto),
      () => scoreSatoshiBodhi(crypto),
    ];

    return scorers
      .map(fn => {
        try {
          return fn();
        } catch (e) {
          console.error('Scorer error:', e);
          return null;
        }
      })
      .filter((s): s is RishiScore => s !== null)
      .sort((a, b) => b.score - a.score);
  } catch (e) {
    console.error('Crypto scorers failed:', e);
    return [];
  }
}

function runCommodityScorers(commodity: CommodityData): RishiScore[] {
  try {
    const scorers = [
      () => scoreGoldRishi(commodity),
      () => scoreSilverRishi(commodity),
      () => scoreCrudeRishi(commodity),
      () => scoreJimRogers(commodity),
      () => scoreDanielYergin(commodity),
      () => scoreRickRule(commodity),
    ];

    return scorers
      .map(fn => {
        try {
          return fn();
        } catch (e) {
          console.error('Scorer error:', e);
          return null;
        }
      })
      .filter((s): s is RishiScore => s !== null)
      .sort((a, b) => b.score - a.score);
  } catch (e) {
    console.error('Commodity scorers failed:', e);
    return [];
  }
}

function runForexScorers(forex: CommodityData): RishiScore[] {
  try {
    const scorers = [
      () => scoreGeorgeSoros(forex),
      () => scoreRayDalio(forex),
      () => scoreDruckenmiller(forex),
      () => scorePaulTudorJones(forex),
    ];

    return scorers
      .map(fn => {
        try {
          return fn();
        } catch (e) {
          console.error('Scorer error:', e);
          return null;
        }
      })
      .filter((s): s is RishiScore => s !== null)
      .sort((a, b) => b.score - a.score);
  } catch (e) {
    console.error('Forex scorers failed:', e);
    return [];
  }
}