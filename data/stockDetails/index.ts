// data/stockDetails/index.ts
// Deep per-stock data modelled after MoneyControl stock pages

export interface QuarterlyResult {
  quarter: string;
  revenue: number;
  operatingProfit: number;
  netProfit: number;
  eps: number;
  opm: number;
  revenueGrowth: number;
  profitGrowth: number;
}

export interface ShareholdingPattern {
  quarter: string;
  promoter: number;
  fii: number;
  dii: number;
  public: number;
  promoterPledged: number;
}

export interface PeerStock {
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  pe: number;
  pb: number;
  roe: number;
  roce: number;
  debtEquity: number;
  revenueGrowth: number;
  netProfitMargin: number;
}

export interface AnalystRec {
  firm: string;
  analyst: string;
  rating: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL' | 'OUTPERFORM';
  targetPrice: number;
  upside: number;
  date: string;
}

export interface TechnicalIndicator {
  name: string;
  value: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  timeframe: string;
}

export interface ManagementPerson {
  name: string;
  designation: string;
  since: string;
}

export interface StockDetail {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  exchange: string;
  isin: string;
  founded: string;
  headquarters: string;
  employees: string;
  website: string;
  about: string;
  cmp: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  avgVolume: number;
  high52w: number;
  low52w: number;
  marketCap: number;
  enterpriseValue: number;
  pe: number;
  pb: number;
  ps: number;
  ev_ebitda: number;
  eps: number;
  roe: number;
  roce: number;
  roa: number;
  debtEquity: number;
  currentRatio: number;
  interestCoverage: number;
  bookValue: number;
  dividendYield: number;
  dividendPerShare: number;
  payoutRatio: number;
  revenueGrowth3y: number;
  profitGrowth3y: number;
  salesGrowth5y: number;
  profitGrowth5y: number;
  opm: number;
  npm: number;
  grossMargin: number;
  fcfYield: number;
  totalDebt: number;
  cashEquivalents: number;
  netDebt: number;
  promoterHolding: number;
  promoterPledge: number;
  fiiHolding: number;
  diiHolding: number;
  publicHolding: number;
  quarterlyResults: QuarterlyResult[];
  shareholdingHistory: ShareholdingPattern[];
  peers: PeerStock[];
  analystRecs: AnalystRec[];
  technicals: TechnicalIndicator[];
  management: ManagementPerson[];
  keyRisks: string[];
  keyStrengths: string[];
  recentNews: { headline: string; time: string; source: string; url: string }[];
}

