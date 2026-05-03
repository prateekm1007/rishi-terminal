/**
 * Rishi Terminal - Bulk Stock Data Refresher
 * 
 * This script updates live price data while preserving all fundamental data.
 * Run with: npx tsx scripts/fetch-all-stocks.ts
 */

import { writeFileSync } from 'fs';
import { STOCKS } from '../data/stocks';
import { fetchLiveQuotes } from '../lib/stockApi';
import { Stock } from '../lib/types';

async function refreshStockData() {
  console.log('Starting bulk stock data refresh...');
  console.log(`Total stocks in database: ${Object.keys(STOCKS).length}`);

  const symbols = Object.keys(STOCKS);
  const batchSize = 70;
  const updatedStocks: Record<string, Stock> = { ...STOCKS };

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    console.log(`Processing ${i + 1} - ${Math.min(i + batchSize, symbols.length)}...`);

    const liveQuotes = await fetchLiveQuotes(batch);

    for (const symbol of batch) {
      const live = liveQuotes.get(symbol);
      const existing = STOCKS[symbol];

      if (live && existing) {
        updatedStocks[symbol] = {
          ...existing,
          price: live.price,
          // Optional: You can also store these if you want to display them
          // marketCap: live.marketCap ?? existing.mktcap,
          // pe: live.pe ?? existing.pe,
        };
        successCount++;
      } else {
        failCount++;
        console.warn(`  - No live data for ${symbol}`);
      }
    }

    // Rate limit protection
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate new file content
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
  
  console.log('\nÃ¢Å“â€¦ Refresh complete!');
  console.log(`   Successfully updated: ${successCount} stocks`);
  console.log(`   Failed to update:     ${failCount} stocks`);
  console.log(`   data/stocks/index.ts has been updated.`);
}

refreshStockData().catch(console.error);