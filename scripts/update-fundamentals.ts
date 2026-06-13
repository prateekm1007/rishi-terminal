// scripts/update-fundamentals.ts
// Run monthly: npx tsx scripts/update-fundamentals.ts
// Fetches live fundamentals from NSE + Yahoo and patches STOCKS in data/stocks/index.ts
// Updates: pe, roe, mktcap, bvps

import * as fs from 'fs';
import * as path from 'path';
import { fetchLiveFundamentals } from '../lib/nse/fundamentals';
import { STOCKS } from '../data/stocks/index';

const STOCKS_FILE = path.resolve(__dirname, '../data/stocks/index.ts');
const LOG_FILE = path.resolve(__dirname, '../data/stocks/update-log.json');

interface UpdateLog {
  lastRun: string;
  updated: string[];
  failed: string[];
  skipped: string[];
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('[Fundamentals Updater] Starting...');
  const symbols = Object.keys(STOCKS);
  console.log(`[Fundamentals Updater] ${symbols.length} stocks to process`);

  const log: UpdateLog = {
    lastRun: new Date().toISOString(),
    updated: [],
    failed: [],
    skipped: [],
  };

  const updates: Record<string, { pe: number; roe: number; mktcap: number; bvps: number }> = {};

  for (let i = 0; i < symbols.length; i += 5) {
    const batch = symbols.slice(i, i + 5);
    process.stdout.write(`\r[${i}/${symbols.length}] ${batch.join(', ')}...                    `);

    const results = await Promise.allSettled(
      batch.map(sym => fetchLiveFundamentals(sym))
    );

    for (let j = 0; j < batch.length; j++) {
      const sym = batch[j];
      const result = results[j];
      if (result.status === 'fulfilled' && result.value) {
        const f = result.value;
        if (f.pe > 0 || f.marketCap > 0) {
          updates[sym] = {
            pe: f.pe,
            roe: f.roe,
            mktcap: Math.round(f.marketCap / 10000000), // to Crores
            bvps: f.bookValue,
          };
          log.updated.push(sym);
        } else {
          log.skipped.push(sym);
        }
      } else {
        log.failed.push(sym);
      }
    }

    if (i + 5 < symbols.length) await sleep(2000);
  }

  console.log('\n[Fundamentals Updater] Patching STOCKS file...');
  let fileContent = fs.readFileSync(STOCKS_FILE, 'utf-8');
  let patchedCount = 0;

  for (const [sym, vals] of Object.entries(updates)) {
    if (vals.pe > 0) {
      fileContent = fileContent.replace(
        new RegExp(`(${sym}:.*?pe: )[0-9.]+`, 'g'), `$1${vals.pe}`
      );
    }
    if (vals.roe > 0) {
      fileContent = fileContent.replace(
        new RegExp(`(${sym}:.*?roe: )[0-9.]+`, 'g'), `$1${vals.roe}`
      );
    }
    if (vals.mktcap > 0) {
      fileContent = fileContent.replace(
        new RegExp(`(${sym}:.*?mktcap: )[0-9.]+`, 'g'), `$1${vals.mktcap}`
      );
    }
    if (vals.bvps > 0) {
      fileContent = fileContent.replace(
        new RegExp(`(${sym}:.*?bvps: )[0-9.]+`, 'g'), `$1${vals.bvps}`
      );
    }
    patchedCount++;
  }

  fs.writeFileSync(STOCKS_FILE, fileContent, 'utf-8');
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf-8');

  console.log(`[Fundamentals Updater] Done.`);
  console.log(`  Updated: ${log.updated.length}`);
  console.log(`  Skipped: ${log.skipped.length}`);
  console.log(`  Failed:  ${log.failed.length}`);
  console.log(`  Patched: ${patchedCount} entries`);
}

main().catch(console.error);