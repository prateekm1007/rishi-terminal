// data/rishi-portfolios/global-plays.ts

export interface RishiPlay {
  rishi: string;
  stock: string;
  market: "US" | "India" | "Global" | "UK" | "China";
  yearBought: number;
  yearSold?: number;
  buyPrice?: number;
  sellPrice?: number;
  return?: string;
  thesis: string;
  outcome: "active" | "success" | "failure" | "mixed";
  category: "value" | "growth" | "turnaround" | "quality" | "momentum" | "distressed";
}

export const GLOBAL_RISHI_PLAYS: RishiPlay[] = [
  
  // ════════════════════════════════════════════════════════════════════════════
  // WARREN BUFFETT — The Oracle of Omaha
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Warren Buffett",
    stock: "Apple (AAPL)",
    market: "US",
    yearBought: 2016,
    buyPrice: 28.50,
    return: "+526%",
    thesis: "Consumer moat with ecosystem lock-in. High switching costs prevent customer churn. iPhone + Services create recurring revenue. Capital-light business model generates massive FCF that Buffett can redeploy.",
    outcome: "active",
    category: "quality"
  },
  {
    rishi: "Warren Buffett",
    stock: "Coca-Cola (KO)",
    market: "US",
    yearBought: 1988,
    buyPrice: 2.50,
    thesis: "Unbeatable global brand moat. Distribution in 200+ countries impossible to replicate. Predictable cash flows from a product people buy daily regardless of economy. Simple business Buffett can understand forever.",
    outcome: "active",
    category: "quality"
  },
  {
    rishi: "Warren Buffett",
    stock: "American Express (AXP)",
    market: "US",
    yearBought: 1964,
    buyPrice: 3.20,
    thesis: "Bought during Salad Oil Scandal when stock crashed 50%. Network effects in payments create winner-takes-most dynamics. Brand trust recoverable despite short-term crisis. Classic cigar-butt turned into quality hold.",
    outcome: "active",
    category: "turnaround"
  },
  {
    rishi: "Warren Buffett",
    stock: "Washington Post",
    market: "US",
    yearBought: 1973,
    yearSold: 2014,
    buyPrice: 5.63,
    sellPrice: 580,
    return: "+10,200%",
    thesis: "Monopoly newspaper in DC metro area trading at 25% of intrinsic value during 1973-74 bear market. Katharine Graham's leadership + local advertising moat. Held 40+ years through digital disruption, exited before collapse.",
    outcome: "success",
    category: "value"
  },
  {
    rishi: "Warren Buffett",
    stock: "See's Candies",
    market: "US",
    yearBought: 1972,
    thesis: "Brand pricing power — customers pay premium for boxed chocolates as gifts. No substitutes during holidays. Capital-light: minimal reinvestment needed, FCF funds other acquisitions. Buffett's template for quality.",
    outcome: "success",
    category: "quality"
  },
  {
    rishi: "Warren Buffett",
    stock: "IBM",
    market: "US",
    yearBought: 2011,
    yearSold: 2018,
    buyPrice: 170,
    sellPrice: 145,
    return: "−15%",
    thesis: "Enterprise IT moat with switching costs. Bought for yield + buybacks. MISTAKE: Buffett admitted he misjudged cloud transition speed. Legacy mainframe revenues declined faster than cloud growth. Lesson: tech moats erode quickly.",
    outcome: "failure",
    category: "value"
  },
  {
    rishi: "Warren Buffett",
    stock: "Bank of America (BAC)",
    market: "US",
    yearBought: 2011,
    buyPrice: 7.14,
    return: "+380%",
    thesis: "Post-2008 crisis distressed investment via preferred shares with warrants. Too-big-to-fail implicit guarantee. Management turnaround under Brian Moynihan. Warrants gave asymmetric upside as bank recovered.",
    outcome: "success",
    category: "distressed"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // RAKESH JHUNJHUNWALA — India's Big Bull
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Rakesh Jhunjhunwala",
    stock: "Titan Company",
    market: "India",
    yearBought: 2002,
    buyPrice: 3,
    return: "+93,233%",
    thesis: "Organized jewelry retail disrupting unorganized market. Tata brand trust eliminates trust barrier in gold buying. Rising middle class + women workforce = multi-decade jewelry demand. Tanishq brand = pricing power moat.",
    outcome: "success",
    category: "growth"
  },
  {
    rishi: "Rakesh Jhunjhunwala",
    stock: "Lupin Pharma",
    market: "India",
    yearBought: 2003,
    yearSold: 2018,
    buyPrice: 140,
    sellPrice: 900,
    return: "+543%",
    thesis: "US generic drug gold rush. Lupin's R&D capabilities in complex generics. Management under Desh Bandhu Gupta executing flawlessly. Exited before USFDA compliance issues crushed sector in 2018-2020.",
    outcome: "success",
    category: "growth"
  },
  {
    rishi: "Rakesh Jhunjhunwala",
    stock: "Crisil",
    market: "India",
    yearBought: 2002,
    yearSold: 2019,
    buyPrice: 42,
    sellPrice: 1800,
    return: "+4,186%",
    thesis: "Credit rating duopoly in India (Crisil + ICRA). Every debt issuance needs rating = recurring revenue. S&P partnership gives global credibility. Capital-light, high-margin business model.",
    outcome: "success",
    category: "quality"
  },
  {
    rishi: "Rakesh Jhunjhunwala",
    stock: "Fortis Healthcare",
    market: "India",
    yearBought: 2002,
    yearSold: 2009,
    buyPrice: 12,
    sellPrice: 165,
    return: "+1,275%",
    thesis: "Multi-specialty hospital chain riding India's healthcare boom. Insurance penetration rising = patients can afford treatment. Singh brothers' aggressive expansion. Exited before governance issues destroyed value post-2015.",
    outcome: "success",
    category: "growth"
  },
  {
    rishi: "Rakesh Jhunjhunwala",
    stock: "Aptech",
    market: "India",
    yearBought: 2002,
    yearSold: 2005,
    buyPrice: 22,
    sellPrice: 600,
    return: "+2,627%",
    thesis: "IT training boom during Y2K era. Arena Animation + NIIT competing for students wanting IT jobs. Sold at peak before competition commoditized the business and margins collapsed.",
    outcome: "success",
    category: "momentum"
  },
  {
    rishi: "Rakesh Jhunjhunwala",
    stock: "Geojit Financial",
    market: "India",
    yearBought: 2006,
    yearSold: 2020,
    buyPrice: 45,
    sellPrice: 28,
    return: "−38%",
    thesis: "Retail broking expansion in South India. RARE LOSS: Competition from discount brokers (Zerodha) destroyed commission-based model. Lesson: business model disruption risk even in growing markets.",
    outcome: "failure",
    category: "value"
  },
  {
    rishi: "Rakesh Jhunjhunwala",
    stock: "Nazara Technologies",
    market: "India",
    yearBought: 2016,
    return: "+180%",
    thesis: "Mobile gaming in India before it became consensus. Kiddopia + World Cricket Championship franchises. Pre-IPO investment with conviction despite losses. Nitish Mittersain's vision on digital entertainment consumption shift.",
    outcome: "active",
    category: "growth"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // RADHAKISHAN DAMANI — The Retail King
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Radhakishan Damani",
    stock: "Avenue Supermarts (DMart)",
    market: "India",
    yearBought: 2002,
    thesis: "Own real estate model = no rent escalation = permanent cost advantage. EDLP (Everyday Low Prices) without promotions builds customer habit. Tier-2/3 city expansion before competition arrives. Zero debt strategy = survives downturns.",
    outcome: "active",
    category: "quality"
  },
  {
    rishi: "Radhakishan Damani",
    stock: "VST Industries",
    market: "India",
    yearBought: 2000,
    yearSold: 2021,
    buyPrice: 80,
    sellPrice: 3500,
    return: "+4,275%",
    thesis: "Cigarette quasi-monopoly in South India. Regulatory barriers prevent new entrants. Pricing power allows regular hikes despite sin tax increases. Capital-light: no factories needed, just distribution. Dividends funded DMart expansion.",
    outcome: "success",
    category: "quality"
  },
  {
    rishi: "Radhakishan Damani",
    stock: "India Cements",
    market: "India",
    yearBought: 2004,
    yearSold: 2016,
    buyPrice: 38,
    sellPrice: 110,
    return: "+189%",
    thesis: "South India cement consolidation. Srinivasan family control. Held during construction boom, exited before overcapacity crushed margins. Damani rarely holds cyclicals long-term — this was tactical.",
    outcome: "success",
    category: "value"
  },
  {
    rishi: "Radhakishan Damani",
    stock: "Sundaram Finance",
    market: "India",
    yearBought: 2002,
    thesis: "Conservative NBFC with 70-year history. TVS group governance. Commercial vehicle financing moat in South India. Never takes excessive leverage — survives every credit cycle. Damani loves boring, profitable, safe businesses.",
    outcome: "active",
    category: "quality"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PETER LYNCH — The GARP Master
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Peter Lynch",
    stock: "Dunkin' Donuts",
    market: "US",
    yearBought: 1982,
    yearSold: 1988,
    buyPrice: 1.50,
    sellPrice: 14.00,
    return: "+833%",
    thesis: "Fast-food franchising model scaling nationally. Discovered by visiting stores (scuttlebutt research). Simple business: donuts + coffee with high repeat purchase frequency. PEG ratio <1 = classic GARP setup.",
    outcome: "success",
    category: "growth"
  },
  {
    rishi: "Peter Lynch",
    stock: "Fannie Mae",
    market: "US",
    yearBought: 1977,
    yearSold: 1982,
    buyPrice: 0.40,
    sellPrice: 8.00,
    return: "+1,900%",
    thesis: "Turnaround from near-bankruptcy in 1970s. Government-sponsored enterprise = implicit backing. Mortgage securitization business misunderstood by Wall Street. Lynch saw the earnings power once rates stabilized.",
    outcome: "success",
    category: "turnaround"
  },
  {
    rishi: "Peter Lynch",
    stock: "Taco Bell",
    market: "US",
    yearBought: 1980,
    yearSold: 1985,
    buyPrice: 1.20,
    sellPrice: 12.50,
    return: "+942%",
    thesis: "Mexican fast-food category creation. Franchise expansion into suburbs. Noticed long lines at stores during mall visits with family. 'Invest in what you know' — bought what he saw people buying.",
    outcome: "success",
    category: "growth"
  },
  {
    rishi: "Peter Lynch",
    stock: "Chrysler",
    market: "US",
    yearBought: 1982,
    yearSold: 1987,
    buyPrice: 2.50,
    sellPrice: 48,
    return: "+1,820%",
    thesis: "Lee Iacocca turnaround. Government loan guarantees prevented bankruptcy. New minivan category = product cycle tailwind. Bought when everyone thought US auto was dead. Classic contrarian turnaround bet.",
    outcome: "success",
    category: "turnaround"
  },
  {
    rishi: "Peter Lynch",
    stock: "Walmart",
    market: "US",
    yearBought: 1978,
    yearSold: 1990,
    buyPrice: 0.05,
    sellPrice: 1.20,
    return: "+2,300%",
    thesis: "Rural discount retail disruption. Sam Walton's relentless focus on logistics and cost. Visited stores, saw operational excellence. PEG <1 despite 30% earnings growth. 'Ten-bagger' example in his book.",
    outcome: "success",
    category: "growth"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // CHARLIE MUNGER — Buffett's Partner
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Charlie Munger",
    stock: "Costco (COST)",
    market: "US",
    yearBought: 1997,
    thesis: "Membership fee moat creates customer lock-in. Low-margin, high-volume model requires operational perfection = hard to replicate. Jim Sinegal's obsessive focus on customer value. Munger: 'I'm a total addict to Costco.'",
    outcome: "active",
    category: "quality"
  },
  {
    rishi: "Charlie Munger",
    stock: "BYD Company",
    market: "China",
    yearBought: 2008,
    buyPrice: 8,
    return: "+3,400%",
    thesis: "Chinese EV + battery technology leader. Wang Chuanfu = engineer-entrepreneur. Bought during financial crisis when everyone avoided China. Vertical integration moat: batteries + cars + buses. Munger's biggest personal win outside Berkshire.",
    outcome: "active",
    category: "growth"
  },
  {
    rishi: "Charlie Munger",
    stock: "Daily Journal Corp (DJCO)",
    market: "US",
    yearBought: 1977,
    thesis: "Legal newspaper publisher turned tech investor. Munger as Chairman using float to invest in stocks (Bank of America, Wells Fargo, Alibaba). Meta-investment: buying Munger's brain via his portfolio.",
    outcome: "active",
    category: "quality"
  },
  {
    rishi: "Charlie Munger",
    stock: "Alibaba (BABA)",
    market: "China",
    yearBought: 2021,
    yearSold: 2022,
    buyPrice: 200,
    sellPrice: 90,
    return: "−55%",
    thesis: "Bought after regulatory crackdown crashed stock 70%. Believed Chinese e-commerce moat intact despite political risk. MISTAKE: Underestimated CCP's willingness to destroy shareholder value. Munger admitted error and exited.",
    outcome: "failure",
    category: "value"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // GEORGE SOROS — The Macro Trader
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "George Soros",
    stock: "British Pound (Short)",
    market: "UK",
    yearBought: 1992,
    return: "+$1B profit",
    thesis: "UK could not maintain ERM currency peg. Interest rate defense would crush economy. Reflexivity: market selling forced BoE to abandon peg, proving Soros right. Asymmetric: risked $10B to make $1B. 'Breaking the Bank of England.'",
    outcome: "success",
    category: "momentum"
  },
  {
    rishi: "George Soros",
    stock: "Thai Baht (Short)",
    market: "Global",
    yearBought: 1997,
    return: "+$790M",
    thesis: "Asian Tiger economies overleveraged with dollar-pegged currencies. Property bubble funded by foreign debt. Shorted baht, triggering currency collapse + Asian Financial Crisis. Controversial but profitable macro call.",
    outcome: "success",
    category: "distressed"
  },
  {
    rishi: "George Soros",
    stock: "Quantum Fund Tech Bubble",
    market: "US",
    yearBought: 1999,
    yearSold: 2000,
    return: "−$5B loss",
    thesis: "Rode internet bubble momentum in 1999 despite knowing it was unsustainable. Reflexivity thesis: bubbles persist longer than logic suggests. MISTAKE: Stayed too long, lost billions when bubble burst in March 2000.",
    outcome: "failure",
    category: "momentum"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BENJAMIN GRAHAM — The Father of Value Investing
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Benjamin Graham",
    stock: "GEICO",
    market: "US",
    yearBought: 1948,
    yearSold: 1972,
    buyPrice: 27,
    sellPrice: 16200,
    return: "+60,000%",
    thesis: "Bought 50% of GEICO for $712K when it was private. Direct-to-consumer auto insurance eliminated agent commissions = cost moat. Insurance float concept. Sold to public, became Graham's greatest investment. Buffett later bought entire company.",
    outcome: "success",
    category: "value"
  },
  {
    rishi: "Benjamin Graham",
    stock: "Northern Pipeline",
    market: "US",
    yearBought: 1926,
    thesis: "Net-net: company trading below liquidation value of its railroad bonds. Forced management to distribute hidden assets to shareholders via proxy fight. Classic Graham 'cigar butt' — cheap asset extraction play.",
    outcome: "success",
    category: "value"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // MOHNISH PABRAI — Heads I Win, Tails I Don't Lose Much
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Mohnish Pabrai",
    stock: "Fiat Chrysler",
    market: "US",
    yearBought: 2015,
    yearSold: 2021,
    buyPrice: 8,
    sellPrice: 22,
    return: "+175%",
    thesis: "Sergio Marchionne turnaround. Jeep brand = only asset worth owning. Bought at liquidation value — downside protected by parts value. Merger with PSA created upside optionality. Asymmetric bet executed perfectly.",
    outcome: "success",
    category: "value"
  },
  {
    rishi: "Mohnish Pabrai",
    stock: "Horsehead Holdings",
    market: "US",
    yearBought: 2014,
    yearSold: 2016,
    buyPrice: 12,
    sellPrice: 0.10,
    return: "−99%",
    thesis: "Zinc recycling technology. MISTAKE: New plant had operational issues, debt crushed company into bankruptcy. Pabrai's public lesson on position sizing: 'I broke my own rule on asymmetry — downside was NOT limited.'",
    outcome: "failure",
    category: "distressed"
  },
  {
    rishi: "Mohnish Pabrai",
    stock: "Seritage Growth Properties",
    market: "US",
    yearBought: 2015,
    return: "+150%",
    thesis: "Sears real estate spinoff. Controlled by Eddie Lampert and Berkshire. Real estate value > market cap. Prime mall locations could be redeveloped. Downside = land value, upside = retail transformation or sale.",
    outcome: "active",
    category: "value"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // NEMISH SHAH — The Balance Sheet Detective
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Nemish Shah",
    stock: "Page Industries",
    market: "India",
    yearBought: 2007,
    yearSold: 2020,
    buyPrice: 1200,
    sellPrice: 24000,
    return: "+1,900%",
    thesis: "Jockey brand exclusive license in India. Innerwear category growing with organized retail. High ROE (>40%) with minimal debt. Hidden asset: brand value not on balance sheet. Pricing power = inflation-proof business.",
    outcome: "success",
    category: "quality"
  },
  {
    rishi: "Nemish Shah",
    stock: "Symphony Ltd",
    market: "India",
    yearBought: 2010,
    return: "+2,800%",
    thesis: "Air cooler manufacturer with 60% market share. Asset-light model: outsources manufacturing, focuses on R&D and branding. Zero debt, high FCF conversion. Export opportunity untapped. Balance sheet had hidden land parcels in Rajkot.",
    outcome: "active",
    category: "quality"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ASHISH KACHOLIA — The Smallcap Hunter
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Ashish Kacholia",
    stock: "Relaxo Footwear",
    market: "India",
    yearBought: 2012,
    yearSold: 2021,
    buyPrice: 150,
    sellPrice: 1100,
    return: "+633%",
    thesis: "Hawai chappal to branded footwear transition. Rural distribution moat — 25,000 retailers. Capital efficiency: high ROE with low debt. Discovered before mutual funds noticed. Exited when valuation became expensive (PE >80).",
    outcome: "success",
    category: "growth"
  },
  {
    rishi: "Ashish Kacholia",
    stock: "Vaibhav Global",
    market: "India",
    yearBought: 2015,
    return: "+450%",
    thesis: "TV home shopping + e-commerce jewelry targeting US/UK. Outsourced manufacturing in India = margin advantage. Zero retail footprint = capital-light. Management with skin in the game. Undiscovered by institutional investors.",
    outcome: "active",
    category: "growth"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // DOLLY KHANNA — The Silent Operator
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Dolly Khanna",
    stock: "Rain Industries",
    market: "India",
    yearBought: 2016,
    yearSold: 2018,
    buyPrice: 45,
    sellPrice: 185,
    return: "+311%",
    thesis: "Calcined pet coke supplier to aluminum/steel. Export-focused = dollar revenue. Debt reduction story. Bought post-commodity crash when everyone avoided cyclicals. Exited before next downturn.",
    outcome: "success",
    category: "value"
  },
  {
    rishi: "Dolly Khanna",
    stock: "Sundaram Clayton",
    market: "India",
    yearBought: 2014,
    return: "+520%",
    thesis: "TVS Group auto component maker. Aluminum die-casting for two-wheelers. EV transition opportunity via lightweight components. Family-run, conservative balance sheet. Underfollowed microcap.",
    outcome: "active",
    category: "quality"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // VIJAY KEDIA — The Smile Theory Investor
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Vijay Kedia",
    stock: "Atul Auto",
    market: "India",
    yearBought: 2016,
    return: "+680%",
    thesis: "Three-wheeler gas/diesel vehicles for last-mile cargo. Gujarat-focused distribution. CNG conversion tailwind. SMILE theory: Small in size, Medium in aspirations, Large in growth potential, Extra in leadership quality.",
    outcome: "active",
    category: "growth"
  },
  {
    rishi: "Vijay Kedia",
    stock: "Tejas Networks",
    market: "India",
    yearBought: 2017,
    yearSold: 2020,
    buyPrice: 220,
    sellPrice: 95,
    return: "−57%",
    thesis: "Telecom equipment 'Make in India' story. Government contracts for 4G rollout. MISTAKE: Execution delays + competitive pressure from Chinese vendors destroyed margins. Lesson: theme alone is not enough without execution moat.",
    outcome: "failure",
    category: "growth"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PORINJU VELIYATH — The Contrarian Value Hunter
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Porinju Veliyath",
    stock: "Geojit Financial",
    market: "India",
    yearBought: 2009,
    yearSold: 2015,
    buyPrice: 12,
    sellPrice: 85,
    return: "+608%",
    thesis: "Post-2008 crash contrarian buy. South India broking presence. Recovery in equity participation from retail investors. Exited before discount brokers (Zerodha) disrupted commission model.",
    outcome: "success",
    category: "value"
  },
  {
    rishi: "Porinju Veliyath",
    stock: "Manappuram Finance",
    market: "India",
    yearBought: 2012,
    return: "+380%",
    thesis: "Gold loan NBFC recovery after regulatory crackdown. Bought when stock fell 70% due to RBI restrictions. Strong Kerala presence, family management. Contrarian bet on regulatory overreach being temporary.",
    outcome: "active",
    category: "value"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // RAAMDEO AGARWAL — The QGLP Framework Creator
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Raamdeo Agarwal",
    stock: "HDFC Bank",
    market: "India",
    yearBought: 1995,
    thesis: "Private sector banking license in 1994 = structural shift from PSU banks. Aditya Puri's execution excellence. QGLP framework perfect fit: Quality (best NPA), Growth (credit demand), Longevity (regulatory moat), Price (PE 12 at IPO).",
    outcome: "active",
    category: "quality"
  },
  {
    rishi: "Raamdeo Agarwal",
    stock: "Pidilite Industries",
    market: "India",
    yearBought: 2000,
    thesis: "Fevicol = generic trademark. Construction adhesive category creation. B2C brand in B2B category = pricing power. Family management with long-term focus. 'Longevity' in QGLP = business will outlive us all.",
    outcome: "active",
    category: "quality"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BASANT MAHESHWARI — The Sector Rotation Specialist
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Basant Maheshwari",
    stock: "La Opala RG",
    market: "India",
    yearBought: 2011,
    yearSold: 2018,
    buyPrice: 40,
    sellPrice: 320,
    return: "+700%",
    thesis: "Opal glassware tableware targeting aspirational households. China +1 export opportunity. Sushil Jhunjhunwala's management. Sector tailwind: premiumization in home products. Exited when growth slowed.",
    outcome: "success",
    category: "growth"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PHILIP FISHER — Growth at Any Price
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Philip Fisher",
    stock: "Motorola",
    market: "US",
    yearBought: 1955,
    yearSold: 2004,
    buyPrice: 2,
    sellPrice: 160,
    return: "+7,900%",
    thesis: "Semiconductor + wireless communications pioneer. R&D culture drives product innovation. Scuttlebutt research: visited engineers, suppliers, competitors. Management quality > current valuation. Held 49 years until death.",
    outcome: "success",
    category: "growth"
  },
  {
    rishi: "Philip Fisher",
    stock: "Texas Instruments",
    market: "US",
    yearBought: 1956,
    thesis: "Silicon transistor technology leadership. Defense contracts provide stable revenue. R&D reinvestment = innovation moat. Management allocates capital to R&D, not dividends — Fisher approved. Long-term compounder.",
    outcome: "active",
    category: "growth"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // JOEL GREENBLATT — Magic Formula Creator
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Joel Greenblatt",
    stock: "Apple (Pre-iPhone)",
    market: "US",
    yearBought: 2003,
    yearSold: 2006,
    buyPrice: 7,
    sellPrice: 80,
    return: "+1,043%",
    thesis: "iPod creating platform for ecosystem. High ROIC from iTunes + hardware. Cheap earnings yield (inverse PE). Magic Formula screen flagged it. Sold before iPhone — missed 100x but still won massively.",
    outcome: "success",
    category: "quality"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // HOWARD MARKS — Risk Assessment Master
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Howard Marks",
    stock: "Distressed Debt 2008-09",
    market: "US",
    yearBought: 2009,
    yearSold: 2012,
    return: "+180%",
    thesis: "Credit crisis forced selling of high-quality bonds at 40-50 cents on dollar. Second-level thinking: market overreacted to liquidity crisis, not solvency crisis. Bought when everyone panic-sold. 'The best opportunities come in the worst times.'",
    outcome: "success",
    category: "distressed"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // SETH KLARMAN — Margin of Safety Obsessed
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Seth Klarman",
    stock: "Penn Central Railroad Bankruptcy",
    market: "US",
    yearBought: 1978,
    thesis: "Bankrupt railroad had hidden real estate assets in Manhattan worth billions. Bought debt/equity at massive discount. Asset liquidation value > investment cost. Classic distressed value with hard asset backing.",
    outcome: "success",
    category: "distressed"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // JOHN TEMPLETON — Global Contrarian
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "John Templeton",
    stock: "Japanese Stocks 1950s",
    market: "Global",
    yearBought: 1954,
    yearSold: 1968,
    return: "+3,000%",
    thesis: "Post-WWII Japan reconstruction. Stocks trading at 3-5x earnings with double-digit growth. Maximum pessimism entry: everyone feared Japan would never recover. 'Buy at the point of maximum pessimism.'",
    outcome: "success",
    category: "value"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // WALTER SCHLOSS — Net-Net Value King
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Walter Schloss",
    stock: "Diversified Portfolio of Net-Nets",
    market: "US",
    yearBought: 1955,
    yearSold: 2002,
    return: "+16%/year for 47 years",
    thesis: "Bought 100+ companies trading below liquidation value. Diversification + patience. No research beyond financials. Graham's cigar butts at scale. Compounded capital for 47 years with minimal drawdowns.",
    outcome: "success",
    category: "value"
  },

  // ════════════════════════════════════════════════════════════════════════════
  // RECENT PLAYS (2020-2024) — Learning from Current Markets
  // ════════════════════════════════════════════════════════════════════════════
  {
    rishi: "Rakesh Jhunjhunwala",
    stock: "Metro Brands",
    market: "India",
    yearBought: 2021,
    return: "−35%",
    thesis: "Footwear retail IPO play. Organized retail growth. MISTAKE: Paid IPO premium (PE 70+), competition from online destroyed thesis. Held until death in 2022. Lesson: even legends overpay during late-cycle euphoria.",
    outcome: "failure",
    category: "growth"
  },
  {
    rishi: "Ashish Kacholia",
    stock: "Chemplast Sanmar",
    market: "India",
    yearBought: 2021,
    yearSold: 2023,
    buyPrice: 550,
    sellPrice: 380,
    return: "−31%",
    thesis: "Specialty chemicals IPO. China +1 thesis. MISTAKE: Capital-intensive commodity chemical, not specialty. PVC pricing collapsed post-COVID demand surge. Exited with loss — rare for Kacholia.",
    outcome: "failure",
    category: "growth"
  },
  {
    rishi: "Vijay Kedia",
    stock: "Aegis Logistics",
    market: "India",
    yearBought: 2020,
    return: "+340%",
    thesis: "LPG/LNG storage infrastructure. Gas demand growth + import dependency = structural tailwind. COVID crash entry at PE 8. Asset-heavy but irreplaceable infrastructure moat.",
    outcome: "active",
    category: "value"
  },

];

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function getRishiPlays(rishiName: string): RishiPlay[] {
  return GLOBAL_RISHI_PLAYS.filter(p => p.rishi === rishiName);
}

export function getSimilarPlays(category: RishiPlay["category"], limit = 8): RishiPlay[] {
  return GLOBAL_RISHI_PLAYS
    .filter(p => p.category === category)
    .slice(0, limit);
}

export function getPlaysByMarket(market: RishiPlay["market"]): RishiPlay[] {
  return GLOBAL_RISHI_PLAYS.filter(p => p.market === market);
}

export function getSuccessfulPlays(limit = 20): RishiPlay[] {
  return GLOBAL_RISHI_PLAYS
    .filter(p => p.outcome === 'success')
    .slice(0, limit);
}

export function getFailedPlays(): RishiPlay[] {
  return GLOBAL_RISHI_PLAYS.filter(p => p.outcome === 'failure');
}

export function getRecentPlays(afterYear = 2015): RishiPlay[] {
  return GLOBAL_RISHI_PLAYS.filter(p => p.yearBought >= afterYear);
}