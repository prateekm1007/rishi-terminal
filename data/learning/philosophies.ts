// data/learning/philosophies.ts (R4-07) — the learning-hub content
// registry.
//
// CONTENT RULES (founder acceptance: "no financial claims without a
// source link (copy audit)"):
//   - Every principle carries at least one source; the biography line
//     carries a source. test/r4-07.learn.test.ts enforces this
//     mechanically and bans performance language ("beat the market",
//     "outperform", "guaranteed returns", ...) outright — educational
//     pages make no claims about outcomes.
//   - No invented quotations (Constitution 4). Principles are
//     paraphrases of documented, sourced ideas; direct quotes are
//     verbatim from the cited page.
//   - The "how the terminal scores it" sections describe what the CODE
//     measures (lib/scorers/*) and link the methodology page — internal
//     facts, not market claims.
//
// Owner note: roadmap marks R4-07 as CODER + FOUNDER (content) — this
// registry is the data-only extension point for the founder's own
// essays: add an entry, and the page, tests and index follow it.

export interface Sourced {
  text: string;
  sources: Array<{ label: string; url: string }>;
}

export interface Philosophy {
  slug: string;
  /** Unique page title (tested). */
  title: string;
  /** Unique page description (tested). */
  description: string;
  rishiName: string;
  /** One sourced biographical line. */
  biography: Sourced;
  /** 4-7 sourced principles. */
  principles: Sourced[];
  /** What the terminal's scorer measures (internal description). */
  howWeScoreIt: {
    /** The scorer module in lib/scorers/. */
    scorer: string;
    factors: string[];
  };
  /** The screener preset id whose filters echo this philosophy. */
  screenerPreset: string;
}

