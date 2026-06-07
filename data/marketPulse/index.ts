// data/marketPulse/index.ts

export interface FIIDIIData {
  date: string;
  fiiNet: number;
  fiiBuy: number;
  fiiSell: number;
  diiNet: number;
  diiBuy: number;
  diiSell: number;
  niftyChange: number;
}

export interface SectorBreadth {
  sector: string;
  advances: number;
  declines: number;
  unchanged: number;
  total: number;
  topGainer: string;
  topGainerPct: number;
  topLoser: string;
  topLoserPct: number;
  netChange: number;
}

export interface MarketBreadthData {
  advances: number;
  declines: number;
  unchanged: number;
  total: number;
  newHighs52w: number;
  newLows52w: number;
  aboveSMA200: number;
  belowSMA200: number;
  advanceDeclineRatio: number;
  mcclellanOscillator: number;
  bullishPct: number;
  putCallRatio: number;
  impliedVolatility: number;
  upVolume: number;
  downVolume: number;
  totalVolume: number;
}

export interface OptionsData {
  strike: number;
  callOI: number;
  callOIChange: number;
  callLTP: number;
  putOI: number;
  putOIChange: number;
  putLTP: number;
  isATM: boolean;
}

export interface DerivativesSnapshot {
  niftyFuturePrice: number;
  niftyFuturePremium: number;
  bankNiftyFuturePrice: number;
  bankNiftyFuturePremium: number;
  niftyPCR: number;
  bankNiftyPCR: number;
  maxCallOIStrike: number;
  maxPutOIStrike: number;
  impliedMove: number;
  vix: number;
  vixChange: number;
}

export interface TopMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  volumeRatio: number;
  sector: string;
  signal: string;
}

export interface BlockDeal {
  time: string;
  symbol: string;
  name: string;
  qty: number;
  price: number;
  value: number;
  side: 'BUY' | 'SELL';
  client: string;
}

// FII / DII — last 15 trading days
export const FII_DII_HISTORY: FIIDIIData[] = [
  { date:'15 Jan', fiiNet:  8245, fiiBuy: 42580, fiiSell: 34335, diiNet: -3120, diiBuy: 28450, diiSell: 31570, niftyChange:  0.59 },
  { date:'14 Jan', fiiNet:  5680, fiiBuy: 38920, fiiSell: 33240, diiNet:  1240, diiBuy: 29840, diiSell: 28600, niftyChange:  0.42 },
  { date:'13 Jan', fiiNet: -2340, fiiBuy: 28450, fiiSell: 30790, diiNet:  4580, diiBuy: 32100, diiSell: 27520, niftyChange: -0.28 },
  { date:'10 Jan', fiiNet:  3120, fiiBuy: 35680, fiiSell: 32560, diiNet:  2140, diiBuy: 30250, diiSell: 28110, niftyChange:  0.35 },
  { date:'09 Jan', fiiNet: -5840, fiiBuy: 24580, fiiSell: 30420, diiNet:  6240, diiBuy: 34580, diiSell: 28340, niftyChange: -0.62 },
  { date:'08 Jan', fiiNet:  1240, fiiBuy: 31450, fiiSell: 30210, diiNet: -1580, diiBuy: 26840, diiSell: 28420, niftyChange:  0.18 },
  { date:'07 Jan', fiiNet:  9840, fiiBuy: 48920, fiiSell: 39080, diiNet: -4250, diiBuy: 24580, diiSell: 28830, niftyChange:  0.88 },
  { date:'06 Jan', fiiNet: -8450, fiiBuy: 22340, fiiSell: 30790, diiNet:  7840, diiBuy: 36240, diiSell: 28400, niftyChange: -0.84 },
  { date:'03 Jan', fiiNet:  4580, fiiBuy: 36840, fiiSell: 32260, diiNet:  1840, diiBuy: 30580, diiSell: 28740, niftyChange:  0.45 },
  { date:'02 Jan', fiiNet:  2840, fiiBuy: 33580, fiiSell: 30740, diiNet:  3240, diiBuy: 31580, diiSell: 28340, niftyChange:  0.28 },
  { date:'01 Jan', fiiNet: -1240, fiiBuy: 27840, fiiSell: 29080, diiNet:  2580, diiBuy: 30420, diiSell: 27840, niftyChange: -0.12 },
  { date:'31 Dec', fiiNet:  6840, fiiBuy: 41240, fiiSell: 34400, diiNet: -2840, diiBuy: 25840, diiSell: 28680, niftyChange:  0.68 },
  { date:'30 Dec', fiiNet: -3580, fiiBuy: 25840, fiiSell: 29420, diiNet:  4840, diiBuy: 33580, diiSell: 28740, niftyChange: -0.35 },
  { date:'27 Dec', fiiNet:  7240, fiiBuy: 43580, fiiSell: 36340, diiNet: -3240, diiBuy: 25240, diiSell: 28480, niftyChange:  0.72 },
  { date:'26 Dec', fiiNet:  2580, fiiBuy: 31840, fiiSell: 29260, diiNet:  1840, diiBuy: 30080, diiSell: 28240, niftyChange:  0.25 },
];

