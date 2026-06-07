export interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePct: number;
  high52w: number;
  low52w: number;
  pe?: number;
  country: string;
  flag: string;
}

export interface Commodity {
  symbol: string;
  name: string;
  price: number;
  unit: string;
  change: number;
  changePct: number;
  high52w: number;
  low52w: number;
  category: string;
  emoji: string;
}

export const INDIAN_INDEXES: MarketIndex[] = [
  { symbol:'NIFTY50',    name:'Nifty 50',           value:24198, change:142.5,  changePct:0.59,  high52w:26277, low52w:19820, pe:22.1, country:'India', flag:'🇮🇳' },
  { symbol:'SENSEX',     name:'BSE Sensex',          value:79802, change:483.2,  changePct:0.61,  high52w:85978, low52w:64486, pe:22.8, country:'India', flag:'🇮🇳' },
  { symbol:'NIFTYBANK',  name:'Nifty Bank',          value:51842, change:285.4,  changePct:0.55,  high52w:54467, low52w:42788, pe:14.2, country:'India', flag:'🇮🇳' },
  { symbol:'NIFTYMID',   name:'Nifty Midcap 100',    value:56124, change:312.8,  changePct:0.56,  high52w:61845, low52w:41432, pe:31.4, country:'India', flag:'🇮🇳' },
  { symbol:'NIFTYSMALL', name:'Nifty Smallcap 100',  value:18842, change:198.5,  changePct:1.06,  high52w:21964, low52w:13956, pe:28.8, country:'India', flag:'🇮🇳' },
  { symbol:'NIFTYIT',    name:'Nifty IT',            value:42156, change:-285.2, changePct:-0.67, high52w:43756, low52w:28554, pe:28.4, country:'India', flag:'🇮🇳' },
  { symbol:'NIFTYPHARMA',name:'Nifty Pharma',        value:21845, change:156.8,  changePct:0.72,  high52w:22124, low52w:15642, pe:32.1, country:'India', flag:'🇮🇳' },
  { symbol:'NIFTYFMCG',  name:'Nifty FMCG',          value:56284, change:-124.5, changePct:-0.22, high52w:58124, low52w:46283, pe:38.5, country:'India', flag:'🇮🇳' },
  { symbol:'NIFTYAUTO',  name:'Nifty Auto',          value:23456, change:342.1,  changePct:1.48,  high52w:24856, low52w:16248, pe:24.6, country:'India', flag:'🇮🇳' },
  { symbol:'NIFTYMETAL', name:'Nifty Metal',         value:9284,  change:-98.4,  changePct:-1.05, high52w:10254, low52w:6824,  pe:10.2, country:'India', flag:'🇮🇳' },
  { symbol:'INDIAVIX',   name:'India VIX',           value:13.84, change:-0.42,  changePct:-2.94, high52w:22.14, low52w:10.44, country:'India', flag:'🇮🇳' },
  { symbol:'NIFTYREALTY',name:'Nifty Realty',        value:1024,  change:18.5,   changePct:1.84,  high52w:1154,  low52w:622,   pe:42.1, country:'India', flag:'🇮🇳' },
];

