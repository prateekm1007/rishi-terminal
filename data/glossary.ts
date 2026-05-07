// data/glossary.ts

export interface GlossaryTerm {
  term: string;
  definition: string;
  example?: string;
  relatedTerms?: string[];
}

export const INVESTMENT_GLOSSARY: Record<string, GlossaryTerm> = {
  'moat': {
    term: 'Economic Moat',
    definition: 'A durable competitive advantage that protects a company from rivals — like a castle moat. It allows a company to sustain high returns on capital for many years.',
    example: 'Coca-Cola\'s brand is a moat. Nobody else can sell "Coke". Asian Paints\' distribution in 65,000 villages is a moat.',
    relatedTerms: ['competitive advantage', 'pricing power', 'switching costs', 'network effects'],
  },
  'pe': {
    term: 'P/E Ratio (Price-to-Earnings)',
    definition: 'Stock price divided by annual earnings per share. Shows how much investors pay for 1 of profit. High PE = expensive OR high growth expected.',
    example: 'PE of 30 means you pay 30 for every 1 of annual profit. Sector context matters — IT typically trades at 25–35x PE.',
    relatedTerms: ['peg ratio', 'valuation', 'earnings', 'forward pe'],
  },
  'roe': {
    term: 'ROE (Return on Equity)',
    definition: 'Net profit ÷ Shareholder Equity. Measures how efficiently management uses your money to generate profit. Buffett\'s primary quality filter.',
    example: 'ROE of 25% means the company earns 25 for every 100 you invested. Sustained ROE >20% indicates a genuine moat.',
    relatedTerms: ['roce', 'roe', 'capital efficiency', 'profitability'],
  },
  'roce': {
    term: 'ROCE (Return on Capital Employed)',
    definition: 'Operating profit ÷ Capital Employed (equity + debt). More comprehensive than ROE — measures returns on ALL capital, not just equity.',
    example: 'ROCE >15% is generally healthy. Greenblatt\'s Magic Formula specifically uses ROIC (similar concept) to find great businesses.',
    relatedTerms: ['roe', 'roic', 'capital efficiency'],
  },
  'fcf': {
    term: 'Free Cash Flow (FCF)',
    definition: 'Cash generated from operations minus capital expenditure. The REAL money a business generates — harder to manipulate than reported profits.',
    example: 'A company reporting 100Cr profit but generating 150Cr FCF is converting profit to cash efficiently. The opposite is a warning sign.',
    relatedTerms: ['operating cash flow', 'capex', 'cash conversion'],
  },
  'margin of safety': {
    term: 'Margin of Safety',
    definition: 'Benjamin Graham\'s core principle: buy at a significant discount to intrinsic value. The gap between price and value protects against errors and bad luck.',
    example: 'If a stock\'s intrinsic value is 100, Graham buys at 60 — a 40% margin of safety. The discount absorbs mistakes in your analysis.',
    relatedTerms: ['intrinsic value', 'downside protection', 'valuation'],
  },
  'intrinsic value': {
    term: 'Intrinsic Value',
    definition: 'The true underlying value of a business based on fundamentals — what a rational buyer would pay to own the entire business. Different from stock price.',
    example: 'Buffett estimates intrinsic value by projecting future cash flows discounted to today. If intrinsic value > market price, the stock is undervalued.',
    relatedTerms: ['margin of safety', 'dcf', 'valuation'],
  },
  'compounding': {
    term: 'Compounding',
    definition: 'Reinvesting profits to generate exponential growth. Einstein called it the 8th wonder of the world. Time is the critical variable — the longer, the more powerful.',
    example: '1L at 15% CAGR grows to: 4L in 10 years, 16L in 20 years, 66L in 30 years. The last decade creates more wealth than the first two combined.',
    relatedTerms: ['cagr', 'reinvestment', 'long-term investing'],
  },
  'cagr': {
    term: 'CAGR (Compound Annual Growth Rate)',
    definition: 'The steady annual growth rate that takes a starting value to an ending value over a time period. Smooths out volatility to show true growth trend.',
    example: 'A stock going from 100 to 200 in 5 years has 14.9% CAGR — not 20% (that would be simple growth, not compound).',
    relatedTerms: ['compounding', 'growth rate', 'returns'],
  },
  'value trap': {
    term: 'Value Trap',
    definition: 'A stock that LOOKS cheap (low PE, low price-to-book) but is fundamentally deteriorating. The low price is JUSTIFIED — not a bargain. The business is shrinking.',
    example: 'Vodafone India had PE of 8 in 2019. Looked cheap. But debt was crushing, subscribers leaving. It lost 95% of value from that point.',
    relatedTerms: ['cheap stock', 'mean reversion', 'fundamental analysis'],
  },
  'asymmetric': {
    term: 'Asymmetric Risk/Reward',
    definition: 'An investment where the potential upside is MUCH larger than the potential downside. Maximum loss is limited; maximum gain is large. Pabrai\'s core concept.',
    example: 'Pabrai\'s rule: "Heads I win big, tails I lose little." A stock trading at 50 with liquidation value of 45 and upside potential of 200 is asymmetric.',
    relatedTerms: ['risk-reward', 'downside protection', 'position sizing'],
  },
  'reflexivity': {
    term: 'Reflexivity',
    definition: 'George Soros\'s theory: market participants\' beliefs don\'t just reflect reality — they CHANGE reality. Bull markets make companies stronger; bear markets make them weaker.',
    example: 'A rising stock price lets a company raise cheap equity, hire better people, make acquisitions — reinforcing the very thesis that drove the price up.',
    relatedTerms: ['market psychology', 'feedback loop', 'momentum'],
  },
  'garp': {
    term: 'GARP (Growth At a Reasonable Price)',
    definition: 'Peter Lynch\'s philosophy: don\'t overpay for growth. The PEG ratio (PE ÷ Growth Rate) should be near 1. Pay a fair price for a growing business.',
    example: 'PE of 20 with 20% earnings growth = PEG of 1.0 (fair). PE of 40 with 15% growth = PEG of 2.7 (expensive). Lynch would buy the first, avoid the second.',
    relatedTerms: ['peg ratio', 'growth investing', 'pe ratio'],
  },
  'peg ratio': {
    term: 'PEG Ratio',
    definition: 'P/E ratio divided by the earnings growth rate. Lynch\'s favorite metric. PEG < 1 = potential bargain; PEG > 2 = likely overvalued for the growth you are getting.',
    example: 'Stock with PE 25 growing at 30%/year = PEG 0.83 (attractive). Stock with PE 50 growing at 15%/year = PEG 3.3 (expensive).',
    relatedTerms: ['garp', 'pe ratio', 'growth rate'],
  },
  'dcf': {
    term: 'DCF (Discounted Cash Flow)',
    definition: 'Valuation method that projects all future cash flows and discounts them to today\'s value using a required rate of return. The gold standard of fundamental valuation.',
    example: 'If TCS will generate 100Cr/year for 20 years and you need 12% returns, the business is worth roughly 750Cr today — the "present value" of those flows.',
    relatedTerms: ['intrinsic value', 'discount rate', 'terminal value'],
  },
  'pricing power': {
    term: 'Pricing Power',
    definition: 'A company\'s ability to raise prices WITHOUT losing customers. The ultimate indicator of a genuine moat. If raising prices sends customers away, there is no moat.',
    example: 'Asian Paints raises paint prices every year. Customers grumble but still buy. That\'s pricing power. A commodity steel producer cannot raise prices — no pricing power.',
    relatedTerms: ['moat', 'brand value', 'competitive advantage'],
  },
  'mean reversion': {
    term: 'Mean Reversion',
    definition: 'The tendency of extreme values to return to long-term averages over time. High-margin businesses attract competition, compressing margins back to normal.',
    example: 'A company earning 40% margins will attract rivals who undercut prices until margins compress to the sector average of 15-20%. Howard Marks focuses heavily on this.',
    relatedTerms: ['competitive advantage', 'moat', 'cyclicality'],
  },
  'circle of competence': {
    term: 'Circle of Competence',
    definition: 'Buffett and Munger\'s principle: only invest in businesses you genuinely understand. Knowing your limits is as important as knowing your strengths.',
    example: 'Buffett avoided tech stocks for 30 years — not because he thought they were bad, but because he couldn\'t reliably predict their competitive positions 10 years out.',
    relatedTerms: ['expertise', 'due diligence', 'research'],
  },
  'scuttlebutt': {
    term: 'Scuttlebutt Method',
    definition: 'Philip Fisher\'s research approach: talk to competitors, suppliers, customers, and employees to understand a business — not just read annual reports.',
    example: 'Fisher would call 20 people who knew a company before buying. Lynch famously discovered investment ideas by visiting malls and talking to store managers.',
    relatedTerms: ['due diligence', 'qualitative research', 'management quality'],
  },
  'float': {
    term: 'Insurance Float',
    definition: 'Premiums collected by an insurance company before claims are paid. Buffett used GEICO\'s float as essentially free money to invest — a structural funding advantage.',
    example: 'Berkshire Hathaway holds $150B+ of float. This is money that belongs to policyholders but Buffett invests until claims come due — a massive competitive advantage.',
    relatedTerms: ['insurance', 'leverage', 'berkshire'],
  },
  'turnaround': {
    term: 'Turnaround Play',
    definition: 'Investing in a struggling company betting it will recover. High risk, high reward if it works. Most turnarounds fail — Munger says "show me the incentive and I\'ll show you the outcome."',
    example: 'YES Bank fell 95% before a forced rescue. Vodafone Idea fell 99%. Most turnarounds do not turn. Lynch had success with a few but warned they are "iffy at best."',
    relatedTerms: ['distressed investing', 'management change', 'risk assessment'],
  },
  'qglp': {
    term: 'QGLP Framework',
    definition: 'Raamdeo Agarwal\'s investment framework: Quality of business, Growth of earnings, Longevity of competitive advantage, and Price paid. All four must score well.',
    example: 'A business scoring 10/10 on Quality but 3/10 on Price is not a buy. All four dimensions must align for Raamdeo to invest with conviction.',
    relatedTerms: ['fundamental analysis', 'quality investing', 'valuation'],
  },
  'momentum': {
    term: 'Price Momentum',
    definition: 'The tendency for rising stocks to keep rising and falling stocks to keep falling, at least over medium-term horizons. Soros and Kedia use momentum as a signal.',
    example: 'A stock breaking to 52-week highs on high volume shows momentum. Trend-followers buy this setup. Value investors often fight momentum — and lose in the short term.',
    relatedTerms: ['trend following', 'technical analysis', 'reflexivity'],
  },
  'conviction': {
    term: 'High Conviction',
    definition: 'Strong belief in an investment thesis based on deep research, leading to large position sizes. Without deep research, concentration is just gambling.',
    example: 'Jhunjhunwala held Titan for 20+ years through multiple 50%+ drawdowns. That is conviction — sustained by continuous research, not just hope.',
    relatedTerms: ['concentration', 'position sizing', 'research depth'],
  },
  'de': {
    term: 'Debt-to-Equity Ratio',
    definition: 'Total debt divided by shareholder equity. Shows financial leverage. High D/E amplifies both profits AND losses. Below 0.5 is generally safe; above 2 is concerning.',
    example: 'D/E of 0.1 (like TCS) means almost no debt. D/E of 3.0 (like Vodafone India) means debt is 3x equity — small revenue drops can threaten solvency.',
    relatedTerms: ['leverage', 'balance sheet', 'financial risk'],
  },
  'ebitda': {
    term: 'EBITDA',
    definition: 'Earnings Before Interest, Taxes, Depreciation, and Amortization. Measures operating profitability before financing decisions and accounting choices distort the picture.',
    example: 'Two companies with same EBITDA but different debt have different earnings. EBITDA strips out financing to compare operating performance purely.',
    relatedTerms: ['operating margin', 'profitability', 'enterprise value'],
  },
  'opm': {
    term: 'Operating Profit Margin (OPM)',
    definition: 'Operating profit divided by revenue. Shows what percentage of every sales rupee becomes operating profit. Higher and expanding margins = pricing power + operating leverage.',
    example: 'OPM of 25% means 25 of every 100 in sales becomes operating profit. If OPM grows from 20% to 25% while revenue doubles, profit grows 2.5x — operating leverage.',
    relatedTerms: ['gross margin', 'ebitda', 'pricing power'],
  },
  'book value': {
    term: 'Book Value',
    definition: 'Net assets of a company: total assets minus total liabilities. Graham\'s anchor — he rarely paid more than 1.5x book. Warren Buffett moved beyond book to focus on earnings power.',
    example: 'If a company has 500Cr assets and 200Cr liabilities, book value is 300Cr. Buying at below book value provides a Graham-style margin of safety.',
    relatedTerms: ['price to book', 'net assets', 'margin of safety'],
  },
  'capex': {
    term: 'Capital Expenditure (CapEx)',
    definition: 'Money spent on physical assets — factories, equipment, infrastructure. High-capex businesses need constant reinvestment; capital-light businesses generate more free cash.',
    example: 'A software company needs almost no capex — margins flow directly to owners. A steel plant needs billions in capex every decade. Buffett prefers capital-light businesses.',
    relatedTerms: ['fcf', 'maintenance capex', 'growth capex'],
  },
  'network effects': {
    term: 'Network Effects',
    definition: 'When a product becomes MORE valuable as more people use it. Creates a self-reinforcing moat — hard for competitors to break in once network reaches critical mass.',
    example: 'NSE (National Stock Exchange) has network effects — more traders = more liquidity = more traders. VISA has network effects — more merchants = more cardholders = more merchants.',
    relatedTerms: ['moat', 'switching costs', 'competitive advantage'],
  },
  'switching costs': {
    term: 'Switching Costs',
    definition: 'The financial, operational, or psychological costs of changing from one product/service to another. High switching costs = customers are locked in = pricing power.',
    example: 'Once a company uses SAP for ERP, switching to another system costs crores and years of disruption. That\'s a switching cost moat — SAP can raise prices every year.',
    relatedTerms: ['moat', 'pricing power', 'customer retention'],
  },
  'eps': {
    term: 'EPS (Earnings Per Share)',
    definition: 'Net profit divided by number of outstanding shares. Shows how much profit each share generates. Growing EPS with stable share count = compounding shareholder value.',
    example: 'If a company earns 100Cr and has 10Cr shares, EPS is 10. If next year EPS is 12, it grew 20% — and if PE stays constant, the stock price also rises 20%.',
    relatedTerms: ['pe ratio', 'earnings growth', 'dilution'],
  },
  'promoter': {
    term: 'Promoter Holding',
    definition: 'The percentage of shares held by the founders/controlling shareholders. High promoter holding (>60%) usually signals founder conviction. Promoter pledging shares is a major red flag.',
    example: 'Damani holds ~75% of DMart. That alignment of interests ensures management acts like owners. Contrast with promoters who dilute equity constantly to fund expansion.',
    relatedTerms: ['corporate governance', 'skin in the game', 'pledging'],
  },
  'beta': {
    term: 'Beta (Volatility)',
    definition: 'Measures a stock\'s price movement relative to the overall market. Beta of 1 = moves with market. Beta of 2 = twice as volatile. Beta of 0.5 = half the market volatility.',
    example: 'ITC has beta ~0.5 — defensive. Tata Motors has beta ~1.5 — amplifies market moves. In bull markets, high-beta wins; in bear markets, low-beta protects capital.',
    relatedTerms: ['volatility', 'risk', 'portfolio management'],
  },
};

