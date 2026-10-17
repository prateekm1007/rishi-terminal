export interface PortfolioHolding {
  symbol: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  notes?: string;
}

export interface JournalEntry {
  id: string;
  symbol: string;
  date: string;
  /**
   * R5-ADVICE-IDENTIFIERS (founder directive 2026-10-11): BUY and SELL
   * here are THE USER'S OWN recorded trades — this type is authored only
   * from user input (there is no code path that writes a JournalEntry
   * from Rishi output, pinned by test/r5.adviceIdentifiers.test.ts).
   * Any future journal UI MUST label these entries "your trade" so they
   * can never be read as Rishi advice.
   */
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