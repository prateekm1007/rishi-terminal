import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * R12-03 (feature-depth audit finding, rule 14/17): the data/ layer had
 * FOUR dead index twins — data/markets/index.ts, data/crypto/index.ts,
 * data/stockDetails/index.ts, data/forex/index.ts — each shadowed by the
 * sibling file (data/markets.ts etc.), which wins module resolution for
 * every import spelling we use. The twins carried DIVERGENT universes
 * (XAUUSD-style vs GOLD-style commodity symbols; XRP/DOGE present only
 * in the dead crypto list), so any future import that resolved to a twin
 * — or deletion of the winning file — would silently serve a different
 * instrument universe. Classic rule-17 loaded gun.
 *
 * This test makes the class un-reintroducible: no directory in data/ may
 * own an index.ts while a sibling <name>.ts exists at the data/ root.
 * Verified RED on the pre-fix tree (4 offenders listed) and GREEN after
 * the deletions.
 */
const DATA_ROOT = join(process.cwd(), 'data');

function findTwins(): string[] {
  const offenders: string[] = [];
  for (const entry of readdirSync(DATA_ROOT)) {
    const fileCandidate = join(DATA_ROOT, `${entry}.ts`);
    const dirCandidate = join(DATA_ROOT, entry);
    if (
      existsSync(fileCandidate) &&
      statSync(fileCandidate).isFile() &&
      statSync(dirCandidate).isDirectory() &&
      existsSync(join(dirCandidate, 'index.ts'))
    ) {
      offenders.push(`data/${entry}/index.ts shadows data/${entry}.ts`);
    }
  }
  return offenders;
}

describe('R12-03 — no shadowed module twins in data/', () => {
  it('no data/<name>/index.ts exists beside data/<name>.ts (divergent-universe hazard)', () => {
    const twins = findTwins();
    expect(
      twins,
      `shadowed module twins carry divergent data and are unimportable dead code — delete them: ${twins.join('; ')}`,
    ).toEqual([]);
  });
});