// ─── Text Scanner ─────────────────────────────────────────────────────────────
// Scans text and returns segments marking glossary terms

export function highlightGlossaryTerms(text: string): Array<{
  text: string;
  term?: string;
  isGlossary: boolean;
}> {
  const terms = Object.keys(INVESTMENT_GLOSSARY).sort((a, b) => b.length - a.length);
  const segments: Array<{ text: string; term?: string; isGlossary: boolean }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    let matched = false;
    for (const termKey of terms) {
      const slice = text.slice(cursor);
      if (slice.toLowerCase().startsWith(termKey.toLowerCase())) {
        const before = cursor > 0 ? text[cursor - 1] : ' ';
        const after = text[cursor + termKey.length] ?? ' ';
        if (/\W/.test(before) && (/\W/.test(after) || cursor + termKey.length >= text.length)) {
          segments.push({ text: text.slice(cursor, cursor + termKey.length), term: termKey, isGlossary: true });
          cursor += termKey.length;
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      if (segments.length > 0 && !segments[segments.length - 1].isGlossary) {
        segments[segments.length - 1].text += text[cursor];
      } else {
        segments.push({ text: text[cursor], isGlossary: false });
      }
      cursor++;
    }
  }

  return segments.length > 0 ? segments : [{ text, isGlossary: false }];
}