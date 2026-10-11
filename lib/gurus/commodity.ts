// lib/gurus/commodity.ts
// Client-safe METADATA for the commodity guru cards (R3, round 2).
// Same pattern as lib/gurus/crypto.ts: the scorers live server-side only
// (app/api/gurus/route.ts); this module carries UI chrome.

export interface CommodityGuruMeta {
  id: string;
  name: string;
  initials: string;
  bio: string;
  /** P0-7/FD-25: a descriptive read of the public framework — never an
   *  attributed quotation (renamed from `philosophy` for parity with
   *  lib/gurus/crypto.ts: the field name must not be quote-shaped). */
  framework: string;
  focus: string;
}

export const COMMODITY_GURUS: CommodityGuruMeta[] = [
  {
    id: 'jimrogers',
    name: 'Jim Rogers',
    initials: 'JR',
    bio: 'Co-founded Quantum Fund. Credited with calling the 2000s commodities supercycle.',
    framework: 'Contrarian cycle timing: unloved commodities, held through the cycle, historically outperformed loved ones.',
    focus: 'Supercycles, physical assets, inflation hedge',
  },
  {
    id: 'rickrule',
    name: 'Rick Rule',
    initials: 'RR',
    bio: 'CEO of Sprott, the resource-focused investment firm.',
    framework: 'A monetary-hardness lens: scarcity, replacement cost and jurisdictional risk separate real assets from paper claims.',
    focus: 'Precious metals, resource scarcity, monetary systems',
  },
  {
    id: 'danielyergin',
    name: 'Daniel Yergin',
    initials: 'DY',
    bio: 'Pulitzer Prize-winning energy historian. Vice chairman at S&P Global.',
    framework: 'Energy history as the base layer of geopolitics: supply, transit chokepoints and transition costs drive the cycle.',
    focus: 'Energy transitions, geopolitical risk, supply dynamics',
  },
];