export const STOCK_DETAILS: Record<string, StockDetail> = {
  HDFCBANK: {
    symbol:'HDFCBANK', name:'HDFC Bank Ltd', sector:'Banking', industry:'Private Sector Bank',
    exchange:'NSE/BSE', isin:'INE040A01034', founded:'1994', headquarters:'Mumbai, Maharashtra',
    employees:'1,77,000+', website:'www.hdfcbank.com',
    about:'HDFC Bank is India\'s largest private sector bank by assets, offering a wide range of banking and financial services. It merged with HDFC Ltd in 2023, creating one of India\'s largest financial conglomerates.',
    cmp:1650, open:1638, high:1662, low:1634, prevClose:1641, volume:12450000, avgVolume:9800000,
    high52w:1880, low52w:1363, marketCap:1260000, enterpriseValue:1340000,
    pe:24.2, pb:3.1, ps:4.8, ev_ebitda:18.4, eps:68.2, roe:17.8, roce:18.2, roa:2.1,
    debtEquity:0.15, currentRatio:1.8, interestCoverage:4.2,
    bookValue:532, dividendYield:1.2, dividendPerShare:19.5, payoutRatio:22.4,
    revenueGrowth3y:16.8, profitGrowth3y:21.4, salesGrowth5y:18.2, profitGrowth5y:19.8,
    opm:42.1, npm:24.8, grossMargin:68.4, fcfYield:3.2,
    totalDebt:24800, cashEquivalents:8400, netDebt:16400,
    promoterHolding:25.5, promoterPledge:0, fiiHolding:45.2, diiHolding:18.4, publicHolding:10.9,
    quarterlyResults:[
      { quarter:'Q3 FY25', revenue:78500, operatingProfit:32800, netProfit:17200, eps:22.1, opm:41.8, revenueGrowth:14.2, profitGrowth:18.4 },
      { quarter:'Q2 FY25', revenue:74200, operatingProfit:30800, netProfit:16100, eps:20.7, opm:41.5, revenueGrowth:12.8, profitGrowth:16.2 },
      { quarter:'Q1 FY25', revenue:70800, operatingProfit:29400, netProfit:15400, eps:19.8, opm:41.5, revenueGrowth:11.4, profitGrowth:14.8 },
      { quarter:'Q4 FY24', revenue:68200, operatingProfit:28200, netProfit:14800, eps:19.1, opm:41.3, revenueGrowth:10.2, profitGrowth:13.2 },
      { quarter:'Q3 FY24', revenue:65800, operatingProfit:27200, netProfit:14500, eps:18.7, opm:41.3, revenueGrowth:18.4, profitGrowth:22.1 },
      { quarter:'Q2 FY24', revenue:63400, operatingProfit:26100, netProfit:13800, eps:17.8, opm:41.2, revenueGrowth:16.2, profitGrowth:20.4 },
    ],
    shareholdingHistory:[
      { quarter:'Dec 24', promoter:25.5, fii:45.2, dii:18.4, public:10.9, promoterPledged:0 },
      { quarter:'Sep 24', promoter:25.5, fii:44.8, dii:18.8, public:10.9, promoterPledged:0 },
      { quarter:'Jun 24', promoter:25.5, fii:44.2, dii:19.2, public:11.1, promoterPledged:0 },
      { quarter:'Mar 24', promoter:25.5, fii:43.8, dii:19.6, public:11.1, promoterPledged:0 },
      { quarter:'Dec 23', promoter:25.5, fii:43.2, dii:20.1, public:11.2, promoterPledged:0 },
    ],
    peers:[
      { symbol:'ICICIBANK',  name:'ICICI Bank',      price:1120, marketCap:850000,  pe:22.1, pb:2.8, roe:17.2, roce:17.8, debtEquity:0.20, revenueGrowth:16.2, netProfitMargin:22.4 },
      { symbol:'KOTAKBANK',  name:'Kotak Mahindra',   price:1850, marketCap:380000,  pe:26.4, pb:3.8, roe:19.1, roce:19.8, debtEquity:0.10, revenueGrowth:20.4, netProfitMargin:26.2 },
      { symbol:'AXISBANK',   name:'Axis Bank',        price:1050, marketCap:320000,  pe:20.2, pb:2.4, roe:16.4, roce:17.1, debtEquity:0.25, revenueGrowth:14.8, netProfitMargin:20.8 },
      { symbol:'SBIN',       name:'State Bank',       price:550,  marketCap:600000,  pe:14.2, pb:1.8, roe:14.1, roce:14.8, debtEquity:0.60, revenueGrowth:12.4, netProfitMargin:18.2 },
      { symbol:'INDUSINDBK', name:'IndusInd Bank',    price:1380, marketCap:280000,  pe:21.4, pb:2.6, roe:17.1, roce:17.8, debtEquity:0.30, revenueGrowth:18.2, netProfitMargin:22.1 },
    ],
    analystRecs:[
      { firm:'Goldman Sachs',   analyst:'Rahul Jain',    rating:'BUY',         targetPrice:1950, upside:18.2, date:'12 Jan 2025' },
      { firm:'Morgan Stanley',  analyst:'Priya Mehta',   rating:'OUTPERFORM',  targetPrice:1900, upside:15.2, date:'08 Jan 2025' },
      { firm:'Kotak Securities',analyst:'Amit Kumar',    rating:'BUY',         targetPrice:1880, upside:13.9, date:'05 Jan 2025' },
      { firm:'ICICI Securities',analyst:'Deepak Sharma', rating:'BUY',         targetPrice:1870, upside:13.3, date:'02 Jan 2025' },
      { firm:'CLSA',            analyst:'Vikram Singh',  rating:'OUTPERFORM',  targetPrice:1920, upside:16.4, date:'28 Dec 2024' },
      { firm:'Emkay Global',    analyst:'Sanjay Gupta',  rating:'BUY',         targetPrice:1860, upside:12.7, date:'22 Dec 2024' },
    ],
    technicals:[
      { name:'RSI (14)',         value:'58.4',     signal:'NEUTRAL', timeframe:'Daily'   },
      { name:'MACD',             value:'12.4',     signal:'BUY',     timeframe:'Daily'   },
      { name:'Moving Avg 20D',   value:'1,628',   signal:'BUY',     timeframe:'Daily'   },
      { name:'Moving Avg 50D',   value:'1,612',   signal:'BUY',     timeframe:'Daily'   },
      { name:'Moving Avg 200D',  value:'1,574',   signal:'BUY',     timeframe:'Daily'   },
      { name:'Bollinger Bands',  value:'Upper: 1,698', signal:'NEUTRAL', timeframe:'Daily' },
      { name:'Stochastic %K',    value:'62.4',     signal:'NEUTRAL', timeframe:'Daily'   },
      { name:'ADX',              value:'28.4',     signal:'BUY',     timeframe:'Daily'   },
      { name:'Volume SMA',       value:'9.8M',     signal:'BUY',     timeframe:'Daily'   },
      { name:'Supertrend',       value:'1,598',   signal:'BUY',     timeframe:'Daily'   },
    ],
    management:[
      { name:'Sashidhar Jagdishan', designation:'MD & CEO',          since:'2020' },
      { name:'Kaizad Bharucha',     designation:'Executive Director', since:'2014' },
      { name:'Srikanth Nadhamuni',  designation:'Non-Executive Director', since:'2022' },
      { name:'Malay Patel',         designation:'Independent Director',  since:'2021' },
    ],
    keyStrengths:['Largest private bank by assets','Strong CASA ratio above 40%','Diversified loan book across retail & corporate','Industry-leading asset quality with low NPA','Post-merger with HDFC Ltd creates insurance & home loan synergies'],
    keyRisks:['NIM pressure in rising rate environment','Elevated credit costs post-HDFC merger integration','Slowdown in retail credit growth','Regulatory risks from RBI guidelines','High FII ownership creates volatility risk'],
    recentNews:[
      { headline:'HDFC Bank Q3 net profit rises 18% to 17,200 crore, beats street estimates', time:'2h ago', source:'Economic Times', url:'https://economictimes.indiatimes.com' },
      { headline:'HDFC Bank eyes 20% credit growth in FY26 on back of rural expansion drive', time:'4h ago', source:'Mint', url:'https://livemint.com' },
      { headline:'FIIs add 2.4 crore shares in HDFC Bank in December quarter', time:'1d ago', source:'Business Standard', url:'https://business-standard.com' },
      { headline:'HDFC Bank launches HDFC Sky platform; eyes 5 million customers in first year', time:'2d ago', source:'MoneyControl', url:'https://moneycontrol.com' },
    ],
  },

  TITAN: {
    symbol:'TITAN', name:'Titan Company Ltd', sector:'Consumer', industry:'Watches & Jewellery',
    exchange:'NSE/BSE', isin:'INE280A01028', founded:'1984', headquarters:'Bengaluru, Karnataka',
    employees:'12,000+', website:'www.titancompany.in',
    about:'Titan Company, a Tata Group company, is India\'s most trusted lifestyle brand. It operates in jewellery (Tanishq), watches, eyewear and fragrances. Tanishq is India\'s largest organized jewellery retail chain.',
    cmp:3250, open:3228, high:3275, low:3215, prevClose:3238, volume:2840000, avgVolume:2200000,
    high52w:3886, low52w:2926, marketCap:289000, enterpriseValue:294000,
    pe:88.4, pb:18.2, ps:4.2, ev_ebitda:54.2, eps:36.8, roe:28.4, roce:34.2, roa:14.8,
    debtEquity:0.12, currentRatio:2.4, interestCoverage:42.8,
    bookValue:178, dividendYield:0.32, dividendPerShare:10.5, payoutRatio:28.4,
    revenueGrowth3y:22.4, profitGrowth3y:28.1, salesGrowth5y:24.2, profitGrowth5y:26.8,
    opm:12.4, npm:8.2, grossMargin:28.4, fcfYield:2.8,
    totalDebt:1240, cashEquivalents:2840, netDebt:-1600,
    promoterHolding:52.9, promoterPledge:0, fiiHolding:18.4, diiHolding:16.2, publicHolding:12.5,
    quarterlyResults:[
      { quarter:'Q3 FY25', revenue:17840, operatingProfit:2214, netProfit:1462, eps:16.4, opm:12.4, revenueGrowth:24.2, profitGrowth:28.4 },
      { quarter:'Q2 FY25', revenue:15480, operatingProfit:1921, netProfit:1268, eps:14.2, opm:12.4, revenueGrowth:22.8, profitGrowth:26.2 },
      { quarter:'Q1 FY25', revenue:14280, operatingProfit:1771, netProfit:1168, eps:13.1, opm:12.4, revenueGrowth:20.4, profitGrowth:24.8 },
      { quarter:'Q4 FY24', revenue:13840, operatingProfit:1718, netProfit:1128, eps:12.6, opm:12.4, revenueGrowth:18.2, profitGrowth:22.4 },
      { quarter:'Q3 FY24', revenue:13680, operatingProfit:1696, netProfit:1112, eps:12.5, opm:12.4, revenueGrowth:24.8, profitGrowth:28.2 },
      { quarter:'Q2 FY24', revenue:12420, operatingProfit:1540, netProfit:1014, eps:11.4, opm:12.4, revenueGrowth:20.2, profitGrowth:24.4 },
    ],
    shareholdingHistory:[
      { quarter:'Dec 24', promoter:52.9, fii:18.4, dii:16.2, public:12.5, promoterPledged:0 },
      { quarter:'Sep 24', promoter:52.9, fii:18.8, dii:15.8, public:12.5, promoterPledged:0 },
      { quarter:'Jun 24', promoter:52.9, fii:19.2, dii:15.4, public:12.5, promoterPledged:0 },
      { quarter:'Mar 24', promoter:52.9, fii:19.8, dii:14.8, public:12.5, promoterPledged:0 },
      { quarter:'Dec 23', promoter:52.9, fii:20.2, dii:14.4, public:12.5, promoterPledged:0 },
    ],
    peers:[
      { symbol:'ASIANPAINT', name:'Asian Paints',   price:3450, marketCap:331000, pe:54.2, pb:14.8, roe:32.4, roce:38.2, debtEquity:0.08, revenueGrowth:8.2,  netProfitMargin:14.2 },
      { symbol:'PIDILITIND',  name:'Pidilite',       price:2850, marketCap:144000, pe:64.8, pb:18.4, roe:28.8, roce:34.2, debtEquity:0.04, revenueGrowth:12.4, netProfitMargin:16.8 },
      { symbol:'DMART',       name:'D-Mart',         price:6850, marketCap:177000, pe:94.2, pb:22.4, roe:18.4, roce:22.8, debtEquity:0.02, revenueGrowth:18.4, netProfitMargin:6.4  },
      { symbol:'TRENT',       name:'Trent',          price:5850, marketCap:207000, pe:88.4, pb:24.2, roe:24.2, roce:28.4, debtEquity:0.08, revenueGrowth:32.4, netProfitMargin:8.2  },
      { symbol:'KANSAINER',   name:'Kansai Nerolac', price:2850, marketCap:15360,  pe:42.4, pb:8.4,  roe:14.8, roce:18.2, debtEquity:0.04, revenueGrowth:8.4,  netProfitMargin:8.8  },
    ],
    analystRecs:[
      { firm:'ICICI Securities', analyst:'Rohan Gupta',   rating:'BUY',     targetPrice:3850, upside:18.5, date:'10 Jan 2025' },
      { firm:'Motilal Oswal',    analyst:'Priyanka Shah', rating:'BUY',     targetPrice:3800, upside:16.9, date:'08 Jan 2025' },
      { firm:'Kotak Securities', analyst:'Neel Mehta',    rating:'HOLD',    targetPrice:3400, upside:4.6,  date:'05 Jan 2025' },
      { firm:'Axis Securities',  analyst:'Vikram Rao',    rating:'BUY',     targetPrice:3750, upside:15.4, date:'02 Jan 2025' },
      { firm:'CLSA',             analyst:'Amy Liu',       rating:'OUTPERFORM', targetPrice:3900, upside:20.0, date:'28 Dec 2024' },
    ],
    technicals:[
      { name:'RSI (14)',         value:'52.4',     signal:'NEUTRAL', timeframe:'Daily'   },
      { name:'MACD',             value:'-8.4',     signal:'SELL',    timeframe:'Daily'   },
      { name:'Moving Avg 20D',   value:'3,218',   signal:'BUY',     timeframe:'Daily'   },
      { name:'Moving Avg 50D',   value:'3,284',   signal:'SELL',    timeframe:'Daily'   },
      { name:'Moving Avg 200D',  value:'3,156',   signal:'BUY',     timeframe:'Daily'   },
      { name:'Bollinger Bands',  value:'Mid: 3,242', signal:'NEUTRAL', timeframe:'Daily' },
      { name:'Stochastic %K',    value:'48.4',     signal:'NEUTRAL', timeframe:'Daily'   },
      { name:'ADX',              value:'18.4',     signal:'NEUTRAL', timeframe:'Daily'   },
      { name:'Volume SMA',       value:'2.2M',     signal:'BUY',     timeframe:'Daily'   },
      { name:'Supertrend',       value:'3,184',   signal:'BUY',     timeframe:'Daily'   },
    ],
    management:[
      { name:'C K Venkataraman', designation:'MD & CEO',               since:'2019' },
      { name:'Ashok Sonthalia',  designation:'CFO',                    since:'2018' },
      { name:'N N Tata',         designation:'Non-Executive Chairman', since:'2021' },
      { name:'Bhaskar Bhat',     designation:'Independent Director',   since:'2019' },
    ],
    keyStrengths:['Tanishq dominates organized jewellery at 7%+ market share','Tata brand trust drives premium pricing','Debt-free with strong cash generation','Multiple growth engines — jewellery, watches, eyewear','Industry-leading same store sales growth'],
    keyRisks:['High valuation — PE of 88x leaves little margin of safety','Gold price volatility impacts margins','Competition from regional jewellers in tier 2/3 cities','Slowdown in discretionary spending during economic downturns','Dependence on festival/wedding season for majority of revenues'],
    recentNews:[
      { headline:'Titan Q3 revenue surges 24% on record Tanishq festive season sales', time:'3h ago', source:'Mint', url:'https://livemint.com' },
      { headline:'Titan eyes 100 new Tanishq stores in FY26; targets Rs 60,000 cr revenue', time:'1d ago', source:'ET', url:'https://economictimes.indiatimes.com' },
      { headline:'Tata Group pledges Rs 40 crore dividend from Titan stake in Q3', time:'2d ago', source:'Business Standard', url:'https://business-standard.com' },
    ],
  },

  RELIANCE: {
    symbol:'RELIANCE', name:'Reliance Industries Ltd', sector:'Energy', industry:'Diversified Conglomerate',
    exchange:'NSE/BSE', isin:'INE002A01018', founded:'1966', headquarters:'Mumbai, Maharashtra',
    employees:'2,36,334', website:'www.ril.com',
    about:'Reliance Industries is India\'s largest company by market cap, operating across oil & gas, petrochemicals, retail (Reliance Retail), telecom (Jio), and green energy. Founded by Dhirubhai Ambani, now led by Mukesh Ambani.',
    cmp:2850, open:2832, high:2868, low:2825, prevClose:2842, volume:8420000, avgVolume:7200000,
    high52w:3218, low52w:2220, marketCap:1929000, enterpriseValue:2184000,
    pe:28.4, pb:2.4, ps:0.8, ev_ebitda:12.4, eps:100.4, roe:10.8, roce:12.4, roa:4.8,
    debtEquity:0.42, currentRatio:1.2, interestCoverage:8.4,
    bookValue:1188, dividendYield:0.42, dividendPerShare:12.0, payoutRatio:12.4,
    revenueGrowth3y:14.2, profitGrowth3y:18.4, salesGrowth5y:16.8, profitGrowth5y:14.2,
    opm:16.4, npm:8.2, grossMargin:24.8, fcfYield:2.4,
    totalDebt:284000, cashEquivalents:168000, netDebt:116000,
    promoterHolding:50.3, promoterPledge:0, fiiHolding:21.4, diiHolding:18.8, publicHolding:9.5,
    quarterlyResults:[
      { quarter:'Q3 FY25', revenue:264000, operatingProfit:43300, netProfit:21804, eps:32.4, opm:16.4, revenueGrowth:8.4,  profitGrowth:18.2 },
      { quarter:'Q2 FY25', revenue:248000, operatingProfit:40700, netProfit:20400, eps:30.2, opm:16.4, revenueGrowth:6.8,  profitGrowth:16.4 },
      { quarter:'Q1 FY25', revenue:238000, operatingProfit:39100, netProfit:19500, eps:28.8, opm:16.4, revenueGrowth:8.2,  profitGrowth:14.8 },
      { quarter:'Q4 FY24', revenue:228000, operatingProfit:37400, netProfit:18500, eps:27.4, opm:16.4, revenueGrowth:10.4, profitGrowth:12.4 },
      { quarter:'Q3 FY24', revenue:244000, operatingProfit:39900, netProfit:18680, eps:27.7, opm:16.4, revenueGrowth:12.4, profitGrowth:10.2 },
      { quarter:'Q2 FY24', revenue:232000, operatingProfit:38000, netProfit:17480, eps:25.9, opm:16.4, revenueGrowth:10.8, profitGrowth:14.2 },
    ],
    shareholdingHistory:[
      { quarter:'Dec 24', promoter:50.3, fii:21.4, dii:18.8, public:9.5,  promoterPledged:0 },
      { quarter:'Sep 24', promoter:50.3, fii:21.8, dii:18.4, public:9.5,  promoterPledged:0 },
      { quarter:'Jun 24', promoter:50.3, fii:22.2, dii:18.0, public:9.5,  promoterPledged:0 },
      { quarter:'Mar 24', promoter:50.3, fii:22.8, dii:17.4, public:9.5,  promoterPledged:0 },
      { quarter:'Dec 23', promoter:50.3, fii:23.2, dii:17.0, public:9.5,  promoterPledged:0 },
    ],
    peers:[
      { symbol:'ONGC',      name:'ONGC',         price:310,  marketCap:390000,  pe:8.4,  pb:1.2, roe:10.4, roce:11.2, debtEquity:0.18, revenueGrowth:4.8,  netProfitMargin:14.2 },
      { symbol:'TATAPOWER', name:'Tata Power',    price:345,  marketCap:110000,  pe:24.4, pb:3.8, roe:10.8, roce:11.4, debtEquity:0.92, revenueGrowth:8.4,  netProfitMargin:6.4  },
      { symbol:'NTPC',      name:'NTPC',          price:295,  marketCap:286000,  pe:14.2, pb:1.8, roe:12.4, roce:13.2, debtEquity:0.62, revenueGrowth:6.4,  netProfitMargin:14.8 },
      { symbol:'ADANIPORTS',name:'Adani Ports',   price:1220, marketCap:264000,  pe:28.4, pb:4.8, roe:14.8, roce:15.4, debtEquity:0.42, revenueGrowth:18.4, netProfitMargin:28.4 },
    ],
    analystRecs:[
      { firm:'Morgan Stanley',   analyst:'Ridham Desai',   rating:'BUY',         targetPrice:3500, upside:22.8, date:'12 Jan 2025' },
      { firm:'Goldman Sachs',    analyst:'Sunil Koul',     rating:'BUY',         targetPrice:3400, upside:19.3, date:'10 Jan 2025' },
      { firm:'Jefferies',        analyst:'Bhaskar Chakraborty', rating:'BUY',    targetPrice:3450, upside:21.1, date:'08 Jan 2025' },
      { firm:'Motilal Oswal',    analyst:'Niket Shah',     rating:'BUY',         targetPrice:3380, upside:18.6, date:'05 Jan 2025' },
      { firm:'UBS',              analyst:'Sanjay Mookim',  rating:'NEUTRAL',     targetPrice:3000, upside:5.3,  date:'02 Jan 2025' },
    ],
    technicals:[
      { name:'RSI (14)',         value:'44.8',     signal:'NEUTRAL', timeframe:'Daily'   },
      { name:'MACD',             value:'-18.4',    signal:'SELL',    timeframe:'Daily'   },
      { name:'Moving Avg 20D',   value:'2,878',   signal:'SELL',    timeframe:'Daily'   },
      { name:'Moving Avg 50D',   value:'2,924',   signal:'SELL',    timeframe:'Daily'   },
      { name:'Moving Avg 200D',  value:'2,788',   signal:'BUY',     timeframe:'Daily'   },
      { name:'Bollinger Bands',  value:'Lower: 2,812', signal:'NEUTRAL', timeframe:'Daily' },
      { name:'Stochastic %K',    value:'38.4',     signal:'NEUTRAL', timeframe:'Daily'   },
      { name:'ADX',              value:'22.4',     signal:'NEUTRAL', timeframe:'Daily'   },
      { name:'Volume SMA',       value:'7.2M',     signal:'BUY',     timeframe:'Daily'   },
      { name:'Supertrend',       value:'2,924',   signal:'SELL',    timeframe:'Daily'   },
    ],
    management:[
      { name:'Mukesh D. Ambani', designation:'Chairman & MD', since:'2002' },
      { name:'Nikhil R. Meswani',designation:'Executive Director', since:'1988' },
      { name:'Hital R. Meswani', designation:'Executive Director', since:'1995' },
      { name:'V. Srikanth',      designation:'CFO', since:'2022' },
    ],
    keyStrengths:['Largest company in India by market cap','Jio — 480M+ subscribers, dominant telecom player','Reliance Retail — India\'s largest retailer','Massive green energy investment (100GW by 2030)','Proven capital allocation track record under Mukesh Ambani'],
    keyRisks:['High debt due to aggressive expansion across segments','Succession planning concerns','Regulatory risk in telecom sector','O2C margins under pressure from global crude volatility','Retail segment facing competition from Zepto, Blinkit, Swiggy'],
    recentNews:[
      { headline:'Reliance Industries Q3 profit jumps 18% to Rs 21,804 crore; Jio, retail drive growth', time:'5h ago', source:'ET', url:'https://economictimes.indiatimes.com' },
      { headline:'Reliance Jio launches satellite internet service in 50 cities; targets 5G leadership', time:'1d ago', source:'Mint', url:'https://livemint.com' },
      { headline:'Reliance Retail eyes Rs 10 lakh crore revenue by FY27 through omnichannel expansion', time:'2d ago', source:'Business Standard', url:'https://business-standard.com' },
    ],
  },
};

// Generate minimal detail records for all other stocks not in STOCK_DETAILS
export function getStockDetail(symbol: string): StockDetail | null {
  return STOCK_DETAILS[symbol] || null;
}