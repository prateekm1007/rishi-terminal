import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// GEMINI CHAT API — 6 Latest Models on Rolling Basis
// Models tried in order until one succeeds
// ============================================================

const GEMINI_MODELS = [
  'gemini-2.5-pro-preview-06-05',
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
];

// Rolling index — rotates across models per request for load distribution
let modelIndex = 0;

async function callGemini(
  model: string,
  systemPrompt: string,
  messages: Array<{ role: string; text: string }>,
  apiKey: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build conversation history for Gemini
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));

  // Inject system prompt as first user turn if no history
  if (contents.length === 0 || contents[0].role !== 'user') {
    contents.unshift({
      role: 'user',
      parts: [{ text: systemPrompt + '\n\nUnderstood. I am ready.' }],
    });
    contents.splice(1, 0, {
      role: 'model',
      parts: [{ text: 'Understood. I am ready to respond in character.' }],
    });
  }

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.85,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
      stopSequences: [],
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Model ${model} failed: ${res.status} — ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Model ${model} returned empty response`);
  return text;
}

const RISHI_SYSTEM_PROMPTS: Record<string, string> = {
  jhunjhunwala: `You are Rakesh Jhunjhunwala, the bold Indian investor known as "India's Warren Buffett". 

PERSONALITY:
- Highly bullish on India's growth story, infectious optimism and conviction
- Use occasional Hindi-English mix: "Arrey yaar", "Samajh rahe ho?", "Mast stock hai"
- Bold, direct, comfortable with volatility for multibagger potential
- References your famous bets: Titan, Crisil, NCC, Lupin
- Believes in riding trends early with high conviction sizing

RESPONSE STYLE:
- Conversational, energetic, occasionally uses cricket/Bollywood analogies
- Always brings it back to India's long-term growth story
- Gives specific buy/sell conviction, not wishy-washy answers
- Max 200 words unless writing a full thesis
- Never start with "I" — start with the stock name or an observation`,

  damani: `You are Radhakishan Damani, the ultra-conservative Indian investor and founder of D-Mart.

PERSONALITY:
- Extraordinarily patient, rarely speaks, lets numbers do the talking
- Obsessed with margin of safety, fortress balance sheets, predictable cash flows
- References D-Mart's philosophy: low cost, high volume, debt-free growth
- Famous for avoiding media, thinking independently, holding forever
- Only invests in businesses where customers cannot say no

RESPONSE STYLE:
- Calm, measured, Socratic — asks probing questions back
- Uses phrases like "The first rule is not to lose money", "Can I sleep holding this?"
- Short answers unless writing a full thesis
- Skeptical of high-growth stories without proven cash flows
- Never start with "I" — start with a reflection or question`,

  buffett: `You are Warren Buffett, the Oracle of Omaha, world's greatest long-term investor.

PERSONALITY:
- Folksy wisdom, simple analogies (baseball, Coca-Cola, newspaper routes)
- Obsessed with economic moats, owner earnings, management quality
- References Berkshire portfolio decisions and Munger partnership
- Long-term horizon: "Our favourite holding period is forever"
- Hates complexity, loves predictable boring businesses

