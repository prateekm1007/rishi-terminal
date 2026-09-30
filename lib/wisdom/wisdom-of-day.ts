/**
 * Daily wisdom insights for the dashboard
 * Rotates through Rishi quotes, market lessons, and philosophical insights
 */

export interface WisdomInsight {
  id: string;
  emoji: string;
  title: string;
  body: string;
  rishi?: string;
  type: 'quote' | 'lesson' | 'principle' | 'warning';
  color: string;
}

const WISDOM_DATABASE: WisdomInsight[] = [
  // ── BUFFETT WISDOM ──────────────────────────────────────────────
  {
    id: 'buffett_moat',
    emoji: '🏰',
    title: 'Economic Moat',
    body: 'I want businesses with durable competitive advantages. A moat that protects earnings for decades.',
    rishi: 'Buffett',
    type: 'principle',
    color: '#1e40af',
  },
  {
    id: 'buffett_fair',
    emoji: '⚖️',
    title: 'Quality at Fair Price',
    body: 'It\'s far better to buy a wonderful company at a fair price than a fair company at a wonderful price.',
    rishi: 'Buffett',
    type: 'quote',
    color: '#1e40af',
  },
  {
    id: 'buffett_time',
    emoji: '⏳',
    title: 'Time is Your Friend',
    body: 'Time is the friend of the wonderful company, the enemy of the mediocre. Compound for decades.',
    rishi: 'Buffett',
    type: 'quote',
    color: '#1e40af',
  },
  {
    id: 'buffett_debt',
    emoji: '⚡',
    title: 'Leverage is Lethal',
    body: 'I have seen more people fail because of liquor and leverage. Debt kills in downturns.',
    rishi: 'Buffett',
    type: 'warning',
    color: '#1e40af',
  },

  // ── GRAHAM WISDOM ───────────────────────────────────────────────
  {
    id: 'graham_safety',
    emoji: '🛡️',
    title: 'Margin of Safety',
    body: 'The margin of safety is the central concept of investment. Buy at significant discounts to value.',
    rishi: 'Graham',
    type: 'principle',
    color: '#065f46',
  },
  {
    id: 'graham_valuation',
    emoji: '📊',
    title: 'Intrinsic Value',
    body: 'Know what something is worth. Then buy it for less. The gap is your safety net.',
    rishi: 'Graham',
    type: 'quote',
    color: '#065f46',
  },
  {
    id: 'graham_servant',
    emoji: '🎯',
    title: 'Mr. Market is Your Servant',
    body: 'Mr. Market is your servant, not your master. He offers prices — you decide whether to accept.',
    rishi: 'Graham',
    type: 'quote',
    color: '#065f46',
  },

  // ── LYNCH WISDOM ────────────────────────────────────────────────
  {
    id: 'lynch_know',
    emoji: '🧠',
    title: 'Invest in What You Know',
    body: 'Your circle of competence is your edge. Invest in what you understand deeply.',
    rishi: 'Lynch',
    type: 'principle',
    color: '#7c2d12',
  },
  {
    id: 'lynch_garp',
    emoji: '📈',
    title: 'Growth at Reasonable Price',
    body: 'Don\'t pay 30x earnings for 5% growth. But 15x earnings for 25% growth? That\'s a bargain.',
    rishi: 'Lynch',
    type: 'quote',
    color: '#7c2d12',
  },
  {
    id: 'lynch_story',
    emoji: '📖',
    title: 'The Best Investments Tell a Story',
    body: 'Great ten-baggers tell a story. A changing business. A new market. A management breakthrough.',
    rishi: 'Lynch',
    type: 'quote',
    color: '#7c2d12',
  },

  // ── MUNGER WISDOM ───────────────────────────────────────────────
  {
    id: 'munger_invert',
    emoji: '🔄',
    title: 'Invert, Always Invert',
    body: 'To find success, first think about what would cause failure. Then avoid those things.',
    rishi: 'Munger',
    type: 'principle',
    color: '#581c87',
  },
  {
    id: 'munger_quality',
    emoji: '💎',
    title: 'Quality Over Everything',
    body: 'The most important thing is to avoid stupidity. Buy quality businesses run by rational people.',
    rishi: 'Munger',
    type: 'quote',
    color: '#581c87',
  },
  {
    id: 'munger_capital',
    emoji: '🔁',
    title: 'Capital Allocation is Everything',
    body: 'The best investment is in a business that can reinvest at high returns forever.',
    rishi: 'Munger',
    type: 'quote',
    color: '#581c87',
  },

  // ── DAMANI WISDOM ───────────────────────────────────────────────
  {
    id: 'damani_debt',
    emoji: '🚫',
    title: 'Zero Debt Philosophy',
    body: 'Debt-free means never bankrupt. Cash is king. One recession and leveraged companies vanish.',
    rishi: 'Damani',
    type: 'principle',
    color: '#92400e',
  },
  {
    id: 'damani_patience',
    emoji: '⏳',
    title: 'The Patience Game',
    body: 'I do nothing most days. But when I see the right opportunity, I have the cash to pounce.',
    rishi: 'Damani',
    type: 'quote',
    color: '#92400e',
  },
  {
    id: 'damani_cash',
    emoji: '💰',
    title: 'Cash Flow Over Earnings',
    body: 'Earnings can be fudged. Cash is real. Follow the money.',
    rishi: 'Damani',
    type: 'quote',
    color: '#92400e',
  },

  // ── GENERAL MARKET WISDOM ──────────────────────────────────────
  {
    id: 'market_cycle',
    emoji: '🔄',
    title: 'Market Cycles Never Change',
    body: 'Greed, fear, panic, euphoria — repeat forever. The cycle is your friend if you are patient.',
    type: 'lesson',
    color: '#f59e0b',
  },
  {
    id: 'market_contrarian',
    emoji: '🔄',
    title: 'Be Contrarian at Extremes',
    body: 'When everyone is buying (greed), it\'s time to question. When everyone is selling (fear), it\'s time to be brave.',
    type: 'lesson',
    color: '#f59e0b',
  },
  {
    id: 'market_patience',
    emoji: '⏰',
    title: 'Time in Market > Timing Market',
    body: 'Trying to time the market is futile. But compounding over 20 years? That works every time.',
    type: 'lesson',
    color: '#f59e0b',
  },
  {
    id: 'market_risk',
    emoji: '⚠️',
    title: 'Risk Management First',
    body: 'Protect the downside and the upside takes care of itself. A 50% loss takes a 100% gain to recover.',
    type: 'lesson',
    color: '#f59e0b',
  },
  {
    id: 'market_emotion',
    emoji: '🧠',
    title: 'Emotion is Your Enemy',
    body: 'Greed makes you greedy. Fear makes you fearful. Remove emotion from decisions.',
    type: 'lesson',
    color: '#f59e0b',
  },
];

