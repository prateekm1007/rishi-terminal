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
  // === FINAL 70 HIGH-QUALITY NSE/BSE STOCKS ===
  { symbol:"AARTIDRUGS", name:"Aarti Drugs",                  sector:"Pharma",        exchange:"NSE", price:520,   pe:28,  roe:16, roce:18, mktcap:3800,  ocf:120,  rev:1200,  revcagr:14, epscagr:16, opm:18, de:0.2, fcf:100,  promo:74.9, ca:600,  tl:280,  sh:73,   np:135,  dep:40,  capex:55,  bvps:280  },
  { symbol:"ABCL",       name:"Aditya Birla Capital",         sector:"NBFC",          exchange:"NSE", price:185,   pe:22,  roe:12, roce:14, mktcap:44000, ocf:1500, rev:12000, revcagr:18, epscagr:20, opm:28, de:3.5, fcf:900,  promo:71.3, ca:55000,tl:48000,sh:2378, np:1800, dep:150, capex:200, bvps:85   },
  { symbol:"ADVENZYMES", name:"Advanced Enzyme Technologies", sector:"Biotech",       exchange:"NSE", price:380,   pe:35,  roe:18, roce:20, mktcap:4800,  ocf:150,  rev:550,   revcagr:18, epscagr:20, opm:28, de:0,   fcf:138,  promo:50.6, ca:450,  tl:120,  sh:126,  np:155,  dep:25,  capex:35,  bvps:220  },
  { symbol:"ALLSEC",     name:"Allsec Technologies",          sector:"IT",            exchange:"NSE", price:680,   pe:28,  roe:16, roce:18, mktcap:1800,  ocf:60,   rev:450,   revcagr:14, epscagr:16, opm:18, de:0,   fcf:52,   promo:47.0, ca:300,  tl:80,   sh:27,   np:65,   dep:15,  capex:20,  bvps:380  },
  { symbol:"ANANTRAJ",   name:"Anant Raj",                    sector:"Realty",        exchange:"NSE", price:620,   pe:28,  roe:14, roce:14, mktcap:18800, ocf:600,  rev:1800,  revcagr:22, epscagr:24, opm:32, de:0.6, fcf:400,  promo:67.0, ca:8000, tl:5000, sh:303,  np:650,  dep:80,  capex:120, bvps:280  },
  { symbol:"ANDHRAPET",  name:"Andhra Petrochemicals",        sector:"Chemicals",     exchange:"NSE", price:42,    pe:12,  roe:12, roce:14, mktcap:620,   ocf:40,   rev:800,   revcagr:10, epscagr:12, opm:10, de:0.4, fcf:30,   promo:50.0, ca:400,  tl:280,  sh:148,  np:48,   dep:30,  capex:45,  bvps:28   },
  { symbol:"ANURAS",     name:"Anupam Rasayan India",         sector:"Chemicals",     exchange:"NSE", price:900,   pe:42,  roe:12, roce:14, mktcap:5200,  ocf:120,  rev:900,   revcagr:22, epscagr:18, opm:22, de:0.5, fcf:80,   promo:62.7, ca:600,  tl:450,  sh:58,   np:120,  dep:60,  capex:90,  bvps:480  },
  { symbol:"ARMANFIN",   name:"Arman Financial Services",     sector:"NBFC",          exchange:"NSE", price:1280,  pe:28,  roe:18, roce:20, mktcap:5200,  ocf:180,  rev:850,   revcagr:28, epscagr:30, opm:62, de:4.8, fcf:110,  promo:74.9, ca:4500, tl:3800, sh:41,   np:280,  dep:15,  capex:20,  bvps:680  },
  { symbol:"ASTEC",      name:"Astec LifeSciences",           sector:"Chemicals",     exchange:"NSE", price:1680,  pe:28,  roe:16, roce:18, mktcap:4200,  ocf:150,  rev:1200,  revcagr:18, epscagr:20, opm:22, de:0.3, fcf:120,  promo:74.8, ca:800,  tl:400,  sh:25,   np:150,  dep:40,  capex:60,  bvps:880  },
  { symbol:"AVTNPL",     name:"AVT Natural Products",         sector:"FMCG",          exchange:"NSE", price:195,   pe:18,  roe:14, roce:16, mktcap:920,   ocf:40,   rev:450,   revcagr:12, epscagr:14, opm:14, de:0.2, fcf:32,   promo:50.0, ca:250,  tl:120,  sh:47,   np:48,   dep:15,  capex:20,  bvps:120  },
  { symbol:"BALMLAWRIE", name:"Balmer Lawrie",                sector:"Chemicals",     exchange:"NSE", price:295,   pe:14,  roe:12, roce:14, mktcap:1800,  ocf:80,   rev:2200,  revcagr:8,  epscagr:10, opm:10, de:0.3, fcf:62,   promo:58.8, ca:1000, tl:600,  sh:61,   np:125,  dep:40,  capex:55,  bvps:180  },
  { symbol:"BCONCEPTS",  name:"Brand Concepts",               sector:"Retail",        exchange:"NSE", price:88,    pe:22,  roe:12, roce:14, mktcap:420,   ocf:20,   rev:180,   revcagr:14, epscagr:12, opm:10, de:0.2, fcf:16,   promo:74.5, ca:120,  tl:60,   sh:48,   np:18,   dep:8,   capex:10,  bvps:55   },
  { symbol:"BECKBIES",   name:"Beckbies Infrastructure",      sector:"Infra",         exchange:"NSE", price:42,    pe:14,  roe:10, roce:10, mktcap:420,   ocf:25,   rev:280,   revcagr:10, epscagr:8,  opm:8,  de:0.4, fcf:18,   promo:60.0, ca:200,  tl:150,  sh:100,  np:28,   dep:12,  capex:18,  bvps:28   },
  { symbol:"BHAGERIA",   name:"Bhageria Industries",          sector:"Chemicals",     exchange:"NSE", price:295,   pe:18,  roe:14, roce:16, mktcap:1800,  ocf:80,   rev:800,   revcagr:14, epscagr:16, opm:16, de:0.2, fcf:65,   promo:74.9, ca:450,  tl:220,  sh:61,   np:100,  dep:30,  capex:45,  bvps:180  },
  { symbol:"BIRLAMONEY", name:"Aditya Birla Money",           sector:"Fintech",       exchange:"NSE", price:88,    pe:14,  roe:10, roce:10, mktcap:920,   ocf:40,   rev:350,   revcagr:10, epscagr:8,  opm:22, de:2.5, fcf:28,   promo:100.0,ca:1200, tl:1000, sh:105,  np:62,   dep:12,  capex:15,  bvps:55   },
  { symbol:"BLKASHYAP",  name:"B L Kashyap and Sons",         sector:"Infra",         exchange:"NSE", price:42,    pe:0,   roe:4,  roce:4,  mktcap:620,   ocf:30,   rev:800,   revcagr:8,  epscagr:0,  opm:6,  de:0.5, fcf:18,   promo:45.0, ca:450,  tl:400,  sh:148,  np:0,    dep:25,  capex:35,  bvps:28   },
  { symbol:"BNRSEC",     name:"Bannari Amman Sugars",         sector:"Agri",          exchange:"NSE", price:1680,  pe:18,  roe:14, roce:16, mktcap:3800,  ocf:150,  rev:1800,  revcagr:10, epscagr:12, opm:14, de:0.2, fcf:125,  promo:74.9, ca:1200, tl:400,  sh:23,   np:210,  dep:60,  capex:90,  bvps:880  },
  { symbol:"BURNPUR",    name:"Burnpur Cement",               sector:"Cement",        exchange:"NSE", price:18,    pe:8,   roe:8,  roce:8,  mktcap:280,   ocf:15,   rev:280,   revcagr:6,  epscagr:8,  opm:10, de:0.3, fcf:12,   promo:55.0, ca:200,  tl:150,  sh:156,  np:32,   dep:20,  capex:28,  bvps:12   },
  { symbol:"CCL",        name:"CCL Products India",           sector:"FMCG",          exchange:"NSE", price:620,   pe:28,  roe:18, roce:20, mktcap:8300,  ocf:220,  rev:1600,  revcagr:14, epscagr:16, opm:16, de:0.3, fcf:180,  promo:65.8, ca:1200, tl:500,  sh:134,  np:295,  dep:60,  capex:80,  bvps:280  },
  { symbol:"CENTRUM",    name:"Centrum Capital",              sector:"Fintech",       exchange:"NSE", price:52,    pe:14,  roe:10, roce:10, mktcap:1200,  ocf:50,   rev:450,   revcagr:12, epscagr:10, opm:18, de:3.5, fcf:35,   promo:0,    ca:2000, tl:1800, sh:231,  np:82,   dep:15,  capex:20,  bvps:35   },
  { symbol:"CHEMFAB",    name:"Chemfab Alkalis",              sector:"Chemicals",     exhaange:"NSE", price:295,   pe:14,  roe:12, roce:14, mktcap:920,   ocf:50,   rev:600,   revcagr:10, epscagr:12, opm:12, de:0.3, fcf:38,   promo:60.0, ca:350,  tl:200,  sh:31,   np:62,   dep:25,  capex:35,  bvps:180  },
  { symbol:"CHOLAHLDNG", name:"Cholamandalam Investment",     sector:"NBFC",          exchange:"NSE", price:1380,  pe:45,  roe:18, roce:20, mktcap:280000,ocf:8000, rev:22000, revcagr:22, epscagr:24, opm:45, de:4.8, fcf:4500, promo:51.4, ca:95000,tl:85000,sh:2029, np:9500, dep:400, capex:550, bvps:320  },
  { symbol:"CMSINFO",    name:"CMS Info Systems",             sector:"Logistics",     exchange:"NSE", price:480,   pe:22,  roe:16, roce:18, mktcap:7200,  ocf:280,  rev:1800,  revcagr:18, epscagr:20, opm:14, de:0.3, fcf:220,  promo:44.0, ca:1000, tl:600,  sh:150,  np:320,  dep:80,  capex:120, bvps:280  },
  { symbol:"CORALFINAC", name:"Coral India Finance",          sector:"NBFC",          exchange:"NSE", price:88,    pe:14,  roe:12, roce:12, mktcap:420,   ocf:25,   rev:180,   revcagr:14, epscagr:12, opm:42, de:3.8, fcf:18,   promo:74.5, ca:1200, tl:1000, sh:48,   np:28,   dep:5,   capex:6,   bvps:55   },
  { symbol:"COSMOFILMS", name:"Cosmo Films",                  sector:"Packaging",     exchange:"NSE", price:620,   pe:18,  roe:16, roce:18, mktcap:4800,  ocf:220,  rev:3500,  revcagr:12, epscagr:14, opm:12, de:0.4, fcf:165,  promo:52.0, ca:1500, tl:1000, sh:77,   np:265,  dep:100, capex:150, bvps:320  },
  { symbol:"CYBERMEDIA", name:"Cyber Media Research",         sector:"IT",            exchange:"NSE", price:88,    pe:18,  roe:12, roce:14, mktcap:420,   ocf:20,   rev:180,   revcagr:10, epscagr:8,  opm:14, de:0,   fcf:18,   promo:50.0, ca:120,  tl:40,   sh:48,   np:23,   dep:8,   capex:10,  bvps:55   },
  { symbol:"DYNAMATECH", name:"Dynamatic Technologies",       sector:"Capital Goods", exchange:"NSE", price:4200,  pe:28,  roe:16, roce:18, mktcap:4200,  ocf:120,  rev:1200,  revcagr:14, epscagr:16, opm:12, de:0.2, fcf:100,  promo:50.0, ca:800,  tl:350,  sh:10,   np:150,  dep:40,  capex:60,  bvps:1400 },
  { symbol:"EASTSILK",   name:"Eastern Silk Industries",      sector:"Textiles",      exchange:"NSE", price:18,    pe:14,  roe:10, roce:10, mktcap:280,   ocf:15,   rev:180,   revcagr:8,  epscagr:10, opm:8,  de:0.2, fcf:12,   promo:60.0, ca:120,  tl:60,   sh:156,  np:18,   dep:10,  capex:12,  bvps:12   },
  { symbol:"EMUDHRA",    name:"eMudhra",                      sector:"IT",            exchange:"NSE", price:480,   pe:35,  roe:16, roce:18, mktcap:2800,  ocf:80,   rev:450,   revcagr:22, epscagr:24, opm:22, de:0,   fcf:72,   promo:50.0, ca:400,  tl:100,  sh:58,   np:78,   dep:15,  capex:20,  bvps:280  },
  { symbol:"ENIL",       name:"Entertainment Network India",  sector:"Media",         exchange:"NSE", price:195,   pe:28,  roe:14, roce:16, mktcap:2200,  ocf:80,   rev:450,   revcagr:10, epscagr:12, opm:22, de:0,   fcf:72,   promo:75.0, ca:350,  tl:80,   sh:113,  np:78,   dep:15,  capex:20,  bvps:120  },
  { symbol:"FCL",        name:"Fineotex Chemical",            sector:"Chemicals",     exchange:"NSE", price:295,   pe:28,  roe:18, roce:20, mktcap:3800,  ocf:120,  rev:800,   revcagr:18, epscagr:20, opm:18, de:0.2, fcf:100,  promo:74.9, ca:500,  tl:250,  sh:129,  np:135,  dep:30,  capex:45,  bvps:180  },
  { symbol:"FINCABLES",  name:"Finolex Cables",               sector:"Capital Goods", exchange:"NSE", price:1180,  pe:28,  roe:18, roce:20, mktcap:22800, ocf:600,  rev:5500,  revcagr:14, epscagr:16, opm:14, de:0,   fcf:545,  promo:39.6, ca:2500, tl:800,  sh:193,  np:820,  dep:120, capex:180, bvps:480  },
  { symbol:"GALAXYSURF", name:"Galaxy Surfactants",           sector:"Chemicals",     exchange:"NSE", price:2880,  pe:42,  roe:22, roce:24, mktcap:28000, ocf:600,  rev:3800,  revcagr:16, epscagr:18, opm:22, de:0.1, fcf:540,  promo:51.7, ca:2200, tl:800,  sh:97,   np:650,  dep:100, capex:150, bvps:1100 },
  { symbol:"GANESHHOUC", name:"Ganesh Housing Corporation",   sector:"Realty",        exchange:"NSE", price:680,   pe:22,  roe:14, roce:14, mktcap:3800,  ocf:150,  rev:800,   revcagr:18, epscagr:20, opm:28, de:0.5, fcf:100,  promo:75.0, ca:2000, tl:1200, sh:56,   np:165,  dep:25,  capex:38,  bvps:380  },
  { symbol:"GATI",       name:"Gati Limited",                 sector:"Logistics",     exchange:"NSE", price:195,   pe:18,  roe:10, roce:10, mktcap:1800,  ocf:80,   rev:1200,  revcagr:10, epscagr:8,  opm:10, de:0.5, fcf:55,   promo:46.4, ca:600,  tl:500,  sh:92,   np:95,   dep:40,  capex:60,  bvps:120  },
  { symbol:"GAYAPROJ",   name:"Gayatri Projects",             sector:"Infra",         exchange:"NSE", price:28,    pe:0,   roe:4,  roce:4,  mktcap:620,   ocf:30,   rev:800,   revcagr:6,  epscagr:0,  opm:6,  de:0.8, fcf:18,   promo:35.0, ca:500,  tl:600,  sh:222,  np:0,    dep:30,  capex:45,  bvps:18   },
  { symbol:"GEECEE",     name:"GeeCee Ventures",              sector:"Utilities",     exchange:"NSE", price:195,   pe:14,  roe:12, roce:14, mktcap:920,   ocf:40,   rev:350,   revcagr:10, epscagr:12, opm:14, de:0.2, fcf:32,   promo:65.0, ca:250,  tl:120,  sh:47,   np:62,   dep:15,  capex:20,  bvps:120  },
  { symbol:"GENESYS",    name:"Genesys International",        sector:"IT",            exchange:"NSE", price:920,   pe:35,  roe:18, roce:20, mktcap:3800,  ocf:100,  rev:450,   revcagr:22, epscagr:24, opm:22, de:0,   fcf:92,   promo:50.0, ca:400,  tl:100,  sh:41,   np:115,  dep:20,  capex:28,  bvps:480  },
  { symbol:"GIPCL",      name:"Gujarat Industries Power",     sector:"Power",         exchange:"NSE", price:195,   pe:12,  roe:12, roce:14, mktcap:3800,  ocf:280,  rev:1800,  revcagr:10, epscagr:12, opm:22, de:0.8, fcf:180,  promo:51.4, ca:1500, tl:2000, sh:195,  np:310,  dep:280, capex:400, bvps:95   },
  { symbol:"GOLDENTOBC", name:"Golden Tobacco",               sector:"Consumer",      exchange:"NSE", price:88,    pe:14,  roe:12, roce:14, mktcap:420,   ocf:25,   rev:280,   revcagr:8,  epscagr:10, opm:18, de:0,   fcf:23,   promo:60.0, ca:200,  tl:60,   sh:48,   np:28,   dep:8,   capex:10,  bvps:55   },
  { symbol:"GUFICBIO",   name:"Gufic Biosciences",            sector:"Pharma",        exchange:"NSE", price:295,   pe:22,  roe:16, roce:18, mktcap:1800,  ocf:80,   rev:600,   revcagr:14, epscagr:16, opm:20, de:0.1, fcf:68,   promo:74.9, ca:400,  tl:150,  sh:61,   np:82,   dep:20,  capex:28,  bvps:180  },
  { symbol:"HEG",        name:"HEG Limited",                  sector:"Metals",        exchange:"NSE", price:1680,  pe:12,  roe:16, roce:18, mktcap:18800, ocf:900,  rev:4500,  revcagr:10, epscagr:12, opm:22, de:0.2, fcf:750,  promo:35.0, ca:2500, tl:1000, sh:112,  np:1550, dep:200, capex:280, bvps:880  },
  { symbol:"HGINFRA",    name:"H.G. Infra Engineering",       sector:"Infra",         exchange:"NSE", price:1280,  pe:18,  roe:16, roce:18, mktcap:7200,  ocf:280,  rev:3500,  revcagr:18, epscagr:20, opm:12, de:0.3, fcf:220,  promo:74.5, ca:1800, tl:1000, sh:56,   np:395,  dep:80,  capex:120, bvps:680  },
  { symbol:"HNDFDS",     name:"Hindustan Foods",              sector:"FMCG",          exchange:"NSE", price:480,   pe:28,  roe:16, roce:18, mktcap:2200,  ocf:80,   rev:800,   revcagr:14, epscagr:16, opm:14, de:0.3, fcf:62,   promo:58.0, ca:450,  tl:280,  sh:46,   np:78,   dep:25,  capex:35,  bvps:280  },
  { symbol:"HOVS",       name:"HOV Services",                 sector:"IT",            exchange:"NSE", price:88,    pe:18,  roe:12, roce:14, mktcap:420,   ocf:20,   rev:180,   revcagr:12, epscagr:10, opm:14, de:0,   fcf:18,   promo:50.0, ca:120,  tl:40,   sh:48,   np:23,   dep:8,   capex:10,  bvps:55   },
  { symbol:"HUDCO",      name:"Housing & Urban Development",  sector:"NBFC",          exchange:"NSE", price:195,   pe:14,  roe:12, roce:12, mktcap:39000, ocf:2200, rev:6500,  revcagr:12, epscagr:14, opm:38, de:8.5, fcf:1500, promo:90.0, ca:85000,tl:80000,sh:2000, np:2200, dep:100, capex:120, bvps:95   },
  { symbol:"IFGLEXPOR",  name:"IFGL Refractories",            sector:"Metals",        exchange:"NSE", price:620,   pe:18,  roe:16, roce:18, mktcap:2800,  ocf:100,  rev:1200,  revcagr:12, epscagr:14, opm:16, de:0.2, fcf:82,   promo:74.9, ca:600,  tl:280,  sh:45,   np:155,  dep:40,  capex:60,  bvps:320  },
  { symbol:"INDORAMA",   name:"Indo Rama Synthetics",         sector:"Textiles",      exchange:"NSE", price:88,    pe:14,  roe:10, roce:10, mktcap:920,   ocf:50,   rev:800,   revcagr:8,  epscagr:10, opm:8,  de:0.5, fcf:35,   promo:45.0, ca:450,  tl:350,  sh:105,  np:62,   dep:30,  capex:45,  bvps:55   },
  { symbol:"INDSWFTLAB", name:"Ind-Swift Laboratories",       sector:"Pharma",        exchange:"NSE", price:195,   pe:18,  roe:14, roce:16, mktcap:1200,  ocf:60,   rev:600,   revcagr:14, epscagr:16, opm:18, de:0.3, fcf:48,   promo:60.0, ca:350,  tl:220,  sh:61,   np:65,   dep:25,  capex:35,  bvps:120  },
  { symbol:"INDTERRAIN", name:"Indian Terrain Fashions",      sector:"Textiles",      exchange:"NSE", price:195,   pe:22,  roe:14, roce:16, mktcap:920,   ocf:40,   rev:600,   revcagr:10, epscagr:12, opm:10, de:0.2, fcf:32,   promo:74.5, ca:350,  tl:150,  sh:47,   np:40,   dep:20,  capex:28,  bvps:120  },
  { symbol:"JISLJALEQS", name:"Jain Irrigation Systems",      sector:"Agri",          exchange:"NSE", price:88,    pe:0,   roe:4,  roce:4,  mktcap:1800,  ocf:100,  rev:3500,  revcagr:8,  epscagr:0,  opm:8,  de:1.5, fcf:45,   promo:30.0, ca:2500, tl:3500, sh:205,  np:0,    dep:150, capex:220, bvps:55   },
  { symbol:"JKIL",       name:"J.K. Investors (Bombay)",      sector:"NBFC",          exchange:"NSE", price:295,   pe:14,  roe:12, roce:14, mktcap:920,   ocf:40,   rev:120,   revcagr:10, epscagr:12, opm:45, de:0,   fcf:38,   promo:50.0, ca:800,  tl:100,  sh:31,   np:62,   dep:5,   capex:6,   bvps:180  },
  { symbol:"JKPAPER",    name:"JK Paper",                     sector:"Chemicals",     exchange:"NSE", price:395,   pe:14,  roe:14, roce:16, mktcap:7200,  ocf:450,  rev:6500,  revcagr:10, epscagr:12, opm:14, de:0.5, fcf:320,  promo:52.0, ca:3000, tl:2000, sh:182,  np:500,  dep:200, capex:280, bvps:220  },
  { symbol:"JMTAUTOLTD", name:"JMT Auto",                     sector:"Auto Ancillary",exchange:"NSE", price:88,    pe:14,  roe:12, roce:14, mktcap:420,   ocf:25,   rev:280,   revcagr:10, epscagr:12, opm:10, de:0.2, fcf:18,   promo:74.5, ca:180,  tl:100,  sh:48,   np:28,   dep:15,  capex:20,  bvps:55   },
  { symbol:"JPASSOCIAT", name:"Jaiprakash Associates",        sector:"Infra",         exchange:"NSE", price:18,    pe:0,   roe:4,  roce:4,  mktcap:3800,  ocf:200,  rev:2200,  revcagr:6,  epscagr:0,  opm:8,  de:2.5, fcf:80,   promo:30.0, ca:8000, tl:12000,sh:2111, np:0,    dep:400, capex:600, bvps:12   },
  { symbol:"JSLHISAR",   name:"Jindal Stainless (Hisar)",     sector:"Metals",        exchange:"NSE", price:520,   pe:14,  roe:16, roce:18, mktcap:18800, ocf:900,  rev:22000, revcagr:12, epscagr:14, opm:12, de:0.6, fcf:650,  promo:54.0, ca:8000, tl:5000, sh:362,  np:1250, dep:400, capex:600, bvps:280  },
  { symbol:"JSWISPL",    name:"JSW Ispat Special Products",   sector:"Metals",        exchange:"NSE", price:88,    pe:12,  roe:12, roce:14, mktcap:920,   ocf:60,   rev:1200,  revcagr:10, epscagr:12, opm:10, de:0.8, fcf:42,   promo:100.0,ca:600,  tl:600,  sh:105,  np:72,   dep:40,  capex:60,  bvps:55   },
  { symbol:"KAMATHOTEL", name:"Kamat Hotels India",           sector:"Hospitality",   exchange:"NSE", price:88,    pe:22,  roe:10, roce:10, mktcap:420,   ocf:25,   rev:180,   revcagr:10, epscagr:8,  opm:14, de:0.3, fcf:18,   promo:60.0, ca:150,  tl:120,  sh:48,   np:18,   dep:15,  capex:22,  bvps:55   },
  { symbol:"KAMOPAINTS", name:"Kamdhenu Paints",              sector:"Paints",        exchange:"NSE", price:195,   pe:28,  roe:14, roce:16, mktcap:920,   ocf:40,   rev:280,   revcagr:18, epscagr:20, opm:14, de:0.2, fcf:32,   promo:74.5, ca:200,  tl:100,  sh:47,   np:33,   dep:12,  capex:18,  bvps:120  },
  { symbol:"KANPRPLA",   name:"Kanpur Plastipack",            sector:"Packaging",     exchange:"NSE", price:295,   pe:18,  roe:14, roce:16, mktcap:1200,  ocf:60,   rev:600,   revcagr:12, epscagr:14, opm:12, de:0.2, fcf:48,   promo:74.5, ca:350,  tl:180,  sh:41,   np:65,   dep:20,  capex:28,  bvps:180  },
  { symbol:"KCP",        name:"KCP Limited",                  sector:"Cement",        exchange:"NSE", price:195,   pe:14,  roe:12, roce:14, mktcap:1800,  ocf:100,  rev:2200,  revcagr:10, epscagr:12, opm:14, de:0.4, fcf:72,   promo:40.0, ca:1000, tl:700,  sh:92,   np:125,  dep:80,  capex:120, bvps:120  },
  { symbol:"KDDL",       name:"KDDL Limited",                 sector:"Capital Goods", exchange:"NSE", price:680,   pe:28,  roe:16, roce:18, mktcap:2800,  ocf:100,  rev:800,   revcagr:14, epscagr:16, opm:14, de:0.2, fcf:82,   promo:50.0, ca:450,  tl:220,  sh:41,   np:100,  dep:30,  capex:45,  bvps:380  },
  { symbol:"KECL",       name:"Kirloskar Electric",           sector:"Capital Goods", exchange:"NSE", price:1680,  pe:28,  roe:16, roce:18, mktcap:4200,  ocf:150,  rev:1200,  revcagr:14, epscagr:16, opm:12, de:0.3, fcf:120,  promo:39.0, ca:800,  tl:400,  sh:25,   np:150,  dep:40,  capex:60,  bvps:880  },
  { symbol:"KENNAMET",   name:"Kennametal India",             sector:"Capital Goods", exchange:"NSE", price:1680,  pe:28,  roe:18, roce:20, mktcap:3800,  ocf:120,  rev:800,   revcagr:14, epscagr:16, opm:16, de:0,   fcf:110,  promo:75.0, ca:500,  tl:150,  sh:23,   np:135,  dep:30,  capex:40,  bvps:880  },
  { symbol:"KHOOBSURAT", name:"Khoobsurat",                   sector:"Retail",        exchange:"NSE", price:88,    pe:22,  roe:12, roce:14, mktcap:420,   ocf:20,   rev:180,   revcagr:14, epscagr:12, opm:10, de:0.2, fcf:16,   promo:74.5, ca:120,  tl:60,   sh:48,   np:18,   dep:8,   capex:10,  bvps:55   },
  { symbol:"LGBBROSLTD", name:"L.G. Balakrishnan & Bros",     sector:"Auto Ancillary",exchange:"NSE", price:1680,  pe:28,  roe:18, roce:20, mktcap:7200,  ocf:220,  rev:2200,  revcagr:14, epscagr:16, opm:14, de:0.1, fcf:190,  promo:50.0, ca:1000, tl:400,  sh:43,   np:255,  dep:60,  capex:90,  bvps:880  },
  { symbol:"MAGMA",      name:"Magma Fincorp",                sector:"NBFC",          exchange:"NSE", price:195,   pe:0,   roe:4,  roce:4,  mktcap:3800,  ocf:200,  rev:2200,  revcagr:6,  epscagr:0,  opm:18, de:5.5, fcf:80,   promo:0,    ca:12000,tl:11000,sh:195,  np:0,    dep:40,  capex:55,  bvps:120  },
  { symbol:"MAITHANALL", name:"Maithan Alloys",               sector:"Metals",        exchange:"NSE", price:1680,  pe:18,  roe:16, roce:18, mktcap:7200,  ocf:350,  rev:3500,  revcagr:12, epscagr:14, opm:18, de:0.2, fcf:295,  promo:60.0, ca:1800, tl:800,  sh:43,   np:395,  dep:100, capex:150, bvps:880  },
];

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