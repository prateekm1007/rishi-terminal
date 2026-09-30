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
  quote: string;
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
    bio: 'Sound money maximalist. Bitcoin as the ultimate store of value. Decentralization above all else.',
    quote: 'The root problem with conventional currency is all the trust required to make it work.',
    focus: 'Bitcoin, decentralization, sound money',
    target: 'BTC',
  },
  {
    id: 'vitalik',
    name: 'Vitalik Veda',
    tag: 'ETH',
    initials: 'VV',
    bio: 'Protocol fundamentalist. Ethereum as world computer. Scalability, security, decentralization trilemma solver.',
    quote: 'Whereas most technologies tend to automate workers, blockchains automate away trust.',
    focus: 'Smart contracts, scalability, DeFi',
    target: 'ETH',
  },
  {
    id: 'saylor',
    name: 'Michael Saylor',
    tag: 'MS',
    initials: 'MS',
    bio: 'Corporate Bitcoin maximalist. Digital property thesis. MicroStrategy Bitcoin treasury architect.',
    quote: 'Bitcoin is a bank in cyberspace, run by incorruptible software.',
    focus: 'Institutional adoption, digital property',
    target: 'BTC',
  },
];