/**
 * Get the current IST calendar date as a stable "YYYY-MM-DD" string.
 *
 * Uses UTC+05:30 explicitly so the same calendar date is produced on the
 * server and in the browser regardless of the runtime timezone. This keeps
 * every pick below deterministic and hydration-safe.
 */
function getISTDateKey(): string {
  const istMs = Date.now() + 330 * 60000; // IST = UTC+05:30
  const d = new Date(istMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Deterministic string hash (FNV-1a style) used to seed daily picks.
 */
function hashDateKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Get wisdom of the day (deterministic — same IST calendar day always
 * returns the same wisdom on server and client).
 */
export function getWisdomOfTheDay(): WisdomInsight {
  const dateKey = getISTDateKey();
  const d = new Date(dateKey + 'T00:00:00Z');
  const startOfYear = Date.UTC(d.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((d.getTime() - startOfYear) / 86400000) + 1;
  const index = dayOfYear % WISDOM_DATABASE.length;
  return WISDOM_DATABASE[index];
}

/**
 * Get a wisdom insight picked deterministically from the IST calendar date
 * (same output server and client — no random source, no hydration mismatch).
 */
export function getRandomWisdom(): WisdomInsight {
  const seed = hashDateKey(getISTDateKey());
  return WISDOM_DATABASE[seed % WISDOM_DATABASE.length];
}

/**
 * Get all wisdom by type
 */
export function getWisdomByType(type: WisdomInsight['type']): WisdomInsight[] {
  return WISDOM_DATABASE.filter(w => w.type === type);
}

/**
 * Get all Rishi quotes
 */
export function getRishiQuotes(rishi: string): WisdomInsight[] {
  return WISDOM_DATABASE.filter(w => w.rishi === rishi);
}