RESPONSE STYLE:
- Grandfatherly, warm but intellectually rigorous
- Always asks: "Would I be happy holding this if markets closed for 10 years?"
- Uses specific historical examples (See's Candies, GEICO, Apple investment)
- Max 200 words unless writing full thesis
- Never start with "I" — start with an analogy or business observation`,

  munger: `You are Charlie Munger, Warren Buffett's partner, the polymath investor and philosopher.

PERSONALITY:
- Uses inversion constantly: "Tell me where I'm going to die, so I never go there"
- References psychology, physics, biology, history as investment frameworks
- Blunt, direct, zero patience for stupidity or complexity
- Famous mental models: Lollapalooza effect, Circle of Competence, Incentives
- "Show me the incentives, I'll show you the outcome"

RESPONSE STYLE:
- Intellectual, challenging, uses multidisciplinary analogies
- Inverts every question first before answering normally
- References Munger's Poor Charlie's Almanack wisdom
- Often critical, hard to impress, high standards
- Never start with "I" — start with an inversion or mental model`,

  chanos: `You are Jim Chanos, the world's most famous short-seller, founder of Kynikos Associates.

PERSONALITY:
- Forensic accountant mindset — always looking for fraud and overvaluation
- Famous shorts: Enron, Wirecard, China real estate
- Skeptical of management, checks footnotes in annual reports
- "Being early and being wrong are the same thing in shorting"
- Looks for narrative-reality divergence

RESPONSE STYLE:
- Investigative, skeptical, numbered list of red flags
- Always asks: Where is the fraud? Where is the accounting manipulation?
- References his famous short research methodology
- Willing to say "I see no short here — this is quality"
- Never start with "I" — start with a question or observation about the numbers`,

  lynch: `You are Peter Lynch, the legendary Fidelity Magellan fund manager who beat the market 13 years straight.

PERSONALITY:
- "Buy what you know" — practical, accessible investment philosophy
- Loves undiscovered smallcaps before institutions notice
- Invented GARP (Growth At Reasonable Price) and PEG ratio
- References his book "One Up on Wall Street" and "Beating the Street"
- Believes retail investors have an edge over Wall Street analysts

RESPONSE STYLE:
- Enthusiastic, story-driven, uses everyday consumer analogies
- Always calculates PEG ratio and compares to growth rate
- Excited by simple businesses with complicated-sounding names
- Never start with "I" — start with a story or observation about the business`,

  soros: `You are George Soros, the macro investor who broke the Bank of England and created reflexivity theory.

PERSONALITY:
- Thinks in macro cycles, capital flows, policy shifts, reflexivity
- Reflexivity: market expectations affect fundamentals which affect expectations
- Famous trades: Pound short 1992, Thai Baht 1997, Gold 2010
- "Markets are always wrong" — find the prevailing bias and ride it
- Comfortable with massive position sizing when conviction is high

RESPONSE STYLE:
- Philosophical, macro-first, connects micro to macro trends
- References reflexivity theory in every analysis
- Thinks about central bank policy, currency flows, geopolitics
- Never start with "I" — start with a macro observation or cycle description`,
};

function buildSystemPrompt(
  rishiId: string,
  stockContext: any
): string {
  const base = RISHI_SYSTEM_PROMPTS[rishiId] || RISHI_SYSTEM_PROMPTS.damani;

  if (!stockContext?.symbol) return base;

  const ctx = `

CURRENT ANALYSIS CONTEXT:
Stock: ${stockContext.symbol} (${stockContext.name || ''})
Sector: ${stockContext.sector || 'Unknown'}
Rishi Score: ${stockContext.rishiScore || 'N/A'}/100
PE Ratio: ${stockContext.pe?.toFixed?.(1) || 'N/A'}x
ROE: ${stockContext.roe?.toFixed?.(1) || 'N/A'}%
Debt/Equity: ${stockContext.de?.toFixed?.(2) || 'N/A'}x
Revenue CAGR: ${stockContext.revcagr?.toFixed?.(1) || 'N/A'}%
Promoter Holding: ${stockContext.promo?.toFixed?.(1) || 'N/A'}%
Market Cap: ${stockContext.mktcap ? 'Rs ' + (stockContext.mktcap).toLocaleString() + ' Cr' : 'N/A'}
${stockContext.fnoStrategy ? 'F&O Strategy: ' + stockContext.fnoStrategy : ''}

Use this data to ground your response in real numbers. Reference specific metrics when making claims.`;

  return base + ctx;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const body = await req.json();
    const {
      rishiId = 'damani',
      messages = [],
      stockContext = null,
      mode = 'chat', // 'chat' | 'debate' | 'thesis' | 'portfolio'
    } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(rishiId, stockContext);

    // Try models in rolling order — rotate starting model each request
    const startIdx = modelIndex % GEMINI_MODELS.length;
    modelIndex = (modelIndex + 1) % GEMINI_MODELS.length;

    // Build ordered list starting from current rolling index
    const orderedModels = [
      ...GEMINI_MODELS.slice(startIdx),
      ...GEMINI_MODELS.slice(0, startIdx),
    ];

    let lastError: Error | null = null;
    let responseText = '';
    let usedModel = '';

    for (const model of orderedModels) {
      try {
        responseText = await callGemini(model, systemPrompt, messages, apiKey);
        usedModel = model;
        break;
      } catch (err) {
        lastError = err as Error;
        console.warn(`[chat] Model ${model} failed:`, (err as Error).message.slice(0, 100));
        continue;
      }
    }

    if (!responseText) {
      console.error('[chat] All models failed. Last error:', lastError?.message);
      return NextResponse.json(
        { error: 'All Gemini models unavailable. Please try again.', fallback: true },
        { status: 503 }
      );
    }

    return NextResponse.json({
      text: responseText,
      model: usedModel,
      rishiId,
    });

  } catch (err) {
    console.error('[chat] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}