export const MARKET_BREADTH: MarketBreadthData = {
  advances:            1284,
  declines:             842,
  unchanged:            124,
  total:               2250,
  newHighs52w:           84,
  newLows52w:            23,
  aboveSMA200:         1380,
  belowSMA200:          870,
  advanceDeclineRatio:  1.52,
  mcclellanOscillator:  42.8,
  bullishPct:           61.5,
  putCallRatio:          0.82,
  impliedVolatility:    13.84,
  upVolume:         8420000000,
  downVolume:       3580000000,
  totalVolume:     12000000000,
};

export const SECTOR_BREADTH: SectorBreadth[] = [
  { sector:'Banking',        advances:28, declines:12, unchanged:2, total:42, topGainer:'HDFCBANK',  topGainerPct:2.4,  topLoser:'BANDHANBNK', topLoserPct:-1.8, netChange: 1.2 },
  { sector:'IT',             advances:12, declines:18, unchanged:2, total:32, topGainer:'LTIM',      topGainerPct:1.8,  topLoser:'WIPRO',      topLoserPct:-2.1, netChange:-0.7 },
  { sector:'Pharma',         advances:22, declines: 8, unchanged:2, total:32, topGainer:'DIVISLAB',  topGainerPct:3.2,  topLoser:'LUPIN',      topLoserPct:-0.8, netChange: 1.8 },
  { sector:'Auto',           advances:18, declines: 6, unchanged:1, total:25, topGainer:'TATAMOTORS',topGainerPct:4.1,  topLoser:'MAHINDRA',   topLoserPct:-0.5, netChange: 2.1 },
  { sector:'FMCG',           advances: 8, declines:14, unchanged:3, total:25, topGainer:'DABUR',     topGainerPct:1.2,  topLoser:'HINDUNILVR', topLoserPct:-1.4, netChange:-0.4 },
  { sector:'Energy',         advances:14, declines: 8, unchanged:2, total:24, topGainer:'NTPC',      topGainerPct:2.8,  topLoser:'IDEA',       topLoserPct:-3.2, netChange: 0.8 },
  { sector:'Metals',         advances: 6, declines:16, unchanged:2, total:24, topGainer:'HINDALCO',  topGainerPct:1.1,  topLoser:'JSWSTEEL',   topLoserPct:-2.8, netChange:-1.5 },
  { sector:'Realty',         advances:16, declines: 4, unchanged:2, total:22, topGainer:'DLF',       topGainerPct:3.8,  topLoser:'OBEROIRLTY', topLoserPct:-0.4, netChange: 2.4 },
  { sector:'Infrastructure', advances:20, declines: 8, unchanged:2, total:30, topGainer:'LT',        topGainerPct:2.2,  topLoser:'ADANIPORTS', topLoserPct:-0.6, netChange: 1.4 },
  { sector:'Consumer',       advances:18, declines:10, unchanged:2, total:30, topGainer:'TITAN',     topGainerPct:2.8,  topLoser:'DMART',      topLoserPct:-0.8, netChange: 1.1 },
];

