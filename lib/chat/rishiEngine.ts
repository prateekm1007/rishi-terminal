// ============================================================
// RISHI PERSONALITY ENGINE — DERIVED from lib/chat/registry.ts
// (audit 2026-10-02, P0 persona one-source-of-truth)
//
// The engine-parameter view of the canonical registry: the seven personas
// that carry scoring-engine parameters. This file no longer owns any data —
// ids and metadata come from the registry. Commit M3 (free access): the
// tier field is gone; the projection carries rendering + engine fields
// only, and no consumer filters personas by entitlement anywhere.
// ============================================================

import { CANONICAL_PERSONAS } from './registry';

export interface RishiPersonality {
  id: string;
  name: string;
  fullName: string;
  emoji: string;
  color: string;
  philosophy: string;
  keyMentalModels: string[];
  shortBias: number; // -100 (pure short) to +100 (pure long)
  riskTolerance: number; // 0-100
  decisionSpeed: number; // 0 (deliberate) to 100 (intuitive)
}

export const RISHI_PERSONALITIES: Record<string, RishiPersonality> = Object.fromEntries(
  CANONICAL_PERSONAS
    .filter(p => p.engine)
    .map(p => [
      p.id,
      {
        id: p.id,
        name: p.name,
        fullName: p.fullName,
        emoji: p.emoji,
        color: p.color,
        philosophy: p.philosophy,
        keyMentalModels: p.engine!.keyMentalModels,
        shortBias: p.engine!.shortBias,
        riskTolerance: p.engine!.riskTolerance,
        decisionSpeed: p.engine!.decisionSpeed,
      } satisfies RishiPersonality,
    ]),
);

export interface ChatContext {
  symbol?: string;
  stockName?: string;
  sector?: string;
  rishiScore?: number;
  pe?: number;
  roe?: number;
  de?: number;
  revcagr?: number;
  promo?: number;
  mktcap?: number;
  fcf?: number;
  portfolio?: Array<{ symbol: string; shares: number; avgPrice: number }>;
  fnoStrategy?: string;
}

export function getRishiPersonality(id: string): RishiPersonality {
  return RISHI_PERSONALITIES[id] || RISHI_PERSONALITIES.damani;
}

// R3 + M3: persona availability is decided by the server from the canonical
// registry (personaAccess.ts) with no tier filtering anywhere. The roster
// itself (the registry) is public marketing content.

export function formatContextForPrompt(context: ChatContext): string {
  if (!context.symbol) return '';

  return `
CONTEXT FOR ANALYSIS:
Stock: ${context.symbol} (${context.stockName})
Sector: ${context.sector}
Current Rishi Score: ${context.rishiScore}/100
Key Metrics: PE ${context.pe?.toFixed(1)}x | ROE ${context.roe?.toFixed(1)}% | D/E ${context.de?.toFixed(2)}x | Revenue CAGR ${context.revcagr?.toFixed(1)}%
Promoter Holding: ${context.promo?.toFixed(1)}%
Market Cap: ${context.mktcap ? 'Rs ' + (context.mktcap / 100).toFixed(0) + ' Cr' : 'N/A'}
Free Cash Flow: ${context.fcf ? 'Rs ' + context.fcf + ' Cr' : 'Analyzing...'}
${context.fnoStrategy ? `F&O Strategy Context: ${context.fnoStrategy}` : ''}
`.trim();
}
