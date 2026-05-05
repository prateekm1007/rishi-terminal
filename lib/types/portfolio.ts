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