export const FOREIGN_INDEXES: MarketIndex[] = [
  { symbol:'DOWJONES', name:'Dow Jones',          value:44854, change:182.4,  changePct:0.41,  high52w:45074, low52w:37124, pe:21.4, country:'USA',     flag:'🇺🇸' },
  { symbol:'SP500',    name:'S&P 500',            value:6012,  change:28.5,   changePct:0.48,  high52w:6147,  low52w:4682,  pe:24.2, country:'USA',     flag:'🇺🇸' },
  { symbol:'NASDAQ',   name:'Nasdaq Composite',   value:19856, change:142.8,  changePct:0.72,  high52w:20204, low52w:14485, pe:31.8, country:'USA',     flag:'🇺🇸' },
  { symbol:'RUSSELL',  name:'Russell 2000',       value:2284,  change:18.5,   changePct:0.82,  high52w:2466,  low52w:1842,  pe:26.4, country:'USA',     flag:'🇺🇸' },
  { symbol:'FTSE100',  name:'FTSE 100',           value:8284,  change:-42.5,  changePct:-0.51, high52w:8474,  low52w:7204,  pe:14.2, country:'UK',      flag:'🇬🇧' },
  { symbol:'DAX',      name:'DAX 40',             value:20284, change:124.8,  changePct:0.62,  high52w:20524, low52w:14630, pe:16.8, country:'Germany', flag:'🇩🇪' },
  { symbol:'NIKKEI',   name:'Nikkei 225',         value:39856, change:285.4,  changePct:0.72,  high52w:41087, low52w:30487, pe:18.4, country:'Japan',   flag:'🇯🇵' },
  { symbol:'HANGSENG', name:'Hang Seng',          value:19284, change:-284.5, changePct:-1.46, high52w:22700, low52w:14794, pe:10.2, country:'HK',      flag:'🇭🇰' },
  { symbol:'SSE',      name:'Shanghai Composite', value:3356,  change:28.5,   changePct:0.86,  high52w:3674,  low52w:2702,  pe:14.8, country:'China',   flag:'🇨🇳' },
  { symbol:'CSIINDIA', name:'CSI 300',            value:3924,  change:42.8,   changePct:1.10,  high52w:4352,  low52w:3128,  pe:13.6, country:'China',   flag:'🇨🇳' },
  { symbol:'KOSPI',    name:'KOSPI',              value:2484,  change:18.4,   changePct:0.75,  high52w:2896,  low52w:2196,  pe:16.2, country:'Korea',   flag:'🇰🇷' },
  { symbol:'ASX200',   name:'ASX 200',            value:8284,  change:42.5,   changePct:0.52,  high52w:8615,  low52w:6948,  pe:18.6, country:'Australia',flag:'🇦🇺' },
  { symbol:'CAC40',    name:'CAC 40',             value:7424,  change:-28.4,  changePct:-0.38, high52w:8259,  low52w:6852,  pe:15.4, country:'France',  flag:'🇫🇷' },
  { symbol:'VIX',      name:'CBOE VIX',           value:14.28, change:-0.84,  changePct:-5.56, high52w:38.57, low52w:10.62, country:'USA',     flag:'🇺🇸' },
];

