// lib/chat/stockEvidence.ts — the server-built stock context for chat.
//
// N3 (round 3): moved out of app/api/chat/route.ts so the seed-labeling
// contract is directly testable (test/chat.prompt.seed.test.ts): every
// seed-derived number the model sees is labelled "seed data" in the
// evidence text, so the assistant never presents placeholder PE/ROE as
// current. The prompt is server-built (Constitution art. 7) — a
// client-supplied systemPrompt is not part of the contract.

import { STOCKS } from '@/data/stocks';
import type { AiEvidenceItem } from '@/lib/ai/schemas';

export function stockEvidence(symbol: string): AiEvidenceItem[] {
  const s = STOCKS[symbol.toUpperCase()];
  if (!s) return [];
  const pe = typeof s.pe === 'number' && s.pe > 0 ? s.pe : null;
  const roe = typeof s.roe === 'number' ? s.roe : null;
  const text = [
    `Analyzing ${s.symbol} (${s.name}), sector: ${s.sector}.`,
    pe !== null ? `P/E ratio (seed data): ${pe}.` : '',
    roe !== null ? `ROE (seed data): ${roe}%.` : '',
    'Seed fundamentals may be stale — qualify any data you cite as indicative.',
  ].filter(Boolean).join(' ');
  return [{ id: `seed:${s.symbol}:profile`, text }];
}
