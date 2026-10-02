// lib/dashboardSymbols.ts — U2 (founder round 7): the dashboard's symbol
// surface, shared by the SERVER page (app/page.tsx builds the SSR initial
// price snapshot from this list) and the CLIENT dashboard (renders the same
// sections). One source of truth — the snapshot and the sections can never
// disagree about which symbols the dashboard shows (Rule 14).
//
// Pure data, no server-only imports: the client component imports it too.

export const TICKER_SYMS = ["NIFTY50","SENSEX","BANK_NIFTY","SPX","DJI","IXIC","DAX","FTSE","HSI","BTC","ETH","GOLD","SILVER","WTI","SOL"];

export const TOP_CRYPTO = [
  { symbol:"BTC", name:"Bitcoin",  icon:"₿", color:"#F7931A" },
  { symbol:"ETH", name:"Ethereum", icon:"Ξ", color:"#627EEA" },
  { symbol:"SOL", name:"Solana",   icon:"◎", color:"#9945FF" },
  { symbol:"BNB", name:"BNB",      icon:"B", color:"#F0B90B" },
];

export const WORLD_MARKETS = [
  { label:"S&P 500",    sym:"SPX"  },
  { label:"Dow Jones",  sym:"DJI"  },
  { label:"Nasdaq",     sym:"IXIC" },
  { label:"DAX",        sym:"DAX"  },
  { label:"FTSE 100",   sym:"FTSE" },
  { label:"Hang Seng",  sym:"HSI"  },
];

export const STATS = [
  { label:"NIFTY 50",   sym:"NIFTY50",    usd:false },
  { label:"SENSEX",     sym:"SENSEX",     usd:false },
  { label:"BANK NIFTY", sym:"BANK_NIFTY", usd:false },
  { label:"Bitcoin",    sym:"BTC",        usd:true  },
  { label:"Gold / oz",  sym:"GOLD",       usd:true  },
];
