export interface IndexData {
  symbol: string;
  name: string;
  flag: string;
  value: number;
  change: number;
  changePct: number;
  high52w: number;
  low52w: number;
  pe?: number;
  country?: string;
}

export interface CommodityData {
  symbol: string;
  name: string;
  emoji: string;
  category: string;
  price: number;
  unit: string;
  change: number;
  changePct: number;
  high52w: number;
  low52w: number;
  
  // ── Commodity-Specific Metrics ──
  contango?: number;           // % (positive = contango, negative = backwardation)
  supercyclePhase?: 'early' | 'mid' | 'late' | 'decline';
  supercycleScore?: number;    // 0-100 (Jim Rogers lens)
  inventoryDays?: number;      // Days of supply
  inventoryVs5YAvg?: number;   // % vs 5-year average (-20 = 20% below avg)
  productionCost?: number;     // Breakeven price in same unit
  costMargin?: number;         // % above production cost
  seasonalityIndex?: number;   // 0-100 (100 = peak season strength)
  usdCorrelation?: number;     // -1 to 1 (negative = inverse to DXY)
}

export const INDIAN_INDEXES: IndexData[] = [
  { symbol: 'NIFTY50', name: 'NIFTY 50', flag: '🇮🇳', value: 24850, change: 185.5, changePct: 0.75, high52w: 26277, low52w: 21281, pe: 22.5 },
  { symbol: 'SENSEX', name: 'SENSEX', flag: '🇮🇳', value: 81950, change: 420.8, changePct: 0.52, high52w: 85978, low52w: 70001, pe: 23.8 },
  { symbol: 'NIFTYBANK', name: 'NIFTY Bank', flag: '🇮🇳', value: 52800, change: -125.2, changePct: -0.24, high52w: 55000, low52w: 43500, pe: 15.2 },
  { symbol: 'NIFTYIT', name: 'NIFTY IT', flag: '🇮🇳', value: 42150, change: 280.5, changePct: 0.67, high52w: 45000, low52w: 32800, pe: 28.5 },
  { symbol: 'NIFTYFMCG', name: 'NIFTY FMCG', flag: '🇮🇳', value: 58200, change: 95.2, changePct: 0.16, high52w: 62000, low52w: 52000, pe: 45.2 },
  { symbol: 'NIFTYPHARMA', name: 'NIFTY Pharma', flag: '🇮🇳', value: 22400, change: 145.8, changePct: 0.65, high52w: 24500, low52w: 18200, pe: 32.5 },
  { symbol: 'NIFTYAUTO', name: 'NIFTY Auto', flag: '🇮🇳', value: 25600, change: -85.5, changePct: -0.33, high52w: 28000, low52w: 20500, pe: 26.8 },
  { symbol: 'NIFTYMETAL', name: 'NIFTY Metal', flag: '🇮🇳', value: 9280, change: 45.2, changePct: 0.49, high52w: 10500, low52w: 7800, pe: 12.5 },
  { symbol: 'NIFTYREALTY', name: 'NIFTY Realty', flag: '🇮🇳', value: 1050, change: 18.5, changePct: 1.79, high52w: 1150, low52w: 750, pe: 18.2 },
  { symbol: 'INDIAVIX', name: 'India VIX', flag: '🇮🇳', value: 13.8, change: -0.5, changePct: -3.5, high52w: 28.5, low52w: 10.2 },
];

