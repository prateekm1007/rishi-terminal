// data/rishi-portfolios/global-plays.ts
// Real historical plays for all 20 Rishis — India + Global

export interface RishiPlay {
  rishi: string;
  rishiShort: string;
  stock: string;
  ticker?: string;
  flag: string;
  market: 'India' | 'USA' | 'UK' | 'Global' | 'HK';
  yearBought: string;
  yearSold?: string;
  buyPrice?: string;
  sellPrice?: string;
  return?: string;
  returnMultiple?: string;
  thesis: string;
  outcome: 'legendary' | 'success' | 'ongoing' | 'mixed' | 'failure';
  category: 'consumer_moat' | 'quality_compound' | 'growth_mania' |
            'cyclical_trap' | 'turnaround_trap' | 'smallcap_gem' |
            'macro_play' | 'value' | 'distressed';
  keyMetricAtBuy?: string;
  whatHappened: string;
  glossaryHint?: string;
}

export const GLOBAL_RISHI_PLAYS: RishiPlay[] = [

  // ════════════════════════════════════════
  // WARREN BUFFETT
  // ════════════════════════════════════════
  {
    rishi: 'Warren Buffett',
    rishiShort: 'Buffett',
    stock: 'Coca-Cola',
    ticker: 'KO',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '1988',
    buyPrice: '$2.50',
    return: '+2,400%',
    returnMultiple: '25x',
    thesis: 'An unbreakable consumer moat built on global brand recognition. Every human on earth knows Coke. Pricing power that compounds quietly for decades. The business earns 35%+ ROE with minimal capex.',
    outcome: 'legendary',
    category: 'consumer_moat',
    keyMetricAtBuy: 'P/E ~15x, ROE 33%, global distribution moat',
    whatHappened: 'Held 35+ years. Dividends alone returned 200% of original investment. The moat grew wider every decade.',
    glossaryHint: 'moat pricing power roe'
  },
  {
    rishi: 'Warren Buffett',
    rishiShort: 'Buffett',
    stock: 'Apple',
    ticker: 'AAPL',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '2016',
    buyPrice: '$28',
    return: '+630%',
    returnMultiple: '7x',
    thesis: 'Not a tech company — a consumer brand with the most powerful switching costs on earth. iPhone ecosystem creates a moat deeper than any factory. 900M loyal customers who upgrade every 3 years.',
    outcome: 'legendary',
    category: 'consumer_moat',
    keyMetricAtBuy: 'P/E 12x at trough, 900M installed base',
    whatHappened: 'Became Berkshire\'s largest holding at $175B+. Buffett called it "probably the best business in the world."',
    glossaryHint: 'switching costs moat consumer'
  },
  {
    rishi: 'Warren Buffett',
    rishiShort: 'Buffett',
    stock: 'American Express',
    ticker: 'AXP',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '1964',
    buyPrice: '$3.20',
    return: '+50,000%',
    returnMultiple: '500x',
    thesis: 'Everyone panicked after the 1963 Salad Oil Scandal. But AmEx\'s brand trust with merchants was intact. This was a temporary crisis, not a permanent loss. Network effects in payments are unbeatable.',
    outcome: 'legendary',
    category: 'turnaround_trap',
    keyMetricAtBuy: 'Stock down 50% on scandal — genuine margin of safety',
    whatHappened: 'One of Buffett\'s greatest contrarian calls. The scandal was real but the business was unharmed. Held 60 years.',
    glossaryHint: 'network effects contrarian margin of safety'
  },
  {
    rishi: 'Warren Buffett',
    rishiShort: 'Buffett',
    stock: 'GEICO Insurance',
    ticker: 'GEICO',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '1976',
    buyPrice: '$2.00',
    return: 'Acquired fully at $70',
    returnMultiple: '35x before acquisition',
    thesis: 'Direct-to-consumer auto insurance — cut out agents, charge less. The float from premiums is essentially a zero-cost loan forever. Graham taught Buffett this concept.',
    outcome: 'legendary',
    category: 'value',
    keyMetricAtBuy: 'Near-bankruptcy price, float concept overlooked by market',
    whatHappened: 'Buffett acquired 100% in 1996 for $2.3B. Now generates $30B+ in annual premiums.',
    glossaryHint: 'float intrinsic value margin of safety'
  },
  {
    rishi: 'Warren Buffett',
    rishiShort: 'Buffett',
    stock: 'IBM',
    ticker: 'IBM',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '2011',
    yearSold: '2017',
    buyPrice: '$170',
    sellPrice: '$150',
    return: '-12%',
    thesis: 'Enterprise IT services lock-in. Massive switching costs. Dividends and buybacks. Thought it was a quality compounder.',
    outcome: 'failure',
    category: 'quality_compound',
    keyMetricAtBuy: 'P/E 13x, strong buyback program',
    whatHappened: 'Sold at a loss. Cloud disrupted IBM\'s mainframe moat. Buffett admitted he misjudged tech disruption. Lesson: tech moats can evaporate faster than consumer moats.',
    glossaryHint: 'moat switching costs quality value trap'
  },

  // ════════════════════════════════════════
  // RAKESH JHUNJHUNWALA
  // ════════════════════════════════════════
  {
    rishi: 'Rakesh Jhunjhunwala',
    rishiShort: 'RJ',
    stock: 'Titan Company',
    ticker: 'TITAN',
    flag: '🇮🇳',
    market: 'India',
    yearBought: '2002',
    yearSold: '2022',
    buyPrice: '3',
    sellPrice: '2,800',
    return: '+93,233%',
    returnMultiple: '933x',
    thesis: 'The great transition from unorganised jewellery to branded retail. Tata\'s ethics + Titan\'s execution + India\'s rising middle class = a 20-year tailwind. Bought when market saw a failing watches company.',
    outcome: 'legendary',
    category: 'consumer_moat',
    keyMetricAtBuy: 'Tiny market cap, brand moat invisible to market',
    whatHappened: 'India\'s greatest stock market win. Jhunjhunwala held through 4 bear markets, never sold despite volatility. Conviction compounding.',
    glossaryHint: 'moat ten bagger conviction compounding'
  },
  {
    rishi: 'Rakesh Jhunjhunwala',
    rishiShort: 'RJ',
    stock: 'Lupin Ltd',
    ticker: 'LUPIN',
    flag: '🇮🇳',
    market: 'India',
    yearBought: '2003',
    yearSold: '2018',
    buyPrice: '140',
    sellPrice: '1,800',
    return: '+1,186%',
    returnMultiple: '13x',
    thesis: 'US generics market opportunity was massive and Lupin had the R&D pipeline. Strong management under Desh Bandhu Gupta. India\'s pharma cost advantage was permanent.',
    outcome: 'success',
    category: 'quality_compound',
    keyMetricAtBuy: 'Low PE, strong R&D pipeline, US FDA approvals accelerating',
    whatHappened: 'Sold before US FDA issues surfaced. Perfect exit. Later Lupin faced quality issues — RJ had already moved on.',
    glossaryHint: 'management quality cagr conviction'
  },
  {
    rishi: 'Rakesh Jhunjhunwala',
    rishiShort: 'RJ',
    stock: 'NCC Ltd',
    ticker: 'NCC',
    flag: '🇮🇳',
    market: 'India',
    yearBought: '2009',
    buyPrice: '70',
    return: 'Ongoing',
    thesis: 'India\'s infrastructure buildout is generational. NCC builds the roads, bridges, buildings of India\'s future. Cyclical but essential. Patient capital required.',
    outcome: 'ongoing',
    category: 'smallcap_gem',
    keyMetricAtBuy: 'Post-crash price, order book growing',
    whatHappened: 'Long-term infrastructure bet. Volatile but held through cycles. India infra thesis playing out decade later.',
    glossaryHint: 'conviction mean reversion capital allocation'
  },

  // ════════════════════════════════════════
  // RADHAKISHAN DAMANI
  // ════════════════════════════════════════
  {
    rishi: 'Radhakishan Damani',
    rishiShort: 'Damani',
    stock: 'Avenue Supermarts (DMart)',
    ticker: 'DMART',
    flag: '🇮🇳',
    market: 'India',
    yearBought: '2002',
    buyPrice: '10 (pre-IPO)',
    return: 'IPO at 299, now 5,000+',
    returnMultiple: '500x',
    thesis: 'Own the real estate you operate from. Every-Day-Low-Prices beats discounting. No debt. Pay suppliers fast to get better prices. Simple model executed with obsessive discipline.',
    outcome: 'legendary',
    category: 'consumer_moat',
    keyMetricAtBuy: 'Founder-built, zero debt, negative working capital',
    whatHappened: 'India\'s most successful retail model. DMart IPO was the decade\'s best listing. Damani still owns 74%. Never sold.',
    glossaryHint: 'working capital skin in the game moat asset light'
  },
  {
    rishi: 'Radhakishan Damani',
    rishiShort: 'Damani',
    stock: 'VST Industries',
    ticker: 'VSTIND',
    flag: '🇮🇳',
    market: 'India',
    yearBought: '2000',
    yearSold: '2015',
    buyPrice: '80',
    sellPrice: '3,500',
    return: '+4,275%',
    returnMultiple: '44x',
    thesis: 'Cigarette monopoly in South India with predictable cash flows. Minimal capex. Strong FCF. Pricing power nobody questions. Boring business = beautiful returns.',
    outcome: 'legendary',
    category: 'consumer_moat',
    keyMetricAtBuy: 'Low PE, high FCF yield, zero competition',
    whatHappened: 'Damani\'s classic "boring business" playbook. Collected dividends and capital gains. Sold after 15 years of compounding.',
    glossaryHint: 'fcf pricing power moat compounding'
  },
  {
    rishi: 'Radhakishan Damani',
    rishiShort: 'Damani',
    stock: 'HDFC Bank',
    ticker: 'HDFCBANK',
    flag: '🇮🇳',
    market: 'India',
    yearBought: '1999',
    buyPrice: '100',
    return: '+9,800%',
    returnMultiple: '99x',
    thesis: 'Private banking will displace PSU banks in India. HDFC Bank\'s technology, culture, and risk management are incomparable. Aditya Puri is a once-in-a-generation banker.',
    outcome: 'legendary',
    category: 'quality_compound',
    keyMetricAtBuy: 'Low P/B on a superior bank',
    whatHappened: 'Held for 25 years. HDFC Bank became India\'s most valuable bank. Management quality thesis proved completely correct.',
    glossaryHint: 'management quality roe network effects'
  },

  // ════════════════════════════════════════
  // CHARLIE MUNGER
  // ════════════════════════════════════════
  {
    rishi: 'Charlie Munger',
    rishiShort: 'Munger',
    stock: 'Costco Wholesale',
    ticker: 'COST',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '1997',
    buyPrice: '$15',
    return: '+2,800%',
    returnMultiple: '29x',
    thesis: 'Membership creates the ultimate moat — customers PAY to shop here. Low-margin, high-volume, extreme operational excellence. The most ethical retailer in America. Trust as competitive advantage.',
    outcome: 'legendary',
    category: 'consumer_moat',
    keyMetricAtBuy: 'Low PE, but quality impossible to replicate',
    whatHappened: 'Munger called Costco the best business in the world multiple times. Still holds. The membership model proved unassailable.',
    glossaryHint: 'moat switching costs quality management quality'
  },
  {
    rishi: 'Charlie Munger',
    rishiShort: 'Munger',
    stock: 'BYD (Electric Vehicles)',
    ticker: 'BYDDY',
    flag: '🇨🇳',
    market: 'HK',
    yearBought: '2008',
    yearSold: '2023',
    buyPrice: 'HK$8',
    sellPrice: 'HK$250',
    return: '+3,025%',
    returnMultiple: '31x',
    thesis: 'Charlie Wang is the most capable man I have ever met. BYD\'s battery technology + manufacturing scale will win the EV race globally. China\'s infrastructure advantage.',
    outcome: 'legendary',
    category: 'growth_mania',
    keyMetricAtBuy: 'Early stage EV, Wang\'s battery expertise thesis',
    whatHappened: 'Munger convinced Buffett. $232M investment became $9B+. One of the greatest emerging market growth bets ever.',
    glossaryHint: 'management quality conviction asymmetric bet'
  },

  // ════════════════════════════════════════
  // PETER LYNCH
  // ════════════════════════════════════════
  {
    rishi: 'Peter Lynch',
    rishiShort: 'Lynch',
    stock: 'Dunkin\' Donuts',
    ticker: 'DNKN',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '1982',
    yearSold: '1990',
    buyPrice: '$1.50',
    sellPrice: '$14.00',
    return: '+833%',
    returnMultiple: '9x',
    thesis: 'Discovered it by eating there. Simple concept that can expand everywhere. Low-cost franchise model means the company doesn\'t need capex to grow. Classic Lynch: invest in what you know.',
    outcome: 'success',
    category: 'consumer_moat',
    keyMetricAtBuy: 'Low PEG ratio, rapid store expansion',
    whatHappened: 'Lynch\'s scuttlebutt method validated at every store visit. Long queues + simple menu + loyal customers = the thesis.',
    glossaryHint: 'scuttlebutt peg ratio ten bagger circle of competence'
  },
  {
    rishi: 'Peter Lynch',
    rishiShort: 'Lynch',
    stock: 'Fannie Mae',
    ticker: 'FNM',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '1977',
    yearSold: '1992',
    buyPrice: '$0.40',
    sellPrice: '$8.00',
    return: '+1,900%',
    returnMultiple: '20x',
    thesis: 'Near-bankrupt mortgage company with government backing. The market misunderstood — it wasn\'t going under. America\'s homeownership boom needed Fannie. Turnaround no one wanted to buy.',
    outcome: 'success',
    category: 'turnaround_trap',
    keyMetricAtBuy: 'Near-zero price, intrinsic value massively higher',
    whatHappened: 'Lynch\'s most discussed holding. Held through massive volatility. The thesis was about intrinsic value vs temporary panic.',
    glossaryHint: 'turnaround intrinsic value contrarian margin of safety'
  },
  {
    rishi: 'Peter Lynch',
    rishiShort: 'Lynch',
    stock: 'Chrysler',
    ticker: 'C',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '1982',
    yearSold: '1987',
    buyPrice: '$2',
    sellPrice: '$48',
    return: '+2,300%',
    returnMultiple: '24x',
    thesis: 'Lee Iacocca had saved Chrysler from bankruptcy. New models coming. Inventory of cash from asset sales. Zero debt post-restructuring. Hated by everyone = Lynch\'s opportunity.',
    outcome: 'legendary',
    category: 'turnaround_trap',
    keyMetricAtBuy: 'Stock near zero, turnaround thesis clear to those looking',
    whatHappened: 'One of Lynch\'s best turnaround calls. Held through Chrysler\'s remarkable K-car recovery.',
    glossaryHint: 'turnaround contrarian ten bagger scuttlebutt'
  },

  // ════════════════════════════════════════
  // GEORGE SOROS
  // ════════════════════════════════════════
  {
    rishi: 'George Soros',
    rishiShort: 'Soros',
    stock: 'British Pound (Short)',
    ticker: 'GBP',
    flag: '🇬🇧',
    market: 'Global',
    yearBought: '1992',
    return: '$1 Billion profit in 1 day',
    returnMultiple: '100x leverage',
    thesis: 'UK couldn\'t maintain its ERM peg without destroying its economy. Raising interest rates to 15% to defend GBP would cause a recession. The peg MUST break. Pure reflexivity — soros bet on the feedback loop.',
    outcome: 'legendary',
    category: 'macro_play',
    keyMetricAtBuy: 'Asymmetric bet — limited downside if wrong, massive upside if right',
    whatHappened: 'Bank of England capitulated on Black Wednesday. Soros made $1B in one day. Changed global macro investing forever.',
    glossaryHint: 'reflexivity asymmetric bet leverage black swan'
  },
  {
    rishi: 'George Soros',
    rishiShort: 'Soros',
    stock: 'Thai Baht (Short)',
    ticker: 'THB',
    flag: '🇹🇭',
    market: 'Global',
    yearBought: '1997',
    return: 'Billions in profit',
    thesis: 'Thai current account deficit + pegged exchange rate + foreign debt = classic reflexivity trap. When the feedback loop turns, currencies don\'t fall — they collapse.',
    outcome: 'legendary',
    category: 'macro_play',
    keyMetricAtBuy: 'Overvalued peg, weak fundamentals, high foreign debt',
    whatHappened: 'Triggered the 1997 Asian Financial Crisis. Baht collapsed 40%. Soros made billions. Governments called him "an economic war criminal."',
    glossaryHint: 'reflexivity leverage currency risk black swan'
  },

  // ════════════════════════════════════════
  // BENJAMIN GRAHAM
  // ════════════════════════════════════════
  {
    rishi: 'Benjamin Graham',
    rishiShort: 'Graham',
    stock: 'GEICO Insurance',
    ticker: 'GEICO',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '1948',
    buyPrice: '$27',
    sellPrice: '$16,200 (by Berkshire)',
    return: '+60,000%',
    returnMultiple: '600x',
    thesis: 'Trading below book value with massive structural advantage. Direct insurance model (no agents) creates permanent cost advantage. The float concept was invisible to the market.',
    outcome: 'legendary',
    category: 'value',
    keyMetricAtBuy: 'Price < book value, margin of safety enormous',
    whatHappened: 'Graham taught Buffett about GEICO. Both became wealthy from it. The founding insight of value investing confirmed.',
    glossaryHint: 'margin of safety price to book intrinsic value float'
  },
  {
    rishi: 'Benjamin Graham',
    rishiShort: 'Graham',
    stock: 'Northern Pipeline',
    ticker: 'N/A',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '1926',
    return: '50% return in 18 months',
    thesis: 'Classic net-net: company trading below its liquid assets. Graham found Northern Pipeline held $95/share in railroad bonds on balance sheet. Stock traded at $65. Free money.',
    outcome: 'success',
    category: 'value',
    keyMetricAtBuy: 'Stock price < liquid assets (net-net)',
    whatHappened: 'Graham demanded dividend from management to unlock value. Succeeded. The birth of activist value investing.',
    glossaryHint: 'margin of safety price to book intrinsic value'
  },

  // ════════════════════════════════════════
  // MOHNISH PABRAI
  // ════════════════════════════════════════
  {
    rishi: 'Mohnish Pabrai',
    rishiShort: 'Pabrai',
    stock: 'Fiat Chrysler',
    ticker: 'FCAU',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '2014',
    yearSold: '2017',
    buyPrice: '$8',
    sellPrice: '$22',
    return: '+175%',
    returnMultiple: '2.7x',
    thesis: 'Classic Pabrai asymmetric bet. Sergio Marchionne was a management genius. Hidden assets in Jeep brand. Ferrari spinoff would unlock massive value. Heads I win, tails I don\'t lose much.',
    outcome: 'success',
    category: 'value',
    keyMetricAtBuy: 'Sum-of-parts value far exceeded market cap',
    whatHappened: 'Ferrari IPO at $52B (bought at implied $2B). Jeep grew globally. Marchionne\'s thesis played out exactly.',
    glossaryHint: 'asymmetric bet intrinsic value management quality conviction'
  },
  {
    rishi: 'Mohnish Pabrai',
    rishiShort: 'Pabrai',
    stock: 'Horsehead Holdings',
    ticker: 'ZINC',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '2014',
    yearSold: '2015',
    buyPrice: '$15',
    sellPrice: '$1',
    return: '-93%',
    thesis: 'Zinc producer with new modern plant. Should have been capital-light and efficient. Thought technology was de-risked.',
    outcome: 'failure',
    category: 'cyclical_trap',
    keyMetricAtBuy: 'Low EV/EBITDA on new plant commissioning',
    whatHappened: 'New plant had massive operational issues. Went bankrupt. Pabrai publicly admitted the mistake and taught the lesson to others.',
    glossaryHint: 'value trap leverage permanent loss'
  },

  // ════════════════════════════════════════
  // PHILIP FISHER
  // ════════════════════════════════════════
  {
    rishi: 'Philip Fisher',
    rishiShort: 'Fisher',
    stock: 'Motorola',
    ticker: 'MOT',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '1955',
    yearSold: '2004',
    buyPrice: '$2',
    sellPrice: '$160',
    return: '+7,900%',
    returnMultiple: '80x',
    thesis: 'R&D culture that was decades ahead. Engineers who loved their work. Management that reinvested profits into future products. Semiconductor leadership coming. Classic scuttlebutt revealed the culture.',
    outcome: 'legendary',
    category: 'quality_compound',
    keyMetricAtBuy: 'R&D spend ratio, engineer satisfaction, management quality',
    whatHappened: 'Held 49 years. One of the greatest growth investing records in history. Fisher proved that qualitative research beats financial ratios.',
    glossaryHint: 'scuttlebutt management quality compounding ten bagger'
  },
  {
    rishi: 'Philip Fisher',
    rishiShort: 'Fisher',
    stock: 'Texas Instruments',
    ticker: 'TXN',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '1956',
    buyPrice: '$14',
    return: '500x+ before splits',
    thesis: 'Semiconductor would be the 20th century\'s foundational technology. TI\'s engineering culture and patent portfolio created a moat invisible to PE-focused investors.',
    outcome: 'legendary',
    category: 'growth_mania',
    keyMetricAtBuy: 'R&D pipeline, engineering talent, patent moat',
    whatHappened: 'Fisher held for decades. His scuttlebutt method found the quality before earnings confirmed it. The definition of growth investing.',
    glossaryHint: 'scuttlebutt moat management quality cagr'
  },

  // ════════════════════════════════════════
  // HOWARD MARKS
  // ════════════════════════════════════════
  {
    rishi: 'Howard Marks',
    rishiShort: 'H. Marks',
    stock: 'High-Yield Bonds (2008)',
    ticker: 'N/A',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '2008',
    return: '+150% in 18 months',
    thesis: 'During 2008 crisis, junk bonds were yielding 20-22%. The market was pricing permanent depression. Oaktree bought distressed debt when terror was maximum. Risk is highest when it seems lowest, lowest when it seems highest.',
    outcome: 'legendary',
    category: 'distressed',
    keyMetricAtBuy: 'Yields 20%+, pricing in default rates impossible to achieve',
    whatHappened: 'Oaktree raised $11B distressed debt fund in 2008. Returned 150%+ as panic subsided. Classic counter-cyclical investing.',
    glossaryHint: 'contrarian asymmetric bet black swan liquidity risk'
  },

  // ════════════════════════════════════════
  // SETH KLARMAN
  // ════════════════════════════════════════
  {
    rishi: 'Seth Klarman',
    rishiShort: 'Klarman',
    stock: 'Theravance Biopharma',
    ticker: 'TBPH',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '2014',
    return: 'Multiple',
    thesis: 'Deep value in biotech spinoff. Pipeline value massively underpriced. Margin of safety existed even with drug development risk. Classic Klarman: buy fear, not hope.',
    outcome: 'success',
    category: 'value',
    keyMetricAtBuy: 'Sum-of-parts discount to NAV',
    whatHappened: 'Baupost\'s biotech thesis generated strong returns. Klarman\'s discipline: never pay for hope, only for hidden assets.',
    glossaryHint: 'margin of safety intrinsic value permanent loss'
  },

  // ════════════════════════════════════════
  // JOEL GREENBLATT
  // ════════════════════════════════════════
  {
    rishi: 'Joel Greenblatt',
    rishiShort: 'Greenblatt',
    stock: 'Spinoffs (Strategy)',
    ticker: 'Various',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '1985-2000',
    return: '50% annualized over 10 years',
    returnMultiple: '50x in 10 years',
    thesis: 'Institutional investors dump spinoffs blindly — index funds can\'t hold them, parent shareholders don\'t want them. Forced selling creates deep discounts. Management in spinoffs have incentive to perform.',
    outcome: 'legendary',
    category: 'value',
    keyMetricAtBuy: 'Forced seller dynamic = guaranteed mispricing',
    whatHappened: 'Gotham Capital averaged 50% returns for 10 years using spinoff strategy. Magic formula then systematized the quality + cheapness approach.',
    glossaryHint: 'magic formula earnings yield asymmetric bet contrarian'
  },

  // ════════════════════════════════════════
  // JOHN TEMPLETON
  // ════════════════════════════════════════
  {
    rishi: 'John Templeton',
    rishiShort: 'Templeton',
    stock: 'Japan (Post-War Basket)',
    ticker: 'Various',
    flag: '🇯🇵',
    market: 'Global',
    yearBought: '1962',
    yearSold: '1989',
    return: '+1,500%',
    returnMultiple: '16x',
    thesis: 'Japan was rebuilding from rubble. Stocks at 2x earnings. No one invested in Japan. Templeton visited personally, saw the work ethic and rebuilding energy. Maximum pessimism = maximum opportunity.',
    outcome: 'legendary',
    category: 'macro_play',
    keyMetricAtBuy: 'P/E 2x, entire country dismissed by Western investors',
    whatHappened: 'Japan became the world\'s 2nd largest economy by 1989. Templeton sold at the peak. 16x return over 27 years.',
    glossaryHint: 'contrarian gdp growth mean reversion'
  },

  // ════════════════════════════════════════
  // WALTER SCHLOSS
  // ════════════════════════════════════════
  {
    rishi: 'Walter Schloss',
    rishiShort: 'Schloss',
    stock: 'Net-Nets Basket',
    ticker: 'Various',
    flag: '🇺🇸',
    market: 'USA',
    yearBought: '1955-2003',
    return: '15.3% CAGR over 47 years',
    returnMultiple: '700x over 47 years',
    thesis: 'Simple Graham method: Buy stocks below liquidation value. Diversify across 100 names. Hold until market recognizes value. No conferences, no management meetings. Just balance sheets.',
    outcome: 'legendary',
    category: 'value',
    keyMetricAtBuy: 'Price < net current asset value consistently',
    whatHappened: 'Schloss ran his fund from a single room with no computer. Beat S&P500 for 47 years. Buffett called him a "superinvestor."',
    glossaryHint: 'margin of safety price to book intrinsic value working capital'
  },

  // ════════════════════════════════════════
  // NEMISH SHAH
  // ════════════════════════════════════════
  {
    rishi: 'Nemish Shah',
    rishiShort: 'N. Shah',
    stock: 'Page Industries',
    ticker: 'PAGEIND',
    flag: '🇮🇳',
    market: 'India',
    yearBought: '2007',
    buyPrice: '1,200',
    sellPrice: '42,000',
    return: '+3,400%',
    returnMultiple: '35x',
    thesis: 'Jockey brand in India is essentially a monopoly on premium innerwear. Huge category with no organised player. Demographics perfectly aligned. Management under Sunder Genomal was exceptional.',
    outcome: 'legendary',
    category: 'consumer_moat',
    keyMetricAtBuy: 'Small market cap, moat invisible at category level',
    whatHappened: 'One of India\'s best quality compounders. Nemish Shah\'s patience and insight into brand building created 35x returns.',
    glossaryHint: 'moat management quality ten bagger compounding'
  },

  // ════════════════════════════════════════
  // VIJAY KEDIA
  // ════════════════════════════════════════
  {
    rishi: 'Vijay Kedia',
    rishiShort: 'Kedia',
    stock: 'Atul Auto',
    ticker: 'ATULAUTO',
    flag: '🇮🇳',
    market: 'India',
    yearBought: '2012',
    buyPrice: '200',
    sellPrice: '600',
    return: '+200%',
    thesis: 'Atul Auto\'s three-wheeler dominance in rural India. SMILE strategy: Small size, Medium experience, Large ambition, Extra-large market. Rural India motorisation just starting.',
    outcome: 'success',
    category: 'smallcap_gem',
    keyMetricAtBuy: 'Small market cap, strong fundamentals, undiscovered by institutions',
    whatHappened: 'Classic Kedia smallcap discovery. Held until thesis played out. Later faced competition but returned well during holding period.',
    glossaryHint: 'ten bagger smallcap conviction scuttlebutt'
  },
  {
    rishi: 'Vijay Kedia',
    rishiShort: 'Kedia',
    stock: 'Vaibhav Global',
    ticker: 'VAIBHAVGBL',
    flag: '🇮🇳',
    market: 'India',
    yearBought: '2015',
    buyPrice: '400',
    return: '15x in 6 years',
    thesis: 'Value retail jewellery through TV shopping globally. Asset-light. Growing subscriber base. US + UK market. Kedia recognised the cable-TV-to-online transition was a tailwind, not headwind.',
    outcome: 'legendary',
    category: 'smallcap_gem',
    keyMetricAtBuy: 'Low PE despite global business, misunderstood by market',
    whatHappened: 'One of Kedia\'s best multi-baggers. SMILE thesis confirmed — small company, massive global market.',
    glossaryHint: 'ten bagger asset light conviction smallcap'
  },

  // ════════════════════════════════════════
  // BASANT MAHESHWARI
  // ════════════════════════════════════════
  {
    rishi: 'Basant Maheshwari',
    rishiShort: 'Basant',
    stock: 'Page Industries (Early)',
    ticker: 'PAGEIND',
    flag: '🇮🇳',
    market: 'India',
    yearBought: '2010',
    buyPrice: '2,000',
    return: '20x',
    thesis: 'Quality business at reasonable price. PE of 25 for 30% earnings growth = PEG below 1. Market never pays enough for predictable growth. Basant\'s "right stock, right price" philosophy.',
    outcome: 'legendary',
    category: 'consumer_moat',
    keyMetricAtBuy: 'PEG below 1, predictable compounding',
    whatHappened: 'Validated the PEG ratio approach for Indian markets. Page Industries became Basant\'s flagship holding.',
    glossaryHint: 'peg ratio compounding quality pricing power'
  },

  // ════════════════════════════════════════
  // PORINJU VELIYATH
  // ════════════════════════════════════════
  {
    rishi: 'Porinju Veliyath',
    rishiShort: 'Porinju',
    stock: 'Eveready Industries',
    ticker: 'EVEREADY',
    flag: '🇮🇳',
    market: 'India',
    yearBought: '2015',
    buyPrice: '150',
    sellPrice: '450',
    return: '+200%',
    thesis: 'Turnaround in battery business. Brand value unrecognized. Management change. Asset-heavy company becoming leaner. Classic Porinju: contrarian + smallcap + neglected sector.',
    outcome: 'success',
    category: 'turnaround_trap',
    keyMetricAtBuy: 'Depressed valuation, brand stronger than stock price',
    whatHappened: 'Sold before company faced challenges again. Demonstrated his ability to call turnarounds and exit correctly.',
    glossaryHint: 'turnaround contrarian value trap management quality'
  },

  // ════════════════════════════════════════
  // RAAMDEO AGRAWAL
  // ════════════════════════════════════════
  {
    rishi: 'Raamdeo Agrawal',
    rishiShort: 'Raamdeo',
    stock: 'Hero Honda',
    ticker: 'HEROMOTOCO',
    flag: '🇮🇳',
    market: 'India',
    yearBought: '1995',
    buyPrice: '30',
    return: '100x+',
    thesis: 'India\'s two-wheeler revolution was inevitable. Hero Honda had the Honda technology + Indian distribution. QGLP framework: Quality management, Growth, Longevity of business, Price paid.',
    outcome: 'legendary',
    category: 'consumer_moat',
    keyMetricAtBuy: 'Low PE, dominant market position, growing Indian middle class',
    whatHappened: 'Raamdeo\'s QGLP framework validated with Hero Honda. Used the same approach for Eicher Motors (RE bikes) — another 100x.',
    glossaryHint: 'moat management quality compounding cagr'
  },

  // ════════════════════════════════════════
  // DOLLY KHANNA / KACHOLIA
  // ════════════════════════════════════════
  {
    rishi: 'Dolly Khanna',
    rishiShort: 'D. Khanna',
    stock: 'Rain Industries',
    ticker: 'RAIN',
    flag: '🇮🇳',
    market: 'India',
    yearBought: '2012',
    buyPrice: '30',
    return: '10x',
    thesis: 'Chemical and carbon products with global operations. Cyclical but deeply undervalued at trough. Small cap with large order book. Classic Dolly Khanna: research-intensive, contrarian, patient.',
    outcome: 'success',
    category: 'smallcap_gem',
    keyMetricAtBuy: 'Low PE at cycle trough, global order book',
    whatHappened: 'Held through the full upcycle. Sold near peak. One of her most discussed multi-bagger calls.',
    glossaryHint: 'mean reversion contrarian smallcap cagr'
  },
];

// ── HELPERS ──────────────────────────────────────────────────────────────────

export function getRishiPlays(rishiName: string): RishiPlay[] {
  return GLOBAL_RISHI_PLAYS.filter(
    p => p.rishi === rishiName || p.rishiShort === rishiName
  );
}

export function getSimilarPlays(
  category: RishiPlay['category'],
  excludeStock?: string,
  limit = 6
): RishiPlay[] {
  return GLOBAL_RISHI_PLAYS
    .filter(p => p.category === category && p.stock !== excludeStock)
    .sort(() => 0.5 - Math.random())
    .slice(0, limit);
}

export function getLegendaryPlays(limit = 8): RishiPlay[] {
  return GLOBAL_RISHI_PLAYS
    .filter(p => p.outcome === 'legendary')
    .slice(0, limit);
}

export function getPlaysByMarket(market: RishiPlay['market']): RishiPlay[] {
  return GLOBAL_RISHI_PLAYS.filter(p => p.market === market);
}

export function getFailurePlays(): RishiPlay[] {
  return GLOBAL_RISHI_PLAYS.filter(
    p => p.outcome === 'failure' || p.outcome === 'mixed'
  );
}