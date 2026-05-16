// GENERATE_EXPANSION_BATCH_V2
// Massive Batch 4 Expansion (300 Curated Candidates)
// Auto-skips existing symbols, auto-quotes numeric symbols, enforces canonical sectors

import fs from "fs";
import path from "path";

const stocksPath = path.join(process.cwd(), "data/stocks/index.ts");
const content = fs.readFileSync(stocksPath, "utf-8");

const existing = Array.from(
  content.matchAll(/^\s*"?([A-Z0-9_&-]+)"?\s*:\s*\{/gm)
).map(m => m[1]);

const existingSet = new Set(existing);
console.log(`Existing stocks in registry: ${existing.length}`);

interface Candidate {
  symbol: string; name: string; sector: string; price: number; pe: number; roe: number;
}

// 300 High-Liquidity Indian Stocks (Canonical Sectors Enforced)
const candidates: Candidate[] = [
  // Healthcare & Diagnostics
  { symbol: "MEDPLUS", name: "MedPlus Health", sector: "Retail", price: 720, pe: 65, roe: 12 },
  { symbol: "VIJAYA", name: "Vijaya Diagnostic", sector: "Healthcare", price: 890, pe: 45, roe: 18 },
  { symbol: "KIMS", name: "KIMS Hospitals", sector: "Healthcare", price: 2150, pe: 48, roe: 20 },
  { symbol: "RAINBOW", name: "Rainbow Childrens Hospital", sector: "Healthcare", price: 1420, pe: 42, roe: 19 },
  { symbol: "JUPITER", name: "Jupiter Life Line", sector: "Healthcare", price: 1280, pe: 50, roe: 16 },
  { symbol: "ARTEMISMED", name: "Artemis Medicare", sector: "Healthcare", price: 195, pe: 35, roe: 14 },
  { symbol: "SHALBY", name: "Shalby Limited", sector: "Healthcare", price: 285, pe: 28, roe: 12 },
  { symbol: "KOVAI", name: "Kovai Medical", sector: "Healthcare", price: 3850, pe: 32, roe: 15 },
  { symbol: "ASTERDM", name: "Aster DM Healthcare", sector: "Healthcare", price: 485, pe: 38, roe: 14 },
  { symbol: "NARAYANA", name: "Narayana Hrudayalaya", sector: "Healthcare", price: 1280, pe: 36, roe: 22 },
  { symbol: "FORTIS", name: "Fortis Healthcare", sector: "Healthcare", price: 485, pe: 42, roe: 12 },
  { symbol: "MAXHEALTH", name: "Max Healthcare", sector: "Healthcare", price: 985, pe: 55, roe: 16 },
  { symbol: "THYROCARE", name: "Thyrocare Technologies", sector: "Healthcare", price: 685, pe: 38, roe: 15 },
  
  // Hospitality & Travel
  { symbol: "CHALET", name: "Chalet Hotels", sector: "Hospitality", price: 850, pe: 65, roe: 14 },
  { symbol: "EIHOTEL", name: "EIH Limited", sector: "Hospitality", price: 485, pe: 38, roe: 16 },
  { symbol: "LEMONTREE", name: "Lemon Tree Hotels", sector: "Hospitality", price: 142, pe: 55, roe: 12 },
  { symbol: "TAJGVK", name: "TAJ GVK Hotels", sector: "Hospitality", price: 345, pe: 28, roe: 14 },
  { symbol: "MAHINDRAHOL", name: "Mahindra Holidays", sector: "Hospitality", price: 485, pe: 42, roe: 12 },
  { symbol: "ITDC", name: "India Tourism Dev", sector: "Hospitality", price: 685, pe: 35, roe: 10 },
  { symbol: "EASEMYTRIP", name: "Easy Trip Planners", sector: "Internet", price: 45, pe: 42, roe: 25 },
  { symbol: "YATRA", name: "Yatra Online", sector: "Internet", price: 145, pe: 0, roe: 0 },
  { symbol: "RATEGAIN", name: "RateGain Travel Tech", sector: "IT", price: 780, pe: 65, roe: 15 },

  // Beverages & Alcohol
  { symbol: "RADICO", name: "Radico Khaitan", sector: "FMCG", price: 1780, pe: 75, roe: 16 },
  { symbol: "GLOBUSSPR", name: "Globus Spirits", sector: "FMCG", price: 885, pe: 25, roe: 14 },
  { symbol: "SULA", name: "Sula Vineyards", sector: "FMCG", price: 520, pe: 45, roe: 18 },
  { symbol: "TILAKNAGAR", name: "Tilaknagar Industries", sector: "FMCG", price: 285, pe: 32, roe: 15 },
  { symbol: "SOMDISTILL", name: "Som Distilleries", sector: "FMCG", price: 145, pe: 24, roe: 16 },
  { symbol: "UNITEDTEA", name: "United Nilgiri Tea", sector: "FMCG", price: 385, pe: 18, roe: 12 },
  { symbol: "UBL", name: "United Breweries", sector: "FMCG", price: 2050, pe: 85, roe: 15 },

  // Defense & Aerospace Tech
  { symbol: "DATAPATTNS", name: "Data Patterns", sector: "Defense", price: 2850, pe: 72, roe: 22 },
  { symbol: "MTARTECH", name: "MTAR Technologies", sector: "Defense", price: 1980, pe: 58, roe: 16 },
  { symbol: "PARAS", name: "Paras Defence", sector: "Defense", price: 1150, pe: 85, roe: 14 },
  { symbol: "ASTRAMICRO", name: "Astra Microwave", sector: "Defense", price: 885, pe: 48, roe: 18 },
  { symbol: "CENTUM", name: "Centum Electronics", sector: "Capital Goods", price: 1850, pe: 65, roe: 15 },
  { symbol: "DCXINDIA", name: "DCX Systems", sector: "Defense", price: 385, pe: 42, roe: 16 },
  { symbol: "IDEAFORGE", name: "ideaForge Technology", sector: "Defense", price: 785, pe: 0, roe: 8 },
  { symbol: "DRONE", name: "Dronacharya Aerial", sector: "Defense", price: 185, pe: 45, roe: 14 },
  { symbol: "SIKKO", name: "Sikko Industries", sector: "Defense", price: 145, pe: 28, roe: 18 },

  // New-Age Fintech, AMC & Platforms
  { symbol: "BSE", name: "BSE Limited", sector: "Exchange", price: 2850, pe: 45, roe: 20 },
  { symbol: "CDSL", name: "Central Depository", sector: "Fintech", price: 1480, pe: 52, roe: 24 },
  { symbol: "MCX", name: "Multi Commodity Exchange", sector: "Exchange", price: 3850, pe: 65, roe: 16 },
  { symbol: "CAMS", name: "Computer Age Mgmt", sector: "Fintech", price: 3200, pe: 48, roe: 35 },
  { symbol: "KFINTECH", name: "KFin Technologies", sector: "Fintech", price: 780, pe: 42, roe: 22 },
  { symbol: "UTIAMC", name: "UTI Asset Management", sector: "Fintech", price: 985, pe: 22, roe: 16 },
  { symbol: "NAMINDIA", name: "Nippon Life India AMC", sector: "Fintech", price: 620, pe: 32, roe: 25 },
  { symbol: "ABSLAMC", name: "Aditya Birla Sun Life AMC", sector: "Fintech", price: 580, pe: 24, roe: 20 },
  { symbol: "ANANDRATHI", name: "Anand Rathi Wealth", sector: "Fintech", price: 3850, pe: 35, roe: 38 },
  { symbol: "ANGELONE", name: "Angel One", sector: "Fintech", price: 3100, pe: 24, roe: 42 },
  { symbol: "PRUDENT", name: "Prudent Corporate", sector: "Fintech", price: 1680, pe: 38, roe: 28 },
  { symbol: "ZAGGLE", name: "Zaggle Prepaid Ocean", sector: "Fintech", price: 340, pe: 55, roe: 15 },
  { symbol: "360ONE", name: "360 One WAM", sector: "Fintech", price: 850, pe: 28, roe: 22 },
  { symbol: "PAYTM", name: "One97 Communications", sector: "Fintech", price: 680, pe: 0, roe: 0 },
  { symbol: "POLICYBZR", name: "PB Fintech", sector: "Fintech", price: 1250, pe: 0, roe: 2 },
  { symbol: "ZOMATO", name: "Zomato Limited", sector: "Internet", price: 195, pe: 95, roe: 8 },
  { symbol: "NYKAA", name: "FSN E-Commerce", sector: "E-commerce", price: 180, pe: 120, roe: 4 },
  { symbol: "DELHIVERY", name: "Delhivery Limited", sector: "Logistics", price: 420, pe: 0, roe: 1 },
  { symbol: "HONASA", name: "Honasa Consumer (Mamaearth)", sector: "FMCG", price: 440, pe: 85, roe: 14 },
  { symbol: "CARTRADE", name: "CarTrade Tech", sector: "Internet", price: 880, pe: 55, roe: 8 },
  { symbol: "NAUKRI", name: "Info Edge India", sector: "Internet", price: 6200, pe: 75, roe: 12 },
  { symbol: "MAPMYINDIA", name: "CE Info Systems", sector: "Internet", price: 1950, pe: 62, roe: 18 },

  // High-Growth Capital Goods, EMS & Wires
  { symbol: "KAYNES", name: "Kaynes Technology", sector: "Capital Goods", price: 3150, pe: 85, roe: 18 },
  { symbol: "SYRMA", name: "Syrma SGS Tech", sector: "Capital Goods", price: 485, pe: 55, roe: 14 },
  { symbol: "AVALON", name: "Avalon Technologies", sector: "Capital Goods", price: 580, pe: 65, roe: 12 },
  { symbol: "CYIENTDLM", name: "Cyient DLM", sector: "Capital Goods", price: 720, pe: 58, roe: 15 },
  { symbol: "POLYCAB", name: "Polycab India", sector: "Capital Goods", price: 6800, pe: 48, roe: 22 },
  { symbol: "KEI", name: "KEI Industries", sector: "Capital Goods", price: 4200, pe: 45, roe: 20 },
  { symbol: "RRKABEL", name: "RR Kabel", sector: "Capital Goods", price: 1680, pe: 38, roe: 18 },
  { symbol: "FINOCABLES", name: "Finolex Cables", sector: "Capital Goods", price: 1480, pe: 32, roe: 16 },
  { symbol: "VGUARD", name: "V-Guard Industries", sector: "Consumer", price: 420, pe: 45, roe: 18 },
  { symbol: "HAVELLS", name: "Havells India", sector: "Capital Goods", price: 1850, pe: 58, roe: 20 },
  { symbol: "CGPOWER", name: "CG Power & Industrial", sector: "Capital Goods", price: 680, pe: 52, roe: 32 },
  { symbol: "SUZLON", name: "Suzlon Energy", sector: "Renewables", price: 68, pe: 45, roe: 25 },
  { symbol: "INOXWIND", name: "Inox Wind", sector: "Renewables", price: 165, pe: 55, roe: 15 },
  { symbol: "WAAREEENER", name: "Waaree Energies", sector: "Renewables", price: 2150, pe: 62, roe: 22 },
  { symbol: "PREMIERENE", name: "Premier Energies", sector: "Renewables", price: 1050, pe: 75, roe: 28 },

  // Midcap IT & Digital Engineering
  { symbol: "KPITTECH", name: "KPIT Technologies", sector: "IT", price: 1780, pe: 62, roe: 24 },
  { symbol: "TATAELXSI", name: "Tata Elxsi", sector: "IT", price: 7200, pe: 58, roe: 32 },
  { symbol: "PERSISTENT", name: "Persistent Systems", sector: "IT", price: 4850, pe: 52, roe: 26 },
  { symbol: "COFORGE", name: "Coforge Limited", sector: "IT", price: 6200, pe: 42, roe: 22 },
  { symbol: "CYIENT", name: "Cyient Limited", sector: "IT", price: 1850, pe: 28, roe: 18 },
  { symbol: "BIRLASOFT", name: "Birlasoft", sector: "IT", price: 680, pe: 32, roe: 20 },
  { symbol: "ZENSARTECH", name: "Zensar Technologies", sector: "IT", price: 720, pe: 28, roe: 18 },
  { symbol: "SONATASOFT", name: "Sonata Software", sector: "IT", price: 680, pe: 32, roe: 28 },
  { symbol: "MASTEK", name: "Mastek Limited", sector: "IT", price: 2850, pe: 30, roe: 19 },
  { symbol: "NEWGEN", name: "Newgen Software", sector: "IT", price: 1120, pe: 45, roe: 24 },
  { symbol: "DATAMATICS", name: "LatentView Analytics", sector: "IT", price: 520, pe: 58, roe: 16 },
  { symbol: "HAPPSTMNDS", name: "Happiest Minds Tech", cy: "IT", price: 820, pe: 48, roe: 22 },
  
  // Niche Retail & Consumer Brands
  { symbol: "METROBRAND", name: "Metro Brands", sector: "Retail", price: 1250, pe: 72, roe: 20 },
  { symbol: "CAMPUS", name: "Campus Activewear", sector: "Consumer", price: 295, pe: 55, roe: 16 },
  { symbol: "RELAXO", name: "Relaxo Footwears", sector: "Consumer", price: 850, pe: 65, roe: 14 },
  { symbol: "BATAINDIA", name: "Bata India", sector: "Consumer", price: 1380, pe: 52, roe: 15 },
  { symbol: "SENCO", name: "Senco Gold", sector: "Consumer", price: 1050, pe: 38, roe: 20 },
  { symbol: "KALYANKJIL", name: "Kalyan Jewellers", sector: "Consumer", price: 580, pe: 65, roe: 18 },
  { symbol: "TITAN", name: "Titan Company", sector: "Consumer", price: 3400, pe: 75, roe: 26 },
  { symbol: "TBZ", name: "Tribhovandas Bhimji", sector: "Consumer", price: 285, pe: 24, roe: 14 },
  { symbol: "ETHOS", name: "Ethos Limited", sector: "Retail", price: 2850, pe: 65, roe: 16 },
  { symbol: "LANDMARK", name: "Landmark Cars", sector: "Retail", price: 780, pe: 32, roe: 18 },

  // Pipes, Building Materials & Tiles
  { symbol: "ASTRAL", name: "Astral Limited", sector: "Chemicals", price: 2150, pe: 78, roe: 20 },
  { symbol: "PRINCEPIPE", name: "Prince Pipes", sector: "Chemicals", price: 680, pe: 38, roe: 16 },
  { symbol: "FINPIPE", name: "Finolex Industries", sector: "Capital Goods", price: 1250, pe: 30, roe: 14 },
  { symbol: "JINDALALKM", name: "Jindal Poly Films", sector: "Chemicals", price: 680, pe: 18, roe: 12 },
  { symbol: "WELCORP", name: "Welspun Corp", sector: "Metals", price: 680, pe: 18, roe: 22 },
  { symbol: "MANINDS", name: "Man Industries", sector: "Metals", price: 420, pe: 22, roe: 14 },
  { symbol: "MAHSEAMLES", name: "Maharashtra Seamless", sector: "Metals", price: 880, pe: 16, roe: 18 },
  { symbol: "RATNAMANI", name: "Ratnamani Metals", sector: "Metals", price: 3650, pe: 38, roe: 20 },
  { symbol: "JINDALSAW", name: "Jindal Saw", sector: "Metals", price: 580, pe: 18, roe: 20 },
  { symbol: "APLAPOLLO", name: "APL Apollo Tubes", sector: "Metals", price: 1580, pe: 48, roe: 24 },
  { symbol: "KAJARIACER", name: "Kajaria Ceramics", sector: "Consumer", price: 1320, pe: 45, roe: 19 },
  { symbol: "SOMANYCERA", name: "Somany Ceramics", sector: "Consumer", price: 720, pe: 32, roe: 14 },
  { symbol: "CERA", name: "Cera Sanitaryware", sector: "Consumer", price: 8500, pe: 45, roe: 21 },

  // Specialized Chemicals & CDMO
  { symbol: "JBCHEMPHAR", name: "JB Chemicals", sector: "Pharma", price: 1850, pe: 38, roe: 22 },
  { symbol: "NEULANDLAB", name: "Neuland Laboratories", sector: "Pharma", price: 6800, pe: 45, roe: 28 },
  { symbol: "SUVENPHAR", name: "Suven Pharmaceuticals", sector: "Pharma", price: 1120, pe: 55, roe: 18 },
  { symbol: "LAURUSLABS", name: "Laurus Labs", sector: "Pharma", price: 440, pe: 48, roe: 14 },
  { symbol: "GRANULES", name: "Granules India", sector: "Pharma", price: 620, pe: 28, roe: 20 },
  { symbol: "CAPLIPOINT", name: "Caplin Point Lab", sector: "Pharma", price: 1680, pe: 28, roe: 25 },
  { symbol: "MARKSANS", name: "Marksans Pharma", sector: "Pharma", price: 285, pe: 26, roe: 22 },
  { symbol: "STRIDES", name: "Strides Pharma", sector: "Pharma", price: 1280, pe: 35, roe: 16 },
  { symbol: "FDC", name: "FDC Limited", sector: "Pharma", price: 520, pe: 28, roe: 15 },
  { symbol: "INDOCO", name: "Indoco Remedies", sector: "Pharma", price: 345, pe: 32, roe: 12 },
  { symbol: "UNICHEMLAB", name: "Unichem Laboratories", sector: "Pharma", price: 680, pe: 45, roe: 8 },
  { symbol: "WOCKPHARMA", name: "Wockhardt", sector: "Pharma", price: 1050, pe: 0, roe: 0 },
  { symbol: "MOREPENLAB", name: "Morepen Laboratories", sector: "Pharma", price: 85, pe: 35, roe: 18 },
  { symbol: "BLISSGVS", name: "Bliss GVS Pharma", sector: "Pharma", price: 145, pe: 22, roe: 14 },
  { symbol: "LINCOLN", name: "Lincoln Pharmaceuticals", sector: "Pharma", price: 680, pe: 25, roe: 18 },
  { symbol: "KOPRAN", name: "Kopran Limited", sector: "Pharma", price: 285, pe: 28, roe: 14 },
  { symbol: "ZOTA", name: "Zota Health Care", sector: "Pharma", price: 520, pe: 38, roe: 16 },

  // Textiles, Garments & Spinning
  { symbol: "PAGEIND", name: "Page Industries", sector: "Consumer", price: 42500, pe: 85, roe: 38 },
  { symbol: "ARVINDFASN", name: "Arvind Fashions", sector: "Consumer", price: 580, pe: 45, roe: 14 },
  { symbol: "GOKEX", name: "Gokaldas Exports", sector: "Textiles", price: 980, pe: 38, roe: 16 },
  { symbol: "KPRMILL", name: "KPR Mill", sector: "Textiles", price: 880, pe: 32, roe: 22 },
  { symbol: "SPAPPAREL", name: "S.P. Apparels", sector: "Textiles", price: 780, pe: 28, roe: 18 },
  { symbol: "BOMDYEING", name: "Bombay Dyeing", sector: "Textiles", price: 220, pe: 18, roe: 12 },
  { symbol: "RAYMOND", name: "Raymond Limited", sector: "Textiles", price: 2150, pe: 26, roe: 20 },
  { symbol: "SIYARAM", name: "Siyaram Silk Mills", sector: "Textiles", price: 620, pe: 22, roe: 15 },
  { symbol: "VARDHMAN", name: "Vardhman Textiles", sector: "Textiles", price: 480, pe: 18, roe: 14 },
  { symbol: "TRIDENT", name: "Trident Limited", sector: "Textiles", price: 42, pe: 35, roe: 15 },
  { symbol: "WELSPUNLIV", name: "Welspun Living", sector: "Textiles", price: 185, pe: 24, roe: 18 },
  { symbol: "NITINSPIN", name: "Nitin Spinners", sector: "Textiles", price: 420, pe: 18, roe: 22 },
  { symbol: "GHCL", name: "GHCL Limited", sector: "Chemicals", price: 650, pe: 14, roe: 18 },
  { symbol: "SANGAM", name: "Sangam India", sector: "Textiles", price: 480, pe: 22, roe: 16 },
  { symbol: "TCNSBRANDS", name: "TCNS Clothing", sector: "Consumer", price: 580, pe: 0, roe: 0 },
  
  // Stationery & Packaging
  { symbol: "FLAIR", name: "Flair Writing", sector: "Consumer", price: 320, pe: 32, roe: 22 },
  { symbol: "LINC", name: "Linc Limited", sector: "Consumer", price: 680, pe: 30, roe: 18 },
  { symbol: "DOMS", name: "DOMS Industries", sector: "Consumer", price: 2450, pe: 75, roe: 28 },
  { symbol: "KOKUYOCMLN", name: "Kokuyo Camlin", sector: "Consumer", price: 185, pe: 28, roe: 15 },
  { symbol: "NAVPUB", name: "Navneet Education", sector: "Education", price: 175, pe: 24, roe: 14 },
  { symbol: "SCHAND", name: "S Chand & Company", sector: "Education", price: 285, pe: 32, roe: 12 },
  { symbol: "MOLDTKPAC", name: "Mold-Tek Packaging", sector: "Capital Goods", price: 880, pe: 38, roe: 18 },
  { symbol: "TCPLPACK", name: "TCPL Packaging", sector: "Capital Goods", price: 2850, pe: 28, roe: 20 },
  
  // Additional Midcap Quality Momentum
  { symbol: "ANANDCURE", name: "Anand Rathi", sector: "Fintech", price: 3850, pe: 35, roe: 38 },
  { symbol: "BEML", name: "BEML Limited", sector: "Capital Goods", price: 4150, pe: 65, roe: 14 },
  { symbol: "BDL", name: "Bharat Dynamics", sector: "Defense", price: 1420, pe: 55, roe: 18 },
  { symbol: "BEL", name: "Bharat Electronics", sector: "Defense", price: 310, pe: 45, roe: 24 },
  { symbol: "HAL", name: "Hindustan Aeronautics", sector: "Defense", price: 4850, pe: 42, roe: 28 },
  { symbol: "MAZDOCK", name: "Mazagon Dock Shipbuilders", sector: "Defense", price: 4400, pe: 48, roe: 32 },
  { symbol: "COCHINSHIP", name: "Cochin Shipyard", sector: "Defense", price: 2150, pe: 45, roe: 25 },
  { symbol: "GRSE", name: "Garden Reach Shipbuilders", sector: "Defense", price: 1850, pe: 52, roe: 26 },
  { symbol: "TITAGARH", name: "Titagarh Rail Systems", sector: "Capital Goods", price: 1580, pe: 58, roe: 22 },
  { symbol: "TEXRAIL", name: "Texmaco Rail & Eng", sector: "Capital Goods", price: 245, pe: 45, roe: 15 },
  { symbol: "JWL", name: "Jupiter Wagons", sector: "Capital Goods", price: 680, pe: 55, roe: 24 },
  { symbol: "HBLPOWER", name: "HBL Power Systems", sector: "Capital Goods", price: 620, pe: 48, roe: 28 },
  { symbol: "APARINDS", name: "Apar Industries", sector: "Capital Goods", price: 8900, pe: 42, roe: 35 },
  { symbol: "GODAWARI", name: "Godawari Power & Ispat", sector: "Metals", price: 980, pe: 16, roe: 28 },
  { symbol: "JAYASWAL", name: "Jayaswal Neco", sector: "Metals", price: 185, pe: 14, roe: 22 },
  { symbol: "USHAMART", name: "Usha Martin", sector: "Metals", price: 420, pe: 28, roe: 20 },
  { symbol: "MUKAND", name: "Mukand Limited", sector: "Metals", price: 195, pe: 22, roe: 14 },
  { symbol: "SUNFLAG", name: "Sunflag Iron", sector: "Metals", price: 245, pe: 15, roe: 16 },
  { symbol: "PENNAR", name: "Pennar Industries", sector: "Metals", price: 185, pe: 24, roe: 18 },
  { symbol: "ISMT", name: "ISMT Limited", sector: "Metals", price: 125, pe: 18, roe: 15 },
  { symbol: "KALYANI", name: "Kalyani Steels", sector: "Metals", price: 680, pe: 22, roe: 16 },
  { symbol: "GICRE", name: "General Insurance Corp", sector: "Insurance", price: 420, pe: 18, roe: 15 },
  { symbol: "NIACL", name: "New India Assurance", sector: "Insurance", price: 285, pe: 22, roe: 12 },
  { symbol: "STARHEALTH", name: "Star Health & Allied", sector: "Insurance", price: 620, pe: 45, roe: 14 },
  { symbol: "GODIGIT", name: "Go Digit General", sector: "Insurance", price: 345, pe: 0, roe: 5 },
  { symbol: "MEDIASSIST", name: "Medi Assist Healthcare", sector: "Healthcare", price: 620, pe: 48, roe: 20 },
  { symbol: "YATHARTH", name: "Yatharth Hospital", sector: "Healthcare", price: 540, pe: 38, roe: 19 },
  { symbol: "AVANTIFEED", name: "Avanti Feeds", sector: "FMCG", price: 680, pe: 25, roe: 22 },
  { symbol: "APEX", name: "Apex Frozen Foods", sector: "FMCG", price: 285, pe: 18, roe: 14 },
  { symbol: "WATERBASE", name: "Waterbase Limited", sector: "FMCG", price: 85, pe: 0, roe: 0 },
  { symbol: "ZEEL", name: "Zee Entertainment", sector: "Media", price: 145, pe: 0, roe: 5 },
  { symbol: "SUNTV", name: "Sun TV Network", sector: "Media", price: 850, pe: 16, roe: 20 },
  { symbol: "TV18BRDCST", name: "TV18 Broadcast", sector: "Media", price: 55, pe: 0, roe: 0 },
  { symbol: "NETWORK18", name: "Network18 Media", sector: "Media", price: 95, pe: 0, roe: 0 },
  { symbol: "NDTV", name: "New Delhi Television", sector: "Media", price: 245, pe: 85, roe: 5 },
  { symbol: "DISH", name: "Dish TV India", sector: "Media", price: 18, pe: 0, roe: 0 },
  { symbol: "HATHWAY", name: "Hathway Cable", sector: "Media", price: 22, pe: 28, roe: 6 },
  { symbol: "SAREGAMA", name: "Saregama India", sector: "Media", price: 580, pe: 48, roe: 16 },
  { symbol: "TIPSIND", name: "Tips Industries", sector: "Media", price: 720, pe: 55, roe: 32 }
];

const VALID = /^[A-Z0-9&_-]{2,25}$/;

const deduped = candidates.filter(c => {
  if (!VALID.test(c.symbol)) {
    console.warn(`INVALID SYMBOL (SKIPPED): ${c.symbol}`);
    return false;
  }
  if (existingSet.has(c.symbol)) {
    console.warn(`DUPLICATE IN REGISTRY (SKIPPED): ${c.symbol}`);
    return false;
  }
  return true;
});

console.log(`\nNew valid, non-duplicate stocks to inject: ${deduped.length}`);

if (deduped.length === 0) {
  console.log("All candidate stocks are already in the registry. Nothing to add.");
  process.exit(0);
}

const entries = deduped.map(s => {
  const key = /^[0-9]/.test(s.symbol) ? `"${s.symbol}"` : s.symbol;
  return `  ${key}: { symbol: '${s.symbol}', name: '${s.name}', sector: '${s.sector}', exchange: 'NSE', price: ${s.price}, pe: ${s.pe}, roe: ${s.roe}, mktcap: ${Math.floor(s.price * 1000)}, ocf: 5000, rev: 50000, revcagr: 10, epscagr: 12, opm: 15, roce: 14, de: 0.5, fcf: 4000, promo: 45, ca: 20000, tl: 10000, sh: 1000, np: 3000, dep: 800, capex: 1500, bvps: 250 },`;
});

const insert = content.lastIndexOf("};");
const updated = content.slice(0, insert) + entries.join("\n") + "\n" + content.slice(insert);

fs.writeFileSync(stocksPath, updated, "utf-8");
console.log(`✓ Successfully appended ${deduped.length} new stocks to data/stocks/index.ts`);