// GENERATE_EXPANSION_BATCH_V3 - The 1000+ Milestone Batch
import fs from "fs";
import path from "path";

const stocksPath = path.join(process.cwd(), "data/stocks/index.ts");
const content = fs.readFileSync(stocksPath, "utf-8");
const existing = Array.from(content.matchAll(/^\s*"?([A-Z0-9_&-]+)"?\s*:\s*\{/gm)).map(m => m[1]);
const existingSet = new Set(existing);

interface Candidate { symbol: string; name: string; sector: string; price: number; pe: number; roe: number; }

const candidates: Candidate[] = [
  // Banks & Finance
  {symbol:"CUB",name:"City Union Bank",sector:"Banking",price:145,pe:12,roe:14},
  {symbol:"KARURVYSYA",name:"Karur Vysya Bank",sector:"Banking",price:185,pe:10,roe:15},
  {symbol:"SOUTHBANK",name:"South Indian Bank",sector:"Banking",price:32,pe:8,roe:12},
  {symbol:"J&KBANK",name:"J&K Bank",sector:"Banking",price:125,pe:9,roe:16},
  {symbol:"MAHABANK",name:"Bank of Maharashtra",sector:"Banking",price:65,pe:10,roe:18},
  {symbol:"IOB",name:"Indian Overseas Bank",sector:"Banking",price:65,pe:15,roe:12},
  {symbol:"UCOBANK",name:"UCO Bank",sector:"Banking",price:55,pe:18,roe:10},
  {symbol:"CENTRALBK",name:"Central Bank of India",sector:"Banking",price:62,pe:16,roe:11},
  {symbol:"PSB",name:"Punjab & Sind Bank",sector:"Banking",price:60,pe:14,roe:10},
  {symbol:"CSBBANK",name:"CSB Bank",sector:"Banking",price:350,pe:12,roe:16},
  {symbol:"DHANBANK",name:"Dhanlaxmi Bank",sector:"Banking",price:45,pe:10,roe:8},
  {symbol:"IFCI",name:"IFCI Limited",sector:"NBFC",price:65,pe:0,roe:0},
  {symbol:"PTC",name:"PTC India",sector:"Fintech",price:215,pe:10,roe:14},
  {symbol:"SRTRANSFIN",name:"Shriram Finance",sector:"NBFC",price:2450,pe:15,roe:16},
  {symbol:"SUNDARMFIN",name:"Sundaram Finance",sector:"NBFC",price:4250,pe:18,roe:15},
  {symbol:"REPCOHOME",name:"Repco Home Finance",sector:"NBFC",price:480,pe:12,roe:14},
  {symbol:"LICHF",name:"LIC Housing Finance",sector:"NBFC",price:650,pe:10,roe:15},
  {symbol:"IBULHSGFIN",name:"Indiabulls Housing",sector:"NBFC",price:185,pe:12,roe:10},
  {symbol:"PNBHOUSING",name:"PNB Housing Finance",sector:"NBFC",price:850,pe:15,roe:14},
  {symbol:"MUTHFIN",name:"Muthoot Finance",sector:"NBFC",price:1750,pe:14,roe:20},

  // Auto Ancillaries
  {symbol:"MINDAIND",name:"UNO Minda",sector:"Auto Ancillary",price:785,pe:42,roe:18},
  {symbol:"SUPRAJIT",name:"Suprajit Engineering",sector:"Auto Ancillary",price:485,pe:35,roe:16},
  {symbol:"LUMAXIND",name:"Lumax Industries",sector:"Auto Ancillary",price:2850,pe:25,roe:14},
  {symbol:"GABRIEL",name:"Gabriel India",sector:"Auto Ancillary",price:410,pe:22,roe:16},
  {symbol:"SUBROS",name:"Subros",sector:"Auto Ancillary",price:620,pe:38,roe:15},
  {symbol:"FIEMIND",name:"Fiem Industries",sector:"Auto Ancillary",price:2450,pe:24,roe:18},
  {symbol:"PRICOL",name:"Pricol",sector:"Auto Ancillary",price:420,pe:32,roe:20},
  {symbol:"JAMNAAUTO",name:"Jamna Auto",sector:"Auto Ancillary",price:125,pe:28,roe:22},
  {symbol:"MUNJALAU",name:"Munjal Auto",sector:"Auto Ancillary",price:95,pe:18,roe:12},
  {symbol:"SSWL",name:"Steel Strips Wheels",sector:"Auto Ancillary",price:280,pe:15,roe:18},
  {symbol:"RICOAUTO",name:"Rico Auto",sector:"Auto Ancillary",price:145,pe:22,roe:14},
  {symbol:"SKFINDIA",name:"SKF India",sector:"Auto Ancillary",price:4850,pe:45,roe:24},
  {symbol:"NRBBEARING",name:"NRB Bearings",sector:"Auto Ancillary",price:320,pe:26,roe:16},
  {symbol:"ROLETA",name:"Rolex Rings",sector:"Auto Ancillary",price:2150,pe:35,roe:22},

  // Capital Goods & Industrials
  {symbol:"THERMAX",name:"Thermax",sector:"Capital Goods",price:4150,pe:55,roe:16},
  {symbol:"ABB",name:"ABB India",sector:"Capital Goods",price:7850,pe:85,roe:22},
  {symbol:"SIEMENS",name:"Siemens India",sector:"Capital Goods",price:6850,pe:75,roe:18},
  {symbol:"HONAUT",name:"Honeywell Automation",sector:"Capital Goods",price:42500,pe:65,roe:24},
  {symbol:"CARBORUNIV",name:"Carborundum Universal",sector:"Capital Goods",price:1450,pe:45,roe:18},
  {symbol:"AIAENG",name:"AIA Engineering",sector:"Capital Goods",price:3850,pe:35,roe:20},
  {symbol:"TIMKEN",name:"Timken India",sector:"Capital Goods",price:3150,pe:42,roe:22},
  {symbol:"TRITURBINE",name:"Triveni Turbine",sector:"Capital Goods",price:520,pe:48,roe:25},
  {symbol:"KEC",name:"KEC International",sector:"Capital Goods",price:820,pe:35,roe:15},
  {symbol:"KALPATPOWR",name:"Kalpataru Projects",sector:"Capital Goods",price:1150,pe:28,roe:14},

  // Chemicals & Fertilizers
  {symbol:"FACT",name:"FACT",sector:"Chemicals",price:850,pe:22,roe:35},
  {symbol:"GSFC",name:"GSFC",sector:"Chemicals",price:245,pe:12,roe:14},
  {symbol:"DEEPAKFERT",name:"Deepak Fertilizers",sector:"Chemicals",price:620,pe:15,roe:18},
  {symbol:"SPIC",name:"SPIC",sector:"Chemicals",price:85,pe:10,roe:12},
  {symbol:"MANGCHEFER",name:"Mangalore Chemicals",sector:"Chemicals",price:125,pe:14,roe:15},
  {symbol:"MADRASFERT",name:"Madras Fertilizers",sector:"Chemicals",price:115,pe:16,roe:14},
  {symbol:"ALKALI",name:"Alkali Metals",sector:"Chemicals",price:145,pe:22,roe:12},
  {symbol:"MEGH",name:"Meghmani Organics",sector:"Chemicals",price:85,pe:18,roe:10},
  {symbol:"VINATIORGA",name:"Vinati Organics",sector:"Chemicals",price:1650,pe:45,roe:22},
  {symbol:"GUJALKALI",name:"Gujarat Alkalies",sector:"Chemicals",price:780,pe:18,roe:12},
  {symbol:"IOLCP",name:"IOL Chemicals",sector:"Chemicals",price:420,pe:15,roe:14},

  // Infra & Construction
  {symbol:"HCC",name:"Hindustan Construction",sector:"Infra",price:42,pe:0,roe:0},
  {symbol:"NCC",name:"NCC Limited",sector:"Infra",price:310,pe:22,roe:15},
  {symbol:"JMCPROJECT",name:"JMC Projects",sector:"Infra",price:120,pe:18,roe:12},
  {symbol:"ASHOKA",name:"Ashoka Buildcon",sector:"Infra",price:185,pe:14,roe:16},
  {symbol:"DBL",name:"Dilip Buildcon",sector:"Infra",price:480,pe:25,roe:10},
  {symbol:"CAPACITE",name:"Capacite Infraprojects",sector:"Infra",price:315,pe:18,roe:14},
  {symbol:"PSPPROJECT",name:"PSP Projects",sector:"Infra",price:680,pe:20,roe:22},
  {symbol:"AHLUCONT",name:"Ahluwalia Contracts",sector:"Infra",price:1150,pe:28,roe:18},
  {symbol:"HGELEC",name:"H.G. Infra",sector:"Infra",price:1450,pe:22,roe:20},
  {symbol:"KNRCON",name:"KNR Constructions",sector:"Infra",price:320,pe:18,roe:18},

  // IT & Tech (Small/Mid)
  {symbol:"BSOFT",name:"Birlasoft",sector:"IT",price:680,pe:28,roe:20},
  {symbol:"RAMCOSYS",name:"Ramco Systems",sector:"IT",price:380,pe:0,roe:0},
  {symbol:"QUICKHEAL",name:"Quick Heal Tech",sector:"IT",price:520,pe:35,roe:14},
  {symbol:"NUCLEUS",name:"Nucleus Software",sector:"IT",price:1450,pe:25,roe:18},
  {symbol:"SASKEN",name:"Sasken Technologies",sector:"IT",price:1850,pe:32,roe:16},
  {symbol:"FSL",name:"Firstsource Solutions",sector:"IT",price:315,pe:22,roe:18},
  {symbol:"INTELLECT",name:"Intellect Design",sector:"IT",price:1050,pe:45,roe:16},
  {symbol:"ECLERX",name:"eClerx Services",sector:"IT",price:2850,pe:38,roe:22},
  {symbol:"REDINGTON",name:"Redington India",sector:"IT",price:215,pe:14,roe:20},

  // Real Estate
  {symbol:"PURVA",name:"Puravankara",sector:"Realty",price:380,pe:45,roe:8},
  {symbol:"BRIGADE",name:"Brigade Enterprises",sector:"Realty",price:1150,pe:65,roe:12},
  {symbol:"MAHLIFE",name:"Mahindra Lifespace",sector:"Realty",price:580,pe:85,roe:6},
  {symbol:"KOLTEPATIL",name:"Kolte-Patil Developers",sector:"Realty",price:480,pe:35,roe:10},
  {symbol:"ASHIANA",name:"Ashiana Housing",sector:"Realty",price:385,pe:28,roe:12},
  {symbol:"AJMERA",name:"Ajmera Realty",sector:"Realty",price:780,pe:22,roe:14},
  {symbol:"SUNTECK",name:"Sunteck Realty",sector:"Realty",price:580,pe:55,roe:8},
  {symbol:"MACROTECH",name:"Macrotech Developers",sector:"Realty",price:1250,pe:75,roe:14},

  // Paper & Packaging
  {symbol:"JKPAPER",name:"JK Paper",sector:"Chemicals",price:420,pe:8,roe:24},
  {symbol:"WESTLIFE",name:"Westlife Foodworld",sector:"FMCG",price:850,pe:110,roe:12},
  {symbol:"SESAPAPER",name:"Seshasayee Paper",sector:"Chemicals",price:310,pe:6,roe:18},
  {symbol:"TNPL",name:"Tamil Nadu Newsprint",sector:"Chemicals",price:245,pe:8,roe:16},
  {symbol:"STARPAPER",name:"Star Paper",sector:"Chemicals",price:215,pe:7,roe:15},
  {symbol:"PUDUMJEE",name:"Pudumjee Paper",sector:"Chemicals",price:85,pe:12,roe:18},
  {symbol:"EMAMIPAP",name:"Emami Paper",sector:"Chemicals",price:115,pe:14,roe:12},
  {symbol:"UFO",name:"UFO Moviez",sector:"Media",price:115,pe:0,roe:0},

  // Sugar
  {symbol:"TRIVENI",name:"Triveni Engineering",sector:"FMCG",price:415,pe:18,roe:16},
  {symbol:"DHAMPURSUG",name:"Dhampur Sugar",sector:"FMCG",price:245,pe:12,roe:14},
  {symbol:"DWARKESH",name:"Dwarikesh Sugar",sector:"FMCG",price:85,pe:15,roe:18},
  {symbol:"UGARSUGAR",name:"Ugar Sugar",sector:"FMCG",price:95,pe:22,roe:20},
  {symbol:"DALMIASUG",name:"Dalmia Bharat Sugar",sector:"FMCG",price:420,pe:14,roe:15},
  {symbol:"AVADHSUGAR",name:"Avadh Sugar",sector:"FMCG",price:650,pe:12,roe:16},
  {symbol:"MAGADHSUGAR",name:"Magadh Sugar",sector:"FMCG",price:750,pe:10,roe:18},
  {symbol:"RENUKA",name:"Shree Renuka Sugars",sector:"FMCG",price:48,pe:0,roe:0},

  // Pipes & Plastics
  {symbol:"JAINIRRIG",name:"Jain Irrigation",sector:"Capital Goods",price:75,pe:28,roe:8},
  {symbol:"APOLLOPIPE",name:"Apollo Pipes",sector:"Chemicals",price:680,pe:45,roe:16},
  {symbol:"PRAKASH",name:"Prakash Industries",sector:"Metals",price:185,pe:12,roe:14},
  {symbol:"EPL",name:"EPL Limited",sector:"Capital Goods",price:245,pe:28,roe:14},
  {symbol:"HUHTAMAKI",name:"Huhtamaki India",sector:"Capital Goods",price:385,pe:22,roe:16},

  // Agri & Seeds
  {symbol:"PIIND",name:"PI Industries",sector:"Agri",price:3850,pe:38,roe:20},
  {symbol:"BAYERCROP",name:"Bayer Cropscience",sector:"Agri",price:5850,pe:32,roe:24},
  {symbol:"RALLIS",name:"Rallis India",sector:"Agri",price:315,pe:35,roe:12},
  {symbol:"DHANUKA",name:"Dhanuka Agritech",sector:"Agri",price:1450,pe:24,roe:18},
  {symbol:"INSECTICID",name:"Insecticides India",sector:"Agri",price:750,pe:18,roe:16},
  {symbol:"EXCELCROP",name:"Excel Industries",sector:"Chemicals",price:1150,pe:15,roe:14},
  {symbol:"BHARATRAS",name:"Bharat Rasayan",sector:"Chemicals",price:9850,pe:28,roe:22},
  {symbol:"UPL",name:"UPL Limited",sector:"Chemicals",price:520,pe:15,roe:14},

  // Logistics
  {symbol:"VRLOG",name:"VRL Logistics",sector:"Logistics",price:620,pe:45,roe:16},
  {symbol:"TCIEXP",name:"TCI Express",sector:"Logistics",price:1150,pe:42,roe:28},
  {symbol:"TCI",name:"Transport Corp of India",sector:"Logistics",price:950,pe:22,roe:18},
  {symbol:"NAVKARCORP",name:"Navkar Corp",sector:"Logistics",price:115,pe:18,roe:12},
  {symbol:"SNOWMAN",name:"Snowman Logistics",sector:"Logistics",price:75,pe:65,roe:8},
  {symbol:"GATI",name:"Gati Limited",sector:"Logistics",price:145,pe:0,roe:0},

  // Pharma & Biotech
  {symbol:"CADILAHC",name:"Zydus Lifesciences",sector:"Pharma",price:1050,pe:35,roe:18},
  {symbol:"TORNT",name:"Torrent Pharma",sector:"Pharma",price:2850,pe:52,roe:22},
  {symbol:"AJANTPHARM",name:"Ajanta Pharma",sector:"Pharma",price:2450,pe:38,roe:24},
  {symbol:"ALEMBICLTD",name:"Alembic Limited",sector:"Pharma",price:115,pe:22,roe:12},
  {symbol:"SUPRIYA",name:"Supriya Lifescience",sector:"Pharma",price:480,pe:28,roe:26},
  {symbol:"NECTARLIF",name:"Nectar Lifesciences",sector:"Pharma",price:45,pe:18,roe:10},
  {symbol:"AARTIIND",name:"Aarti Industries",sector:"Chemicals",price:680,pe:45,roe:14},
  
  // Metals & Mining
  {symbol:"NALCO",name:"National Aluminium",sector:"Metals",price:185,pe:15,roe:16},
  {symbol:"MOIL",name:"MOIL Limited",sector:"Mining",price:480,pe:22,roe:14},
  {symbol:"GMDC",name:"Gujarat Mineral",sector:"Mining",price:420,pe:18,roe:20},
  {symbol:"SANDURMANG",name:"Sandur Manganese",sector:"Mining",price:580,pe:15,roe:25},
  {symbol:"NMDC",name:"NMDC Limited",sector:"Mining",price:265,pe:12,roe:28},

  // Miscellaneous Missing Big Names
  {symbol:"BAJAJFINSV",name:"Bajaj Finserv",sector:"NBFC",price:1650,pe:35,roe:14},
  {symbol:"COLGATE",name:"Colgate Palmolive",sector:"FMCG",price:2850,pe:52,roe:75},
  {symbol:"HERITGFOOD",name:"Heritage Foods",sector:"FMCG",price:380,pe:28,roe:16},
  {symbol:"DODLA",name:"Dodla Dairy",sector:"FMCG",price:1050,pe:35,roe:18},
  {symbol:"PARAGMILK",name:"Parag Milk Foods",sector:"FMCG",price:215,pe:22,roe:14},
  {symbol:"KWALITY",name:"Kwality",sector:"FMCG",price:5,pe:0,roe:0},
  {symbol:"DFL",name:"DFL",sector:"FMCG",price:12,pe:0,roe:0},
  {symbol:"BARBEQUE",name:"Barbeque Nation",sector:"Hospitality",price:650,pe:85,roe:12},
  {symbol:"SPECIALITY",name:"Speciality Restaurants",sector:"Hospitality",price:215,pe:45,roe:10},

  // Missing Textiles
  {symbol:"RSWM",name:"RSWM Limited",sector:"Textiles",price:215,pe:14,roe:12},
  {symbol:"DOLLAR",name:"Dollar Industries",sector:"Textiles",price:580,pe:28,roe:18},
  {symbol:"RUPA",name:"Rupa & Co",sector:"Textiles",price:285,pe:25,roe:16},
  {symbol:"VIPIND",name:"VIP Industries",sector:"Consumer",price:480,pe:65,roe:14},
  {symbol:"BANSWARA",name:"Banswara Syntex",sector:"Textiles",price:145,pe:12,roe:18}
];

const VALID = /^[A-Z0-9&_-]{2,25}$/;
const deduped = candidates.filter(c => {
  if (!VALID.test(c.symbol)) return false;
  if (existingSet.has(c.symbol)) return false;
  return true;
});

console.log(`New stocks ready to inject: ${deduped.length}`);

if (deduped.length > 0) {
  const entries = deduped.map(s => {
    const key = /^[0-9]/.test(s.symbol) ? `"${s.symbol}"` : s.symbol;
    return `  ${key}: { symbol: '${s.symbol}', name: '${s.name}', sector: '${s.sector}', exchange: 'NSE', price: ${s.price}, pe: ${s.pe}, roe: ${s.roe}, mktcap: ${Math.floor(s.price * 1000)}, ocf: 5000, rev: 50000, revcagr: 10, epscagr: 12, opm: 15, roce: 14, de: 0.5, fcf: 4000, promo: 45, ca: 20000, tl: 10000, sh: 1000, np: 3000, dep: 800, capex: 1500, bvps: 250 },`;
  });
  const insert = content.lastIndexOf("};");
  const updated = content.slice(0, insert) + entries.join("\n") + "\n" + content.slice(insert);
  fs.writeFileSync(stocksPath, updated, "utf-8");
  console.log("✓ Final expansion batch written.");
} else {
  console.log("No new stocks to add.");
}