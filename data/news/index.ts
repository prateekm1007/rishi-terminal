// data/news/index.ts
// Fallback static stories shown while live API loads

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  category: string;
  subCategory: string;
  time: string;
  minutesAgo: number;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  tags: string[];
  isBreaking: boolean;
  isTrending: boolean;
  region: 'INDIA' | 'GLOBAL' | 'CRYPTO' | 'SPORTS';
  url: string;
}

export const NEWS_FEED: NewsItem[] = [
  // INDIA
  { id:'n1', headline:'RBI holds repo rate at 6.5% for 6th consecutive meeting, maintains withdrawal of accommodation stance', summary:'The Monetary Policy Committee unanimously decided to keep the benchmark lending rate unchanged. Governor Shaktikanta Das cited sticky core inflation and global uncertainty as reasons for the pause. Markets largely expected this outcome with focus now shifting to timeline for rate cuts.', source:'MoneyControl', category:'Economy', subCategory:'RBI Policy', time:'10:32 AM', minutesAgo:12, impact:'NEUTRAL', tags:['RBI','Repo Rate','Monetary Policy','Interest Rates'], isBreaking:true, isTrending:true, region:'INDIA', url:'https://www.moneycontrol.com' },
  { id:'n2', headline:'Nifty 50 hits fresh 3-month high; Bank Nifty up 1.2% led by HDFC Bank and ICICI Bank surge', summary:'Indian equity benchmarks rallied sharply with Nifty crossing 24,200. Banking stocks led the charge after RBI governor hinted at potential rate cuts in upcoming quarters. FII buying supported the rally.', source:'Economic Times', category:'Markets', subCategory:'Equity', time:'11:15 AM', minutesAgo:5, impact:'POSITIVE', tags:['Nifty','Bank Nifty','HDFCBANK','ICICIBANK'], isBreaking:false, isTrending:true, region:'INDIA', url:'https://economictimes.indiatimes.com' },
  { id:'n3', headline:'FIIs pump Rs 8,245 crore into Indian equities in single session; biggest inflow in 4 months', summary:'Foreign Institutional Investors turned aggressive buyers as rupee stabilized and global risk appetite improved. IT and banking sectors received maximum FII allocation.', source:'Business Standard', category:'Markets', subCategory:'FII Activity', time:'03:45 PM', minutesAgo:28, impact:'POSITIVE', tags:['FII','Foreign Flows','Banking','IT'], isBreaking:false, isTrending:true, region:'INDIA', url:'https://www.business-standard.com' },
  { id:'n4', headline:'Reliance Industries Q3 results: Net profit jumps 18% YoY to Rs 21,804 crore, beats estimates', summary:'RIL reported strong quarterly earnings driven by record Jio subscriber additions and retail segment turnaround. Management guided for continued capex in green energy.', source:'CNBC TV18', category:'Earnings', subCategory:'Results', time:'06:30 PM', minutesAgo:45, impact:'POSITIVE', tags:['RELIANCE','Earnings','Q3','Results'], isBreaking:true, isTrending:true, region:'INDIA', url:'https://www.cnbctv18.com' },
  { id:'n5', headline:'SEBI proposes tighter F&O rules; weekly expiry contracts to be limited to one per exchange', summary:'Market regulator SEBI released a consultation paper proposing major overhaul of derivatives market structure to curb retail speculation and reduce systemic risk.', source:'SEBI', category:'Regulation', subCategory:'SEBI', time:'02:15 PM', minutesAgo:95, impact:'NEGATIVE', tags:['SEBI','FnO','Derivatives','Regulation'], isBreaking:true, isTrending:true, region:'INDIA', url:'https://www.sebi.gov.in' },
  { id:'n6', headline:'India GDP growth forecast raised to 7.2% for FY25 by IMF; fastest growing major economy', summary:'International Monetary Fund upgraded India GDP forecast citing strong domestic consumption, infrastructure spending, and services export growth. China revised down to 4.6%.', source:'IMF', category:'Economy', subCategory:'GDP', time:'08:00 PM', minutesAgo:120, impact:'POSITIVE', tags:['GDP','India','IMF','Economy'], isBreaking:false, isTrending:true, region:'INDIA', url:'https://www.imf.org' },
  { id:'n7', headline:'Infosys raises FY25 revenue guidance to 4.5-5% after strong Q3; stock up 4% in trade', summary:'IT major Infosys beat Q3 estimates with net profit of Rs 6,806 crore and raised full year guidance. Large deal wins of $2.4 billion in the quarter signal strong demand pipeline.', source:'Mint', category:'Earnings', subCategory:'IT Sector', time:'07:45 PM', minutesAgo:140, impact:'POSITIVE', tags:['INFY','Infosys','IT','Earnings'], isBreaking:false, isTrending:true, region:'INDIA', url:'https://www.livemint.com' },
  { id:'n8', headline:'Adani Group stocks surge 8-15% after Hindenburg Research announces shutdown', summary:'Adani Group portfolio stocks witnessed massive rally after short-seller Hindenburg Research announced it was winding down operations. Adani Enterprises led gains with 15% surge.', source:'Reuters', category:'Corporate', subCategory:'Conglomerate', time:'01:30 PM', minutesAgo:180, impact:'POSITIVE', tags:['ADANI','Hindenburg','Short Seller'], isBreaking:true, isTrending:true, region:'INDIA', url:'https://www.reuters.com' },
  // GLOBAL
  { id:'n9', headline:'Federal Reserve holds rates steady; signals 2 cuts in 2025 as inflation nears 2% target', summary:'The Fed kept benchmark rate at 5.25-5.50% range but dot plot now shows consensus for 50bps cuts in 2025. Chair Powell expressed growing confidence on inflation trajectory.', source:'Reuters', category:'Economy', subCategory:'Fed Policy', time:'02:00 AM', minutesAgo:15, impact:'POSITIVE', tags:['Fed','Interest Rates','US Economy','Powell'], isBreaking:true, isTrending:true, region:'GLOBAL', url:'https://www.reuters.com' },
  { id:'n10', headline:'Nvidia hits $4 trillion market cap milestone; Jensen Huang says AI revolution just beginning', summary:'Nvidia became the first company to reach $4 trillion market capitalization. CEO Jensen Huang announced next-gen Blackwell Ultra chips shipping to hyperscalers in Q2 2025.', source:'CNBC', category:'Tech', subCategory:'AI/Semiconductors', time:'09:45 PM', minutesAgo:48, impact:'POSITIVE', tags:['NVDA','Nvidia','AI','Semiconductors'], isBreaking:true, isTrending:true, region:'GLOBAL', url:'https://www.cnbc.com' },
  { id:'n11', headline:'China stimulus package of $1.4 trillion approved; real estate sector leads Asian market rally', summary:'Chinese government approved massive fiscal stimulus targeting infrastructure, consumption and real estate. Hang Seng surged 4.2%.', source:'FT', category:'Economy', subCategory:'China', time:'08:15 AM', minutesAgo:62, impact:'POSITIVE', tags:['China','Stimulus','Asia','Real Estate'], isBreaking:false, isTrending:true, region:'GLOBAL', url:'https://www.ft.com' },
  { id:'n12', headline:'Oil prices drop 3% as OPEC+ signals production increase from Q2 2025; Brent below $75', summary:'Crude oil tumbled after OPEC+ members reached agreement to gradually unwind 2.2 million bpd of voluntary cuts starting April 2025.', source:'Reuters', category:'Commodities', subCategory:'Energy', time:'11:30 PM', minutesAgo:85, impact:'NEGATIVE', tags:['Crude Oil','OPEC','Energy','Brent'], isBreaking:false, isTrending:false, region:'GLOBAL', url:'https://www.reuters.com' },
  // CRYPTO
  { id:'n13', headline:'Bitcoin crosses $100K again; ETF inflows hit record $2.4 billion in single day', summary:'Bitcoin surged past the psychological $100,000 level as institutional demand through spot ETFs hit record highs. BlackRock IBIT alone saw $1.8 billion in single-day inflows.', source:'CoinDesk', category:'Crypto', subCategory:'Bitcoin', time:'03:22 AM', minutesAgo:8, impact:'POSITIVE', tags:['Bitcoin','BTC','ETF','BlackRock'], isBreaking:true, isTrending:true, region:'CRYPTO', url:'https://www.coindesk.com' },
  { id:'n14', headline:'SEC approves spot Solana ETF; SOL price jumps 18% to new all-time high of $290', summary:'The US Securities and Exchange Commission approved the first spot Solana ETF. Grayscale, BlackRock, and Fidelity are among the initial issuers.', source:'Bloomberg', category:'Crypto', subCategory:'Altcoins', time:'09:00 AM', minutesAgo:35, impact:'POSITIVE', tags:['Solana','SOL','ETF','SEC'], isBreaking:true, isTrending:true, region:'CRYPTO', url:'https://www.bloomberg.com' },
  { id:'n15', headline:'Ethereum Pectra upgrade goes live; gas fees drop 85%, DeFi TVL surges $50B in 48 hours', summary:'The most significant Ethereum upgrade since The Merge reduced transaction costs dramatically. Total Value Locked in DeFi protocols surged as users returned to the network.', source:'The Block', category:'Crypto', subCategory:'Ethereum', time:'06:15 AM', minutesAgo:22, impact:'POSITIVE', tags:['Ethereum','ETH','DeFi','Upgrade'], isBreaking:false, isTrending:true, region:'CRYPTO', url:'https://www.theblock.co' },
  // SPORTS / CRICKET / IPL
  { id:'s1', headline:'IPL 2025 Mega Auction: Mumbai Indians spend Rs 185 crore to build squad; Rohit Sharma retained as captain', summary:'Mumbai Indians had a stellar IPL 2025 mega auction, retaining Rohit Sharma and adding Jasprit Bumrah back after his international heroics. The franchise spent big on overseas pacers targeting another title.', source:'ESPNCricinfo', category:'Cricket', subCategory:'IPL', time:'09:00 AM', minutesAgo:45, impact:'POSITIVE', tags:['IPL','Mumbai Indians','Rohit Sharma','Auction'], isBreaking:false, isTrending:true, region:'SPORTS', url:'https://www.espncricinfo.com' },
  { id:'s2', headline:'Virat Kohli scores 150* against Australia in Adelaide Test; India take commanding lead', summary:'Virat Kohli produced a masterclass innings of 150 not out on day 3 of the second Test against Australia at Adelaide Oval. His knock has put India in a commanding position with a lead of 287 runs.', source:'Cricbuzz', category:'Cricket', subCategory:'Test Cricket', time:'02:30 PM', minutesAgo:18, impact:'POSITIVE', tags:['Virat Kohli','India','Australia','Test Cricket','Adelaide'], isBreaking:true, isTrending:true, region:'SPORTS', url:'https://www.cricbuzz.com' },
  { id:'s3', headline:'Jasprit Bumrah takes 5-wicket haul; becomes fastest Indian to 200 Test wickets', summary:'Jasprit Bumrah claimed his 5th five-wicket haul in Test cricket and in the process became the fastest Indian bowler to reach 200 Test wickets. His fitness and consistency have made him the world number 1 bowler.', source:'NDTV Sports', category:'Cricket', subCategory:'Test Cricket', time:'04:15 PM', minutesAgo:32, impact:'POSITIVE', tags:['Bumrah','India','Test Cricket','Record','200 Wickets'], isBreaking:false, isTrending:true, region:'SPORTS', url:'https://sports.ndtv.com' },
  { id:'s4', headline:'IPL 2025 Schedule released: 74 matches across 10 venues; Final at Narendra Modi Stadium on May 25', summary:'BCCI officially announced the IPL 2025 schedule with 74 matches to be played across 10 home venues. The tournament begins March 22 with defending champions KKR taking on RCB in the opener.', source:'BCCI', category:'Cricket', subCategory:'IPL', time:'11:00 AM', minutesAgo:120, impact:'POSITIVE', tags:['IPL 2025','BCCI','Schedule','T20'], isBreaking:false, isTrending:true, region:'SPORTS', url:'https://www.bcci.tv' },
  { id:'s5', headline:'Rohit Sharma becomes 3rd Indian to score 10,000 ODI runs; joins Sachin and Kohli in elite club', summary:'Mumbai Indians captain Rohit Sharma reached the coveted 10,000 ODI runs milestone during the 2nd ODI against Sri Lanka. He became only the third Indian after Sachin Tendulkar and Virat Kohli to achieve this feat.', source:'Times of India', category:'Cricket', subCategory:'ODI Cricket', time:'03:45 PM', minutesAgo:155, impact:'POSITIVE', tags:['Rohit Sharma','10000 Runs','ODI','Record','India'], isBreaking:false, isTrending:false, region:'SPORTS', url:'https://timesofindia.indiatimes.com' },
  { id:'s6', headline:'CSK vs MI IPL 2025 opener: Dhoni finishes it in style with last-ball six; CSK win by 3 wickets', summary:'In a nail-biting IPL 2025 opener, MS Dhoni once again showed why he is the best finisher in T20 cricket. Needing 14 off the last over, Dhoni smashed 2 sixes to seal a dramatic victory for Chennai Super Kings.', source:'ESPNCricinfo', category:'Cricket', subCategory:'IPL', time:'10:30 PM', minutesAgo:25, impact:'POSITIVE', tags:['CSK','MI','Dhoni','IPL 2025','T20'], isBreaking:true, isTrending:true, region:'SPORTS', url:'https://www.espncricinfo.com' },
  { id:'s7', headline:'India wins T20 World Cup 2024; Virat Kohli named Player of the Tournament after match-winning 76', summary:'India lifted the ICC T20 World Cup 2024 after defeating South Africa by 7 runs in a thrilling final. Virat Kohli scored a crucial 76 in the final and announced his T20I retirement immediately after the victory.', source:'ICC', category:'Cricket', subCategory:'World Cup', time:'11:45 PM', minutesAgo:200, impact:'POSITIVE', tags:['India','T20 World Cup','Virat Kohli','ICC','Champions'], isBreaking:false, isTrending:true, region:'SPORTS', url:'https://www.icc-cricket.com' },
  { id:'s8', headline:'KL Rahul century puts India in strong position; hosts 285/4 at stumps on Day 1 vs England', summary:'KL Rahul anchored India innings with a composed century at home as England struggled to make inroads on a flat Rajkot pitch. Rahul scored 110 off 196 balls before falling late in the day.', source:'Cricbuzz', category:'Cricket', subCategory:'Test Cricket', time:'06:00 PM', minutesAgo:280, impact:'POSITIVE', tags:['KL Rahul','India','England','Test Cricket','Century'], isBreaking:false, isTrending:false, region:'SPORTS', url:'https://www.cricbuzz.com' },
  { id:'s9', headline:'IPL 2025 Player Retention: RCB retain Virat Kohli for Rs 21 crore; Dhoni exempted from retention rules', summary:'Royal Challengers Bangalore retained Virat Kohli as their marquee player ahead of IPL 2025 mega auction. MS Dhoni received a special exemption from CSK under the uncapped player rule after brief retirement.', source:'Cricbuzz', category:'Cricket', subCategory:'IPL', time:'08:00 PM', minutesAgo:320, impact:'POSITIVE', tags:['IPL 2025','Virat Kohli','RCB','Dhoni','CSK','Retention'], isBreaking:false, isTrending:true, region:'SPORTS', url:'https://www.cricbuzz.com' },
  { id:'s10', headline:'Hardik Pandya returns to form with all-round display; takes 3 wickets and scores 68 for MI', summary:'After a difficult IPL season, Hardik Pandya showed why he is one of the most valuable T20 players with a brilliant all-round display for Mumbai Indians. His performance came at a crucial moment in the tournament.', source:'NDTV Sports', category:'Cricket', subCategory:'IPL', time:'09:30 PM', minutesAgo:380, impact:'POSITIVE', tags:['Hardik Pandya','Mumbai Indians','IPL','All-rounder'], isBreaking:false, isTrending:false, region:'SPORTS', url:'https://sports.ndtv.com' },
];

