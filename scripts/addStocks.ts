// scripts/addStocks.ts
// ADD_STOCKS_V1 — Bulk add stocks from CSV/JSON to data/stocks/index.ts

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface StockInput {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  marketCap: number;
  exchange?: string;
}

const STOCKS_PATH = join(process.cwd(), "data/stocks/index.ts");

function addStocksToFile(newStocks: StockInput[]) {
  // Read existing stocks file
  const content = readFileSync(STOCKS_PATH, "utf-8");
  
  // Parse existing stock count
  const existingCount = (content.match(/export const STOCKS/g) || []).length;
  
  // Generate new stock entries
  const entries = newStocks.map(s => {
    const cap = s.marketCap || 10000;
    return `  "${s.symbol}": {
    symbol: "${s.symbol}",
    name: "${s.name}",
    price: ${s.price},
    change: 0,
    changePercent: 0,
    marketCap: ${cap},
    sector: "${s.sector}",
    exchange: "${s.exchange || 'NSE'}",
    volume: 1000000,
    pe: 20,
    pb: 3,
    dividend: 1.5,
    high52w: ${s.price * 1.2},
    low52w: ${s.price * 0.8},
  },`;
  }).join("\n");
  
  // Find insertion point (before the closing brace of STOCKS object)
  const insertIdx = content.lastIndexOf("};");
  if (insertIdx === -1) throw new Error("Could not find STOCKS object closing brace");
  
  const updated = 
    content.slice(0, insertIdx) + 
    entries + "\n" +
    content.slice(insertIdx);
  
  writeFileSync(STOCKS_PATH, updated, "utf-8");
  
  console.log(`✓ Added ${newStocks.length} stocks`);
  console.log(`Total stocks: ${existingCount + newStocks.length}`);
}

// Example: Read from nifty500.json
const INPUT_FILE = process.argv[2] || "scripts/nifty500.json";

try {
  const input = JSON.parse(readFileSync(INPUT_FILE, "utf-8"));
  addStocksToFile(input.stocks);
} catch (e) {
  console.error("Usage: tsx scripts/addStocks.ts <input.json>");
  console.error("Input format: { stocks: [{ symbol, name, sector, price, marketCap }] }");
  process.exit(1);
}