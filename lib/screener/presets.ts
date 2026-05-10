export interface ScreenerPreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rishi: string;
  filters: ScreenerFilters;
}

export interface ScreenerFilters {
  minPE?: number;
  maxPE?: number;
  minROE?: number;
  maxROE?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
  minDE?: number;
  maxDE?: number;
  minRevCAGR?: number;
  sectors?: string[];
  excludeSectors?: string[];
}

export const SCREENER_PRESETS: ScreenerPreset[] = [
  {
    id: "jhunjhunwala",
    name: "Jhunjhunwala Mode",
    emoji: "🦁",
    description: "High conviction multibaggers — strong ROE, reasonable valuation, India growth story",
    rishi: "Rakesh Jhunjhunwala",
    filters: { minROE: 18, minRevCAGR: 12, maxPE: 35, maxDE: 1.5, minMarketCap: 5000 },
  },
  {
    id: "damani",
    name: "Damani Mode",
    emoji: "🧘",
    description: "Conservative compounders — fortress balance sheet, predictable cash flows",
    rishi: "Radhakishan Damani",
    filters: { minROE: 20, maxDE: 0.5, maxPE: 30, minMarketCap: 10000 },
  },
  {
    id: "buffett",
    name: "Buffett Mode",
    emoji: "🎩",
    description: "Wonderful businesses at fair prices — wide moat, owner earnings",
    rishi: "Warren Buffett",
    filters: { minROE: 15, maxPE: 25, maxDE: 0.8, minRevCAGR: 8, minMarketCap: 20000 },
  },
  {
    id: "graham",
    name: "Graham Mode",
    emoji: "📘",
    description: "Deep value — low PE, low PB, margin of safety",
    rishi: "Benjamin Graham",
    filters: { maxPE: 15, minROE: 10, maxDE: 1.0 },
  },
  {
    id: "lynch",
    name: "Lynch Mode",
    emoji: "🚀",
    description: "Growth at reasonable price — tenbagger potential, PEG < 1",
    rishi: "Peter Lynch",
    filters: { minRevCAGR: 20, maxPE: 30, minROE: 15, minMarketCap: 1000, maxMarketCap: 50000 },
  },
  {
    id: "pharma_short",
    name: "Pharma Short Mode",
    emoji: "💊",
    description: "Pharma shorts — USFDA warnings, overvaluation, patent cliffs",
    rishi: "Jim Chanos",
    filters: { minPE: 35, maxROE: 12, sectors: ["Pharma"] },
  },
  {
    id: "growth_trap",
    name: "Growth Trap Mode",
    emoji: "⚠️",
    description: "Overvalued growth stories — high PE, negative FCF, narrative over reality",
    rishi: "Jim Chanos",
    filters: { minPE: 50, maxROE: 10 },
  },
  {
    id: "smallcap_gem",
    name: "Smallcap Gem Mode",
    emoji: "💎",
    description: "Undiscovered compounders — high ROE, strong growth, sub 10K Cr",
    rishi: "Ashish Kacholia",
    filters: { maxMarketCap: 10000, minROE: 20, minRevCAGR: 18, maxDE: 1.0 },
  },
];

export function applyFilters(stocks: any[], filters: ScreenerFilters): any[] {
  return stocks.filter(s => {
    if (filters.minPE !== undefined && s.pe < filters.minPE) return false;
    if (filters.maxPE !== undefined && s.pe > filters.maxPE) return false;
    if (filters.minROE !== undefined && s.roe < filters.minROE) return false;
    if (filters.maxROE !== undefined && s.roe > filters.maxROE) return false;
    if (filters.minMarketCap !== undefined && s.mktcap < filters.minMarketCap) return false;
    if (filters.maxMarketCap !== undefined && s.mktcap > filters.maxMarketCap) return false;
    if (filters.minDE !== undefined && s.de < filters.minDE) return false;
    if (filters.maxDE !== undefined && s.de > filters.maxDE) return false;
    if (filters.minRevCAGR !== undefined && s.revcagr < filters.minRevCAGR) return false;
    if (filters.sectors && !filters.sectors.includes(s.sector)) return false;
    if (filters.excludeSectors && filters.excludeSectors.includes(s.sector)) return false;
    return true;
  });
}