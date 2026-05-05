import { Stock, RishiScore } from '../types';

export interface DialogueLine {
  speaker: string;
  text: string;
  emotion: 'agree' | 'disagree' | 'concern' | 'optimistic' | 'neutral';
}

export interface RishiDialogue {
  topic: string;
  participants: string[];
  lines: DialogueLine[];
  consensus: 'strong' | 'moderate' | 'divided';
  summary: string;
}

/**
 * Generate a philosophical dialogue between Rishis about a stock
 * Uses their actual scores and insights to create realistic conversation
 */
export function generateRishiDialogue(
  stock: Stock,
  scores: RishiScore[]
): RishiDialogue {
  // Sort by score to get bulls vs bears
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const topBull = sorted[0];
  const topBear = sorted[sorted.length - 1];
  const moderate = sorted[Math.floor(sorted.length / 2)];

  // Determine consensus strength
  const spread = topBull.score - topBear.score;
  const consensus = spread < 20 ? 'strong' : spread < 40 ? 'moderate' : 'divided';

  // Build dialogue based on actual scores
  const lines: DialogueLine[] = [];

  // Opening: Bull makes the case
  lines.push({
    speaker: topBull.name,
    text: `I see ${stock.name} as a ${topBull.label.toLowerCase()} opportunity. ${topBull.insight}`,
    emotion: 'optimistic',
  });

  // Bear responds with concerns
  const bearConcerns = topBear.comps
    .filter(c => c.v < 50)
    .map(c => c.label)
    .slice(0, 2);

  if (bearConcerns.length > 0) {
    lines.push({
      speaker: topBear.name,
      text: `I'm cautious here. My concerns are ${bearConcerns.join(' and ')}. ${topBear.insight}`,
      emotion: 'concern',
    });
  }

  // Moderate voice adds nuance
  if (moderate && moderate.name !== topBull.name && moderate.name !== topBear.name) {
    const moderateStance = moderate.score > 60 
      ? 'I lean positive but see both perspectives.'
      : moderate.score > 40
      ? 'This requires careful position sizing.'
      : 'I would wait for better entry points.';

    lines.push({
      speaker: moderate.name,
      text: `${moderateStance} ${moderate.insight}`,
      emotion: 'neutral',
    });
  }

  // Bull addresses bear's concerns
  const bullStrengths = topBull.comps
    .filter(c => c.v >= 70)
    .map(c => c.label)
    .slice(0, 2);

  if (bullStrengths.length > 0) {
    lines.push({
      speaker: topBull.name,
      text: `But consider the ${bullStrengths.join(' and ')} — these are exceptional. At ${stock.price.toLocaleString()}, the market is undervaluing ${bullStrengths[0].toLowerCase()}.`,
      emotion: 'agree',
    });
  }

  // Bear's final word on valuation
  if (stock.pe > 30) {
    lines.push({
      speaker: topBear.name,
      text: `The P/E of ${stock.pe}x concerns me. I need margin of safety, and I don't see it at these levels.`,
      emotion: 'disagree',
    });
  }

  // Bull's philosophical close
  const bullClose = topBull.score >= 80
    ? 'This is a once-in-a-decade compounder. I would build a position.'
    : topBull.score >= 65
    ? 'The odds favor a patient accumulator here.'
    : 'There is value, but it requires conviction.';

  lines.push({
    speaker: topBull.name,
    text: bullClose,
    emotion: 'optimistic',
  });

  // Generate summary
  const summary = consensus === 'strong'
    ? `Strong ${topBull.score > 70 ? 'bullish' : 'bearish'} consensus. Rishis largely agree on ${stock.name}.`
    : consensus === 'moderate'
    ? `Moderate divergence. ${topBull.name} sees opportunity, ${topBear.name} urges caution.`
    : `Deep philosophical divide. ${topBull.name} scores ${topBull.score}, ${topBear.name} scores ${topBear.score}.`;

  return {
    topic: `Is ${stock.name} a buy at ${stock.price.toLocaleString()}?`,
    participants: [topBull.name, topBear.name, moderate?.name].filter(Boolean) as string[],
    lines,
    consensus,
    summary,
  };
}

/**
 * Generate multiple dialogue scenarios for a stock
 */
export function generateDialogueSets(
  stock: Stock,
  scores: RishiScore[]
): RishiDialogue[] {
  const dialogues: RishiDialogue[] = [];

  // Main dialogue: Top bull vs top bear
  dialogues.push(generateRishiDialogue(stock, scores));

  // Quality vs Value debate (if we have both types)
  const qualityRishis = scores.filter(s => 
    ['Buffett', 'Munger', 'Lynch'].includes(s.name)
  );
  const valueRishis = scores.filter(s => 
    ['Graham', 'Schloss', 'Templeton'].includes(s.name)
  );

  if (qualityRishis.length > 0 && valueRishis.length > 0) {
    const qualityAvg = qualityRishis.reduce((sum, s) => sum + s.score, 0) / qualityRishis.length;
    const valueAvg = valueRishis.reduce((sum, s) => sum + s.score, 0) / valueRishis.length;

    if (Math.abs(qualityAvg - valueAvg) > 15) {
      const qualityVoice = qualityRishis[0];
      const valueVoice = valueRishis[0];

      dialogues.push({
        topic: 'Quality vs Value: Which lens matters more?',
        participants: [qualityVoice.name, valueVoice.name],
        lines: [
          {
            speaker: qualityVoice.name,
            text: `I focus on business quality first. ${stock.name}'s ROE of ${stock.roe}% and ROCE of ${stock.roce}% show competitive advantage.`,
            emotion: 'optimistic',
          },
          {
            speaker: valueVoice.name,
            text: `But at P/E of ${stock.pe}x, you're paying a premium. I need a margin of safety before I can commit capital.`,
            emotion: 'concern',
          },
          {
            speaker: qualityVoice.name,
            text: `Quality compounds. If this business can sustain these returns, today's price will look cheap in 5 years.`,
            emotion: 'agree',
          },
          {
            speaker: valueVoice.name,
            text: `Perhaps. But I've learned that price paid determines returns. I'll wait for Mr. Market to offer a better deal.`,
            emotion: 'neutral',
          },
        ],
        consensus: 'divided',
        summary: `Classic quality vs value debate. ${qualityVoice.name} prioritizes moat, ${valueVoice.name} prioritizes price.`,
      });
    }
  }

  return dialogues;
}