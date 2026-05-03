/**
 * Rishi Terminal - Safe Test Fetch Script
 * 
 * This script ONLY updates 12 key stocks for validation.
 * It will NOT touch the rest of your data.
 * 
 * Usage:
 *   npx tsx scripts/test-fetch.ts
 */

import { writeFileSync, readFileSync } from 'fs';
import { STOCKS } from '../data/stocks';
import { fetchLiveQuotes } from '../lib/stockApi';
import { Stock } from '../lib/types';

// === TEST STOCKS (High quality + diverse sectors) ===
const TEST_STOCKS = [
  "RELIANCE",      // Energy / Conglomerate
  "TCS",           // IT
  "HDFCBANK",      // Banking
  "TITAN",         // Consumer
  "INFY",          // IT
  "HINDUNILVR",    // FMCG
  "ICICIBANK",     // Banking
  "SBIN",          // Banking (PSU)
  "BHARTIARTL",    // Telecom
  "TATAMOTORS",    // Auto
  "SUNPHARMA",     // Pharma
  "DMART",         // Retail
];

async function testFetch() {
  console.log("=== RISHI TERMINAL TEST FETCH ===");
  console.log(`Testing with ${TEST_STOCKS.length} stocks...\n`);

  const liveQuotes = await fetchLiveQuotes(TEST_STOCKS);
  const updatedStocks: Record<string, Stock> = { ...STOCKS };

  let updatedCount = 0;

  for (const symbol of TEST_STOCKS) {
    const live = liveQuotes.get(symbol);
    const existing = STOCKS[symbol];

    if (live && existing) {
      updatedStocks[symbol] = {
        ...existing,
        price: live.price,
      };
      console.log(`Ã¢Å“â€œ ${symbol}: ${live.price} (was ${existing.price})`);
      updatedCount++;
    } else {
      console.log(`Ã¢Å“â€” ${symbol}: No live data found`);
    }
  }

  // Generate updated file content
  let fileContent = `import { Stock } from '../lib/types';\n\n`;
  fileContent += `export const STOCKS: Record<string, Stock> = {\n`;

  for (const [symbol, stock] of Object.entries(updatedStocks)) {
    fileContent += `  ${symbol}: {\n`;
    fileContent += `    symbol: '${stock.symbol}',\n`;
    fileContent += `    name: '${stock.name.replace(/'/g, "\\'")}',\n`;
    fileContent += `    sector: '${stock.sector}',\n`;
    fileContent += `    exchange: '${stock.exchange}',\n`;
    fileContent += `    price: ${stock.price},\n`;
    fileContent += `    pe: ${stock.pe},\n`;
    fileContent += `    roe: ${stock.roe},\n`;
    fileContent += `    mktcap: ${stock.mktcap},\n`;
    fileContent += `    ocf: ${stock.ocf},\n`;
    fileContent += `    rev: ${stock.rev},\n`;
    fileContent += `    revcagr: ${stock.revcagr},\n`;
    fileContent += `    epscagr: ${stock.epscagr},\n`;
    fileContent += `    opm: ${stock.opm},\n`;
    fileContent += `    roce: ${stock.roce},\n`;
    fileContent += `    de: ${stock.de},\n`;
    fileContent += `    fcf: ${stock.fcf},\n`;
    fileContent += `    promo: ${stock.promo},\n`;
    fileContent += `    ca: ${stock.ca},\n`;
    fileContent += `    tl: ${stock.tl},\n`;
    fileContent += `    sh: ${stock.sh},\n`;
    fileContent += `    np: ${stock.np},\n`;
    fileContent += `    dep: ${stock.dep},\n`;
    fileContent += `    capex: ${stock.capex},\n`;
    fileContent += `    bvps: ${stock.bvps},\n`;
    fileContent += `  },\n`;
  }

  fileContent += `};\n`;

  writeFileSync('data/stocks/index.ts', fileContent);

  console.log(`\nÃ¢Å“â€¦ Test complete!`);
  console.log(`   Stocks updated: ${updatedCount}/${TEST_STOCKS.length}`);
  console.log(`   data/stocks/index.ts has been updated with test data.`);
  console.log(`\nPlease verify the changes look correct before running the full script.`);
}

testFetch().catch(console.error);