export const DERIVATIVES: DerivativesSnapshot = {
  niftyFuturePrice:      24215,
  niftyFuturePremium:      17,
  bankNiftyFuturePrice:  51920,
  bankNiftyFuturePremium:  78,
  niftyPCR:               0.82,
  bankNiftyPCR:           0.94,
  maxCallOIStrike:       24500,
  maxPutOIStrike:        24000,
  impliedMove:             1.8,
  vix:                   13.84,
  vixChange:             -2.94,
};

export const OPTIONS_CHAIN: OptionsData[] = [
  { strike:23500, callOI:  245000, callOIChange: -12000, callLTP:  785, putOI: 1240000, putOIChange:  45000, putLTP:   8.5, isATM:false },
  { strike:23750, callOI:  380000, callOIChange: -18000, callLTP:  548, putOI: 1180000, putOIChange:  38000, putLTP:  14.2, isATM:false },
  { strike:24000, callOI:  845000, callOIChange:  24000, callLTP:  324, putOI:  985000, putOIChange:  52000, putLTP:  28.5, isATM:false },
  { strike:24100, callOI:  624000, callOIChange:  18000, callLTP:  248, putOI:  748000, putOIChange:  28000, putLTP:  42.8, isATM:false },
  { strike:24200, callOI:  512000, callOIChange:  12000, callLTP:  182, putOI:  524000, putOIChange:  18000, putLTP:  68.4, isATM:true  },
  { strike:24300, callOI:  428000, callOIChange:   8000, callLTP:  128, putOI:  384000, putOIChange:  12000, putLTP:  98.5, isATM:false },
  { strike:24400, callOI:  385000, callOIChange:   4000, callLTP:   82, putOI:  284000, putOIChange:   8000, putLTP: 148.2, isATM:false },
  { strike:24500, callOI: 1248000, callOIChange:  85000, callLTP:   48, putOI:  185000, putOIChange:   4000, putLTP: 218.5, isATM:false },
  { strike:24750, callOI:  845000, callOIChange:  42000, callLTP:   18, putOI:   98000, putOIChange:   2000, putLTP: 385.2, isATM:false },
  { strike:25000, callOI: 1580000, callOIChange: 125000, callLTP:    8, putOI:   48000, putOIChange:   1000, putLTP: 548.5, isATM:false },
];

export const TOP_GAINERS: TopMover[] = [
  { symbol:'TATAMOTORS', name:'Tata Motors',      price:  885, change: 34.8, changePct: 4.09, volume: 28450000, volumeRatio:2.8, sector:'Auto',    signal:'BUY'  },
  { symbol:'DLF',        name:'DLF',              price:  895, change: 32.4, changePct: 3.76, volume: 18240000, volumeRatio:3.2, sector:'Realty',  signal:'BUY'  },
  { symbol:'DIVISLAB',   name:"Divi's Labs",      price: 5420, change:168.5, changePct: 3.21, volume:  4280000, volumeRatio:2.1, sector:'Pharma',  signal:'BUY'  },
  { symbol:'NTPC',       name:'NTPC',             price:  303, change:  8.2, changePct: 2.78, volume: 42580000, volumeRatio:1.8, sector:'Energy',  signal:'HOLD' },
  { symbol:'TITAN',      name:'Titan Company',    price: 3340, change: 88.5, changePct: 2.72, volume:  8240000, volumeRatio:2.4, sector:'Consumer',signal:'BUY'  },
];

export const TOP_LOSERS: TopMover[] = [
  { symbol:'WIPRO',      name:'Wipro',            price:  508, change:-12.4, changePct:-2.38, volume: 32580000, volumeRatio:3.8, sector:'IT',      signal:'AVOID' },
  { symbol:'JSWSTEEL',   name:'JSW Steel',        price:  875, change:-25.8, changePct:-2.86, volume: 18450000, volumeRatio:2.4, sector:'Metals',  signal:'AVOID' },
  { symbol:'HINDUNILVR', name:'HUL',              price: 2792, change:-38.2, changePct:-1.35, volume:  8240000, volumeRatio:1.6, sector:'FMCG',    signal:'HOLD'  },
  { symbol:'BANDHANBNK', name:'Bandhan Bank',     price:  181, change: -3.2, changePct:-1.74, volume: 24580000, volumeRatio:2.2, sector:'Banking', signal:'AVOID' },
  { symbol:'IDEA',       name:'Idea Cellular',    price:   8.2,change: -0.3, changePct:-3.53, volume:985000000, volumeRatio:4.2, sector:'Telecom', signal:'AVOID' },
];

