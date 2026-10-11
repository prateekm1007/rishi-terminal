// lib/gurus/crypto.ts
// Client-safe METADATA for the crypto guru cards (R3, round 2).
//
// The guru SCORERS (lib/scorers/crypto/*) are server-side only: they are
// imported exclusively by app/api/gurus/route.ts, which computes the
// verdicts and tier-slices the response. This module carries only the UI
// chrome (names, bios, tags) so the client can render what the server
// sends without ever seeing the paid verdict content for a free tier.

export interface CryptoGuruMeta {
  id: string;
  name: string;
  tag: string;
  /** Short initials badge for the detail page. */
  initials: string;
  bio: string;
  /** P0-7 (round 47): the quote field is GONE — no attributed quotations
   *  of real persons render anywhere (founder order 2026-10-11). The
   *  card carries a descriptive framework read instead. */
  framework: string;
  /** One-line focus areas for the detail page. */
  focus: string;
  /** Which asset the guru's verdict tracks (matches CRYPTO_ASSETS.symbol). */
  target: string;
}

export const CRYPTO_GURUS: CryptoGuruMeta[] = [
  {
    id: 'satoshi',
    name: 'Satoshi Bodhi',
    tag: 'BTC',
    initials: 'SB',
    bio: 'Sound-money maximalist framework. Bitcoin as a store of value, decentralization above all else.',
    framework: 'Reads monetary debasement risk, issuance schedule and node decentralization as the value thesis.',
    focus: 'Bitcoin, decentralization, sound money',
    target: 'BTC',
  },
  {
    id: 'vitalik',
    name: 'Vitalik Veda',
    tag: 'ETH',
    initials: 'VV',
    bio: 'Protocol-fundamentalist framework. Ethereum as a world computer; the scalability-security-decentralization trilemma.',
    framework: 'Reads fee markets, L2 settlement demand and protocol revenue as the value thesis.',
    focus: 'Smart contracts, scalability, DeFi',
    target: 'ETH',
  },
  {
    id: 'saylor',
    name: 'Michael Saylor',
    tag: 'MS',
    initials: 'MS',
    bio: 'Corporate-treasury framework. Bitcoin as digital property; the MicroStrategy balance-sheet strategy popularized the template.',
    framework: 'Reads institutional adoption, treasury demand and long-duration holding as the value thesis.',
    focus: 'Institutional adoption, digital property',
    target: 'BTC',
  },
];