export const TICKER_ITEMS = [
  { text:'NIFTY 50  24,198  ▲ 142.5 (+0.59%)',   color:'#10B981' },
  { text:'SENSEX  79,802  ▲ 483.2 (+0.61%)',      color:'#10B981' },
  { text:'BANK NIFTY  51,842  ▲ 285.4 (+0.55%)',  color:'#10B981' },
  { text:'NIFTY IT  42,156  ▼ 285.2 (-0.67%)',    color:'#EF4444' },
  { text:'GOLD  $2,652  ▲ 12.4 (+0.47%)',          color:'#F59E0B' },
  { text:'CRUDE WTI  $71.85  ▼ 0.84 (-1.16%)',     color:'#EF4444' },
  { text:'BTC  $98,500  ▲ 2.45%',                  color:'#10B981' },
  { text:'ETH  $3,650  ▲ 1.82%',                   color:'#10B981' },
  { text:'USD/INR  84.28  ▼ 0.12%',               color:'#EF4444' },
  { text:'S&P 500  6,012  ▲ 28.5 (+0.48%)',        color:'#10B981' },
  { text:'NASDAQ  19,856  ▲ 142.8 (+0.72%)',       color:'#10B981' },
  { text:'🏏 INDIA vs AUS — VIRAT 150* — INDIA 380/4', color:'#818CF8' },
  { text:'🏆 IPL 2025 — CSK beat MI by 3 wkts — DHONI 18*(6)', color:'#F59E0B' },
  { text:'FII NET  +8,245 Cr  🟢 BUYING',         color:'#10B981' },
  { text:'MCX GOLD  77,285  ▲ 285 (+0.37%)',      color:'#F59E0B' },
  { text:'INDIA VIX  13.84  ▼ 2.94%  😌 CALM',     color:'#10B981' },
];

