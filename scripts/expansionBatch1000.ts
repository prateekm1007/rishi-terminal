import * as fs from "fs";
import * as path from "path";

const stocksPath = path.join(process.cwd(), "data", "stocks", "index.ts");
const stocksContent = fs.readFileSync(stocksPath, "utf-8");

const existingStocks = new Set(
  Array.from(stocksContent.matchAll(/^\s*"?([A-Z0-9_&.-]+)"?\s*:\s*\{/gm)).map(m => m[1])
);
console.log(`Existing stocks: ${existingStocks.size}`);

interface Candidate {
  symbol: string; name: string; sector: string; exchange: string;
  price: number; pe: number; roe: number; roce: number; mktcap: number;
  ocf: number; rev: number; revcagr: number; epscagr: number;
  opm: number; de: number; fcf: number; promo: number;
  ca: number; tl: number; sh: number; np: number;
  dep: number; capex: number; bvps: number;
}

const candidates: Candidate[] = [
  // === BANKING (gaps) ===
  { symbol:"CSBBANK",    name:"CSB Bank",                    sector:"Banking",       exchange:"NSE", price:295,   pe:12,  roe:14, roce:14, mktcap:5100,  ocf:400,  rev:1800,  revcagr:16, epscagr:18, opm:38, de:0,   fcf:320,  promo:49.7, ca:9000,  tl:7500,  sh:173,  np:310,  dep:45,  capex:60,  bvps:120  },
  { symbol:"LAKSHVILAS", name:"Lakshmi Vilas Bank",          sector:"Banking",       exchange:"NSE", price:18,    pe:0,   roe:0,  roce:0,  mktcap:3800,  ocf:0,    rev:1200,  revcagr:0,  epscagr:0,  opm:0,  de:0,   fcf:0,    promo:0,    ca:6000,  tl:5500,  sh:211,  np:0,    dep:30,  capex:40,  bvps:12   },
  { symbol:"MAHABANK",   name:"Bank of Maharashtra",         sector:"Banking",       exchange:"NSE", price:52,    pe:8,   roe:16, roce:14, mktcap:38000, ocf:3500, rev:12000, revcagr:18, epscagr:22, opm:38, de:0,   fcf:2800, promo:86.5, ca:55000, tl:48000, sh:7750, np:2600, dep:300, capex:400, bvps:30   },
  { symbol:"UCOBANK",    name:"UCO Bank",                    sector:"Banking",       exchange:"NSE", price:42,    pe:10,  roe:12, roce:10, mktcap:25000, ocf:1800, rev:8000,  revcagr:12, epscagr:15, opm:32, de:0,   fcf:1400, promo:95.4, ca:38000, tl:33000, sh:5952, np:1500, dep:200, capex:280, bvps:22   },
  { symbol:"IOB",        name:"Indian Overseas Bank",        sector:"Banking",       exchange:"NSE", price:52,    pe:12,  roe:14, roce:12, mktcap:100000,ocf:4000, rev:15000, revcagr:14, epscagr:18, opm:35, de:0,   fcf:3200, promo:96.4, ca:70000, tl:62000, sh:19200,np:4200, dep:400, capex:500, bvps:22   },
  { symbol:"CENTRALBK",  name:"Central Bank of India",       sector:"Banking",       exchange:"NSE", price:55,    pe:10,  roe:12, roce:10, mktcap:47000, ocf:2800, rev:11000, revcagr:12, epscagr:14, opm:32, de:0,   fcf:2200, promo:93.1, ca:52000, tl:46000, sh:8566, np:2200, dep:300, capex:380, bvps:28   },
  { symbol:"PSB",        name:"Punjab & Sind Bank",          sector:"Banking",       exchange:"NSE", price:48,    pe:8,   roe:10, roce:8,  mktcap:11000, ocf:700,  rev:3500,  revcagr:10, epscagr:12, opm:28, de:0,   fcf:550,  promo:98.3, ca:18000, tl:16000, sh:2296, np:600,  dep:80,  capex:100, bvps:25   },
  { symbol:"DHANBANK",   name:"Dhanlaxmi Bank",              sector:"Banking",       exchange:"NSE", price:22,    pe:0,   roe:6,  roce:5,  mktcap:650,   ocf:60,   rev:600,   revcagr:6,  epscagr:0,  opm:20, de:0,   fcf:40,   promo:0,    ca:3500,  tl:3200,  sh:295,  np:25,   dep:20,  capex:25,  bvps:15   },

  // === NBFC (gaps) ===
  { symbol:"AROHAN",     name:"Arohan Financial Services",   sector:"NBFC",          exchange:"NSE", price:98,    pe:12,  roe:12, roce:10, mktcap:1800,  ocf:150,  rev:850,   revcagr:18, epscagr:12, opm:52, de:4.2, fcf:100,  promo:55.0, ca:5000,  tl:4200,  sh:184,  np:120,  dep:20,  capex:28,  bvps:65   },
  { symbol:"PAISALO",    name:"Paisalo Digital",             sector:"NBFC",          exchange:"NSE", price:68,    pe:14,  roe:14, roce:12, mktcap:3200,  ocf:180,  rev:550,   revcagr:22, epscagr:18, opm:58, de:3.5, fcf:130,  promo:68.0, ca:2800,  tl:2200,  sh:471,  np:160,  dep:12,  capex:18,  bvps:38   },
  { symbol:"SURYODAY",   name:"Suryoday Small Finance Bank", sector:"Banking",       exchange:"NSE", price:155,   pe:10,  roe:12, roce:10, mktcap:2200,  ocf:180,  rev:900,   revcagr:20, epscagr:14, opm:36, de:0,   fcf:140,  promo:0,    ca:5500,  tl:4800,  sh:142,  np:155,  dep:25,  capex:35,  bvps:95   },
  { symbol:"ESAFSFB",    name:"ESAF Small Finance Bank",     sector:"Banking",       exchange:"NSE", price:52,    pe:8,   roe:10, roce:8,  mktcap:2200,  ocf:180,  rev:1100,  revcagr:18, epscagr:12, opm:32, de:0,   fcf:130,  promo:59.3, ca:7000,  tl:6200,  sh:422,  np:180,  dep:30,  capex:42,  bvps:35   },
  { symbol:"UTKARSHBNK", name:"Utkarsh Small Finance Bank",  sector:"Banking",       exchange:"NSE", price:42,    pe:8,   roe:12, roce:10, mktcap:2500,  ocf:200,  rev:1200,  revcagr:22, epscagr:16, opm:34, de:0,   fcf:150,  promo:75.3, ca:8000,  tl:7000,  sh:595,  np:200,  dep:28,  capex:38,  bvps:28   },
  { symbol:"UJJIVAN",    name:"Ujjivan Financial Services",  sector:"NBFC",          exchange:"NSE", price:295,   pe:10,  roe:16, roce:14, mktcap:3500,  ocf:250,  rev:900,   revcagr:18, epscagr:14, opm:38, de:3.8, fcf:190,  promo:0,    ca:4500,  tl:3800,  sh:119,  np:220,  dep:18,  capex:24,  bvps:145  },
  { symbol:"SUVIDHAFIN", name:"Suvidha Finserv",             sector:"NBFC",          exchange:"NSE", price:195,   pe:14,  roe:12, roce:10, mktcap:850,   ocf:45,   rev:180,   revcagr:18, epscagr:12, opm:42, de:3.2, fcf:32,   promo:74.8, ca:900,   tl:750,   sh:44,   np:42,   dep:5,   capex:8,   bvps:120  },

  // === CAPITAL GOODS / EMS (gaps) ===
  { symbol:"ISGEC",      name:"Isgec Heavy Engineering",     sector:"Capital Goods", exchange:"NSE", price:1280,  pe:22,  roe:16, roce:18, mktcap:5800,  ocf:280,  rev:3800,  revcagr:14, epscagr:16, opm:10, de:0.3, fcf:220,  promo:70.4, ca:2500,  tl:1000,  sh:45,   np:250,  dep:120, capex:160, bvps:480  },
  { symbol:"THERMAX",    name:"Thermax",                     sector:"Capital Goods", exchange:"NSE", price:3850,  pe:52,  roe:20, roce:22, mktcap:45800, ocf:800,  rev:8500,  revcagr:16, epscagr:18, opm:10, de:0.1, fcf:680,  promo:62.0, ca:5000,  tl:1500,  sh:119,  np:880,  dep:200, capex:280, bvps:780  },
  { symbol:"GRINDWELL",  name:"Grindwell Norton",            sector:"Capital Goods", exchange:"NSE", price:1950,  pe:42,  roe:22, roce:24, mktcap:14400, ocf:280,  rev:2000,  revcagr:14, epscagr:16, opm:18, de:0,   fcf:250,  promo:74.9, ca:1200,  tl:300,   sh:74,   np:340,  dep:80,  capex:110, bvps:580  },
  { symbol:"TIMKEN",     name:"Timken India",                sector:"Capital Goods", exchange:"NSE", price:2800,  pe:42,  roe:20, roce:22, mktcap:21100, ocf:380,  rev:2800,  revcagr:14, epscagr:16, opm:16, de:0,   fcf:340,  promo:75.0, ca:1500,  tl:400,   sh:75,   np:500,  dep:100, capex:140, bvps:680  },
  { symbol:"VOLTAMP",    name:"Voltamp Transformers",        sector:"Capital Goods", exchange:"NSE", price:9200,  pe:28,  roe:22, roce:24, mktcap:6900,  ocf:200,  rev:1200,  revcagr:18, epscagr:22, opm:14, de:0,   fcf:185,  promo:73.7, ca:900,   tl:150,   sh:8,    np:240,  dep:30,  capex:40,  bvps:2400 },
  { symbol:"KIRLOSBROS", name:"Kirloskar Brothers",          sector:"Capital Goods", exchange:"NSE", price:2050,  pe:28,  roe:18, roce:20, mktcap:6600,  ocf:220,  rev:2800,  revcagr:12, epscagr:14, opm:10, de:0.2, fcf:180,  promo:40.0, ca:2000,  tl:800,   sh:32,   np:235,  dep:80,  capex:110, bvps:680  },
  { symbol:"LAXMIMACH",  name:"Lakshmi Machine Works",       sector:"Capital Goods", exchange:"NSE", price:14800, pe:28,  roe:18, roce:20, mktcap:17600, ocf:350,  rev:2400,  revcagr:12, epscagr:14, opm:12, de:0,   fcf:320,  promo:43.6, ca:2000,  tl:400,   sh:12,   np:595,  dep:80,  capex:110, bvps:4200 },
  { symbol:"PSPPROJECT",  name:"PSP Projects",               sector:"Capital Goods", exchange:"NSE", price:680,   pe:18,  roe:16, roce:18, mktcap:2600,  ocf:150,  rev:2200,  revcagr:18, epscagr:16, opm:10, de:0.2, fcf:110,  promo:67.7, ca:1500,  tl:600,   sh:38,   np:145,  dep:40,  capex:55,  bvps:320  },
  { symbol:"KNRCON",     name:"KNR Constructions",           sector:"Infra",         exchange:"NSE", price:295,   pe:12,  roe:14, roce:16, mktcap:8300,  ocf:400,  rev:3800,  revcagr:16, epscagr:14, opm:14, de:0.3, fcf:300,  promo:55.2, ca:3000,  tl:1200,  sh:282,  np:480,  dep:120, capex:160, bvps:180  },
  { symbol:"NCC",        name:"NCC Limited",                 sector:"Infra",         exchange:"NSE", price:225,   pe:14,  roe:12, roce:14, mktcap:14200, ocf:500,  rev:14000, revcagr:14, epscagr:12, opm:8,  de:0.4, fcf:350,  promo:21.4, ca:8000,  tl:4000,  sh:631,  np:560,  dep:180, capex:240, bvps:120  },
  { symbol:"PNCINFRA",   name:"PNC Infratech",               sector:"Infra",         exchange:"NSE", price:295,   pe:12,  roe:14, roce:16, mktcap:7600,  ocf:450,  rev:8000,  revcagr:16, epscagr:14, opm:12, de:0.3, fcf:330,  promo:55.1, ca:5000,  tl:2000,  sh:257,  np:600,  dep:150, capex:200, bvps:195  },

  // === DEFENSE / AEROSPACE (gaps) ===
  { symbol:"DCXINDIA",   name:"DCX Systems",                 sector:"Defense",       exchange:"NSE", price:320,   pe:28,  roe:14, roce:16, mktcap:3700,  ocf:80,   rev:1200,  revcagr:28, epscagr:30, opm:8,  de:0.4, fcf:55,   promo:74.5, ca:800,   tl:400,   sh:116,  np:95,   dep:20,  capex:30,  bvps:180  },
  { symbol:"SOLARINDS",  name:"Solar Industries India",      sector:"Defense",       exchange:"NSE", price:9800,  pe:52,  roe:24, roce:26, mktcap:88000, ocf:900,  rev:5000,  revcagr:22, epscagr:25, opm:18, de:0.2, fcf:750,  promo:73.4, ca:3500,  tl:1200,  sh:90,   np:1400, dep:150, capex:220, bvps:2200 },
  { symbol:"BRAHMASTRA", name:"Brahmastra Realty",           sector:"Defense",       exchange:"NSE", price:295,   pe:18,  roe:12, roce:12, mktcap:1200,  ocf:50,   rev:380,   revcagr:18, epscagr:14, opm:14, de:0.3, fcf:35,   promo:65.0, ca:500,   tl:250,   sh:41,   np:65,   dep:15,  capex:22,  bvps:220  },
  { symbol:"MUNJALAU",   name:"Munjal Auto Industries",      sector:"Auto Ancillary",exchange:"NSE", price:165,   pe:14,  roe:14, roce:16, mktcap:1550,  ocf:80,   rev:1400,  revcagr:10, epscagr:12, opm:8,  de:0.3, fcf:60,   promo:67.0, ca:600,   tl:350,   sh:94,   np:80,   dep:40,  capex:55,  bvps:95   },

  // === RAILWAYS (gaps) ===
  { symbol:"RAILVIKAS",  name:"Rail Vikas Nigam",            sector:"Railways",      exchange:"NSE", price:452,   pe:28,  roe:14, roce:14, mktcap:94000, ocf:1500, rev:22000, revcagr:18, epscagr:20, opm:8,  de:0.3, fcf:1100, promo:72.8, ca:15000, tl:6000,  sh:2084, np:1400, dep:400, capex:550, bvps:165  },
  { symbol:"IREDA",      name:"IREDA",                       sector:"NBFC",          exchange:"NSE", price:195,   pe:18,  roe:14, roce:12, mktcap:52000, ocf:1500, rev:4500,  revcagr:22, epscagr:18, opm:62, de:5.5, fcf:800,  promo:75.0, ca:25000, tl:22000, sh:2668, np:1800, dep:80,  capex:100, bvps:88   },
  { symbol:"TEXRAIL",    name:"Texmaco Rail",                sector:"Railways",      exchange:"NSE", price:195,   pe:22,  roe:12, roce:12, mktcap:3800,  ocf:120,  rev:1500,  revcagr:18, epscagr:14, opm:10, de:0.6, fcf:80,   promo:40.5, ca:1200,  tl:900,   sh:195,  np:140,  dep:80,  capex:120, bvps:120  },
  { symbol:"HBLPOWER",   name:"HBL Power Systems",           sector:"Capital Goods", exchange:"NSE", price:520,   pe:28,  roe:18, roce:20, mktcap:8000,  ocf:180,  rev:1800,  revcagr:22, epscagr:28, opm:18, de:0.2, fcf:140,  promo:59.0, ca:1200,  tl:500,   sh:154,  np:285,  dep:60,  capex:90,  bvps:180  },

  // === RENEWABLES / POWER (gaps) ===
  { symbol:"WEBSOL",     name:"Websol Energy System",        sector:"Renewables",    exchange:"NSE", price:820,   pe:28,  roe:16, roce:16, mktcap:3100,  ocf:80,   rev:450,   revcagr:35, epscagr:40, opm:14, de:0.4, fcf:55,   promo:61.5, ca:400,   tl:250,   sh:38,   np:110,  dep:30,  capex:45,  bvps:480  },
  { symbol:"SWSOLAR",    name:"Sterling and Wilson Solar",   sector:"Renewables",    exchange:"NSE", price:395,   pe:28,  roe:10, roce:10, mktcap:6700,  ocf:150,  rev:3800,  revcagr:22, epscagr:18, opm:6,  de:0.8, fcf:80,   promo:40.9, ca:2500,  tl:2000,  sh:169,  np:180,  dep:30,  capex:45,  bvps:280  },
  { symbol:"INDIGONAV",  name:"Indigo Paints",               sector:"Paints",        exchange:"NSE", price:1280,  pe:52,  roe:18, roce:20, mktcap:6200,  ocf:120,  rev:1200,  revcagr:22, epscagr:20, opm:16, de:0.1, fcf:100,  promo:56.8, ca:800,   tl:200,   sh:48,   np:120,  dep:35,  capex:50,  bvps:520  },
  { symbol:"KANSAINER",  name:"Kansai Nerolac Paints",       sector:"Paints",        exchange:"NSE", price:295,   pe:35,  roe:14, roce:16, mktcap:15900, ocf:450,  rev:7500,  revcagr:10, epscagr:12, opm:12, de:0,   fcf:400,  promo:75.0, ca:3500,  tl:800,   sh:539,  np:480,  dep:150, capex:200, bvps:145  },
  { symbol:"AKZOINDIA",  name:"Akzo Nobel India",            sector:"Paints",        exchange:"NSE", price:2180,  pe:38,  roe:22, roce:24, mktcap:10200, ocf:220,  rev:3800,  revcagr:10, epscagr:12, opm:14, de:0,   fcf:200,  promo:74.8, ca:1800,  tl:400,   sh:47,   np:270,  dep:60,  capex:80,  bvps:620  },
  { symbol:"NLCINDIA",   name:"NLC India",                   sector:"Power",         exchange:"NSE", price:215,   pe:12,  roe:12, roce:12, mktcap:30000, ocf:2500, rev:14000, revcagr:10, epscagr:12, opm:22, de:1.2, fcf:1200, promo:79.2, ca:8000,  tl:8000,  sh:1395, np:1800, dep:1200,capex:2000,bvps:120  },
  { symbol:"JSWENERGY",  name:"JSW Energy",                  sector:"Power",         exchange:"NSE", price:520,   pe:28,  roe:14, roce:14, mktcap:91000, ocf:3000, rev:14000, revcagr:16, epscagr:18, opm:32, de:1.2, fcf:1500, promo:73.3, ca:8000,  tl:10000, sh:1750, np:2200, dep:1500,capex:3000,bvps:280  },

  // === REALTY (gaps) ===
  { symbol:"SUNTECK",    name:"Sunteck Realty",              sector:"Realty",        exchange:"NSE", price:395,   pe:22,  roe:10, roce:10, mktcap:5800,  ocf:200,  rev:1200,  revcagr:18, epscagr:20, opm:28, de:0.4, fcf:140,  promo:66.6, ca:3500,  tl:2000,  sh:147,  np:260,  dep:40,  capex:60,  bvps:320  },
  { symbol:"HEMIPROP",   name:"Hemisphere Properties",       sector:"Realty",        exchange:"NSE", price:88,    pe:0,   roe:4,  roce:4,  mktcap:1200,  ocf:25,   rev:120,   revcagr:12, epscagr:0,  opm:14, de:0.2, fcf:18,   promo:72.0, ca:500,   tl:300,   sh:136,  np:20,   dep:8,   capex:12,  bvps:65   },
  { symbol:"IBREALEST",  name:"Indiabulls Real Estate",      sector:"Realty",        exchange:"NSE", price:115,   pe:0,   roe:4,  roce:4,  mktcap:4800,  ocf:150,  rev:800,   revcagr:10, epscagr:0,  opm:16, de:0.8, fcf:80,   promo:22.0, ca:3000,  tl:2500,  sh:418,  np:50,   dep:30,  capex:45,  bvps:195  },
  { symbol:"ELDECO",     name:"Eldeco Housing",               sector:"Realty",        exchange:"NSE", price:2200,  pe:22,  roe:16, roce:16, mktcap:2000,  ocf:80,   rev:450,   revcagr:14, epscagr:16, opm:22, de:0.1, fcf:65,   promo:74.7, ca:600,   tl:200,   sh:9,    np:90,   dep:12,  capex:18,  bvps:880  },
  { symbol:"ASHIANA",    name:"Ashiana Housing",             sector:"Realty",        exchange:"NSE", price:420,   pe:22,  roe:14, roce:14, mktcap:4200,  ocf:180,  rev:1200,  revcagr:18, epscagr:16, opm:16, de:0.2, fcf:135,  promo:52.6, ca:1500,  tl:600,   sh:100,  np:190,  dep:30,  capex:45,  bvps:220  },
  { symbol:"AJMERA",     name:"Ajmera Realty",               sector:"Realty",        exchange:"NSE", price:620,   pe:18,  roe:14, roce:14, mktcap:2900,  ocf:150,  rev:1100,  revcagr:18, epscagr:16, opm:20, de:0.6, fcf:100,  promo:68.8, ca:2000,  tl:1200,  sh:47,   np:160,  dep:25,  capex:38,  bvps:380  },

  // === HOSPITALITY / TRAVEL ===
  { symbol:"TAJGVK",     name:"Taj GVK Hotels",              sector:"Hospitality",   exchange:"NSE", price:285,   pe:28,  roe:12, roce:12, mktcap:1900,  ocf:80,   rev:550,   revcagr:14, epscagr:16, opm:22, de:0.4, fcf:55,   promo:50.0, ca:350,   tl:250,   sh:67,   np:68,   dep:50,  capex:70,  bvps:195  },
  { symbol:"DEVYANI",    name:"Devyani International",       sector:"Consumer",      exchange:"NSE", price:158,   pe:88,  roe:10, roce:10, mktcap:18800, ocf:350,  rev:3200,  revcagr:22, epscagr:0,  opm:12, de:1.5, fcf:120,  promo:66.0, ca:1200,  tl:2000,  sh:1190, np:180,  dep:400, capex:600, bvps:45   },
  { symbol:"SAPPHIRE",   name:"Sapphire Foods India",        sector:"Consumer",      exchange:"NSE", price:295,   pe:45,  roe:10, roce:10, mktcap:3700,  ocf:180,  rev:2000,  revcagr:16, epscagr:0,  opm:8,  de:0.8, fcf:80,   promo:56.0, ca:800,   tl:1000,  sh:125,  np:80,   dep:250, capex:350, bvps:195  },
  { symbol:"WESTLIFE",   name:"Westlife Foodworld",          sector:"Consumer",      exchange:"NSE", price:680,   pe:75,  roe:14, roce:14, mktcap:10600, ocf:280,  rev:2800,  revcagr:16, epscagr:20, opm:10, de:0.5, fcf:120,  promo:56.6, ca:900,   tl:1000,  sh:156,  np:135,  dep:350, capex:480, bvps:280  },
  { symbol:"EASEMYTRIP", name:"Easy Trip Planners",          sector:"Internet",      exchange:"NSE", price:16,    pe:28,  roe:12, roce:12, mktcap:4300,  ocf:80,   rev:550,   revcagr:28, epscagr:18, opm:18, de:0,   fcf:72,   promo:62.9, ca:500,   tl:100,   sh:2688, np:95,   dep:20,  capex:28,  bvps:8    },
  { symbol:"YATRA",      name:"Yatra Online",                sector:"Internet",      exchange:"NSE", price:148,   pe:0,   roe:4,  roce:4,  mktcap:1800,  ocf:30,   rev:450,   revcagr:14, epscagr:0,  opm:6,  de:0.2, fcf:18,   promo:47.3, ca:400,   tl:200,   sh:122,  np:0,    dep:15,  capex:22,  bvps:120  },

  // === FMCG / CONSUMER (gaps) ===
  { symbol:"JYOTHYLAB",  name:"Jyothy Labs",                 sector:"FMCG",          exchange:"NSE", price:380,   pe:35,  roe:18, roce:20, mktcap:14000, ocf:350,  rev:2800,  revcagr:10, epscagr:12, opm:14, de:0,   fcf:320,  promo:52.7, ca:1200,  tl:300,   sh:368,  np:400,  dep:60,  capex:80,  bvps:145  },
  { symbol:"EMAMILTD",   name:"Emami",                       sector:"FMCG",          exchange:"NSE", price:580,   pe:35,  roe:22, roce:24, mktcap:25700, ocf:600,  rev:3800,  revcagr:8,  epscagr:10, opm:22, de:0.1, fcf:550,  promo:51.9, ca:2000,  tl:600,   sh:443,  np:720,  dep:80,  capex:110, bvps:195  },
  { symbol:"DODLA",      name:"Dodla Dairy",                 sector:"FMCG",          exchange:"NSE", price:1180,  pe:28,  roe:16, roce:18, mktcap:5900,  ocf:200,  rev:3200,  revcagr:14, epscagr:16, opm:8,  de:0.2, fcf:160,  promo:62.7, ca:1200,  tl:500,   sh:50,   np:210,  dep:80,  capex:120, bvps:520  },
  { symbol:"HERITGFOOD", name:"Heritage Foods",              sector:"FMCG",          exchange:"NSE", price:480,   pe:22,  roe:14, roce:16, mktcap:2200,  ocf:100,  rev:2800,  revcagr:10, epscagr:12, opm:6,  de:0.3, fcf:70,   promo:38.5, ca:1000,  tl:500,   sh:46,   np:100,  dep:60,  capex:90,  bvps:280  },
  { symbol:"HATSUN",     name:"Hatsun Agro Product",         sector:"FMCG",          exchange:"NSE", price:980,   pe:55,  roe:18, roce:16, mktcap:21200, ocf:350,  rev:7500,  revcagr:12, epscagr:14, opm:8,  de:0.8, fcf:180,  promo:70.8, ca:1500,  tl:1500,  sh:216,  np:380,  dep:300, capex:450, bvps:280  },
  { symbol:"BIKAJI",     name:"Bikaji Foods",                sector:"FMCG",          exchange:"NSE", price:720,   pe:52,  roe:18, roce:20, mktcap:18600, ocf:280,  rev:2800,  revcagr:18, epscagr:20, opm:12, de:0.1, fcf:240,  promo:73.4, ca:1200,  tl:400,   sh:258,  np:355,  dep:80,  capex:120, bvps:220  },
  { symbol:"TASYBITE",   name:"Tasty Bite Eatables",         sector:"FMCG",          exchange:"NSE", price:8500,  pe:55,  roe:20, roce:22, mktcap:2600,  ocf:50,   rev:350,   revcagr:12, epscagr:14, opm:14, de:0,   fcf:45,   promo:64.0, ca:250,   tl:60,    sh:3,    np:47,   dep:12,  capex:16,  bvps:2400 },
  { symbol:"CCL",        name:"CCL Products India",          sector:"FMCG",          exchange:"NSE", price:620,   pe:28,  roe:18, roce:20, mktcap:8300,  ocf:220,  rev:1600,  revcagr:14, epscagr:16, opm:16, de:0.3, fcf:180,  promo:65.8, ca:1200,  tl:500,   sh:134,  np:295,  dep:60,  capex:80,  bvps:280  },
  { symbol:"KRSNAA",     name:"Krsnaa Diagnostics",          sector:"Healthcare",    exchange:"NSE", price:620,   pe:28,  roe:14, roce:14, mktcap:3400,  ocf:100,  rev:650,   revcagr:22, epscagr:18, opm:20, de:0.4, fcf:70,   promo:42.5, ca:500,   tl:350,   sh:55,   np:120,  dep:60,  capex:90,  bvps:380  },

  // === SPECIALTY CHEMICALS (gaps) ===
  { symbol:"SUMICHEM",   name:"Sumitomo Chemical India",     sector:"Chemicals",     exchange:"NSE", price:395,   pe:28,  roe:18, roce:20, mktcap:19800, ocf:350,  rev:2500,  revcagr:12, epscagr:14, opm:14, de:0,   fcf:320,  promo:75.0, ca:1200,  tl:300,   sh:500,  np:420,  dep:60,  capex:80,  bvps:145  },
  { symbol:"PIIND",      name:"PI Industries",               sector:"Chemicals",     exchange:"NSE", price:3900,  pe:38,  roe:22, roce:24, mktcap:59000, ocf:1000, rev:7500,  revcagr:18, epscagr:20, opm:18, de:0,   fcf:900,  promo:52.0, ca:4000,  tl:800,   sh:151,  np:1150, dep:150, capex:220, bvps:820  },
  { symbol:"RALLIS",     name:"Rallis India",                sector:"Chemicals",     exchange:"NSE", price:295,   pe:22,  roe:14, roce:16, mktcap:5800,  ocf:200,  rev:2800,  revcagr:8,  epscagr:10, opm:10, de:0.1, fcf:170,  promo:50.1, ca:1500,  tl:500,   sh:194,  np:245,  dep:60,  capex:80,  bvps:180  },
  { symbol:"NAVINFLUOR", name:"Navin Fluorine International",sector:"Chemicals",     exchange:"NSE", price:3200,  pe:38,  roe:18, roce:20, mktcap:15800, ocf:280,  rev:2000,  revcagr:18, epscagr:16, opm:22, de:0.1, fcf:245,  promo:30.0, ca:1200,  tl:400,   sh:49,   np:415,  dep:80,  capex:120, bvps:1100 },
  { symbol:"FLUOROCHEM", name:"Gujarat Fluorochemicals",     sector:"Chemicals",     exchange:"NSE", price:4200,  pe:28,  roe:18, roce:20, mktcap:21000, ocf:450,  rev:3500,  revcagr:20, epscagr:18, opm:22, de:0.3, fcf:380,  promo:66.4, ca:2500,  tl:1000,  sh:50,   np:750,  dep:200, capex:300, bvps:1200 },
  { symbol:"NOCIL",      name:"NOCIL",                       sector:"Chemicals",     exchange:"NSE", price:245,   pe:18,  roe:14, roce:16, mktcap:3900,  ocf:180,  rev:1400,  revcagr:10, epscagr:12, opm:16, de:0,   fcf:160,  promo:51.8, ca:900,   tl:200,   sh:159,  np:215,  dep:40,  capex:55,  bvps:120  },
  { symbol:"EPIGRAL",    name:"Epigral",                     sector:"Chemicals",     exchange:"NSE", price:1280,  pe:18,  roe:16, roce:18, mktcap:3900,  ocf:180,  rev:1200,  revcagr:18, epscagr:16, opm:18, de:0.3, fcf:140,  promo:70.2, ca:800,   tl:450,   sh:30,   np:215,  dep:60,  capex:90,  bvps:680  },
  { symbol:"AARTI",      name:"Aarti Industries",            sector:"Chemicals",     exchange:"NSE", price:395,   pe:22,  roe:14, roce:16, mktcap:14300, ocf:500,  rev:6800,  revcagr:12, epscagr:10, opm:14, de:0.6, fcf:350,  promo:44.1, ca:4000,  tl:2500,  sh:362,  np:580,  dep:200, capex:300, bvps:220  },
  { symbol:"AARTIIND",   name:"Aarti Industries",            sector:"Chemicals",     exchange:"NSE", price:395,   pe:22,  roe:14, roce:16, mktcap:14300, ocf:500,  rev:6800,  revcagr:12, epscagr:10, opm:14, de:0.6, fcf:350,  promo:44.1, ca:4000,  tl:2500,  sh:362,  np:580,  dep:200, capex:300, bvps:220  },

  // === TEXTILES (gaps) ===
  { symbol:"VARDHMAN",   name:"Vardhman Textiles",           sector:"Textiles",      exchange:"NSE", price:480,   pe:12,  roe:14, roce:16, mktcap:15600, ocf:900,  rev:9000,  revcagr:8,  epscagr:10, opm:14, de:0.4, fcf:650,  promo:74.5, ca:5000,  tl:2000,  sh:325,  np:1100, dep:400, capex:550, bvps:380  },
  { symbol:"WELSPUNIND", name:"Welspun India",               sector:"Textiles",      exchange:"NSE", price:155,   pe:14,  roe:14, roce:16, mktcap:15400, ocf:800,  rev:10000, revcagr:10, epscagr:12, opm:14, de:0.5, fcf:550,  promo:69.3, ca:4000,  tl:2500,  sh:993,  np:900,  dep:400, capex:550, bvps:95   },
  { symbol:"KITEX",      name:"Kitex Garments",              sector:"Textiles",      exchange:"NSE", price:395,   pe:18,  roe:14, roce:16, mktcap:3200,  ocf:120,  rev:1200,  revcagr:10, epscagr:12, opm:16, de:0.2, fcf:95,   promo:67.3, ca:600,   tl:280,   sh:81,   np:175,  dep:45,  capex:60,  bvps:280  },
  { symbol:"RUPA",       name:"Rupa and Company",            sector:"Textiles",      exchange:"NSE", price:295,   pe:18,  roe:14, roce:16, mktcap:2400,  ocf:100,  rev:1200,  revcagr:8,  epscagr:10, opm:10, de:0.2, fcf:80,   promo:73.8, ca:800,   tl:300,   sh:81,   np:130,  dep:25,  capex:35,  bvps:165  },
  { symbol:"ARVIND",     name:"Arvind Limited",              sector:"Textiles",      exchange:"NSE", price:295,   pe:14,  roe:12, roce:14, mktcap:7700,  ocf:450,  rev:8500,  revcagr:10, epscagr:12, opm:10, de:0.6, fcf:300,  promo:41.1, ca:4000,  tl:2500,  sh:260,  np:520,  dep:250, capex:350, bvps:220  },
  { symbol:"RAYMOND",    name:"Raymond",                     sector:"Textiles",      exchange:"NSE", price:1680,  pe:18,  roe:14, roce:14, mktcap:22500, ocf:500,  rev:8000,  revcagr:10, epscagr:12, opm:10, de:0.5, fcf:350,  promo:49.6, ca:4500,  tl:2500,  sh:134,  np:1100, dep:200, capex:280, bvps:780  },
  { symbol:"TRIDENT",    name:"Trident",                     sector:"Textiles",      exchange:"NSE", price:38,    pe:14,  roe:12, roce:14, mktcap:19000, ocf:800,  rev:7000,  revcagr:10, epscagr:8,  opm:16, de:0.5, fcf:550,  promo:74.0, ca:3000,  tl:2000,  sh:5050, np:1000, dep:400, capex:550, bvps:22   },
  { symbol:"LUXIND",     name:"Lux Industries",              sector:"Textiles",      exchange:"NSE", price:1480,  pe:18,  roe:16, roce:18, mktcap:4700,  ocf:150,  rev:2200,  revcagr:10, epscagr:12, opm:10, de:0.3, fcf:115,  promo:74.4, ca:1200,  tl:500,   sh:32,   np:260,  dep:40,  capex:55,  bvps:680  },

  // === METALS / MINING (gaps) ===
  { symbol:"NMDC",       name:"NMDC",                        sector:"Mining",        exchange:"NSE", price:68,    pe:8,   roe:14, roce:16, mktcap:59000, ocf:4500, rev:22000, revcagr:8,  epscagr:10, opm:40, de:0,   fcf:3800, promo:60.8, ca:15000, tl:4000,  sh:8682, np:5500, dep:500, capex:800, bvps:38   },
  { symbol:"MOIL",       name:"MOIL",                        sector:"Mining",        exchange:"NSE", price:395,   pe:14,  roe:14, roce:16, mktcap:6600,  ocf:400,  rev:1800,  revcagr:10, epscagr:12, opm:30, de:0,   fcf:360,  promo:64.7, ca:2000,  tl:300,   sh:168,  np:450,  dep:80,  capex:120, bvps:220  },
  { symbol:"WELCORP",    name:"Welspun Corp",                sector:"Metals",        exchange:"NSE", price:680,   pe:14,  roe:16, roce:18, mktcap:18000, ocf:800,  rev:12000, revcagr:12, epscagr:14, opm:12, de:0.5, fcf:580,  promo:53.9, ca:6000,  tl:3000,  sh:265,  np:1100, dep:250, capex:350, bvps:380  },
  { symbol:"GPIL",       name:"Godawari Power & Ispat",      sector:"Metals",        exchange:"NSE", price:820,   pe:8,   roe:20, roce:22, mktcap:5700,  ocf:500,  rev:5000,  revcagr:12, epscagr:14, opm:16, de:0.3, fcf:380,  promo:72.8, ca:2500,  tl:1000,  sh:70,   np:650,  dep:150, capex:220, bvps:380  },
  { symbol:"RATNAMANI",  name:"Ratnamani Metals & Tubes",    sector:"Metals",        exchange:"NSE", price:3650,  pe:28,  roe:20, roce:22, mktcap:18000, ocf:500,  rev:3500,  revcagr:14, epscagr:16, opm:16, de:0,   fcf:450,  promo:60.9, ca:2500,  tl:500,   sh:49,   np:640,  dep:100, capex:140, bvps:1200 },
  { symbol:"JINDALSAW",  name:"Jindal Saw",                  sector:"Metals",        exchange:"NSE", price:295,   pe:8,   roe:12, roce:14, mktcap:9500,  ocf:700,  rev:12000, revcagr:8,  epscagr:10, opm:10, de:0.6, fcf:480,  promo:46.3, ca:5000,  tl:3500,  sh:322,  np:1100, dep:350, capex:480, bvps:195  },
  { symbol:"SANDUMANG",  name:"Sandur Manganese",            sector:"Mining",        exchange:"NSE", price:380,   pe:8,   roe:14, roce:16, mktcap:2000,  ocf:200,  rev:1400,  revcagr:10, epscagr:12, opm:22, de:0,   fcf:175,  promo:56.5, ca:800,   tl:200,   sh:53,   np:250,  dep:50,  capex:70,  bvps:280  },

  // === AGRI / FERTILISERS (gaps) ===
  { symbol:"COROMANDEL", name:"Coromandel International",   sector:"Agri",          exchange:"NSE", price:1780,  pe:22,  roe:22, roce:24, mktcap:52000, ocf:1500, rev:22000, revcagr:10, epscagr:12, opm:10, de:0.1, fcf:1200, promo:55.3, ca:8000,  tl:2500,  sh:292,  np:2200, dep:200, capex:280, bvps:620  },
  { symbol:"DEEPAKFERT", name:"Deepak Fertilisers",         sector:"Chemicals",     exchange:"NSE", price:980,   pe:14,  roe:16, roce:18, mktcap:12600, ocf:700,  rev:7500,  revcagr:10, epscagr:12, opm:14, de:0.4, fcf:520,  promo:45.0, ca:3500,  tl:1800,  sh:129,  np:800,  dep:200, capex:280, bvps:520  },
  { symbol:"RCF",        name:"Rashtriya Chemicals",        sector:"Chemicals",     exchange:"NSE", price:115,   pe:12,  roe:10, roce:10, mktcap:6800,  ocf:400,  rev:8500,  revcagr:6,  epscagr:8,  opm:6,  de:0.5, fcf:280,  promo:75.0, ca:4000,  tl:2500,  sh:591,  np:500,  dep:150, capex:200, bvps:65   },
  { symbol:"CHAMBALFERT",name:"Chambal Fertilisers",        sector:"Agri",          exchange:"NSE", price:480,   pe:10,  roe:16, roce:18, mktcap:19900, ocf:900,  rev:16000, revcagr:8,  epscagr:10, opm:8,  de:0.3, fcf:700,  promo:57.0, ca:6000,  tl:2500,  sh:415,  np:1400, dep:150, capex:200, bvps:220  },
  { symbol:"FACT",       name:"Fertilisers and Chemicals Travancore",sector:"Agri", exchange:"NSE", price:680,   pe:14,  roe:14, roce:14, mktcap:29000, ocf:600,  rev:5500,  revcagr:8,  epscagr:10, opm:8,  de:0.4, fcf:440,  promo:90.0, ca:2500,  tl:1500,  sh:427,  np:800,  dep:100, capex:140, bvps:180  },

  // === MEDIA / EDUCATION ===
  { symbol:"TV18BRDCST", name:"TV18 Broadcast",             sector:"Media",         exchange:"NSE", price:42,    pe:0,   roe:4,  roce:4,  mktcap:9600,  ocf:200,  rev:3500,  revcagr:8,  epscagr:0,  opm:8,  de:0.3, fcf:100,  promo:56.3, ca:2000,  tl:1500,  sh:2286, np:0,    dep:150, capex:200, bvps:22   },
  { symbol:"NETWORK18",  name:"Network18 Media",            sector:"Media",         exchange:"NSE", price:58,    pe:0,   roe:4,  roce:4,  mktcap:17500, ocf:300,  rev:7000,  revcagr:8,  epscagr:0,  opm:8,  de:0.4, fcf:120,  promo:75.0, ca:4000,  tl:3000,  sh:3022, np:0,    dep:300, capex:400, bvps:28   },
  { symbol:"NDTV",       name:"NDTV",                       sector:"Media",         exchange:"NSE", price:195,   pe:28,  roe:8,  roce:8,  mktcap:2800,  ocf:60,   rev:500,   revcagr:8,  epscagr:6,  opm:12, de:0,   fcf:50,   promo:64.7, ca:400,   tl:100,   sh:144,  np:100,  dep:25,  capex:32,  bvps:195  },
  { symbol:"NIITLTD",    name:"NIIT",                        sector:"Education",     exchange:"NSE", price:125,   pe:18,  roe:12, roce:14, mktcap:1900,  ocf:100,  rev:800,   revcagr:10, epscagr:12, opm:12, de:0.2, fcf:80,   promo:30.0, ca:600,   tl:300,   sh:152,  np:105,  dep:30,  capex:42,  bvps:95   },
  { symbol:"CARTRADE",   name:"CarTrade Tech",               sector:"Internet",      exchange:"NSE", price:880,   pe:55,  roe:8,  roce:8,  mktcap:4700,  ocf:80,   rev:450,   revcagr:18, epscagr:10, opm:16, de:0,   fcf:72,   promo:28.0, ca:900,   tl:100,   sh:53,   np:85,   dep:20,  capex:28,  bvps:1580 },
  { symbol:"MAPMYINDIA", name:"C.E. Info Systems",           sector:"Internet",      exchange:"NSE", price:1680,  pe:55,  roe:22, roce:24, mktcap:9100,  ocf:120,  rev:400,   revcagr:22, epscagr:25, opm:28, de:0,   fcf:110,  promo:45.3, ca:600,   tl:100,   sh:54,   np:165,  dep:20,  capex:28,  bvps:780  },

  // === LOGISTICS (gaps) ===
  { symbol:"TCI",        name:"Transport Corporation of India",sector:"Logistics",  exchange:"NSE", price:980,   pe:18,  roe:16, roce:18, mktcap:7400,  ocf:280,  rev:4500,  revcagr:12, epscagr:14, opm:8,  de:0.3, fcf:220,  promo:70.0, ca:2000,  tl:800,   sh:76,   np:380,  dep:100, capex:140, bvps:480  },
  { symbol:"TCIEXP",     name:"TCI Express",                 sector:"Logistics",     exchange:"NSE", price:1050,  pe:28,  roe:20, roce:22, mktcap:4000,  ocf:150,  rev:1200,  revcagr:14, epscagr:16, opm:12, de:0,   fcf:135,  promo:67.3, ca:600,   tl:150,   sh:38,   np:145,  dep:30,  capex:42,  bvps:380  },
  { symbol:"VRL",        name:"VRL Logistics",               sector:"Logistics",     exchange:"NSE", price:480,   pe:22,  roe:16, roce:18, mktcap:4400,  ocf:220,  rev:2800,  revcagr:12, epscagr:14, opm:10, de:0.4, fcf:165,  promo:57.1, ca:1000,  tl:700,   sh:91,   np:200,  dep:150, capex:200, bvps:220  },
  { symbol:"SNOWMAN",    name:"Snowman Logistics",           sector:"Logistics",     exchange:"NSE", price:52,    pe:28,  roe:8,  roce:8,  mktcap:1300,  ocf:60,   rev:320,   revcagr:12, epscagr:10, opm:18, de:0.5, fcf:30,   promo:40.3, ca:300,   tl:350,   sh:250,  np:45,   dep:80,  capex:120, bvps:38   },
  { symbol:"AEGISLOG",   name:"Aegis Logistics",            sector:"Logistics",     exchange:"NSE", price:680,   pe:28,  roe:18, roce:20, mktcap:24500, ocf:500,  rev:5500,  revcagr:18, epscagr:20, opm:12, de:0.3, fcf:400,  promo:58.7, ca:2000,  tl:1000,  sh:360,  np:620,  dep:120, capex:180, bvps:220  },

  // === MISC HIGH-VOLUME (gaps) ===
  { symbol:"INOXLEISURE",name:"INOX Leisure",                sector:"Entertainment", exchange:"NSE", price:135,   pe:28,  roe:8,  roce:8,  mktcap:1700,  ocf:180,  rev:1200,  revcagr:12, epscagr:0,  opm:14, de:0.8, fcf:60,   promo:47.9, ca:600,   tl:800,   sh:126,  np:55,   dep:250, capex:350, bvps:120  },
  { symbol:"ZAGGLE",     name:"Zaggle Prepaid Ocean Services",sector:"Fintech",      exchange:"NSE", price:280,   pe:35,  roe:14, roce:14, mktcap:3100,  ocf:80,   rev:800,   revcagr:35, epscagr:30, opm:12, de:0.1, fcf:65,   promo:50.0, ca:500,   tl:200,   sh:111,  np:88,   dep:20,  capex:28,  bvps:195  },
  { symbol:"KFINTECH",   name:"KFin Technologies",           sector:"Fintech",       exchange:"NSE", price:920,   pe:35,  roe:22, roce:24, mktcap:14700, ocf:280,  rev:850,   revcagr:18, epscagr:20, opm:28, de:0,   fcf:260,  promo:74.9, ca:700,   tl:150,   sh:160,  np:420,  dep:30,  capex:40,  bvps:320  },
  { symbol:"CAMS",       name:"Computer Age Management",     sector:"Fintech",       exchange:"NSE", price:4150,  pe:45,  roe:28, roce:30, mktcap:20100, ocf:350,  rev:950,   revcagr:16, epscagr:18, opm:38, de:0,   fcf:330,  promo:30.0, ca:800,   tl:150,   sh:48,   np:445,  dep:30,  capex:38,  bvps:780  },
  { symbol:"MSTCLTD",    name:"MSTC",                        sector:"Utilities",     exchange:"NSE", price:480,   pe:14,  roe:16, roce:16, mktcap:3000,  ocf:150,  rev:800,   revcagr:10, epscagr:12, opm:14, de:0,   fcf:130,  promo:64.8, ca:600,   tl:150,   sh:63,   np:195,  dep:15,  capex:20,  bvps:280  },
  { symbol:"UPDATER",    name:"UDS (Updater Services)",      sector:"Utilities",     exchange:"NSE", price:320,   pe:22,  roe:14, roce:14, mktcap:2100,  ocf:80,   rev:2200,  revcagr:18, epscagr:16, opm:6,  de:0.3, fcf:55,   promo:67.0, ca:800,   tl:500,   sh:66,   np:95,   dep:40,  capex:55,  bvps:220  },
  { symbol:"PRUDENT",    name:"Prudent Corporate Advisory",  sector:"Fintech",       exchange:"NSE", price:2050,  pe:35,  roe:22, roce:24, mktcap:7000,  ocf:120,  rev:600,   revcagr:22, epscagr:25, opm:22, de:0,   fcf:110,  promo:74.2, ca:600,   tl:100,   sh:34,   np:200,  dep:15,  capex:20,  bvps:680  },
  { symbol:"LATENTVIEW", name:"LatentView Analytics",        sector:"IT",            exchange:"NSE", price:380,   pe:42,  roe:16, roce:18, mktcap:8000,  ocf:150,  rev:600,   revcagr:28, epscagr:22, opm:22, de:0,   fcf:140,  promo:54.3, ca:800,   tl:100,   sh:211,  np:190,  dep:20,  capex:28,  bvps:280  },
  { symbol:"HAPPSTMNDS", name:"Happiest Minds Technologies", sector:"IT",            exchange:"NSE", price:695,   pe:38,  roe:22, roce:24, mktcap:10000, ocf:200,  rev:1650,  revcagr:18, epscagr:20, opm:18, de:0,   fcf:180,  promo:52.8, ca:1000,  tl:200,   sh:144,  np:260,  dep:40,  capex:55,  bvps:265  },
  { symbol:"DATAMATICS", name:"Datamatics Global Services",  sector:"IT",            exchange:"NSE", price:680,   pe:18,  roe:14, roce:16, mktcap:5500,  ocf:150,  rev:1200,  revcagr:14, epscagr:12, opm:14, de:0,   fcf:130,  promo:56.3, ca:900,   tl:200,   sh:81,   np:280,  dep:30,  capex:40,  bvps:380  },
  { symbol:"RSYSTEMS",   name:"R Systems International",     sector:"IT",            exchange:"NSE", price:580,   pe:22,  roe:18, roce:20, mktcap:3800,  ocf:120,  rev:900,   revcagr:14, epscagr:16, opm:14, de:0,   fcf:108,  promo:65.0, ca:600,   tl:100,   sh:65,   np:175,  dep:25,  capex:32,  bvps:280  },
  { symbol:"RRKABEL",    name:"RR Kabel",                    sector:"Capital Goods", exchange:"NSE", price:1280,  pe:38,  roe:18, roce:20, mktcap:16200, ocf:250,  rev:5000,  revcagr:18, epscagr:20, opm:8,  de:0.2, fcf:200,  promo:75.0, ca:2500,  tl:1000,  sh:127,  np:425,  dep:60,  capex:90,  bvps:380  },
  { symbol:"KAYNES",     name:"Kaynes Technology",           sector:"Capital Goods", exchange:"NSE", price:3800,  pe:75,  roe:18, roce:18, mktcap:22800, ocf:200,  rev:1800,  revcagr:40, epscagr:45, opm:14, de:0.3, fcf:150,  promo:59.1, ca:1200,  tl:600,   sh:60,   np:300,  dep:60,  capex:90,  bvps:680  },
  { symbol:"SENCO",      name:"Senco Gold",                  sector:"Consumer",      exchange:"NSE", price:920,   pe:22,  roe:16, roce:18, mktcap:6700,  ocf:180,  rev:4500,  revcagr:18, epscagr:16, opm:8,  de:0.5, fcf:120,  promo:74.5, ca:2500,  tl:1500,  sh:73,   np:295,  dep:40,  capex:60,  bvps:420  },
  { symbol:"KALYAN",     name:"Kalyan Jewellers",            sector:"Consumer",      exchange:"NSE", price:580,   pe:35,  roe:14, roce:14, mktcap:58000, ocf:600,  rev:18000, revcagr:18, epscagr:20, opm:8,  de:0.8, fcf:350,  promo:62.4, ca:6000,  tl:4000,  sh:1000, np:900,  dep:100, capex:150, bvps:180  },
  { symbol:"MANYAVAR",   name:"Vedant Fashions (Manyavar)",  sector:"Retail",        exchange:"NSE", price:920,   pe:45,  roe:28, roce:30, mktcap:23700, ocf:500,  rev:1800,  revcagr:18, epscagr:20, opm:38, de:0,   fcf:465,  promo:78.0, ca:1000,  tl:200,   sh:258,  np:525,  dep:30,  capex:45,  bvps:220  },
];

// === Dedup filter ===
const VALID_SYM = /^[A-Z0-9&_-]{2,25}$/;
const addedInBatch = new Set<string>();

const deduped = candidates.filter(c => {
  if (!VALID_SYM.test(c.symbol)) { console.log(`SKIP invalid: ${c.symbol}`); return false; }
  if (existingStocks.has(c.symbol)) { console.log(`SKIP exists: ${c.symbol}`); return false; }
  if (addedInBatch.has(c.symbol)) { console.log(`SKIP intra-batch dup: ${c.symbol}`); return false; }
  addedInBatch.add(c.symbol);
  return true;
});

console.log(`\nCandidates:      ${candidates.length}`);
console.log(`After dedup:     ${deduped.length}`);
console.log(`Projected total: ${existingStocks.size + deduped.length}`);

if (deduped.length === 0) { console.log("Nothing new to add."); process.exit(0); }

function quoteKey(sym: string): string {
  return /^[0-9]|[^A-Z0-9_]/.test(sym) ? `"${sym}"` : sym;
}

const stockEntries = deduped.map(c => {
  const k = quoteKey(c.symbol);
  return [
    `  ${k}: {`,
    `    symbol: '${c.symbol}', name: '${c.name}', sector: '${c.sector}', exchange: '${c.exchange}',`,
    `    price: ${c.price}, pe: ${c.pe}, roe: ${c.roe}, roce: ${c.roce}, mktcap: ${c.mktcap},`,
    `    ocf: ${c.ocf}, rev: ${c.rev}, revcagr: ${c.revcagr}, epscagr: ${c.epscagr},`,
    `    opm: ${c.opm}, de: ${c.de}, fcf: ${c.fcf}, promo: ${c.promo},`,
    `    ca: ${c.ca}, tl: ${c.tl}, sh: ${c.sh}, np: ${c.np},`,
    `    dep: ${c.dep}, capex: ${c.capex}, bvps: ${c.bvps},`,
    `  },`,
  ].join('\n');
}).join('\n');

const closingBrace = stocksContent.lastIndexOf("};");
if (closingBrace === -1) { console.error("ERROR: No closing '};'"); process.exit(1); }

const updated = stocksContent.slice(0, closingBrace) + stockEntries + "\n" + stocksContent.slice(closingBrace);
fs.writeFileSync(stocksPath, updated, "utf-8");
console.log(`\nWrote ${deduped.length} new stocks to data/stocks/index.ts`);
console.log("Next: npx tsx scripts/validateStocks.ts");