export const COMMODITIES: Commodity[] = [
  { symbol:'XAUUSD', name:'Gold',          price:2652,  unit:'USD/oz',  change:12.4,  changePct:0.47,  high52w:2790,  low52w:1984,  category:'Precious Metals', emoji:'🥇' },
  { symbol:'XAGUSD', name:'Silver',        price:30.85, unit:'USD/oz',  change:0.42,  changePct:1.38,  high52w:34.86, low52w:21.94, category:'Precious Metals', emoji:'🥈' },
  { symbol:'XPTUSD', name:'Platinum',      price:952,   unit:'USD/oz',  change:-8.5,  changePct:-0.89, high52w:1095,  low52w:852,   category:'Precious Metals', emoji:'⚗️' },
  { symbol:'XPDUSD', name:'Palladium',     price:984,   unit:'USD/oz',  change:14.2,  changePct:1.46,  high52w:1284,  low52w:862,   category:'Precious Metals', emoji:'🔬' },
  { symbol:'CRUDEWTI',name:'Crude Oil WTI',price:71.85, unit:'USD/bbl', change:-0.84, changePct:-1.16, high52w:95.03, low52w:63.57, category:'Energy',         emoji:'🛢️' },
  { symbol:'CRUDEBRT',name:'Brent Crude',  price:75.42, unit:'USD/bbl', change:-0.72, changePct:-0.95, high52w:98.30, low52w:67.14, category:'Energy',         emoji:'⛽' },
  { symbol:'NATURALGAS',name:'Natural Gas', price:3.24,  unit:'USD/MMBtu',change:0.18, changePct:5.88,  high52w:4.25,  low52w:1.52,  category:'Energy',         emoji:'🔥' },
  { symbol:'COAL',    name:'Thermal Coal', price:128,   unit:'USD/ton', change:-2.4,  changePct:-1.84, high52w:195,   low52w:112,   category:'Energy',         emoji:'⚫' },
  { symbol:'COPPER',  name:'Copper',       price:4.28,  unit:'USD/lb',  change:0.042, changePct:0.99,  high52w:5.20,  low52w:3.52,  category:'Base Metals',    emoji:'🔶' },
  { symbol:'ALUMINIUM',name:'Aluminium',   price:2485,  unit:'USD/ton', change:18.5,  changePct:0.75,  high52w:2764,  low52w:2052,  category:'Base Metals',    emoji:'🔩' },
  { symbol:'ZINC',    name:'Zinc',         price:2986,  unit:'USD/ton', change:-24.5, changePct:-0.81, high52w:3285,  low52w:2184,  category:'Base Metals',    emoji:'⚙️' },
  { symbol:'NICKEL',  name:'Nickel',       price:15842, unit:'USD/ton', change:285.4, changePct:1.83,  high52w:21485, low52w:14285, category:'Base Metals',    emoji:'🔋' },
  { symbol:'WHEAT',   name:'Wheat',        price:548,   unit:'USc/bu', change:-4.5,  changePct:-0.81, high52w:678,   low52w:488,   category:'Agriculture',    emoji:'🌾' },
  { symbol:'CORN',    name:'Corn',         price:442,   unit:'USc/bu', change:3.2,   changePct:0.73,  high52w:512,   low52w:388,   category:'Agriculture',    emoji:'🌽' },
  { symbol:'SOYBEAN', name:'Soybean',      price:985,   unit:'USc/bu', change:-6.8,  changePct:-0.69, high52w:1285,  low52w:924,   category:'Agriculture',    emoji:'🫘' },
  { symbol:'COTTON',  name:'Cotton',       price:68.4,  unit:'USc/lb', change:0.84,  changePct:1.24,  high52w:92.4,  low52w:62.4,  category:'Agriculture',    emoji:'🌿' },
  { symbol:'SUGAR',   name:'Sugar',        price:19.85, unit:'USc/lb', change:-0.24, changePct:-1.20, high52w:28.40, low52w:16.85, category:'Agriculture',    emoji:'🍬' },
  { symbol:'COFFEE',  name:'Coffee',       price:298,   unit:'USc/lb', change:8.4,   changePct:2.90,  high52w:342,   low52w:168,   category:'Agriculture',    emoji:'☕' },
  { symbol:'MCXGOLD', name:'MCX Gold',     price:77285, unit:'/10g',  change:285,   changePct:0.37,  high52w:81425, low52w:59842, category:'MCX India',      emoji:'🥇' },
  { symbol:'MCXSILVER',name:'MCX Silver',  price:91485, unit:'/kg',   change:485,   changePct:0.53,  high52w:99845, low52w:67285, category:'MCX India',      emoji:'🥈' },
  { symbol:'MCXCRUDE',name:'MCX Crude',    price:5985,  unit:'/bbl',  change:-42,   changePct:-0.70, high52w:7895,  low52w:5285,  category:'MCX India',      emoji:'🛢️' },
  { symbol:'MCXCOPPER',name:'MCX Copper',  price:856,   unit:'/kg',   change:8.5,   changePct:1.00,  high52w:924,   low52w:706,   category:'MCX India',      emoji:'🔶' },
];

export function getMarketSummary() {
  const indianUp = INDIAN_INDEXES.filter(i => i.changePct > 0).length;
  const indianDown = INDIAN_INDEXES.filter(i => i.changePct < 0).length;
  const foreignUp = FOREIGN_INDEXES.filter(i => i.changePct > 0).length;
  const foreignDown = FOREIGN_INDEXES.filter(i => i.changePct < 0).length;
  const commUp = COMMODITIES.filter(c => c.changePct > 0).length;
  const commDown = COMMODITIES.filter(c => c.changePct < 0).length;
  const nifty = INDIAN_INDEXES.find(i => i.symbol === 'NIFTY50');
  const sp500 = FOREIGN_INDEXES.find(i => i.symbol === 'SP500');
  const gold = COMMODITIES.find(c => c.symbol === 'XAUUSD');
  const crude = COMMODITIES.find(c => c.symbol === 'CRUDEWTI');
  return { indianUp, indianDown, foreignUp, foreignDown, commUp, commDown, nifty, sp500, gold, crude };
}