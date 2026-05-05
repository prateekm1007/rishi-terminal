export interface JournalEntry {
  id: string;
  date: string;
  type: 'BUY' | 'SELL' | 'HOLD' | 'REFLECTION' | 'LESSON';
  symbol?: string;
  title: string;
  body: string;
  emotionalState?: 'CONFIDENT' | 'FEARFUL' | 'GREEDY' | 'NEUTRAL' | 'UNCERTAIN';
  tags?: string[];
}

export interface JournalPrompt {
  question: string;
  context: string;
  philosophy: string;
}

const STORAGE_KEY = 'rishi_journal_v1';

/**
 * Reflection prompts inspired by great investors
 */
export const JOURNAL_PROMPTS: JournalPrompt[] = [
  { question: 'What is my circle of competence for this investment?', context: 'Understanding limits', philosophy: 'Buffett' },
  { question: 'What is the margin of safety at this price?', context: 'Risk management', philosophy: 'Graham' },
  { question: 'Am I buying the business or the stock price?', context: 'Investment vs speculation', philosophy: 'Lynch' },
  { question: 'What could permanently impair this capital?', context: 'Downside analysis', philosophy: 'Munger' },
  { question: 'Why am I the buyer when someone else is the seller?', context: 'Contrarian thinking', philosophy: 'Howard Marks' },
  { question: 'What would I do if the market closed for 5 years?', context: 'Long-term conviction', philosophy: 'Buffett' },
  { question: 'Is management treating shareholders like partners?', context: 'Capital allocation', philosophy: 'Buffett' },
  { question: 'What is the moat and is it widening?', context: 'Competitive advantage', philosophy: 'Munger' },
  { question: 'Am I acting on fear or greed right now?', context: 'Emotional discipline', philosophy: 'Graham' },
  { question: 'What do I know that the market does not?', context: 'Edge identification', philosophy: 'Pabrai' },
];

/**
 * Load journal entries from localStorage
 */
export function loadJournal(): JournalEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save journal entries
 */
export function saveJournal(entries: JournalEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/**
 * Add new journal entry
 */
export function addJournalEntry(entry: Omit<JournalEntry, 'id' | 'date'>): void {
  const entries = loadJournal();
  const newEntry: JournalEntry = {
    ...entry,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    date: new Date().toISOString(),
  };
  entries.unshift(newEntry);
  saveJournal(entries);
}

/**
 * Delete journal entry
 */
export function deleteJournalEntry(id: string): void {
  const entries = loadJournal();
  const filtered = entries.filter(e => e.id !== id);
  saveJournal(filtered);
}

/**
 * Get random prompt for reflection
 */
export function getRandomPrompt(): JournalPrompt {
  return JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)];
}

/**
 * Filter journal by symbol
 */
export function getEntriesBySymbol(symbol: string): JournalEntry[] {
  const entries = loadJournal();
  return entries.filter(e => e.symbol?.toUpperCase() === symbol.toUpperCase());
}

/**
 * Get journal statistics
 */
export function getJournalStats() {
  const entries = loadJournal();
  const byType = entries.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byEmotion = entries.reduce((acc, e) => {
    if (e.emotionalState) {
      acc[e.emotionalState] = (acc[e.emotionalState] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return {
    total: entries.length,
    byType,
    byEmotion,
    oldestEntry: entries[entries.length - 1]?.date,
    newestEntry: entries[0]?.date,
  };
}