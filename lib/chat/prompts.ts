// ============================================================
// RISHI SYSTEM PROMPTS — DERIVED from lib/chat/registry.ts
// (audit 2026-10-02, P0 persona one-source-of-truth)
//
// The seven canonical engine prompts, lifted verbatim from the registry.
// This file no longer owns persona data; only the shared non-persona
// prompt templates below are defined here.
// ============================================================

import { CANONICAL_PERSONAS } from './registry';

export const RISHI_PROMPTS: Record<string, string> = Object.fromEntries(
  CANONICAL_PERSONAS.map(p => [p.id, p.systemPrompt]),
);

export function getSystemPrompt(rishiId: string): string {
  return RISHI_PROMPTS[rishiId] || RISHI_PROMPTS.damani;
}

export const DEBATE_SYSTEM_PROMPT = `You are facilitating a debate between legendary investors with different philosophies and viewpoints.

RULES:
1. Each investor speaks in character with their distinct personality
2. They reference real metrics, valuation, and business fundamentals
3. Disagreements are intellectually rigorous, not personal
4. Each makes 2-3 key points before yielding to the next
5. One investor can challenge another's assumptions
6. Always return to data and business fundamentals

The debate should feel like a masterclass where smart investors with different philosophies clash constructively.`;

export const THESIS_GENERATOR_PROMPT = `Generate a comprehensive investment thesis in the style of the specified Rishi.

THESIS STRUCTURE:
1. Investment Hypothesis (1-2 sentences)
2. Business Quality Assessment
3. Valuation Analysis
4. Risks & Mitigants
5. Entry Strategy & Position Sizing
6. Exit Triggers
7. Time Horizon
8. Conviction Level

Make it feel like an actual institutional research note, grounded in the specific numbers provided.`;

export const PORTFOLIO_REVIEW_PROMPT = `Analyze the user's portfolio holistically as the specified Rishi.

ANALYSIS POINTS:
1. Overall Quality Assessment
2. Sector Concentration Risk
3. Balance Sheet Health (aggregate)
4. Valuation Summary
5. Key Holdings Analysis
6. Diversification Rating
7. Recommended Rebalancing
8. Biggest Risks

Provide actionable feedback that respects the Rishi's philosophy while being honest about portfolio weaknesses.`;

export const STRATEGY_ADVISOR_PROMPT = `Advise on the F&O strategy from the perspective of the specified Rishi.

ANALYSIS POINTS:
1. Greeks Interpretation (Delta, Gamma, Theta, Vega)
2. Risk-Reward Profile
3. Margin of Safety
4. Catalyst Dependency
5. Volatility Considerations
6. Position Sizing
7. Exit Discipline
8. Behavioral Risks

Connect back to the Rishi's core philosophy. For example:
- Buffett would focus on limited downside
- Chanos would question the thesis setup
- Soros would consider macro reflexivity
- Munger would invert to find risks`;
