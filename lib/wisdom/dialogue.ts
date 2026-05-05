import { Stock } from '../types';
import { RishiScore } from '../consensus/types';

export interface DialogueSet {
  id: string;
  title: string;
  participants: string[];
  exchanges: DialogueExchange[];
  context: string;
}

export interface DialogueExchange {
  speaker: string;
  text: string;
  emotion: 'agreement' | 'disagreement' | 'caution' | 'excitement';
}

export function generateDialogueSets(stock: Stock, scores: RishiScore[]): DialogueSet[] {
  const topBull = scores[0];
  const topBear = scores[scores.length - 1];
  
  const sets: DialogueSet[] = [];
  
  // Bull vs Bear dialogue
  if (topBull && topBear && topBull.score - topBear.score > 30) {
    sets.push({
      id: 'bull_bear',
      title: 'The Great Debate',
      participants: [topBull.full, topBear.full],
      context: `${topBull.full} sees ${stock.name} scoring ${topBull.score}/100, while ${topBear.full} scores it ${topBear.score}/100`,
      exchanges: [
        {
          speaker: topBull.full,
          text: topBull.insight,
          emotion: 'excitement',
        },
        {
          speaker: topBear.full,
          text: topBear.insight,
          emotion: 'caution',
        },
        {
          speaker: topBull.full,
          text: `Look at the ${topBull.comps[0]?.label.toLowerCase()} — ${topBull.comps[0]?.detail}. This is exactly what we should be buying.`,
          emotion: 'agreement',
        },
        {
          speaker: topBear.full,
          text: `But you are ignoring the risks. ${topBear.comps[topBear.comps.length - 1]?.detail}. The margin of safety is insufficient.`,
          emotion: 'disagreement',
        },
      ],
    });
  }
  
  // Consensus agreement (when top 3 agree)
  if (scores.length >= 3) {
    const top3 = scores.slice(0, 3);
    const avgTop3 = Math.round(top3.reduce((sum, s) => sum + s.score, 0) / 3);
    
    if (Math.max(...top3.map(s => s.score)) - Math.min(...top3.map(s => s.score)) < 15) {
      sets.push({
        id: 'consensus',
        title: 'The Masters Agree',
        participants: top3.map(s => s.full),
        context: `${top3.map(s => s.name).join(', ')} all score ${stock.name} within 15 points`,
        exchanges: [
          {
            speaker: top3[0].full,
            text: `This is a ${avgTop3 >= 75 ? 'wonderful' : avgTop3 >= 60 ? 'solid' : 'questionable'} business. ${top3[0].insight}`,
            emotion: avgTop3 >= 75 ? 'excitement' : 'agreement',
          },
          {
            speaker: top3[1].full,
            text: `I concur. ${top3[1].insight}`,
            emotion: 'agreement',
          },
          {
            speaker: top3[2].full,
            text: `${avgTop3 >= 75 ? 'We rarely see such alignment. Act with conviction.' : 'Worth monitoring, but stay disciplined.'}`,
            emotion: avgTop3 >= 75 ? 'excitement' : 'caution',
          },
        ],
      });
    }
  }
  
  return sets;
}