export const BLOCK_DEALS: BlockDeal[] = [
  { time:'09:18', symbol:'HDFCBANK',  name:'HDFC Bank',     qty:  2450000, price: 1648, value: 4037.6, side:'BUY',  client:'Morgan Stanley Asia'    },
  { time:'09:24', symbol:'INFY',      name:'Infosys',        qty:  1840000, price: 1654, value: 3043.4, side:'BUY',  client:'Goldman Sachs'           },
  { time:'09:45', symbol:'RELIANCE',  name:'Reliance',       qty:   845000, price: 2858, value: 2415.0, side:'SELL', client:'Societe Generale'        },
  { time:'10:12', symbol:'TCS',       name:'TCS',            qty:   425000, price: 3812, value: 1620.1, side:'BUY',  client:'Nomura Singapore'        },
  { time:'10:38', symbol:'TATAMOTORS',name:'Tata Motors',    qty:  2840000, price:  882, value: 2504.9, side:'BUY',  client:'CLSA Mauritius'          },
  { time:'11:02', symbol:'WIPRO',     name:'Wipro',          qty:  3250000, price:  509, value: 1654.3, side:'SELL', client:'JP Morgan Securities'    },
  { time:'11:45', symbol:'AXISBANK',  name:'Axis Bank',      qty:  1480000, price: 1052, value: 1556.9, side:'BUY',  client:'Deutsche Bank AG'        },
  { time:'12:18', symbol:'LT',        name:'L&T',            qty:   384000, price: 3858, value: 1481.5, side:'BUY',  client:'UBS Securities'          },
];

export function getMarketMood(): { mood: string; score: number; color: string; description: string } {
  const breadthScore  = (MARKET_BREADTH.advances / MARKET_BREADTH.total) * 100;
  const fiiToday      = FII_DII_HISTORY[0].fiiNet;
  const vixScore      = DERIVATIVES.vix < 15 ? 80 : DERIVATIVES.vix < 20 ? 60 : 40;
  const pcrScore      = DERIVATIVES.niftyPCR < 0.8 ? 70 : DERIVATIVES.niftyPCR < 1.2 ? 80 : 60;
  const fiiScore      = fiiToday > 5000 ? 85 : fiiToday > 0 ? 70 : 40;
  const composite     = Math.round((breadthScore + vixScore + pcrScore + fiiScore) / 4);

  if (composite >= 70) return { mood:'BULLISH',  score:composite, color:'#10B981', description:'Strong buying across sectors. Momentum favors longs.' };
  if (composite >= 55) return { mood:'NEUTRAL',  score:composite, color:'#F59E0B', description:'Mixed signals. Selective stock-picking recommended.' };
  return                      { mood:'BEARISH',  score:composite, color:'#EF4444', description:'Caution advised. Defensive positioning preferred.' };
}

export function getFIISummary() {
  const last5  = FII_DII_HISTORY.slice(0, 5);
  const last15 = FII_DII_HISTORY;
  const fii5d  = last5.reduce((s, d) => s + d.fiiNet, 0);
  const fii15d = last15.reduce((s, d) => s + d.fiiNet, 0);
  const dii5d  = last5.reduce((s, d) => s + d.diiNet, 0);
  const dii15d = last15.reduce((s, d) => s + d.diiNet, 0);
  const fiiBuyDays  = last15.filter(d => d.fiiNet > 0).length;
  const fiiSellDays = last15.filter(d => d.fiiNet < 0).length;
  return { fii5d, fii15d, dii5d, dii15d, fiiBuyDays, fiiSellDays };
}