export const FOREIGN_INDEXES: IndexData[] = [
  { symbol: 'SPX', name: 'S&P 500', flag: '🇺🇸', country: 'USA', value: 5850, change: 45.2, changePct: 0.78, high52w: 6100, low52w: 4900, pe: 21.5 },
  { symbol: 'DJI', name: 'Dow Jones', flag: '🇺🇸', country: 'USA', value: 43500, change: 280.5, changePct: 0.65, high52w: 45000, low52w: 38000, pe: 19.8 },
  { symbol: 'IXIC', name: 'NASDAQ', flag: '🇺🇸', country: 'USA', value: 18800, change: 125.8, changePct: 0.67, high52w: 19500, low52w: 15500, pe: 28.5 },
  { symbol: 'FTSE', name: 'FTSE 100', flag: '🇬🇧', country: 'UK', value: 8200, change: -15.5, changePct: -0.19, high52w: 8500, low52w: 7400, pe: 14.2 },
  { symbol: 'DAX', name: 'DAX', flag: '🇩🇪', country: 'Germany', value: 19800, change: 85.2, changePct: 0.43, high52w: 20500, low52w: 17200, pe: 16.8 },
  { symbol: 'CAC', name: 'CAC 40', flag: '🇫🇷', country: 'France', value: 7650, change: 25.8, changePct: 0.34, high52w: 8000, low52w: 6800, pe: 15.5 },
  { symbol: 'N225', name: 'Nikkei 225', flag: '🇯🇵', country: 'Japan', value: 39500, change: -125.5, changePct: -0.32, high52w: 42000, low52w: 32000, pe: 18.2 },
  { symbol: 'HSI', name: 'Hang Seng', flag: '🇭🇰', country: 'Hong Kong', value: 20800, change: 185.5, changePct: 0.90, high52w: 22500, low52w: 16500, pe: 12.5 },
  { symbol: 'SSEC', name: 'Shanghai Composite', flag: '🇨🇳', country: 'China', value: 3420, change: 45.2, changePct: 1.34, high52w: 3700, low52w: 2900, pe: 14.8 },
  { symbol: 'KOSPI', name: 'KOSPI', flag: '🇰🇷', country: 'South Korea', value: 2680, change: 28.5, changePct: 1.08, high52w: 2850, low52w: 2350, pe: 13.2 },
  { symbol: 'ASX', name: 'ASX 200', flag: '🇦🇺', country: 'Australia', value: 8150, change: -12.8, changePct: -0.16, high52w: 8500, low52w: 7200, pe: 17.5 },
  { symbol: 'TSX', name: 'TSX Composite', flag: '🇨🇦', country: 'Canada', value: 24200, change: 85.5, changePct: 0.35, high52w: 25500, low52w: 21800, pe: 16.2 },
  { symbol: 'BOVESPA', name: 'BOVESPA', flag: '🇧🇷', country: 'Brazil', value: 125000, change: 580.5, changePct: 0.47, high52w: 135000, low52w: 105000, pe: 11.8 },
  { symbol: 'VIX', name: 'VIX (Fear Index)', flag: '🇺🇸', country: 'USA', value: 14.5, change: -0.8, changePct: -5.2, high52w: 32.5, low52w: 11.2 },
];