export const TRENDING_TOPICS = [
  { topic:'RBI Rate Decision',  count:48520, change:'+124%' },
  { topic:'Infosys Q3 Results', count:38240, change:'+89%'  },
  { topic:'IPL 2025 Auction',   count:35600, change:'+201%' },
  { topic:'Virat Kohli 150',    count:32100, change:'+185%' },
  { topic:'Bitcoin $100K',      count:28450, change:'+145%' },
  { topic:'SEBI FnO Rules',     count:24830, change:'+52%'  },
  { topic:'Dhoni CSK',          count:22400, change:'+168%' },
  { topic:'FII Buying Spree',   count:19240, change:'+38%'  },
];

export const IPL_TEAMS = [
  { short:'MI',  name:'Mumbai Indians',        color:'#004BA0', emoji:'🔵', titles:5 },
  { short:'CSK', name:'Chennai Super Kings',   color:'#FDB913', emoji:'🟡', titles:5 },
  { short:'RCB', name:'Royal Challengers',     color:'#D4001B', emoji:'🔴', titles:0 },
  { short:'KKR', name:'Kolkata Knight Riders', color:'#3A225D', emoji:'🟣', titles:3 },
  { short:'DC',  name:'Delhi Capitals',        color:'#0078BC', emoji:'🔵', titles:0 },
  { short:'SRH', name:'Sunrisers Hyderabad',   color:'#F7A721', emoji:'🟠', titles:1 },
  { short:'PBKS',name:'Punjab Kings',          color:'#ED1B24', emoji:'🔴', titles:0 },
  { short:'RR',  name:'Rajasthan Royals',      color:'#EA1A85', emoji:'🩷', titles:1 },
  { short:'GT',  name:'Gujarat Titans',        color:'#1C1C1C', emoji:'⚫', titles:1 },
  { short:'LSG', name:'Lucknow Super Giants',  color:'#A0C1D1', emoji:'🩵', titles:0 },
];

export const CRICKET_LIVE = {
  match: 'India vs Australia — 2nd Test, Day 3',
  venue: 'Adelaide Oval, Adelaide',
  status: 'LIVE',
  india: { score:'380/4', overs:'92.3', batting:'Virat Kohli 150*, Rahul 42*' },
  australia: { score:'245', overs:'78.0', batting:'All out' },
  lead: 'India lead by 135 runs',
  lastBall: 'FOUR through covers by Kohli!',
  toss: 'India won toss, elected to bat',
};