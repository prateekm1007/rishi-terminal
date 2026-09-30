// lib/gurus/commodity.ts
// Client-safe METADATA for the commodity guru cards (R3, round 2).
// Same pattern as lib/gurus/crypto.ts: the scorers live server-side only
// (app/api/gurus/route.ts); this module carries UI chrome.

export interface CommodityGuruMeta {
  id: string;
  name: string;
  initials: string;
  bio: string;
  philosophy: string;
  focus: string;
}

export const COMMODITY_GURUS: CommodityGuruMeta[] = [
  {
    id: 'jimrogers',
    name: 'Jim Rogers',
    initials: 'JR',
    bio: 'Co-founded Quantum Fund. Predicted the 2000s commodities supercycle.',
    philosophy: 'Buy commodities when nobody wants them. Sell when everybody loves them.',
    focus: 'Supercycles, physical assets, inflation hedge',
  },
  {
    id: 'rickrule',
    name: 'Rick Rule',
    initials: 'RR',
    bio: 'CEO of Sprott. Legendary resource sector investor.',
    philosophy: 'Gold is money. Everything else is credit.',
    focus: 'Precious metals, resource scarcity, monetary systems',
  },
  {
    id: 'danielyergin',
    name: 'Daniel Yergin',
    initials: 'DY',
    bio: 'Pulitzer Prize-winning energy historian. VP at S&P Global.',
    philosophy: 'Oil is the lifeblood of the industrial civilization.',
    focus: 'Energy transitions, geopolitical risk, supply dynamics',
  },
];