export const PHILOSOPHIES: Philosophy[] = [
  {
    slug: 'jhunjhunwala',
    title: 'The Jhunjhunwala Philosophy — Conviction Multibagger | Learn | Rishi Terminal',
    description: 'Rakesh Jhunjhunwala’s documented approach: conviction in India’s growth, buying businesses rather than ticks, and promoter skin in the game — with sources.',
    rishiName: 'Rakesh Jhunjhunwala',
    biography: {
      text: 'Rakesh Jhunjhunwala (1960–2022) was an Indian chartered accountant turned investor, widely reported in Indian financial media as the “Big Bull” of Dalal Street.',
      sources: [
        { label: 'Reuters obituary', url: 'https://www.reuters.com/world/india/indias-big-bull-rakesh-jhunjhunwala-dies-aged-62-2022-08-14/' },
        { label: 'Forbes India profile', url: 'https://www.forbesindia.com/article/forbes-india-40th-anniversary-issue/rakesh-jhunjhunwala-the-big-bull-of-dalal-street/84251/1' },
      ],
    },
    principles: [
      {
        text: 'Back high-conviction views on India’s long-term economic growth with concentrated equity positions, rather than diversifying away a thesis.',
        sources: [
          { label: 'Economic Times interviews archive', url: 'https://economictimes.indiatimes.com/topic/rakesh-jhunjhunwala-interview' },
          { label: 'Forbes India profile', url: 'https://www.forbesindia.com/article/forbes-india-40th-anniversary-issue/rakesh-jhunjhunwala-the-big-bull-of-dalal-street/84251/1' },
        ],
      },
      {
        text: 'Buy businesses, not stock ticks: the holding decision rests on the company’s earnings power and the promoter’s demonstrated capital allocation.',
        sources: [{ label: 'Economic Times interviews archive', url: 'https://economictimes.indiatimes.com/topic/rakesh-jhunjhunwala-interview' }],
      },
      {
        text: 'Promoter skin in the game matters: managements with meaningful personal capital at risk align with minority shareholders.',
        sources: [{ label: 'Forbes India profile', url: 'https://www.forbesindia.com/article/forbes-india-40th-anniversary-issue/rakesh-jhunjhunwala-the-big-bull-of-dalal-street/84251/1' }],
      },
      {
        text: 'Hold through volatility when the original thesis is intact; sell when the thesis breaks, not when the price falls.',
        sources: [{ label: 'Reuters obituary and career coverage', url: 'https://www.reuters.com/world/india/indias-big-bull-rakesh-jhunjhunwala-dies-aged-62-2022-08-14/' }],
      },
      {
        text: 'Size positions by conviction and research depth, accepting that individual positions can fail while the portfolio approach survives.',
        sources: [{ label: 'Economic Times interviews archive', url: 'https://economictimes.indiatimes.com/topic/rakesh-jhunjhunwala-interview' }],
      },
    ],
    howWeScoreIt: {
      scorer: 'lib/scorers/jhunjhunwala.ts',
      factors: ['Return on equity', 'leverage', 'promoter holding', 'earnings growth'],
    },
    screenerPreset: 'jhunjhunwala',
  },
  {
    slug: 'damani',
    title: 'The Damani Philosophy — Conservative Compounding | Learn | Rishi Terminal',
    description: 'Radhakrishnan Damani’s documented approach: capital protection first, fortress balance sheets and quiet compounding — with sources.',
    rishiName: 'Radhakrishnan Damani',
    biography: {
      text: 'Radhakrishnan Damani is an Indian investor and the founder of the DMart retail chain (Avenue Supermarts); he keeps a deliberately low public profile, and coverage describes him as unusually media-shy.',
      sources: [
        { label: 'Forbes profile', url: 'https://www.forbes.com/profile/radhakishan-damani/' },
        { label: 'Avenue Supermarts (DMart) corporate site', url: 'https://www.dmartindia.com/about-us' },
      ],
    },
    principles: [
      {
        text: 'Protect capital first: the first question is what can go wrong, and the balance sheet is treated as the primary safety device.',
        sources: [{ label: 'Forbes profile', url: 'https://www.forbes.com/profile/radhakishan-damani/' }],
      },
      {
        text: 'Prefer predictable, cash-generating businesses bought at sensible prices over stories that need everything to go right.',
        sources: [{ label: 'Avenue Supermarts investor communications (BSE filings)', url: 'https://www.bseindia.com/stock-share-price/avenue-supermarts-ltd/dmart/540376/' }],
      },
      {
        text: 'Frugality in operations compounds: DMart’s documented everyday-low-cost retail model keeps expenses low and passes savings to shoppers.',
        sources: [{ label: 'DMart corporate site — about us', url: 'https://www.dmartindia.com/about-us' }],
      },
      {
        text: 'Let compounding do the work quietly: long holding periods and minimal trading are recurring themes in how his portfolio is described.',
        sources: [{ label: 'Forbes profile', url: 'https://www.forbes.com/profile/radhakishan-damani/' }],
      },
    ],
    howWeScoreIt: {
      scorer: 'lib/scorers/damani.ts',
      factors: ['debt-to-equity', 'free cash flow consistency', 'valuation discipline'],
    },
    screenerPreset: 'damani',
  },
  {
    slug: 'buffett',
    title: 'The Buffett Philosophy — Wonderful Businesses at Fair Prices | Learn | Rishi Terminal',
    description: 'Warren Buffett’s documented approach: durable moats, owner earnings and buying wonderful businesses at fair prices — sourced to the Berkshire letters.',
    rishiName: 'Warren Buffett',
    biography: {
      text: 'Warren Buffett has chaired Berkshire Hathaway since 1965 and writes an annual shareholder letter that is published free on the company’s own site.',
      sources: [
        { label: 'Berkshire Hathaway shareholder letters', url: 'https://www.berkshirehathaway.com/letters/letters.html' },
        { label: 'Berkshire Hathaway corporate site', url: 'https://www.berkshirehathaway.com/' },
      ],
    },
    principles: [
      {
        text: '“It’s far better to buy a wonderful company at a fair price than a fair company at a wonderful price.” (1989 shareholder letter)',
        sources: [{ label: 'Berkshire 1989 shareholder letter', url: 'https://www.berkshirehathaway.com/letters/1989.html' }],
      },
      {
        text: 'A durable competitive advantage (“moat”) protects returns on capital; the letters discuss moats repeatedly across decades.',
        sources: [{ label: 'Berkshire shareholder letters index', url: 'https://www.berkshirehathaway.com/letters/letters.html' }],
      },
      {
        text: 'Value businesses by the cash they generate — “owner earnings” — rather than accounting earnings; defined in the 1986 letter.',
        sources: [{ label: 'Berkshire 1986 shareholder letter', url: 'https://www.berkshirehathaway.com/letters/1986.html' }],
      },
      {
        text: 'Margin of safety, inherited from Benjamin Graham, remains the anchor of the purchase decision.',
        sources: [
          { label: 'Berkshire shareholder letters index', url: 'https://www.berkshirehathaway.com/letters/letters.html' },
          { label: 'The Intelligent Investor (Graham)', url: 'https://en.wikipedia.org/wiki/The_Intelligent_Investor' },
        ],
      },
      {
        text: 'Think like a part-owner: “time is the friend of the wonderful business” (1989 letter) — holding periods are “forever” for the right businesses.',
        sources: [{ label: 'Berkshire 1989 shareholder letter', url: 'https://www.berkshirehathaway.com/letters/1989.html' }],
      },
    ],
    howWeScoreIt: {
      scorer: 'lib/scorers/buffett.ts',
      factors: ['return on capital', 'earnings quality', 'valuation versus cash generation'],
    },
    screenerPreset: 'buffett',
  },
  {
    slug: 'graham',
    title: 'The Graham Philosophy — Margin of Safety | Learn | Rishi Terminal',
    description: 'Benjamin Graham’s documented framework: Mr. Market, intrinsic value and the margin of safety — sourced to The Intelligent Investor and Security Analysis.',
    rishiName: 'Benjamin Graham',
    biography: {
      text: 'Benjamin Graham (1894–1976) taught investing at Columbia Business School, wrote The Intelligent Investor and Security Analysis, and is widely described as the father of security analysis and value investing.',
      sources: [
        { label: 'Columbia Business School — faculty history', url: 'https://www8.gsb.columbia.edu/valueinvesting/about-us/benjamin-graham' },
        { label: 'The Intelligent Investor', url: 'https://en.wikipedia.org/wiki/The_Intelligent_Investor' },
      ],
    },
    principles: [
      {
        text: 'Mr. Market: treat daily quotations as offers from an emotional partner, to be exploited when agreeable and ignored when not (chapter 8 of The Intelligent Investor).',
        sources: [{ label: 'The Intelligent Investor, ch. 8', url: 'https://en.wikipedia.org/wiki/The_Intelligent_Investor' }],
      },
      {
        text: 'Margin of safety is the central concept of investment: pay meaningfully less than conservatively computed intrinsic value.',
        sources: [{ label: 'The Intelligent Investor, ch. 20', url: 'https://en.wikipedia.org/wiki/The_Intelligent_Investor' }],
      },
      {
        text: 'Distinguish investment from speculation: “An investment operation is one which, upon thorough analysis, promises safety of principal and an adequate return.”',
        sources: [{ label: 'Security Analysis (1934)', url: 'https://en.wikipedia.org/wiki/Security_Analysis_(book)' }],
      },
      {
        text: 'Insist on a demonstrable floor — net current asset value (“net-nets”) was Graham’s most famous quantitative screen.',
        sources: [{ label: 'Security Analysis (1934)', url: 'https://en.wikipedia.org/wiki/Security_Analysis_(book)' }],
      },
    ],
    howWeScoreIt: {
      scorer: 'lib/scorers/graham.ts',
      factors: ['price-to-earnings floors', 'balance-sheet strength', 'net-current-asset tests'],
    },
    screenerPreset: 'graham',
  },
  {
    slug: 'lynch',
    title: 'The Lynch Philosophy — Growth at a Reasonable Price | Learn | Rishi Terminal',
    description: 'Peter Lynch’s documented approach: invest in what you understand, the PEG ratio and categorizing companies before valuing them — sourced to One Up On Wall Street.',
    rishiName: 'Peter Lynch',
    biography: {
      text: 'Peter Lynch managed Fidelity’s Magellan Fund from 1977 to 1990 and wrote One Up On Wall Street (1989), which lays out his framework for retail investors.',
      sources: [
        { label: 'One Up On Wall Street (1989)', url: 'https://en.wikipedia.org/wiki/One_Up_on_Wall_Street' },
        { label: 'Fidelity — Peter Lynch profile', url: 'https://www.fidelity.com/learning-center/trading-investing/fundamental-analysis/peter-lynch-on-investing' },
      ],
    },
    principles: [
      {
        text: 'Invest in what you know: everyday observation can surface growth companies before the street fully prices them (One Up On Wall Street).',
        sources: [{ label: 'One Up On Wall Street', url: 'https://en.wikipedia.org/wiki/One_Up_on_Wall_Street' }],
      },
      {
        text: 'The PEG ratio — price-to-earnings divided by growth — as a first-pass sanity check on whether growth is already over-priced.',
        sources: [{ label: 'One Up On Wall Street', url: 'https://en.wikipedia.org/wiki/One_Up_on_Wall_Street' }],
      },
      {
        text: 'Categorize before you value: slow growers, stalwarts, fast growers, cyclicals, turnarounds and asset plays each need a different lens.',
        sources: [{ label: 'One Up On Wall Street, ch. 7', url: 'https://en.wikipedia.org/wiki/One_Up_on_Wall_Street' }],
      },
      {
        text: 'Know why you own it: write the “story” — if the story changes, the reason to hold changes (Lynch’s Fidelity interviews).',
        sources: [{ label: 'Fidelity — Peter Lynch on investing', url: 'https://www.fidelity.com/learning-center/trading-investing/fundamental-analysis/peter-lynch-on-investing' }],
      },
    ],
    howWeScoreIt: {
      scorer: 'lib/scorers/lynch.ts',
      factors: ['earnings growth versus P/E (PEG-style)', 'growth consistency'],
    },
    screenerPreset: 'lynch',
  },
];

export function philosophyBySlug(slug: string): Philosophy | undefined {
  return PHILOSOPHIES.find((p) => p.slug === slug);
}
