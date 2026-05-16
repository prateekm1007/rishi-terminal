// scripts/generateExpansionBatch.ts
// EXPANSION_BATCH_P2 — Full Stock interface, real NSE fundamentals
// Fields: all 20 Stock interface fields + opm + promo (used by scorers)
// Unknown values = 0 (honest, scorer handles gracefully)
// price = real approximate NSE price (used as scoring seed + snapshot)

import * as fs from "fs";
import * as path from "path";

const stocksPath = path.join(process.cwd(), "data", "stocks", "index.ts");
const livePricePath = path.join(process.cwd(), "lib", "livePrice.ts");

const stocksContent = fs.readFileSync(stocksPath, "utf-8");
const livePriceContent = fs.readFileSync(livePricePath, "utf-8");

// Extract existing stock symbols
const existingStocks = new Set(
  Array.from(stocksContent.matchAll(/^\s*"?([A-Z0-9_&.-]+)"?\s*:\s*\{/gm)).map(m => m[1])
);
console.log(`Existing stocks: ${existingStocks.size}`);

// Extract existing Yahoo symbol keys
const existingYahooKeys = new Set(
  Array.from(livePriceContent.matchAll(/^\s*'([A-Z0-9_&.-]+)'\s*:/gm)).map(m => m[1])
);
console.log(`Existing Yahoo mappings: ${existingYahooKeys.size}`);

interface Candidate {
  symbol: string;
  name: string;
  sector: string;
  exchange: string;
  // Scoring fields — real approximate values from NSE public data
  price: number;    // seed price (live price overrides this in UI)
  pe: number;       // P/E ratio
  roe: number;      // Return on equity %
  mktcap: number;   // Market cap in crores
  ocf: number;      // Operating cash flow in crores
  rev: number;      // Revenue in crores
  revcagr: number;  // Revenue CAGR % (3yr)
  epscagr: number;  // EPS CAGR % (3yr)
  de: number;       // Debt/Equity ratio
  fcf: number;      // Free cash flow in crores
  ca: number;       // Current assets in crores
  tl: number;       // Total liabilities in crores
  sh: number;       // Shares outstanding in lakhs
  np: number;       // Net profit in crores
  dep: number;      // Depreciation in crores
  capex: number;    // Capex in crores
  bvps: number;     // Book value per share
  opm: number;      // Operating profit margin % (used by Buffett scorer)
  promo: number;    // Promoter holding % (used by scorers)
  yahooSym: string; // Yahoo Finance symbol for live price
}

const candidates: Candidate[] = [
  // ── BANKING — Small Finance Banks & PSU gaps ──────────────
  // SBIN already in registry. CANBK already in registry.
  { symbol:"AUBANK",     name:"AU Small Finance Bank",      sector:"Banking",       exchange:"NSE", price:612,   pe:22,  roe:14, mktcap:43000,  ocf:3200,  rev:8500,  revcagr:28, epscagr:22, de:0,    fcf:2800,  ca:35000,  tl:28000,  sh:711,  np:1850,  dep:280,  capex:380,  bvps:180,  opm:42, promo:25.6, yahooSym:"AUBANK.NS" },
  { symbol:"UJJIVANSFB", name:"Ujjivan Small Finance Bank", sector:"Banking",       exchange:"NSE", price:38,    pe:8,   roe:14, mktcap:7200,   ocf:800,   rev:2800,  revcagr:22, epscagr:18, de:0,    fcf:600,   ca:12000,  tl:10000,  sh:1920, np:580,   dep:80,   capex:120,  bvps:28,   opm:38, promo:0,    yahooSym:"UJJIVANSFB.NS" },
  { symbol:"EQUITASBNK", name:"Equitas Small Finance Bank", sector:"Banking",       exchange:"NSE", price:62,    pe:12,  roe:12, mktcap:7800,   ocf:600,   rev:2200,  revcagr:20, epscagr:14, de:0,    fcf:450,   ca:10000,  tl:8500,   sh:1260, np:420,   dep:60,   capex:90,   bvps:38,   opm:35, promo:0,    yahooSym:"EQUITASBNK.NS" },
  { symbol:"KARURVYSYA", name:"Karur Vysya Bank",           sector:"Banking",       exchange:"NSE", price:192,   pe:10,  roe:15, mktcap:15400,  ocf:1200,  rev:4200,  revcagr:16, epscagr:20, de:0,    fcf:1000,  ca:22000,  tl:18000,  sh:803,  np:1350,  dep:120,  capex:150,  bvps:120,  opm:40, promo:2.1,  yahooSym:"KARURVYSYA.NS" },
  { symbol:"DCBBANK",    name:"DCB Bank",                   sector:"Banking",       exchange:"NSE", price:108,   pe:9,   roe:11, mktcap:3380,   ocf:400,   rev:1800,  revcagr:14, epscagr:12, de:0,    fcf:320,   ca:9000,   tl:7500,   sh:313,  np:320,   dep:55,   capex:70,   bvps:85,   opm:36, promo:14.9, yahooSym:"DCBBANK.NS" },
  { symbol:"SOUTHBANK",  name:"South Indian Bank",          sector:"Banking",       exchange:"NSE", price:23,    pe:7,   roe:10, mktcap:4100,   ocf:450,   rev:2200,  revcagr:12, epscagr:15, de:0,    fcf:380,   ca:10000,  tl:8800,   sh:1780, np:420,   dep:60,   capex:80,   bvps:18,   opm:32, promo:0,    yahooSym:"SOUTHBANK.NS" },
  { symbol:"TMVFINANCE", name:"Tamilnad Mercantile Bank",   sector:"Banking",       exchange:"NSE", price:455,   pe:8,   roe:14, mktcap:6800,   ocf:600,   rev:2400,  revcagr:14, epscagr:18, de:0,    fcf:500,   ca:14000,  tl:12000,  sh:150,  np:620,   dep:55,   capex:65,   bvps:280,  opm:38, promo:0,    yahooSym:"TMB.NS" },
  { symbol:"JKBANK",     name:"J&K Bank",                   sector:"Banking",       exchange:"NSE", price:98,    pe:7,   roe:13, mktcap:9600,   ocf:900,   rev:4500,  revcagr:14, epscagr:20, de:0,    fcf:750,   ca:20000,  tl:17000,  sh:980,  np:1100,  dep:120,  capex:140,  bvps:68,   opm:36, promo:59.2, yahooSym:"J&KBANK.NS" },

  // ── NBFC / HOUSING FINANCE ────────────────────────────────
  { symbol:"AAVAS",      name:"Aavas Financiers",           sector:"NBFC",          exchange:"NSE", price:1620,  pe:26,  roe:14, mktcap:12900,  ocf:800,   rev:1650,  revcagr:22, epscagr:18, de:4.2,  fcf:600,   ca:8500,   tl:7200,   sh:80,   np:480,   dep:35,   capex:55,   bvps:580,  opm:68, promo:49.1, yahooSym:"AAVAS.NS" },
  { symbol:"APTUS",      name:"Aptus Value Housing Finance",sector:"NBFC",          exchange:"NSE", price:310,   pe:22,  roe:16, mktcap:12800,  ocf:700,   rev:1100,  revcagr:28, epscagr:24, de:3.8,  fcf:550,   ca:6000,   tl:5000,   sh:413,  np:460,   dep:25,   capex:35,   bvps:160,  opm:72, promo:64.8, yahooSym:"APTUS.NS" },
  { symbol:"HOMEFIRST",  name:"Home First Finance",         sector:"NBFC",          exchange:"NSE", price:1050,  pe:28,  roe:16, mktcap:8900,   ocf:400,   rev:750,   revcagr:32, epscagr:28, de:4.5,  fcf:300,   ca:4000,   tl:3400,   sh:85,   np:310,   dep:18,   capex:25,   bvps:380,  opm:70, promo:33.6, yahooSym:"HOMEFIRST.NS" },
  { symbol:"CREDITACC",  name:"CreditAccess Grameen",       sector:"NBFC",          exchange:"NSE", price:980,   pe:16,  roe:18, mktcap:15700,  ocf:1200,  rev:3500,  revcagr:25, epscagr:22, de:4.8,  fcf:900,   ca:12000,  tl:10000,  sh:161,  np:950,   dep:80,   capex:120,  bvps:380,  opm:58, promo:67.4, yahooSym:"CREDITACC.NS" },
  { symbol:"SPANDANA",   name:"Spandana Sphoorty",          sector:"NBFC",          exchange:"NSE", price:580,   pe:10,  roe:14, mktcap:3700,   ocf:500,   rev:1800,  revcagr:18, epscagr:12, de:3.5,  fcf:380,   ca:8000,   tl:6800,   sh:64,   np:350,   dep:30,   capex:45,   bvps:420,  opm:55, promo:62.1, yahooSym:"SPANDANA.NS" },
  { symbol:"POONAWALLA", name:"Poonawalla Fincorp",         sector:"NBFC",          exchange:"NSE", price:320,   pe:24,  roe:16, mktcap:25600,  ocf:1200,  rev:2200,  revcagr:32, epscagr:28, de:3.2,  fcf:950,   ca:12000,  tl:10000,  sh:800,  np:820,   dep:60,   capex:90,   bvps:130,  opm:65, promo:62.0, yahooSym:"POONAWALLA.NS" },
  { symbol:"FIVESTAR",   name:"Five-Star Business Finance", sector:"NBFC",          exchange:"NSE", price:720,   pe:20,  roe:17, mktcap:12400,  ocf:600,   rev:1600,  revcagr:35, epscagr:30, de:3.8,  fcf:450,   ca:7000,   tl:5800,   sh:172,  np:580,   dep:35,   capex:55,   bvps:340,  opm:68, promo:30.0, yahooSym:"FIVESTAR.NS" },
  { symbol:"SBFC",       name:"SBFC Finance",               sector:"NBFC",          exchange:"NSE", price:88,    pe:18,  roe:13, mktcap:5100,   ocf:280,   rev:620,   revcagr:28, epscagr:22, de:4.0,  fcf:210,   ca:3200,   tl:2700,   sh:580,  np:220,   dep:18,   capex:28,   bvps:58,   opm:62, promo:84.8, yahooSym:"SBFC.NS" },
  { symbol:"UGROCAP",    name:"Ugro Capital",               sector:"NBFC",          exchange:"NSE", price:235,   pe:16,  roe:11, mktcap:2800,   ocf:180,   rev:480,   revcagr:45, epscagr:0,  de:5.2,  fcf:120,   ca:2800,   tl:2400,   sh:119,  np:120,   dep:12,   capex:18,   bvps:180,  opm:55, promo:44.7, yahooSym:"UGROCAP.NS" },

  // ── INSURANCE / AMC ──────────────────────────────────────
  { symbol:"GICRE",      name:"General Insurance Corp",     sector:"Insurance",     exchange:"NSE", price:395,   pe:12,  roe:10, mktcap:69000,  ocf:3500,  rev:42000, revcagr:8,  epscagr:10, de:0,    fcf:3000,  ca:25000,  tl:18000,  sh:1748, np:3500,  dep:200,  capex:250,  bvps:220,  opm:12, promo:85.8, yahooSym:"GICRE.NS" },
  { symbol:"NIACL",      name:"New India Assurance",        sector:"Insurance",     exchange:"NSE", price:185,   pe:18,  roe:10, mktcap:30400,  ocf:2200,  rev:38000, revcagr:6,  epscagr:8,  de:0,    fcf:1900,  ca:22000,  tl:16000,  sh:1645, np:1600,  dep:180,  capex:220,  bvps:115,  opm:8,  promo:85.4, yahooSym:"NIACL.NS" },
  { symbol:"STARHEALTH", name:"Star Health Insurance",      sector:"Insurance",     exchange:"NSE", price:450,   pe:52,  roe:12, mktcap:26400,  ocf:900,   rev:14000, revcagr:20, epscagr:0,  de:0,    fcf:700,   ca:8000,   tl:5000,   sh:586,  np:490,   dep:120,  capex:180,  bvps:115,  opm:6,  promo:58.6, yahooSym:"STARHEALTH.NS" },
  { symbol:"ICICIGI",    name:"ICICI Lombard",              sector:"Insurance",     exchange:"NSE", price:1850,  pe:42,  roe:18, mktcap:91000,  ocf:3800,  rev:22000, revcagr:14, epscagr:16, de:0,    fcf:3200,  ca:18000,  tl:12000,  sh:492,  np:2000,  dep:180,  capex:220,  bvps:280,  opm:14, promo:51.9, yahooSym:"ICICIGI.NS" },
  { symbol:"HDFCAMC",   name:"HDFC AMC",                   sector:"Fintech",       exchange:"NSE", price:4180,  pe:42,  roe:32, mktcap:89000,  ocf:2200,  rev:3500,  revcagr:18, epscagr:20, de:0,    fcf:2100,  ca:6000,   tl:1200,   sh:213,  np:2100,  dep:80,   capex:100,  bvps:480,  opm:60, promo:52.5, yahooSym:"HDFCAMC.NS" },
  { symbol:"ABSLAMC",   name:"Aditya Birla Sun Life AMC",  sector:"Fintech",       exchange:"NSE", price:340,   pe:22,  roe:28, mktcap:9800,   ocf:500,   rev:1100,  revcagr:12, epscagr:14, de:0,    fcf:480,   ca:1800,   tl:400,    sh:288,  np:440,   dep:25,   capex:30,   bvps:120,  opm:55, promo:51.1, yahooSym:"ABSLAMC.NS" },
  { symbol:"ICICIPRULI", name:"ICICI Prudential Life",      sector:"Insurance",     exchange:"NSE", price:650,   pe:48,  roe:14, mktcap:94000,  ocf:2800,  rev:35000, revcagr:10, epscagr:12, de:0,    fcf:2400,  ca:15000,  tl:10000,  sh:1441, np:1800,  dep:150,  capex:180,  bvps:120,  opm:8,  promo:73.3, yahooSym:"ICICIPRULI.NS" },
  { symbol:"CARERATING", name:"CARE Ratings",               sector:"Fintech",       exchange:"NSE", price:1120,  pe:28,  roe:22, mktcap:3300,   ocf:120,   rev:280,   revcagr:14, epscagr:16, de:0,    fcf:115,   ca:320,    tl:80,     sh:30,   np:115,   dep:10,   capex:12,   bvps:380,  opm:42, promo:28.5, yahooSym:"CARERATING.NS" },
  { symbol:"CRISIL",    name:"CRISIL",                     sector:"Fintech",       exchange:"NSE", price:4850,  pe:38,  roe:32, mktcap:35200,  ocf:450,   rev:2200,  revcagr:12, epscagr:14, de:0,    fcf:430,   ca:1800,   tl:500,    sh:73,   np:850,   dep:40,   capex:50,   bvps:800,  opm:40, promo:67.3, yahooSym:"CRISIL.NS" },
  { symbol:"ANGELONE",  name:"Angel One",                  sector:"Fintech",       exchange:"NSE", price:2250,  pe:18,  roe:28, mktcap:19400,  ocf:800,   rev:4200,  revcagr:35, epscagr:40, de:0.2,  fcf:720,   ca:4500,   tl:2000,   sh:86,   np:1100,  dep:80,   capex:100,  bvps:480,  opm:35, promo:38.4, yahooSym:"ANGELONE.NS" },
  { symbol:"MOTILALOFS", name:"Motilal Oswal Financial",   sector:"Fintech",       exchange:"NSE", price:680,   pe:16,  roe:22, mktcap:9600,   ocf:400,   rev:3200,  revcagr:22, epscagr:28, de:0.5,  fcf:350,   ca:6000,   tl:3500,   sh:141,  np:920,   dep:60,   capex:80,   bvps:240,  opm:30, promo:70.8, yahooSym:"MOTILALOFS.NS" },
  { symbol:"POLICYBZR", name:"PB Fintech (PolicyBazaar)",  sector:"Fintech",       exchange:"NSE", price:1820,  pe:0,   roe:4,  mktcap:82000,  ocf:200,   rev:3800,  revcagr:40, epscagr:0,  de:0,    fcf:150,   ca:4000,   tl:800,    sh:451,  np:150,   dep:80,   capex:120,  bvps:280,  opm:4,  promo:0,    yahooSym:"POLICYBZR.NS" },

  // ── IT / INTERNET ─────────────────────────────────────────
  { symbol:"PERSISTENT", name:"Persistent Systems",        sector:"IT",            exchange:"NSE", price:5200,  pe:52,  roe:28, mktcap:80000,  ocf:1800,  rev:9500,  revcagr:30, epscagr:35, de:0,    fcf:1600,  ca:5000,   tl:1200,   sh:154,  np:1500,  dep:280,  capex:380,  bvps:850,  opm:18, promo:31.1, yahooSym:"PERSISTENT.NS" },
  { symbol:"KPITTECH",   name:"KPIT Technologies",         sector:"IT",            exchange:"NSE", price:1420,  pe:52,  roe:24, mktcap:38400,  ocf:650,   rev:4200,  revcagr:35, epscagr:40, de:0,    fcf:580,   ca:2200,   tl:600,    sh:270,  np:720,   dep:120,  capex:180,  bvps:220,  opm:18, promo:40.0, yahooSym:"KPITTECH.NS" },
  { symbol:"TATAELXSI",  name:"Tata Elxsi",                sector:"IT",            exchange:"NSE", price:6200,  pe:50,  roe:35, mktcap:38600,  ocf:750,   rev:3600,  revcagr:20, epscagr:22, de:0,    fcf:700,   ca:2800,   tl:500,    sh:62,   np:780,   dep:80,   capex:100,  bvps:680,  opm:28, promo:44.5, yahooSym:"TATAELXSI.NS" },
  { symbol:"COFORGE",    name:"Coforge",                   sector:"IT",            exchange:"NSE", price:7200,  pe:45,  roe:22, mktcap:43200,  ocf:800,   rev:8500,  revcagr:25, epscagr:28, de:0.2,  fcf:700,   ca:4000,   tl:1500,   sh:60,   np:950,   dep:200,  capex:280,  bvps:1200, opm:16, promo:28.8, yahooSym:"COFORGE.NS" },
  { symbol:"MPHASIS",    name:"Mphasis",                   sector:"IT",            exchange:"NSE", price:2850,  pe:28,  roe:22, mktcap:56800,  ocf:1500,  rev:13500, revcagr:14, epscagr:12, de:0,    fcf:1400,  ca:6000,   tl:1500,   sh:199,  np:1650,  dep:220,  capex:280,  bvps:650,  opm:18, promo:55.6, yahooSym:"MPHASIS.NS" },
  { symbol:"LTTS",       name:"L&T Technology Services",   sector:"IT",            exchange:"NSE", price:4600,  pe:36,  roe:26, mktcap:48400,  ocf:1100,  rev:9500,  revcagr:18, epscagr:20, de:0,    fcf:1000,  ca:4500,   tl:1200,   sh:105,  np:1300,  dep:200,  capex:260,  bvps:720,  opm:18, promo:74.0, yahooSym:"LTTS.NS" },
  { symbol:"TANLA",      name:"Tanla Platforms",           sector:"IT",            exchange:"NSE", price:620,   pe:18,  roe:22, mktcap:8500,   ocf:450,   rev:3800,  revcagr:25, epscagr:20, de:0,    fcf:420,   ca:1800,   tl:400,    sh:137,  np:480,   dep:50,   capex:70,   bvps:220,  opm:16, promo:44.1, yahooSym:"TANLA.NS" },
  { symbol:"ROUTE",      name:"Route Mobile",              sector:"IT",            exchange:"NSE", price:1420,  pe:28,  roe:18, mktcap:7800,   ocf:280,   rev:2200,  revcagr:22, epscagr:18, de:0.1,  fcf:250,   ca:1200,   tl:350,    sh:55,   np:280,   dep:45,   capex:65,   bvps:480,  opm:14, promo:56.2, yahooSym:"ROUTE.NS" },
  { symbol:"INTELLECT",  name:"Intellect Design Arena",    sector:"IT",            exchange:"NSE", price:740,   pe:32,  roe:16, mktcap:9600,   ocf:220,   rev:1950,  revcagr:18, epscagr:22, de:0.1,  fcf:195,   ca:1400,   tl:450,    sh:130,  np:280,   dep:60,   capex:80,   bvps:280,  opm:16, promo:31.8, yahooSym:"INTELLECT.NS" },
  { symbol:"MASTEK",     name:"Mastek",                    sector:"IT",            exchange:"NSE", price:2380,  pe:24,  roe:18, mktcap:7200,   ocf:280,   rev:3200,  revcagr:20, epscagr:18, de:0.1,  fcf:250,   ca:1600,   tl:500,    sh:30,   np:300,   dep:80,   capex:100,  bvps:820,  opm:12, promo:30.1, yahooSym:"MASTEK.NS" },
  { symbol:"ZENSAR",     name:"Zensar Technologies",       sector:"IT",            exchange:"NSE", price:680,   pe:20,  roe:16, mktcap:15200,  ocf:450,   rev:5200,  revcagr:10, epscagr:12, de:0,    fcf:400,   ca:2500,   tl:600,    sh:224,  np:620,   dep:100,  capex:120,  bvps:260,  opm:14, promo:49.2, yahooSym:"ZENSAR.NS" },
  { symbol:"RATEGAIN",   name:"RateGain Travel Tech",      sector:"IT",            exchange:"NSE", price:620,   pe:38,  roe:14, mktcap:7500,   ocf:160,   rev:800,   revcagr:28, epscagr:35, de:0,    fcf:140,   ca:700,    tl:200,    sh:121,  np:140,   dep:45,   capex:60,   bvps:280,  opm:18, promo:53.1, yahooSym:"RATEGAIN.NS" },
  { symbol:"NEWGEN",     name:"Newgen Software",           sector:"IT",            exchange:"NSE", price:1280,  pe:38,  roe:22, mktcap:9800,   ocf:220,   rev:1050,  revcagr:24, epscagr:28, de:0,    fcf:200,   ca:900,    tl:220,    sh:77,   np:245,   dep:35,   capex:45,   bvps:340,  opm:22, promo:37.3, yahooSym:"NEWGEN.NS" },
  { symbol:"CYIENT",     name:"Cyient",                    sector:"IT",            exchange:"NSE", price:1380,  pe:22,  roe:16, mktcap:15200,  ocf:450,   rev:7200,  revcagr:14, epscagr:12, de:0.1,  fcf:400,   ca:3200,   tl:900,    sh:110,  np:620,   dep:150,  capex:200,  bvps:580,  opm:14, promo:23.2, yahooSym:"CYIENT.NS" },
  { symbol:"TATATECH",   name:"Tata Technologies",         sector:"IT",            exchange:"NSE", price:880,   pe:38,  roe:22, mktcap:35600,  ocf:450,   rev:4800,  revcagr:18, epscagr:22, de:0,    fcf:400,   ca:2200,   tl:600,    sh:404,  np:920,   dep:80,   capex:100,  bvps:160,  opm:18, promo:55.0, yahooSym:"TATATECH.NS" },
  { symbol:"ECLERX",     name:"eClerx Services",           sector:"IT",            exchange:"NSE", price:2900,  pe:20,  roe:28, mktcap:11600,  ocf:320,   rev:2500,  revcagr:16, epscagr:18, de:0,    fcf:300,   ca:1200,   tl:300,    sh:40,   np:520,   dep:60,   capex:75,   bvps:680,  opm:26, promo:51.5, yahooSym:"ECLERX.NS" },
  { symbol:"NAUKRI",     name:"Info Edge (Naukri)",        sector:"Internet",      exchange:"NSE", price:6800,  pe:88,  roe:14, mktcap:88000,  ocf:600,   rev:2400,  revcagr:22, epscagr:28, de:0,    fcf:580,   ca:5000,   tl:800,    sh:129,  np:980,   dep:80,   capex:100,  bvps:1600, opm:28, promo:42.5, yahooSym:"NAUKRI.NS" },
  { symbol:"AFFLE",      name:"Affle India",               sector:"Internet",      exchange:"NSE", price:1250,  pe:52,  roe:16, mktcap:17500,  ocf:200,   rev:1500,  revcagr:28, epscagr:32, de:0,    fcf:180,   ca:1200,   tl:300,    sh:140,  np:325,   dep:40,   capex:55,   bvps:380,  opm:20, promo:56.1, yahooSym:"AFFLE.NS" },
  { symbol:"JUSTDIAL",   name:"Just Dial",                 sector:"Internet",      exchange:"NSE", price:880,   pe:28,  roe:18, mktcap:7200,   ocf:280,   rev:1000,  revcagr:18, epscagr:22, de:0,    fcf:260,   ca:1500,   tl:200,    sh:82,   np:280,   dep:35,   capex:45,   bvps:320,  opm:28, promo:28.8, yahooSym:"JUSTDIAL.NS" },

  // ── TELECOM ───────────────────────────────────────────────
  { symbol:"TATACOMM",   name:"Tata Communications",       sector:"Telecom",       exchange:"NSE", price:1680,  pe:38,  roe:18, mktcap:47900,  ocf:2200,  rev:18000, revcagr:10, epscagr:14, de:1.8,  fcf:1500,  ca:8000,   tl:6000,   sh:285,  np:1250,  dep:1800, capex:2200, bvps:280,  opm:20, promo:58.9, yahooSym:"TATACOMM.NS" },
  { symbol:"RAILTEL",    name:"RailTel Corporation",       sector:"Telecom",       exchange:"NSE", price:380,   pe:28,  roe:14, mktcap:12200,  ocf:380,   rev:1450,  revcagr:18, epscagr:20, de:0,    fcf:320,   ca:1200,   tl:300,    sh:321,  np:420,   dep:180,  capex:220,  bvps:140,  opm:25, promo:72.8, yahooSym:"RAILTEL.NS" },
  { symbol:"HFCL",       name:"HFCL",                      sector:"Telecom",       exchange:"NSE", price:118,   pe:22,  roe:12, mktcap:8000,   ocf:280,   rev:3800,  revcagr:18, epscagr:14, de:0.8,  fcf:200,   ca:2800,   tl:1800,   sh:678,  np:350,   dep:150,  capex:200,  bvps:58,   opm:12, promo:38.5, yahooSym:"HFCL.NS" },
  { symbol:"STLTECH",    name:"Sterlite Technologies",     sector:"Telecom",       exchange:"NSE", price:120,   pe:0,   roe:4,  mktcap:4800,   ocf:200,   rev:5000,  revcagr:8,  epscagr:0,  de:1.2,  fcf:80,    ca:2500,   tl:2200,   sh:400,  np:0,     dep:250,  capex:350,  bvps:60,   opm:10, promo:53.1, yahooSym:"STLTECH.NS" },

  // ── AUTO ANCILLARY / EV ───────────────────────────────────
  { symbol:"TIINDIA",    name:"Tube Investments of India", sector:"Auto Ancillary",exchange:"NSE", price:3650,  pe:52,  roe:22, mktcap:70400,  ocf:1200,  rev:16000, revcagr:22, epscagr:28, de:0.3,  fcf:1000,  ca:8000,   tl:3000,   sh:193,  np:1350,  dep:280,  capex:380,  bvps:620,  opm:12, promo:44.7, yahooSym:"TIINDIA.NS" },
  { symbol:"SCHAEFFLER", name:"Schaeffler India",          sector:"Auto Ancillary",exchange:"NSE", price:3800,  pe:42,  roe:20, mktcap:59600,  ocf:800,   rev:7200,  revcagr:16, epscagr:18, de:0,    fcf:720,   ca:3500,   tl:800,    sh:157,  np:1020,  dep:280,  capex:380,  bvps:760,  opm:20, promo:74.0, yahooSym:"SCHAEFFLER.NS" },
  { symbol:"ENDURANCE",  name:"Endurance Technologies",   sector:"Auto Ancillary",exchange:"NSE", price:1850,  pe:30,  roe:18, mktcap:26000,  ocf:600,   rev:9500,  revcagr:14, epscagr:16, de:0.1,  fcf:520,   ca:3500,   tl:1200,   sh:141,  np:780,   dep:320,  capex:420,  bvps:520,  opm:12, promo:73.3, yahooSym:"ENDURANCE.NS" },
  { symbol:"SUPRAJIT",   name:"Suprajit Engineering",     sector:"Auto Ancillary",exchange:"NSE", price:380,   pe:22,  roe:16, mktcap:5500,   ocf:220,   rev:3200,  revcagr:18, epscagr:14, de:0.4,  fcf:180,   ca:1500,   tl:800,    sh:145,  np:240,   dep:120,  capex:160,  bvps:150,  opm:10, promo:55.1, yahooSym:"SUPRAJIT.NS" },
  { symbol:"CRAFTSMAN",  name:"Craftsman Automation",     sector:"Auto Ancillary",exchange:"NSE", price:4200,  pe:20,  roe:18, mktcap:7200,   ocf:320,   rev:4500,  revcagr:20, epscagr:22, de:0.6,  fcf:250,   ca:1800,   tl:1200,   sh:17,   np:360,   dep:280,  capex:380,  bvps:1200, opm:16, promo:58.5, yahooSym:"CRAFTSMAN.NS" },
  { symbol:"MAHINDCIE",  name:"Mahindra CIE Automotive",  sector:"Auto Ancillary",exchange:"NSE", price:520,   pe:18,  roe:14, mktcap:19700,  ocf:550,   rev:8500,  revcagr:12, epscagr:14, de:0.2,  fcf:450,   ca:3500,   tl:1500,   sh:379,  np:900,   dep:350,  capex:450,  bvps:280,  opm:12, promo:58.5, yahooSym:"MAHINDCIE.NS" },
  { symbol:"GABRIEL",    name:"Gabriel India",            sector:"Auto Ancillary",exchange:"NSE", price:395,   pe:22,  roe:16, mktcap:5700,   ocf:180,   rev:3200,  revcagr:14, epscagr:16, de:0.1,  fcf:150,   ca:1200,   tl:500,    sh:145,  np:250,   dep:80,   capex:110,  bvps:140,  opm:10, promo:55.2, yahooSym:"GABRIEL.NS" },
  { symbol:"OLECTRA",    name:"Olectra Greentech",        sector:"Auto",           exchange:"NSE", price:1280,  pe:55,  roe:16, mktcap:10300,  ocf:150,   rev:1200,  revcagr:45, epscagr:50, de:0.5,  fcf:100,   ca:1000,   tl:600,    sh:81,   np:185,   dep:60,   capex:90,   bvps:380,  opm:14, promo:56.8, yahooSym:"OLECTRA.NS" },
  { symbol:"SANDHAR",    name:"Sandhar Technologies",     sector:"Auto Ancillary",exchange:"NSE", price:480,   pe:20,  roe:14, mktcap:2700,   ocf:140,   rev:3200,  revcagr:14, epscagr:12, de:0.5,  fcf:100,   ca:1200,   tl:800,    sh:56,   np:130,   dep:120,  capex:160,  bvps:240,  opm:8,  promo:67.0, yahooSym:"SANDHAR.NS" },

  // ── PHARMA / CDMO ─────────────────────────────────────────
  { symbol:"GRANULES",   name:"Granules India",           sector:"Pharma",        exchange:"NSE", price:480,   pe:18,  roe:16, mktcap:11900,  ocf:450,   rev:4800,  revcagr:14, epscagr:12, de:0.4,  fcf:350,   ca:2200,   tl:1200,   sh:248,  np:550,   dep:200,  capex:280,  bvps:180,  opm:18, promo:42.1, yahooSym:"GRANULES.NS" },
  { symbol:"LAURUSLABS", name:"Laurus Labs",              sector:"Pharma",        exchange:"NSE", price:480,   pe:35,  roe:18, mktcap:25700,  ocf:600,   rev:5800,  revcagr:22, epscagr:14, de:0.5,  fcf:450,   ca:2800,   tl:1800,   sh:535,  np:720,   dep:350,  capex:480,  bvps:180,  opm:20, promo:27.2, yahooSym:"LAURUSLABS.NS" },
  { symbol:"GLAND",      name:"Gland Pharma",             sector:"Pharma",        exchange:"NSE", price:1680,  pe:28,  roe:14, mktcap:27700,  ocf:600,   rev:5500,  revcagr:8,  epscagr:6,  de:0,    fcf:550,   ca:4500,   tl:800,    sh:165,  np:900,   dep:200,  capex:280,  bvps:780,  opm:24, promo:57.9, yahooSym:"GLAND.NS" },
  { symbol:"ERIS",       name:"Eris Lifesciences",        sector:"Pharma",        exchange:"NSE", price:1100,  pe:28,  roe:18, mktcap:15000,  ocf:380,   rev:1800,  revcagr:16, epscagr:18, de:0.3,  fcf:320,   ca:1200,   tl:600,    sh:137,  np:520,   dep:80,   capex:110,  bvps:420,  opm:28, promo:60.3, yahooSym:"ERIS.NS" },
  { symbol:"SUVEN",      name:"Suven Pharmaceuticals",   sector:"Pharma",        exchange:"NSE", price:920,   pe:45,  roe:22, mktcap:11700,  ocf:180,   rev:650,   revcagr:20, epscagr:25, de:0,    fcf:165,   ca:800,    tl:150,    sh:127,  np:260,   dep:30,   capex:40,   bvps:220,  opm:42, promo:51.8, yahooSym:"SUVEN.NS" },
  { symbol:"MARKSANS",   name:"Marksans Pharma",         sector:"Pharma",        exchange:"NSE", price:195,   pe:18,  roe:14, mktcap:7200,   ocf:200,   rev:2200,  revcagr:16, epscagr:14, de:0,    fcf:180,   ca:1400,   tl:400,    sh:369,  np:380,   dep:60,   capex:80,   bvps:80,   opm:16, promo:43.2, yahooSym:"MARKSANS.NS" },
  { symbol:"NATCOPHARM", name:"Natco Pharma",            sector:"Pharma",        exchange:"NSE", price:1300,  pe:18,  roe:16, mktcap:23500,  ocf:500,   rev:3200,  revcagr:18, epscagr:20, de:0.1,  fcf:430,   ca:2200,   tl:600,    sh:181,  np:1100,  dep:100,  capex:140,  bvps:520,  opm:28, promo:49.9, yahooSym:"NATCOPHARM.NS" },
  { symbol:"SEQUENT",    name:"Sequent Scientific",      sector:"Pharma",        exchange:"NSE", price:118,   pe:28,  roe:10, mktcap:3400,   ocf:120,   rev:1900,  revcagr:10, epscagr:8,  de:0.6,  fcf:80,    ca:1200,   tl:900,    sh:288,  np:120,   dep:80,   capex:110,  bvps:62,   opm:10, promo:25.0, yahooSym:"SEQUENT.NS" },
  { symbol:"NEULANDLAB", name:"Neuland Laboratories",   sector:"Pharma",        exchange:"NSE", price:13500, pe:38,  roe:22, mktcap:17400,  ocf:200,   rev:1400,  revcagr:22, epscagr:28, de:0.2,  fcf:175,   ca:900,    tl:400,    sh:13,   np:450,   dep:80,   capex:110,  bvps:2200, opm:30, promo:35.9, yahooSym:"NEULANDLAB.NS" },

  // ── HEALTHCARE ────────────────────────────────────────────
  { symbol:"KIMS",       name:"KIMS Health",              sector:"Healthcare",    exchange:"NSE", price:1750,  pe:42,  roe:16, mktcap:11700,  ocf:280,   rev:2200,  revcagr:22, epscagr:28, de:0.4,  fcf:220,   ca:1000,   tl:800,    sh:67,   np:270,   dep:120,  capex:180,  bvps:520,  opm:18, promo:48.3, yahooSym:"KIMS.NS" },
  { symbol:"RAINBOW",    name:"Rainbow Children Medicare",sector:"Healthcare",    exchange:"NSE", price:1350,  pe:52,  roe:18, mktcap:6800,   ocf:150,   rev:1100,  revcagr:22, epscagr:28, de:0.5,  fcf:110,   ca:600,    tl:500,    sh:50,   np:130,   dep:80,   capex:120,  bvps:380,  opm:20, promo:52.6, yahooSym:"RAINBOW.NS" },
  { symbol:"YATHARTH",   name:"Yatharth Hospital",       sector:"Healthcare",    exchange:"NSE", price:395,   pe:32,  roe:14, mktcap:2400,   ocf:80,    rev:500,   revcagr:25, epscagr:22, de:0.3,  fcf:55,    ca:300,    tl:250,    sh:61,   np:75,    dep:35,   capex:55,   bvps:180,  opm:18, promo:61.5, yahooSym:"YATHARTH.NS" },
  { symbol:"MAXHEALTH",  name:"Max Healthcare",          sector:"Healthcare",    exchange:"NSE", price:1020,  pe:88,  roe:14, mktcap:99000,  ocf:900,   rev:6500,  revcagr:22, epscagr:35, de:0.5,  fcf:680,   ca:3500,   tl:2500,   sh:970,  np:1100,  dep:400,  capex:580,  bvps:220,  opm:16, promo:23.7, yahooSym:"MAXHEALTH.NS" },
  { symbol:"MEDANTA",    name:"Global Health (Medanta)", sector:"Healthcare",    exchange:"NSE", price:920,   pe:65,  roe:14, mktcap:22200,  ocf:350,   rev:3200,  revcagr:20, epscagr:28, de:0.6,  fcf:250,   ca:1500,   tl:1200,   sh:242,  np:340,   dep:220,  capex:320,  bvps:280,  opm:16, promo:64.6, yahooSym:"MEDANTA.NS" },
  { symbol:"VIJAYA",     name:"Vijaya Diagnostic",       sector:"Healthcare",    exchange:"NSE", price:720,   pe:52,  roe:18, mktcap:4700,   ocf:100,   rev:600,   revcagr:18, epscagr:22, de:0,    fcf:90,    ca:400,    tl:120,    sh:65,   np:88,    dep:40,   capex:55,   bvps:280,  opm:28, promo:48.3, yahooSym:"VIJAYA.NS" },
  { symbol:"THYROCARE",  name:"Thyrocare Technologies",  sector:"Healthcare",    exchange:"NSE", price:620,   pe:35,  roe:16, mktcap:3300,   ocf:120,   rev:700,   revcagr:12, epscagr:10, de:0,    fcf:110,   ca:500,    tl:150,    sh:53,   np:90,    dep:35,   capex:45,   bvps:280,  opm:24, promo:66.1, yahooSym:"THYROCARE.NS" },

  // ── DEFENSE / AEROSPACE ──────────────────────────────────
  { symbol:"DATAPATTNS", name:"Data Patterns",           sector:"Defense",       exchange:"NSE", price:1950,  pe:40,  roe:18, mktcap:4500,   ocf:100,   rev:500,   revcagr:30, epscagr:35, de:0,    fcf:90,    ca:600,    tl:150,    sh:23,   np:110,   dep:20,   capex:28,   bvps:480,  opm:28, promo:44.4, yahooSym:"DATAPATTNS.NS" },
  { symbol:"PARAS",      name:"Paras Defence",           sector:"Defense",       exchange:"NSE", price:920,   pe:55,  roe:16, mktcap:2100,   ocf:45,    rev:280,   revcagr:25, epscagr:30, de:0.1,  fcf:38,    ca:350,    tl:120,    sh:23,   np:38,    dep:15,   capex:22,   bvps:350,  opm:25, promo:58.0, yahooSym:"PARAS.NS" },
  { symbol:"MTAR",       name:"MTAR Technologies",       sector:"Defense",       exchange:"NSE", price:1700,  pe:45,  roe:16, mktcap:5100,   ocf:120,   rev:650,   revcagr:28, epscagr:32, de:0.2,  fcf:95,    ca:600,    tl:250,    sh:30,   np:113,   dep:40,   capex:60,   bvps:580,  opm:22, promo:46.6, yahooSym:"MTAR.NS" },
  { symbol:"ZEN",        name:"Zen Technologies",        sector:"Defense",       exchange:"NSE", price:1750,  pe:50,  roe:22, mktcap:3800,   ocf:80,    rev:380,   revcagr:35, epscagr:40, de:0,    fcf:72,    ca:450,    tl:100,    sh:22,   np:75,    dep:15,   capex:20,   bvps:380,  opm:28, promo:58.2, yahooSym:"ZEN.NS" },
  { symbol:"ASTRA",      name:"Astra Microwave",         sector:"Defense",       exchange:"NSE", price:490,   pe:32,  roe:18, mktcap:3600,   ocf:90,    rev:550,   revcagr:18, epscagr:22, de:0,    fcf:80,    ca:500,    tl:120,    sh:74,   np:110,   dep:25,   capex:35,   bvps:180,  opm:22, promo:26.1, yahooSym:"ASTRAMICRO.NS" },
  { symbol:"MIDHANI",    name:"Mishra Dhatu Nigam",      sector:"Defense",       exchange:"NSE", price:298,   pe:28,  roe:14, mktcap:5600,   ocf:180,   rev:1050,  revcagr:14, epscagr:16, de:0,    fcf:160,   ca:800,    tl:200,    sh:188,  np:200,   dep:50,   capex:70,   bvps:120,  opm:22, promo:74.0, yahooSym:"MIDHANI.NS" },
  { symbol:"MAZDOCK",    name:"Mazagon Dock",            sector:"Defense",       exchange:"NSE", price:2200,  pe:16,  roe:20, mktcap:44400,  ocf:1200,  rev:9500,  revcagr:18, epscagr:22, de:0,    fcf:1100,  ca:8000,   tl:3000,   sh:202,  np:2200,  dep:180,  capex:220,  bvps:600,  opm:16, promo:84.8, yahooSym:"MAZDOCK.NS" },
  { symbol:"IDEAFORGE",  name:"ideaForge Technology",    sector:"Defense",       exchange:"NSE", price:680,   pe:0,   roe:4,  mktcap:1950,   ocf:20,    rev:220,   revcagr:35, epscagr:0,  de:0,    fcf:12,    ca:350,    tl:100,    sh:29,   np:10,    dep:15,   capex:22,   bvps:480,  opm:5,  promo:43.2, yahooSym:"IDEAFORGE.NS" },
  { symbol:"AZAD",       name:"Azad Engineering",        sector:"Defense",       exchange:"NSE", price:1300,  pe:50,  roe:14, mktcap:3800,   ocf:60,    rev:350,   revcagr:28, epscagr:35, de:0.3,  fcf:45,    ca:400,    tl:200,    sh:29,   np:75,    dep:25,   capex:38,   bvps:580,  opm:22, promo:68.0, yahooSym:"AZAD.NS" },
  { symbol:"ELGIEQUIP",  name:"Elgi Equipments",         sector:"Capital Goods", exchange:"NSE", price:580,   pe:32,  roe:18, mktcap:9200,   ocf:280,   rev:2800,  revcagr:14, epscagr:16, de:0.1,  fcf:240,   ca:1500,   tl:500,    sh:159,  np:280,   dep:80,   capex:110,  bvps:180,  opm:14, promo:45.0, yahooSym:"ELGIEQUIP.NS" },

  // ── RENEWABLES / POWER ───────────────────────────────────
  { symbol:"NTPCGREEN",  name:"NTPC Green Energy",        sector:"Renewables",    exchange:"NSE", price:110,   pe:0,   roe:4,  mktcap:89000,  ocf:500,   rev:1200,  revcagr:45, epscagr:0,  de:2.5,  fcf:200,   ca:3000,   tl:8000,   sh:8100, np:0,     dep:400,  capex:3000, bvps:45,   opm:50, promo:89.5, yahooSym:"NTPCGREEN.NS" },
  { symbol:"SJVN",       name:"SJVN",                     sector:"Power",         exchange:"NSE", price:112,   pe:18,  roe:12, mktcap:44000,  ocf:1500,  rev:3200,  revcagr:14, epscagr:12, de:1.2,  fcf:800,   ca:3500,   tl:5000,   sh:3929, np:1600,  dep:500,  capex:2000, bvps:60,   opm:55, promo:86.0, yahooSym:"SJVN.NS" },
  { symbol:"NHPC",       name:"NHPC",                     sector:"Power",         exchange:"NSE", price:82,    pe:14,  roe:12, mktcap:82000,  ocf:3500,  rev:10000, revcagr:10, epscagr:10, de:0.8,  fcf:2000,  ca:8000,   tl:10000,  sh:10045,np:4500,  dep:1200, capex:3000, bvps:38,   opm:52, promo:67.4, yahooSym:"NHPC.NS" },
  { symbol:"TORNTPOWER", name:"Torrent Power",            sector:"Power",         exchange:"NSE", price:1380,  pe:22,  roe:16, mktcap:66200,  ocf:2500,  rev:22000, revcagr:12, epscagr:14, de:1.0,  fcf:1500,  ca:8000,   tl:8000,   sh:480,  np:2100,  dep:1200, capex:2000, bvps:500,  opm:22, promo:52.7, yahooSym:"TORNTPOWER.NS" },
  { symbol:"CESC",       name:"CESC",                     sector:"Power",         exchange:"NSE", price:165,   pe:12,  roe:12, mktcap:21800,  ocf:1800,  rev:12000, revcagr:8,  epscagr:10, de:0.8,  fcf:1000,  ca:5000,   tl:5000,   sh:1325, np:1400,  dep:800,  capex:1200, bvps:95,   opm:18, promo:52.1, yahooSym:"CESC.NS" },
  { symbol:"ADANIGREEN", name:"Adani Green Energy",       sector:"Renewables",    exchange:"NSE", price:1250,  pe:0,   roe:8,  mktcap:197000, ocf:3500,  rev:10000, revcagr:35, epscagr:0,  de:6.5,  fcf:500,   ca:15000,  tl:45000,  sh:1582, np:1200,  dep:2000, capex:8000, bvps:180,  opm:55, promo:56.7, yahooSym:"ADANIGREEN.NS" },
  { symbol:"ADANIPOWER", name:"Adani Power",              sector:"Power",         exchange:"NSE", price:520,   pe:8,   roe:28, mktcap:200000, ocf:8000,  rev:52000, revcagr:22, epscagr:35, de:1.5,  fcf:4000,  ca:20000,  tl:30000,  sh:3861, np:22000, dep:3000, capex:5000, bvps:180,  opm:28, promo:75.1, yahooSym:"ADANIPOWER.NS" },
  { symbol:"SUZLON",     name:"Suzlon Energy",            sector:"Renewables",    exchange:"NSE", price:55,    pe:28,  roe:16, mktcap:77000,  ocf:1200,  rev:8000,  revcagr:22, epscagr:35, de:0.3,  fcf:900,   ca:5000,   tl:3000,   sh:14000,np:1400,  dep:200,  capex:300,  bvps:22,   opm:16, promo:14.5, yahooSym:"SUZLON.NS" },
  { symbol:"INOXWIND",   name:"Inox Wind",                sector:"Renewables",    exchange:"NSE", price:195,   pe:0,   roe:4,  mktcap:10500,  ocf:150,   rev:2800,  revcagr:28, epscagr:0,  de:0.8,  fcf:80,    ca:2000,   tl:1800,   sh:540,  np:100,   dep:80,   capex:120,  bvps:80,   opm:10, promo:44.9, yahooSym:"INOXWIND.NS" },
  { symbol:"WAAREEENER", name:"Waaree Energies",          sector:"Renewables",    exchange:"NSE", price:2280,  pe:38,  roe:22, mktcap:65000,  ocf:800,   rev:12000, revcagr:45, epscagr:50, de:0.3,  fcf:600,   ca:5000,   tl:2000,   sh:285,  np:1700,  dep:200,  capex:600,  bvps:580,  opm:14, promo:70.9, yahooSym:"WAAREEENER.NS" },
  { symbol:"PREMIER",    name:"Premier Energies",         sector:"Renewables",    exchange:"NSE", price:920,   pe:42,  roe:18, mktcap:13300,  ocf:180,   rev:2200,  revcagr:40, epscagr:45, de:0.4,  fcf:130,   ca:1200,   tl:600,    sh:145,  np:315,   dep:60,   capex:90,   bvps:280,  opm:14, promo:66.0, yahooSym:"PREMIERENE.NS" },
  { symbol:"INDIAGRID",  name:"IndiGrid InvIT",           sector:"Power",         exchange:"NSE", price:148,   pe:18,  roe:10, mktcap:8900,   ocf:900,   rev:1800,  revcagr:12, epscagr:8,  de:2.5,  fcf:600,   ca:1000,   tl:4000,   sh:601,  np:380,   dep:500,  capex:800,  bvps:108,  opm:55, promo:0,    yahooSym:"INDIGRID.NS" },

  // ── REALTY ───────────────────────────────────────────────
  { symbol:"MACROTECH",  name:"Macrotech Developers",     sector:"Realty",        exchange:"NSE", price:1280,  pe:38,  roe:14, mktcap:127000, ocf:2500,  rev:12000, revcagr:28, epscagr:35, de:0.8,  fcf:1500,  ca:25000,  tl:15000,  sh:992,  np:2800,  dep:200,  capex:300,  bvps:420,  opm:28, promo:74.4, yahooSym:"LODHA.NS" },
  { symbol:"PRESTIGE",   name:"Prestige Estates",         sector:"Realty",        exchange:"NSE", price:1520,  pe:45,  roe:12, mktcap:61000,  ocf:1200,  rev:8000,  revcagr:22, epscagr:28, de:1.0,  fcf:700,   ca:15000,  tl:12000,  sh:401,  np:1200,  dep:300,  capex:450,  bvps:480,  opm:22, promo:70.8, yahooSym:"PRESTIGE.NS" },
  { symbol:"SOBHA",      name:"Sobha",                    sector:"Realty",        exchange:"NSE", price:1480,  pe:50,  roe:12, mktcap:14000,  ocf:400,   rev:3500,  revcagr:16, epscagr:20, de:1.2,  fcf:200,   ca:6000,   tl:5000,   sh:95,   np:280,   dep:120,  capex:180,  bvps:780,  opm:14, promo:53.8, yahooSym:"SOBHA.NS" },
  { symbol:"BRIGADE",    name:"Brigade Enterprises",      sector:"Realty",        exchange:"NSE", price:1020,  pe:38,  roe:14, mktcap:25500,  ocf:700,   rev:5500,  revcagr:22, epscagr:28, de:0.8,  fcf:400,   ca:8000,   tl:6000,   sh:250,  np:620,   dep:200,  capex:300,  bvps:380,  opm:18, promo:43.5, yahooSym:"BRIGADE.NS" },
  { symbol:"PHOENIXLTD", name:"Phoenix Mills",            sector:"Realty",        exchange:"NSE", price:1720,  pe:45,  roe:14, mktcap:61000,  ocf:1500,  rev:4200,  revcagr:22, epscagr:28, de:0.8,  fcf:900,   ca:8000,   tl:7000,   sh:354,  np:1200,  dep:500,  capex:800,  bvps:580,  opm:35, promo:48.0, yahooSym:"PHOENIXLTD.NS" },
  { symbol:"MAHLIFE",    name:"Mahindra Lifespace",       sector:"Realty",        exchange:"NSE", price:495,   pe:42,  roe:10, mktcap:7600,   ocf:200,   rev:1200,  revcagr:18, epscagr:22, de:0.3,  fcf:120,   ca:2500,   tl:1500,   sh:154,  np:180,   dep:40,   capex:60,   bvps:340,  opm:16, promo:51.2, yahooSym:"MAHLIFE.NS" },
  { symbol:"KOLTEPATIL", name:"Kolte-Patil Developers",  sector:"Realty",        exchange:"NSE", price:395,   pe:18,  roe:14, mktcap:3100,   ocf:200,   rev:2200,  revcagr:18, epscagr:20, de:0.5,  fcf:140,   ca:2500,   tl:1500,   sh:79,   np:175,   dep:40,   capex:55,   bvps:220,  opm:14, promo:67.1, yahooSym:"KOLTEPATIL.NS" },
  { symbol:"PURAVANKARA",name:"Puravankara",              sector:"Realty",        exchange:"NSE", price:295,   pe:22,  roe:12, mktcap:7000,   ocf:400,   rev:2800,  revcagr:18, epscagr:22, de:0.8,  fcf:250,   ca:5000,   tl:3500,   sh:237,  np:320,   dep:80,   capex:120,  bvps:150,  opm:16, promo:69.8, yahooSym:"PURVA.NS" },

  // ── EXCHANGE / CAPITAL MARKETS ────────────────────────────
  { symbol:"CDSL",       name:"CDSL",                     sector:"Exchange",      exchange:"NSE", price:1680,  pe:52,  roe:28, mktcap:35100,  ocf:380,   rev:800,   revcagr:22, epscagr:25, de:0,    fcf:365,   ca:1200,   tl:250,    sh:209,  np:680,   dep:30,   capex:38,   bvps:380,  opm:55, promo:15.0, yahooSym:"CDSL.NS" },
  { symbol:"MCXINDIA",   name:"MCX India",                sector:"Exchange",      exchange:"NSE", price:6200,  pe:50,  roe:18, mktcap:31600,  ocf:300,   rev:650,   revcagr:16, epscagr:20, de:0,    fcf:285,   ca:1200,   tl:250,    sh:51,   np:620,   dep:25,   capex:30,   bvps:820,  opm:48, promo:0,    yahooSym:"MCX.NS" },
  { symbol:"BSE",        name:"BSE",                      sector:"Exchange",      exchange:"NSE", price:5200,  pe:50,  roe:18, mktcap:70000,  ocf:500,   rev:1200,  revcagr:22, epscagr:28, de:0,    fcf:480,   ca:2500,   tl:400,    sh:135,  np:1200,  dep:50,   capex:60,   bvps:1200, opm:50, promo:0,    yahooSym:"BSE.NS" },
  { symbol:"NSDL",       name:"NSDL",                     sector:"Exchange",      exchange:"NSE", price:980,   pe:38,  roe:22, mktcap:9800,   ocf:200,   rev:600,   revcagr:18, epscagr:22, de:0,    fcf:190,   ca:800,    tl:150,    sh:100,  np:280,   dep:20,   capex:25,   bvps:320,  opm:48, promo:0,    yahooSym:"NSDL.NS" },

  // ── LOGISTICS / AVIATION ─────────────────────────────────
  { symbol:"BLUEDART",   name:"Blue Dart Express",        sector:"Logistics",     exchange:"NSE", price:7200,  pe:45,  roe:18, mktcap:17100,  ocf:400,   rev:5500,  revcagr:12, epscagr:14, de:0.5,  fcf:300,   ca:2500,   tl:1800,   sh:24,   np:380,   dep:350,  capex:500,  bvps:1200, opm:12, promo:75.0, yahooSym:"BLUEDART.NS" },
  { symbol:"DELHIVERY",  name:"Delhivery",                sector:"Logistics",     exchange:"NSE", price:380,   pe:0,   roe:4,  mktcap:27600,  ocf:400,   rev:8000,  revcagr:18, epscagr:0,  de:0.3,  fcf:150,   ca:4000,   tl:2000,   sh:726,  np:0,     dep:800,  capex:1000, bvps:138,  opm:4,  promo:0,    yahooSym:"DELHIVERY.NS" },
  { symbol:"GESHIP",     name:"Great Eastern Shipping",   sector:"Logistics",     exchange:"NSE", price:1020,  pe:8,   roe:18, mktcap:14400,  ocf:1800,  rev:6000,  revcagr:14, epscagr:20, de:0.6,  fcf:1200,  ca:3500,   tl:3000,   sh:141,  np:1600,  dep:800,  capex:1200, bvps:780,  opm:38, promo:33.7, yahooSym:"GESHIP.NS" },
  { symbol:"SCI",        name:"Shipping Corp of India",   sector:"Logistics",     exchange:"NSE", price:192,   pe:8,   roe:12, mktcap:8900,   ocf:800,   rev:3500,  revcagr:10, epscagr:12, de:0.8,  fcf:500,   ca:2500,   tl:2500,   sh:464,  np:850,   dep:500,  capex:700,  bvps:120,  opm:22, promo:63.8, yahooSym:"SCI.NS" },
  { symbol:"INTERGLOBE", name:"IndiGo (InterGlobe)",      sector:"Aviation",      exchange:"NSE", price:5200,  pe:18,  roe:28, mktcap:201000, ocf:8000,  rev:65000, revcagr:18, epscagr:35, de:2.5,  fcf:3000,  ca:20000,  tl:30000,  sh:387,  np:8100,  dep:5000, capex:7000, bvps:580,  opm:14, promo:36.6, yahooSym:"INDIGO.NS" },
  { symbol:"GMRAIRPORT", name:"GMR Airports Infrastructure",sector:"Infra",       exchange:"NSE", price:88,    pe:0,   roe:4,  mktcap:55000,  ocf:1500,  rev:5000,  revcagr:18, epscagr:0,  de:3.5,  fcf:200,   ca:8000,   tl:20000,  sh:6250, np:0,     dep:1200, capex:3000, bvps:28,   opm:22, promo:58.4, yahooSym:"GMRINFRA.NS" },
  { symbol:"ALLCARGO",   name:"Allcargo Logistics",       sector:"Logistics",     exchange:"NSE", price:55,    pe:0,   roe:4,  mktcap:3600,   ocf:300,   rev:12000, revcagr:8,  epscagr:0,  de:0.5,  fcf:100,   ca:4000,   tl:3000,   sh:655,  np:0,     dep:400,  capex:550,  bvps:95,   opm:4,  promo:69.3, yahooSym:"ALLCARGO.NS" },
  { symbol:"TVSSCS",     name:"TVS Supply Chain Solutions",sector:"Logistics",    exchange:"NSE", price:188,   pe:40,  roe:10, mktcap:10800,  ocf:200,   rev:10000, revcagr:22, epscagr:0,  de:0.8,  fcf:100,   ca:3500,   tl:2500,   sh:575,  np:150,   dep:300,  capex:400,  bvps:98,   opm:4,  promo:57.9, yahooSym:"TVSSCS.NS" },

  // ── AGRI / SUGAR ──────────────────────────────────────────
  { symbol:"BALRAMCHIN", name:"Balrampur Chini",          sector:"Agri",          exchange:"NSE", price:295,   pe:14,  roe:16, mktcap:5900,   ocf:500,   rev:6000,  revcagr:12, epscagr:14, de:0.3,  fcf:380,   ca:3000,   tl:1500,   sh:200,  np:420,   dep:200,  capex:280,  bvps:150,  opm:12, promo:41.3, yahooSym:"BALRAMCHIN.NS" },
  { symbol:"TRIVENI",    name:"Triveni Engineering",      sector:"Agri",          exchange:"NSE", price:390,   pe:18,  roe:14, mktcap:10000,  ocf:400,   rev:5500,  revcagr:14, epscagr:16, de:0.4,  fcf:300,   ca:2500,   tl:1500,   sh:257,  np:480,   dep:150,  capex:220,  bvps:180,  opm:10, promo:55.2, yahooSym:"TRIVENI.NS" },
  { symbol:"KRBL",       name:"KRBL",                     sector:"Agri",          exchange:"NSE", price:295,   pe:14,  roe:14, mktcap:6900,   ocf:350,   rev:5500,  revcagr:8,  epscagr:10, de:0.2,  fcf:280,   ca:3500,   tl:1500,   sh:234,  np:450,   dep:80,   capex:110,  bvps:150,  opm:14, promo:59.5, yahooSym:"KRBL.NS" },
  { symbol:"RENUKA",     name:"Shree Renuka Sugars",      sector:"Agri",          exchange:"NSE", price:45,    pe:0,   roe:4,  mktcap:11200,  ocf:400,   rev:12000, revcagr:10, epscagr:0,  de:1.5,  fcf:100,   ca:5000,   tl:5000,   sh:2490, np:0,     dep:500,  capex:700,  bvps:25,   opm:6,  promo:62.0, yahooSym:"RENUKA.NS" },

  // ── MEDIA / ENTERTAINMENT ────────────────────────────────
  { symbol:"ZEEL",       name:"Zee Entertainment",        sector:"Media",         exchange:"NSE", price:118,   pe:22,  roe:8,  mktcap:11300,  ocf:600,   rev:8000,  revcagr:6,  epscagr:4,  de:0.2,  fcf:480,   ca:4000,   tl:2000,   sh:958,  np:500,   dep:200,  capex:280,  bvps:120,  opm:14, promo:3.9,  yahooSym:"ZEEL.NS" },
  { symbol:"SUNTV",      name:"Sun TV Network",           sector:"Media",         exchange:"NSE", price:720,   pe:18,  roe:22, mktcap:28400,  ocf:1800,  rev:4200,  revcagr:8,  epscagr:10, de:0,    fcf:1700,  ca:4500,   tl:500,    sh:394,  np:2000,  dep:100,  capex:120,  bvps:280,  opm:48, promo:75.0, yahooSym:"SUNTV.NS" },
  { symbol:"PVRINOX",    name:"PVR INOX",                 sector:"Entertainment", exchange:"NSE", price:1320,  pe:0,   roe:4,  mktcap:12300,  ocf:1200,  rev:5500,  revcagr:14, epscagr:0,  de:1.5,  fcf:200,   ca:2000,   tl:4000,   sh:93,   np:0,     dep:1200, capex:1500, bvps:580,  opm:14, promo:10.6, yahooSym:"PVRINOX.NS" },
  { symbol:"SAREGAMA",   name:"Saregama India",           sector:"Media",         exchange:"NSE", price:420,   pe:52,  roe:18, mktcap:7600,   ocf:120,   rev:650,   revcagr:18, epscagr:22, de:0,    fcf:112,   ca:600,    tl:150,    sh:182,  np:145,   dep:25,   capex:32,   bvps:165,  opm:28, promo:59.5, yahooSym:"SAREGAMA.NS" },
  { symbol:"NAZARA",     name:"Nazara Technologies",      sector:"Entertainment", exchange:"NSE", price:920,   pe:88,  roe:8,  mktcap:7900,   ocf:80,    rev:1200,  revcagr:32, epscagr:0,  de:0,    fcf:65,    ca:1200,   tl:300,    sh:86,   np:88,    dep:40,   capex:55,   bvps:620,  opm:8,  promo:55.1, yahooSym:"NAZARA.NS" },
  { symbol:"AFFLE",      name:"Affle India",              sector:"Internet",      exchange:"NSE", price:1250,  pe:52,  roe:16, mktcap:17500,  ocf:200,   rev:1500,  revcagr:28, epscagr:32, de:0,    fcf:180,   ca:1200,   tl:300,    sh:140,  np:325,   dep:40,   capex:55,   bvps:380,  opm:20, promo:56.1, yahooSym:"AFFLE.NS" },

  // ── EMS / CAPITAL GOODS ───────────────────────────────────
  { symbol:"KAYNES",     name:"Kaynes Technology",        sector:"Capital Goods", exchange:"NSE", price:3800,  pe:75,  roe:18, mktcap:22800,  ocf:200,   rev:1800,  revcagr:40, epscagr:45, de:0.3,  fcf:150,   ca:1200,   tl:600,    sh:60,   np:300,   dep:60,   capex:90,   bvps:680,  opm:14, promo:59.1, yahooSym:"KAYNES.NS" },
  { symbol:"SYRMA",      name:"Syrma SGS Technology",     sector:"Capital Goods", exchange:"NSE", price:390,   pe:40,  roe:14, mktcap:5600,   ocf:100,   rev:2500,  revcagr:35, epscagr:30, de:0.3,  fcf:70,    ca:1500,   tl:700,    sh:144,  np:140,   dep:60,   capex:90,   bvps:220,  opm:8,  promo:40.2, yahooSym:"SYRMA.NS" },
  { symbol:"AMBER",      name:"Amber Enterprises",        sector:"Capital Goods", exchange:"NSE", price:5800,  pe:55,  roe:14, mktcap:19700,  ocf:300,   rev:14000, revcagr:28, epscagr:32, de:0.5,  fcf:200,   ca:5000,   tl:3000,   sh:34,   np:360,   dep:200,  capex:300,  bvps:1800, opm:6,  promo:39.8, yahooSym:"AMBER.NS" },
  { symbol:"AVALON",     name:"Avalon Technologies",      sector:"Capital Goods", exchange:"NSE", price:480,   pe:28,  roe:14, mktcap:2800,   ocf:80,    rev:800,   revcagr:22, epscagr:18, de:0.2,  fcf:60,    ca:500,    tl:250,    sh:58,   np:100,   dep:25,   capex:38,   bvps:280,  opm:10, promo:59.5, yahooSym:"AVALON.NS" },
  { symbol:"CENTUM",     name:"Centum Electronics",       sector:"Capital Goods", exchange:"NSE", price:1380,  pe:22,  roe:12, mktcap:1600,   ocf:60,    rev:600,   revcagr:18, epscagr:14, de:0.4,  fcf:40,    ca:500,    tl:350,    sh:12,   np:72,    dep:35,   capex:50,   bvps:820,  opm:14, promo:51.5, yahooSym:"CENTUM.NS" },
  { symbol:"ELECON",     name:"Elecon Engineering",       sector:"Capital Goods", exchange:"NSE", price:520,   pe:28,  roe:18, mktcap:9800,   ocf:280,   rev:2200,  revcagr:18, epscagr:22, de:0.3,  fcf:220,   ca:1500,   tl:700,    sh:188,  np:350,   dep:100,  capex:140,  bvps:220,  opm:20, promo:52.6, yahooSym:"ELECON.NS" },
  { symbol:"HBLPOWER",   name:"HBL Power Systems",        sector:"Capital Goods", exchange:"NSE", price:520,   pe:28,  roe:18, mktcap:8000,   ocf:180,   rev:1800,  revcagr:22, epscagr:28, de:0.2,  fcf:140,   ca:1200,   tl:500,    sh:154,  np:285,   dep:60,   capex:90,   bvps:180,  opm:18, promo:59.0, yahooSym:"HBLPOWER.NS" },

  // ── RAILWAYS ──────────────────────────────────────────────
  { symbol:"TITAGARH",   name:"Titagarh Rail Systems",    sector:"Railways",      exchange:"NSE", price:1150,  pe:40,  roe:18, mktcap:10500,  ocf:200,   rev:2800,  revcagr:28, epscagr:35, de:0.4,  fcf:140,   ca:2000,   tl:1000,   sh:91,   np:260,   dep:80,   capex:120,  bvps:380,  opm:12, promo:42.0, yahooSym:"TITAGARH.NS" },
  { symbol:"TEXRAIL",    name:"Texmaco Rail",             sector:"Railways",      exchange:"NSE", price:195,   pe:22,  roe:12, mktcap:3800,   ocf:120,   rev:1500,  revcagr:18, epscagr:14, de:0.6,  fcf:80,    ca:1200,   tl:900,    sh:195,  np:140,   dep:80,   capex:120,  bvps:120,  opm:10, promo:40.5, yahooSym:"TEXRAIL.NS" },
  { symbol:"KERNEX",     name:"Kernex Microsystems",      sector:"Railways",      exchange:"NSE", price:520,   pe:28,  roe:14, mktcap:850,    ocf:30,    rev:180,   revcagr:22, epscagr:18, de:0,    fcf:25,    ca:200,    tl:60,     sh:16,   np:30,    dep:8,    capex:12,   bvps:320,  opm:18, promo:48.1, yahooSym:"KERNEX.NS" },

  // ── SPECIALTY CHEMICALS ───────────────────────────────────
  { symbol:"ALKYLAMINE", name:"Alkyl Amines Chemicals",   sector:"Chemicals",     exchange:"NSE", price:1920,  pe:28,  roe:18, mktcap:9800,   ocf:280,   rev:1600,  revcagr:14, epscagr:12, de:0.2,  fcf:230,   ca:1000,   tl:400,    sh:51,   np:340,   dep:80,   capex:110,  bvps:680,  opm:24, promo:76.7, yahooSym:"ALKYLAMINE.NS" },
  { symbol:"FINEORG",    name:"Fine Organic Industries",  sector:"Chemicals",     exchange:"NSE", price:4200,  pe:38,  roe:22, mktcap:12900,  ocf:280,   rev:2200,  revcagr:16, epscagr:18, de:0,    fcf:255,   ca:1200,   tl:300,    sh:31,   np:340,   dep:60,   capex:80,   bvps:1100, opm:24, promo:74.4, yahooSym:"FINEORG.NS" },
  { symbol:"TATACHEM",   name:"Tata Chemicals",           sector:"Chemicals",     exchange:"NSE", price:1020,  pe:18,  roe:14, mktcap:26000,  ocf:1000,  rev:14000, revcagr:8,  epscagr:10, de:0.5,  fcf:750,   ca:6000,   tl:4000,   sh:255,  np:1100,  dep:600,  capex:800,  bvps:520,  opm:16, promo:38.0, yahooSym:"TATACHEM.NS" },
  { symbol:"GHCL",       name:"GHCL",                     sector:"Chemicals",     exchange:"NSE", price:490,   pe:12,  roe:16, mktcap:4900,   ocf:380,   rev:3800,  revcagr:10, epscagr:12, de:0.3,  fcf:300,   ca:2000,   tl:1200,   sh:100,  np:380,   dep:180,  capex:250,  bvps:250,  opm:18, promo:46.6, yahooSym:"GHCL.NS" },
  { symbol:"ROSSARI",    name:"Rossari Biotech",          sector:"Chemicals",     exchange:"NSE", price:680,   pe:38,  roe:14, mktcap:4200,   ocf:120,   rev:1400,  revcagr:18, epscagr:14, de:0.4,  fcf:90,    ca:800,    tl:500,    sh:62,   np:110,   dep:55,   capex:80,   bvps:320,  opm:12, promo:55.4, yahooSym:"ROSSARI.NS" },
  { symbol:"CLEAN",      name:"Clean Science",            sector:"Chemicals",     exchange:"NSE", price:1300,  pe:42,  roe:28, mktcap:14100,  ocf:200,   rev:800,   revcagr:18, epscagr:20, de:0,    fcf:185,   ca:800,    tl:150,    sh:109,  np:335,   dep:35,   capex:45,   bvps:380,  opm:42, promo:72.0, yahooSym:"CLEAN.NS" },
  { symbol:"ANUPAM",     name:"Anupam Rasayan",           sector:"Chemicals",     exchange:"NSE", price:900,   pe:42,  roe:12, mktcap:5200,   ocf:120,   rev:900,   revcagr:22, epscagr:18, de:0.5,  fcf:80,    ca:600,    tl:450,    sh:58,   np:120,   dep:60,   capex:90,   bvps:480,  opm:22, promo:62.7, yahooSym:"ANUPAM.NS" },
  { symbol:"IOLCP",      name:"IOL Chemicals",            sector:"Chemicals",     exchange:"NSE", price:295,   pe:12,  roe:14, mktcap:2400,   ocf:180,   rev:2200,  revcagr:10, epscagr:8,  de:0.3,  fcf:140,   ca:1200,   tl:700,    sh:81,   np:190,   dep:80,   capex:110,  bvps:180,  opm:12, promo:45.1, yahooSym:"IOLCP.NS" },
  { symbol:"HIKAL",      name:"Hikal",                    sector:"Chemicals",     exchange:"NSE", price:295,   pe:22,  roe:14, mktcap:4400,   ocf:180,   rev:2200,  revcagr:12, epscagr:10, de:0.5,  fcf:130,   ca:1200,   tl:900,    sh:150,  np:200,   dep:120,  capex:180,  bvps:150,  opm:16, promo:47.5, yahooSym:"HIKAL.NS" },

  // ── CONSUMER / FMCG / RETAIL ──────────────────────────────
  { symbol:"RADICO",     name:"Radico Khaitan",           sector:"Consumer",      exchange:"NSE", price:1920,  pe:52,  roe:18, mktcap:25600,  ocf:400,   rev:4500,  revcagr:12, epscagr:14, de:0.3,  fcf:320,   ca:2500,   tl:1000,   sh:133,  np:480,   dep:120,  capex:180,  bvps:420,  opm:14, promo:46.0, yahooSym:"RADICO.NS" },
  { symbol:"GLOBUSSPR",  name:"Globus Spirits",           sector:"Consumer",      exchange:"NSE", price:920,   pe:18,  roe:16, mktcap:2800,   ocf:150,   rev:1800,  revcagr:18, epscagr:14, de:0.4,  fcf:110,   ca:1000,   tl:600,    sh:30,   np:155,   dep:60,   capex:90,   bvps:420,  opm:12, promo:70.2, yahooSym:"GLOBUSSPR.NS" },
  { symbol:"TILAKNAGAR", name:"Tilaknagar Industries",    sector:"Consumer",      exchange:"NSE", price:195,   pe:28,  roe:12, mktcap:5800,   ocf:150,   rev:1500,  revcagr:18, epscagr:22, de:0.5,  fcf:110,   ca:800,    tl:600,    sh:297,  np:205,   dep:40,   capex:60,   bvps:88,   opm:14, promo:47.2, yahooSym:"TILAKNAGAR.NS" },
  { symbol:"VSTIND",     name:"VST Industries",           sector:"Consumer",      exchange:"NSE", price:3450,  pe:18,  roe:22, mktcap:5300,   ocf:280,   rev:1400,  revcagr:6,  epscagr:8,  de:0,    fcf:265,   ca:800,    tl:150,    sh:15,   np:295,   dep:30,   capex:40,   bvps:1200, opm:28, promo:32.2, yahooSym:"VSTIND.NS" },
  { symbol:"GODFRYPHLP", name:"Godfrey Phillips",         sector:"Consumer",      exchange:"NSE", price:5850,  pe:18,  roe:24, mktcap:30200,  ocf:550,   rev:4500,  revcagr:8,  epscagr:10, de:0,    fcf:520,   ca:2500,   tl:600,    sh:52,   np:1200,  dep:100,  capex:140,  bvps:1800, opm:22, promo:46.0, yahooSym:"GODFRYPHLP.NS" },
  { symbol:"SYMPHONY",   name:"Symphony",                 sector:"Consumer",      exchange:"NSE", price:1120,  pe:38,  roe:20, mktcap:7800,   ocf:180,   rev:1100,  revcagr:10, epscagr:12, de:0,    fcf:168,   ca:1000,   tl:200,    sh:70,   np:200,   dep:25,   capex:32,   bvps:320,  opm:22, promo:74.9, yahooSym:"SYMPHONY.NS" },
  { symbol:"CAMPUS",     name:"Campus Activewear",        sector:"Consumer",      exchange:"NSE", price:188,   pe:28,  roe:14, mktcap:5900,   ocf:120,   rev:1500,  revcagr:18, epscagr:14, de:0.2,  fcf:90,    ca:800,    tl:400,    sh:314,  np:165,   dep:50,   capex:70,   bvps:88,   opm:12, promo:74.8, yahooSym:"CAMPUS.NS" },
  { symbol:"ELID",       name:"Electronics Mart India",   sector:"Consumer",      exchange:"NSE", price:195,   pe:22,  roe:14, mktcap:5600,   ocf:180,   rev:5500,  revcagr:18, epscagr:14, de:0.4,  fcf:120,   ca:1200,   tl:900,    sh:287,  np:250,   dep:80,   capex:120,  bvps:95,   opm:6,  promo:66.0, yahooSym:"EMIL.NS" },

  // ── METALS / MINING ───────────────────────────────────────
  { symbol:"HINDCOPPER", name:"Hindustan Copper",         sector:"Metals",        exchange:"NSE", price:295,   pe:22,  roe:12, mktcap:28400,  ocf:400,   rev:3200,  revcagr:14, epscagr:18, de:0.3,  fcf:280,   ca:2000,   tl:1500,   sh:962,  np:800,   dep:200,  capex:500,  bvps:120,  opm:18, promo:66.1, yahooSym:"HINDCOPPER.NS" },
  { symbol:"VEDL",       name:"Vedanta",                  sector:"Metals",        exchange:"NSE", price:420,   pe:8,   roe:22, mktcap:164000, ocf:12000, rev:145000,revcagr:8,  epscagr:10, de:1.5,  fcf:6000,  ca:40000,  tl:55000,  sh:3903, np:8000,  dep:6000, capex:9000, bvps:180,  opm:28, promo:56.4, yahooSym:"VEDL.NS" },

  // ── HOSPITALITY ──────────────────────────────────────────
  { symbol:"EIHOTEL",    name:"EIH (Oberoi Hotels)",      sector:"Hospitality",   exchange:"NSE", price:295,   pe:42,  roe:14, mktcap:16700,  ocf:350,   rev:2200,  revcagr:16, epscagr:20, de:0.2,  fcf:280,   ca:1200,   tl:600,    sh:567,  np:400,   dep:200,  capex:280,  bvps:120,  opm:22, promo:34.0, yahooSym:"EIHOTEL.NS" },
  { symbol:"CHALET",     name:"Chalet Hotels",            sector:"Hospitality",   exchange:"NSE", price:720,   pe:55,  roe:12, mktcap:15300,  ocf:280,   rev:1400,  revcagr:18, epscagr:22, de:1.2,  fcf:150,   ca:800,    tl:1500,   sh:213,  np:280,   dep:280,  capex:420,  bvps:380,  opm:28, promo:58.8, yahooSym:"CHALET.NS" },
  { symbol:"LEMONTREE",  name:"Lemon Tree Hotels",        sector:"Hospitality",   exchange:"NSE", price:128,   pe:48,  roe:10, mktcap:10200,  ocf:350,   rev:1100,  revcagr:18, epscagr:22, de:1.5,  fcf:120,   ca:600,    tl:1500,   sh:799,  np:215,   dep:350,  capex:500,  bvps:62,   opm:28, promo:25.9, yahooSym:"LEMONTREE.NS" },

  // ── NUVOCO / CEMENT GAP ──────────────────────────────────
  { symbol:"NUVOCO",     name:"Nuvoco Vistas",            sector:"Cement",        exchange:"NSE", price:295,   pe:28,  roe:10, mktcap:8300,   ocf:400,   rev:5500,  revcagr:8,  epscagr:10, de:0.8,  fcf:220,   ca:2500,   tl:2500,   sh:282,  np:300,   dep:500,  capex:700,  bvps:220,  opm:14, promo:58.5, yahooSym:"NUVOCO.NS" },

  // ── FINTECH / PAYMENTS ────────────────────────────────────
  { symbol:"INFIBEAM",   name:"Infibeam Avenues",         sector:"Fintech",       exchange:"NSE", price:28,    pe:35,  roe:10, mktcap:7700,   ocf:120,   rev:1200,  revcagr:18, epscagr:14, de:0.2,  fcf:100,   ca:800,    tl:400,    sh:2750, np:220,   dep:40,   capex:60,   bvps:18,   opm:20, promo:57.1, yahooSym:"INFIBEAM.NS" },
];

// ── Deduplicate against existing stocks and intra-batch ──
const VALID_SYMBOL = /^[A-Z0-9&_-]{2,25}$/;
const addedInBatch = new Set<string>();

const deduped = candidates.filter(c => {
  if (!VALID_SYMBOL.test(c.symbol)) {
    console.log(`SKIP invalid format: ${c.symbol}`);
    return false;
  }
  if (existingStocks.has(c.symbol)) {
    console.log(`SKIP duplicate (already in registry): ${c.symbol}`);
    return false;
  }
  if (addedInBatch.has(c.symbol)) {
    console.log(`SKIP intra-batch duplicate: ${c.symbol}`);
    return false;
  }
  addedInBatch.add(c.symbol);
  return true;
});

console.log(`\nCandidates:      ${candidates.length}`);
console.log(`After dedup:     ${deduped.length}`);
console.log(`Projected total: ${existingStocks.size + deduped.length}`);

if (deduped.length === 0) {
  console.log("Nothing new to add.");
  process.exit(0);
}

// ── Generate stock entries (full interface) ───────────────
function quoteKey(sym: string): string {
  return /^[0-9]|[^A-Z0-9_]/.test(sym) ? `"${sym}"` : sym;
}

const stockEntries = deduped.map(c => {
  const k = quoteKey(c.symbol);
  return [
    `  ${k}: {`,
    `    symbol: '${c.symbol}', name: '${c.name}', sector: '${c.sector}', exchange: '${c.exchange}',`,
    `    price: ${c.price}, pe: ${c.pe}, roe: ${c.roe}, mktcap: ${c.mktcap},`,
    `    ocf: ${c.ocf}, rev: ${c.rev}, revcagr: ${c.revcagr}, epscagr: ${c.epscagr},`,
    `    de: ${c.de}, fcf: ${c.fcf}, ca: ${c.ca}, tl: ${c.tl},`,
    `    sh: ${c.sh}, np: ${c.np}, dep: ${c.dep}, capex: ${c.capex}, bvps: ${c.bvps},`,
    `    opm: ${c.opm}, promo: ${c.promo},`,
    `  },`,
  ].join('\n');
}).join('\n');

// ── Splice into stocks/index.ts ───────────────────────────
const closingBrace = stocksContent.lastIndexOf("};");
if (closingBrace === -1) {
  console.error("ERROR: Could not find closing '};' in stocks file");
  process.exit(1);
}
const updatedStocks = stocksContent.slice(0, closingBrace) + stockEntries + "\n" + stocksContent.slice(closingBrace);
fs.writeFileSync(stocksPath, updatedStocks, "utf-8");
console.log(`\nWrote ${deduped.length} new stocks to data/stocks/index.ts`);

// ── Add Yahoo symbol mappings to livePrice.ts ─────────────
const newYahooMappings = deduped
  .filter(c => !existingYahooKeys.has(c.symbol) && c.yahooSym)
  .map(c => `  '${c.symbol}': '${c.yahooSym}',`)
  .join('\n');

if (newYahooMappings) {
  // Insert before the MARKET INDEXES comment
  const insertMarker = "// MARKET INDEXES";
  if (livePriceContent.includes(insertMarker)) {
    const updatedLivePrice = livePriceContent.replace(
      insertMarker,
      `// NEW BATCH ADDITIONS\n${newYahooMappings}\n\n  ${insertMarker}`
    );
    fs.writeFileSync(livePricePath, updatedLivePrice, "utf-8");
    console.log(`Added ${deduped.filter(c => !existingYahooKeys.has(c.symbol)).length} Yahoo mappings to livePrice.ts`);
  } else {
    console.warn("WARNING: Could not find insertion marker in livePrice.ts — Yahoo mappings not added");
  }
}

console.log("\nNext: npx tsx scripts/validateStocks.ts");