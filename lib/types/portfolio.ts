export interface PortfolioHolding {
  symbol: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  notes?: string;
}

/** The user's own trade journal. This is a RECORD OF YOUR OWN TRADES —
 *  entries you write about transactions you made yourself, in your own
 *  words. It is not terminal output, not analysis the product produced,
 *  and not a recommendation to transact. The BUY/SELL entry types are
 *  factual records of what the user did (the same factual class as a
 *  brokerage statement), never directives — the labelling contract any
 *  journal UI must carry verbatim (founder order 2026-10-11, round 48). */
export interface JournalEntry {
  id: string;
  symbol: string;
  date: string;
  type: 'BUY' | 'SELL' | 'OBSERVATION' | 'THESIS' | 'REVIEW';
  title: string;
  content: string;
  tags?: string[];
}

export interface CustomRishiWeight {
  name: string;
  weight: number;
  reason?: string;
}

export interface Portfolio {
  holdings: PortfolioHolding[];
  journal: JournalEntry[];
  customWeights: CustomRishiWeight[];
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PORTFOLIO: Portfolio = {
  holdings: [],
  journal: [],
  customWeights: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};