export const COMMODITIES: CommodityData[] = [
  {
    symbol: 'GOLD',
    name: 'Gold',
    emoji: '🥇',
    category: 'Precious Metals',
    price: 2650,
    unit: '$/oz',
    change: 12.5,
    changePct: 0.47,
    high52w: 2750,
    low52w: 2200,
    contango: -0.8,              // Slight backwardation (safe-haven demand)
    supercyclePhase: 'mid',
    supercycleScore: 72,         // Jim Rogers: Mid-cycle strength
    inventoryDays: 45,           // COMEX warehouse stocks
    inventoryVs5YAvg: -12,       // 12% below 5Y average
    productionCost: 1850,        // Global all-in sustaining cost
    costMargin: 43.2,            // 43% above production cost
    seasonalityIndex: 65,        // Moderate seasonal strength
    usdCorrelation: -0.82        // Strong inverse correlation to USD
  },
  { symbol: 'SILVER', name: 'Silver', emoji: '🥈', category: 'Precious Metals', price: 32.5, unit: '$/oz', change: 0.85, changePct: 2.68, high52w: 35, low52w: 22 },
  { symbol: 'PLATINUM', name: 'Platinum', emoji: '⚪', category: 'Precious Metals', price: 1050, unit: '$/oz', change: -5.2, changePct: -0.49, high52w: 1200, low52w: 950 },
  { symbol: 'PALLADIUM', name: 'Palladium', emoji: '⚫', category: 'Precious Metals', price: 980, unit: '$/oz', change: -8.5, changePct: -0.86, high52w: 1500, low52w: 900 },
  {
    symbol: 'WTI',
    name: 'Crude Oil WTI',
    emoji: '🛢️',
    category: 'Energy',
    price: 72.5,
    unit: '$/bbl',
    change: 1.85,
    changePct: 2.62,
    high52w: 95,
    low52w: 65,
    contango: 2.5,               // Contango (oversupply signal)
    supercyclePhase: 'decline',
    supercycleScore: 38,         // Jim Rogers: Late cycle weakness
    inventoryDays: 28,           // US commercial crude stocks
    inventoryVs5YAvg: 8,         // 8% above 5Y average
    productionCost: 55,          // US shale breakeven
    costMargin: 31.8,            // 32% above breakeven
    seasonalityIndex: 55,        // Moderate demand season
    usdCorrelation: -0.65        // Inverse correlation to USD
  },
  { symbol: 'BRENT', name: 'Brent Crude', emoji: '🛢️', category: 'Energy', price: 76.8, unit: '$/bbl', change: 2.15, changePct: 2.88, high52w: 98, low52w: 70 },
  { symbol: 'NATGAS', name: 'Natural Gas', emoji: '🔥', category: 'Energy', price: 3.45, unit: '$/MMBtu', change: -0.12, changePct: -3.36, high52w: 5.5, low52w: 2.8 },
  { symbol: 'COPPER', name: 'Copper', emoji: '🔶', category: 'Base Metals', price: 9850, unit: '$/ton', change: 125.5, changePct: 1.29, high52w: 11000, low52w: 8500 },
  { symbol: 'ALUMINUM', name: 'Aluminum', emoji: '⬜', category: 'Base Metals', price: 2580, unit: '$/ton', change: 45.2, changePct: 1.78, high52w: 2900, low52w: 2200 },
  { symbol: 'ZINC', name: 'Zinc', emoji: '⬛', category: 'Base Metals', price: 3150, unit: '$/ton', change: -28.5, changePct: -0.90, high52w: 3600, low52w: 2800 },
  {
    symbol: 'WHEAT',
    name: 'Wheat',
    emoji: '🌾',
    category: 'Agriculture',
    price: 650,
    unit: '$/bu',
    change: 8.5,
    changePct: 1.32,
    high52w: 850,
    low52w: 580,
    contango: 1.2,               // Contango (harvest pressure)
    supercyclePhase: 'early',
    supercycleScore: 58,         // Jim Rogers: Early cycle potential
    inventoryDays: 85,           // Global ending stocks
    inventoryVs5YAvg: -5,        // 5% below 5Y average
    productionCost: 520,         // US Great Plains production cost
    costMargin: 25.0,            // 25% above production cost
    seasonalityIndex: 72,        // Strong seasonal demand (planting season)
    usdCorrelation: -0.45        // Moderate inverse USD correlation
  },
  { symbol: 'CORN', name: 'Corn', emoji: '🌽', category: 'Agriculture', price: 485, unit: '$/bu', change: -5.2, changePct: -1.06, high52w: 650, low52w: 420 },
  { symbol: 'SOYBEAN', name: 'Soybeans', emoji: '🫘', category: 'Agriculture', price: 1280, unit: '$/bu', change: 12.5, changePct: 0.98, high52w: 1550, low52w: 1150 },
  { symbol: 'COTTON', name: 'Cotton', emoji: '☁️', category: 'Agriculture', price: 82.5, unit: '$/lb', change: 1.85, changePct: 2.29, high52w: 95, low52w: 72 },
  { symbol: 'GOLDMCX', name: 'Gold MCX', emoji: '🥇', category: 'MCX India', price: 72500, unit: '/10g', change: 350, changePct: 0.48, high52w: 75000, low52w: 60000 },
  { symbol: 'SILVERMCX', name: 'Silver MCX', emoji: '🥈', category: 'MCX India', price: 88500, unit: '/kg', change: 1200, changePct: 1.37, high52w: 95000, low52w: 65000 },
  { symbol: 'CRUDEOILMCX', name: 'Crude Oil MCX', emoji: '🛢️', category: 'MCX India', price: 6150, unit: '/bbl', change: 85, changePct: 1.40, high52w: 7500, low52w: 5200 },
];

export function getMarketSummary() {
  const indianUp = INDIAN_INDEXES.filter(i => i.changePct > 0).length;
  const indianDown = INDIAN_INDEXES.filter(i => i.changePct < 0).length;
  const foreignUp = FOREIGN_INDEXES.filter(i => i.changePct > 0).length;
  const foreignDown = FOREIGN_INDEXES.filter(i => i.changePct < 0).length;
  const commUp = COMMODITIES.filter(c => c.changePct > 0).length;
  const commDown = COMMODITIES.filter(c => c.changePct < 0).length;
  
  const nifty = INDIAN_INDEXES.find(i => i.symbol === 'NIFTY50');
  const sp500 = FOREIGN_INDEXES.find(i => i.symbol === 'SPX');
  const gold = COMMODITIES.find(c => c.symbol === 'GOLD');
  const crude = COMMODITIES.find(c => c.symbol === 'WTI');
  
  return { indianUp, indianDown, foreignUp, foreignDown, commUp, commDown, nifty, sp500, gold, crude };
}
