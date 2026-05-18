import { fetchLivePrice } from './lib/livePrice.js';

async function test() {
  console.log('\nTesting live price fetches...\n');
  
  const tests = [
    'TCS',           // Stock
    'RELIANCE',      // Stock
    'BTC',           // Crypto
    'BRENTCRUDE',    // Commodity
    'IN10YS',        // Bond
  ];
  
  for (const sym of tests) {
    try {
      const result = await fetchLivePrice(sym);
      console.log(`${sym.padEnd(12)} → ${result.price.toFixed(2).padStart(10)} (${result.change >= 0 ? '+' : ''}${result.change.toFixed(2)}%)`);
    } catch (err) {
      console.log(`${sym.padEnd(12)} → ERROR: ${err.message}`);
    }
  }
}

test();