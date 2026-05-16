// scripts/fetchNifty500.ts
// FETCH_NIFTY500_V1 — Download Nifty 500 constituents + live prices

import { writeFileSync } from "fs";

const NIFTY500_URL = "https://www.niftyindices.com/IndexConstituent/ind_nifty500list.csv";

async function fetchNifty500() {
  console.log("Fetching Nifty 500 constituent list...");
  
  const res = await fetch(NIFTY500_URL);
  const csv = await res.text();
  
  const lines = csv.split("\n").slice(1); // skip header
  const stocks = [];
  
  for (const line of lines) {
    const [company, industry, symbol, seriesRaw] = line.split(",");
    if (!symbol || symbol.trim().length === 0) continue;
    
    const sym = symbol.trim();
    
    // Fetch live price from your existing /api/prices endpoint
    try {
      const priceRes = await fetch(`http://localhost:3000/api/prices?symbol=${sym}`);
      const priceData = await priceRes.json();
      
      stocks.push({
        symbol: sym,
        name: company?.trim() || sym,
        sector: industry?.trim() || "Unknown",
        price: priceData.price || 100,
        marketCap: priceData.marketCap || 10000,
        exchange: "NSE",
      });
      
      console.log(`✓ ${sym} — ${priceData.price || 100}`);
      
    } catch (e) {
      console.warn(`⚠ ${sym} — using placeholder price`);
      stocks.push({
        symbol: sym,
        name: company?.trim() || sym,
        sector: industry?.trim() || "Unknown",
        price: 100,
        marketCap: 10000,
        exchange: "NSE",
      });
    }
    
    // Rate limit: 1 request per second
    await new Promise(r => setTimeout(r, 1000));
  }
  
  const output = { stocks, fetched_at: new Date().toISOString(), count: stocks.length };
  writeFileSync("scripts/nifty500.json", JSON.stringify(output, null, 2));
  
  console.log(`\n✓ Saved ${stocks.length} stocks to scripts/nifty500.json`);
  console.log("Next: tsx scripts/addStocks.ts scripts/nifty500.json");
}

fetchNifty500();