import type { UniversalAsset } from "../types/asset";

export interface StockParallel {
  era: string;
  lesson: string;
  companies: string[];
  rishis: string[];
  quote: string;
  author: string;
}

// â”€â”€â”€ SECTOR PARALLELS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Covers all 40 major Indian stock sectors

const SECTOR_PARALLELS: Record<string, StockParallel> = {

  IT: {
    era: "India IT Decade (2000â€“2010)",
    lesson: "Indian IT companies rode a structural shift as global enterprises outsourced software development. TCS, Infosys, and Wipro compounded at 20%+ for a decade by combining low-cost talent with world-class execution. The key insight: a durable cost advantage + repeat business = compounding machine.",
    companies: ["Infosys (2003â€“2008: 8x)", "TCS post-IPO (2004â€“2010: 6x)", "Wipro IT (2002â€“2007: 10x)", "HCL Tech (2009â€“2015: 12x)"],
    rishis: ["Buffett", "Munger", "Fisher"],
    quote: "A great business at a fair price is superior to a fair business at a great price.",
    author: "Charlie Munger",
  },

  Software: {
    era: "India IT Decade (2000â€“2010)",
    lesson: "Indian IT companies rode a structural shift as global enterprises outsourced software development. TCS, Infosys, and Wipro compounded at 20%+ for a decade by combining low-cost talent with world-class execution.",
    companies: ["Infosys (2003â€“2008: 8x)", "TCS post-IPO (2004â€“2010: 6x)", "Mphasis (2012â€“2018: 7x)"],
    rishis: ["Buffett", "Munger", "Fisher"],
    quote: "Invest in businesses that even a fool can run, because someday a fool will.",
    author: "Warren Buffett",
  },

  Pharma: {
    era: "India Pharma Export Boom (2005â€“2015)",
    lesson: "Sun Pharma, Dr Reddy's, and Cipla built global generic empires by passing US FDA audits and capturing patent cliffs. The pattern: Indian quality + regulatory compliance = premium margins. Companies that sustained FDA approvals compounded at 25%+ while those that failed faced 50%+ corrections.",
    companies: ["Sun Pharma (2009â€“2015: 15x)", "Lupin (2010â€“2014: 6x)", "Dr Reddy's (2012â€“2015: 3x)", "Cipla (2008â€“2013: 4x)"],
    rishis: ["Pabrai", "Fisher", "Jhunjhunwala"],
    quote: "Risk comes from not knowing what you are doing.",
    author: "Warren Buffett",
  },

  Banking: {
    era: "India Private Bank Compounding Decade (1995â€“2008)",
    lesson: "HDFC Bank demonstrated that disciplined underwriting + low NPAs + retail deposit franchise = 30% annual compounding for 15 years. The lesson: in banking, consistency of credit quality matters more than growth rate. One bad credit cycle can wipe out a decade of gains.",
    companies: ["HDFC Bank (1995â€“2008: 100x)", "Kotak Mahindra Bank (2004â€“2018: 20x)", "IndusInd Bank (2009â€“2017: 25x)"],
    rishis: ["Buffett", "Damani", "Raamdeo"],
    quote: "Banking is a business where you lend money to people who will pay it back.",
    author: "Rakesh Jhunjhunwala",
  },

  "Private Bank": {
    era: "India Private Bank Compounding Decade (1995â€“2008)",
    lesson: "HDFC Bank demonstrated that disciplined underwriting + low NPAs + retail deposit franchise creates 30% annual compounding. Credit quality consistency matters more than growth speed.",
    companies: ["HDFC Bank (1995â€“2008: 100x)", "Kotak Mahindra Bank (2004â€“2018: 20x)", "Axis Bank (2003â€“2010: 18x)"],
    rishis: ["Buffett", "Damani", "Raamdeo"],
    quote: "The key to investing is not assessing how much an industry is going to affect society, but rather determining the competitive advantage of any given company.",
    author: "Warren Buffett",
  },

  FMCG: {
    era: "India Consumption Boom (2005â€“2015)",
    lesson: "Hindustan Unilever, Nestle India, Britannia, and Dabur compounded silently while everyone chased IT and infrastructure. The pattern: pricing power + rural distribution + brand loyalty = inflation-beating returns with low volatility. Damani built his fortune identifying these hidden compounders.",
    companies: ["Nestle India (2009â€“2019: 8x)", "Britannia (2013â€“2019: 10x)", "Marico (2010â€“2018: 7x)", "Dabur (2010â€“2020: 6x)"],
    rishis: ["Damani", "Buffett", "Munger"],
    quote: "The best businesses are those where the customer cannot do without you.",
    author: "Radhakishan Damani",
  },

  Consumer: {
    era: "India Consumption Boom (2005â€“2015)",
    lesson: "Consumer brands with pricing power and rural distribution compounded at 20%+ for a decade. The insight: rising aspiration + brand loyalty + distribution moat = durable earnings growth.",
    companies: ["Asian Paints (2008â€“2018: 12x)", "Titan (2010â€“2018: 10x)", "Page Industries (2010â€“2017: 15x)"],
    rishis: ["Damani", "Buffett", "Basant"],
    quote: "Time is the friend of the wonderful company, the enemy of the mediocre.",
    author: "Warren Buffett",
  },

  Retail: {
    era: "India Organized Retail Rise (2010â€“2020)",
    lesson: "Avenue Supermarts (DMart) showed that everyday low prices + high inventory turns + owned stores = capital-efficient compounding. The pattern mirrors Walmart's early decades â€” boring model, extraordinary returns.",
    companies: ["DMart (2017â€“2021: 5x)", "Titan retail (2012â€“2019: 8x)", "V-Mart (2013â€“2018: 6x)"],
    rishis: ["Damani", "Buffett", "Graham"],
    quote: "All there is to investing is picking good stocks at good times and staying with them as long as they remain good companies.",
    author: "Warren Buffett",
  },

  Auto: {
    era: "India Auto Supercycle (2003â€“2010)",
    lesson: "Maruti Suzuki went from a government company to the dominant mass-market vehicle manufacturer as India's middle class exploded. The pattern: demographic tailwind + first-mover distribution + cost discipline = decade-long compounding. Hero Honda (now Hero MotoCorp) showed the same in two-wheelers.",
    companies: ["Maruti Suzuki (2003â€“2010: 12x)", "Hero Honda (2003â€“2008: 6x)", "Bajaj Auto (2009â€“2015: 7x)", "Eicher Motors (2012â€“2017: 30x)"],
    rishis: ["Jhunjhunwala", "Damani", "Lynch"],
    quote: "Behind every stock is a company. Find out what it's doing.",
    author: "Peter Lynch",
  },

  "Auto Components": {
    era: "India Auto Ancillary Compounding (2010â€“2018)",
    lesson: "Companies supplying to multiple OEMs with global quality standards compounded faster than the OEMs themselves. The pattern: diversified customer base + export capability + operating leverage = superior returns.",
    companies: ["Motherson Sumi (2012â€“2018: 10x)", "Minda Industries (2014â€“2019: 8x)", "Bosch India (2009â€“2015: 5x)"],
    rishis: ["Pabrai", "Lynch", "Fisher"],
    quote: "Invest in what you know.",
    author: "Peter Lynch",
  },

  Chemicals: {
    era: "India Specialty Chemicals Decade (2014â€“2022)",
    lesson: "China+1 strategy redirected global chemical sourcing to India. Aarti Industries, SRF, and PI Industries compounded at 30%+ as Indian companies captured specialty chemical value chains. The insight: regulatory moat + backward integration + export contracts = durable pricing power.",
    companies: ["Aarti Industries (2014â€“2018: 8x)", "SRF Ltd (2016â€“2021: 10x)", "PI Industries (2017â€“2021: 5x)", "Navin Fluorine (2018â€“2021: 6x)"],
    rishis: ["Pabrai", "Kacholia", "Fisher"],
    quote: "The stock market is a device for transferring money from the impatient to the patient.",
    author: "Warren Buffett",
  },

  "Specialty Chemicals": {
    era: "India Specialty Chemicals Decade (2014â€“2022)",
    lesson: "China+1 strategy redirected global chemical sourcing to India. Companies with technical barriers and long-term export contracts compounded at 30%+ annually.",
    companies: ["SRF Ltd (2016â€“2021: 10x)", "Navin Fluorine (2018â€“2021: 6x)", "Balaji Amines (2017â€“2021: 8x)"],
    rishis: ["Pabrai", "Kacholia", "Fisher"],
    quote: "It's not what you buy, it's what you pay for it.",
    author: "Seth Klarman",
  },

  Metals: {
    era: "Commodity Downcycle â†’ Supercycle (2016â€“2022)",
    lesson: "Tata Steel and Hindalco looked cheap at PE<5 during the 2016â€“2018 downcycle â€” and they were value traps. The recovery came with the commodity supercycle of 2020â€“2022. The lesson: in cyclicals, buy when PE is HIGH (trough earnings) not when PE is low (peak earnings).",
    companies: ["Tata Steel (2020â€“2022: 5x)", "Hindalco (2020â€“2021: 4x)", "SAIL (2020â€“2021: 6x)", "JSW Steel (2020â€“2022: 4x)"],
    rishis: ["Graham", "Marks", "Kedia"],
    quote: "In cyclical industries, the time to buy is when conditions are terrible and the time to sell is when conditions are great.",
    author: "Howard Marks",
  },

  Energy: {
    era: "Reliance Transformation (2010â€“2020)",
    lesson: "Reliance Industries transformed from a pure petrochemical company into a diversified conglomerate with Jio and retail, creating multiple value unlocking events. The pattern: optionality in large, cash-rich businesses creates non-linear returns when reinvestment cycles complete.",
    companies: ["Reliance Industries (2016â€“2020: 4x)", "ONGC (2016â€“2022: cyclical)", "IGL (2015â€“2020: 6x)", "Gujarat Gas (2018â€“2021: 5x)"],
    rishis: ["Buffett", "Munger", "Raamdeo"],
    quote: "The best investment you can make is in your own abilities.",
    author: "Warren Buffett",
  },

  "Oil & Gas": {
    era: "India Gas Distribution Boom (2015â€“2021)",
    lesson: "City gas distribution companies like IGL, MGL, and Gujarat Gas compounded at 25%+ as India pivoted from liquid fuels to natural gas. Regulatory exclusivity + infrastructure buildout + government policy tailwind = durable moat.",
    companies: ["IGL (2015â€“2020: 6x)", "MGL (2015â€“2020: 4x)", "Gujarat Gas (2018â€“2021: 5x)"],
    rishis: ["Buffett", "Lynch", "Raamdeo"],
    quote: "A monopoly business with a government mandate is the closest thing to a free lunch in investing.",
    author: "Rakesh Jhunjhunwala",
  },

  Infrastructure: {
    era: "India Infrastructure Boom (2003â€“2008)",
    lesson: "L&T, Bharat Electronics, and IRB Infrastructure captured the Bharat Nirman infrastructure wave. The lesson: government capex cycles create 5-7 year compounding windows, but end abruptly when government spending shifts. Entry timing matters enormously.",
    companies: ["L&T (2003â€“2008: 20x)", "Bharat Electronics (2014â€“2018: 8x)", "KNR Constructions (2016â€“2020: 5x)"],
    rishis: ["Lynch", "Nemish", "Kacholia"],
    quote: "The trick is not to learn to trust your gut feelings, but rather to discipline yourself to ignore them.",
    author: "Peter Lynch",
  },

  "Capital Goods": {
    era: "India Capex Revival (2014â€“2018 and 2022â€“)",
    lesson: "Capital goods companies have high operating leverage â€” small revenue increases create large profit jumps. The 2003â€“2008 cycle saw 15-20x returns. The key: identify the cycle turn early, when order books start growing but margins are still compressed.",
    companies: ["L&T (2003â€“2008: 20x)", "Thermax (2004â€“2008: 10x)", "Cummins India (2012â€“2018: 4x)", "ABB India (2020â€“2023: 5x)"],
    rishis: ["Lynch", "Kacholia", "Pabrai"],
    quote: "You get recessions, you have stock market declines. If you don't understand that's going to happen, then you're not ready, you won't do well in the markets.",
    author: "Peter Lynch",
  },

  Telecom: {
    era: "India Telecom Consolidation (2016â€“2020)",
    lesson: "Jio's entry destroyed the telecom sector for all incumbents except Airtel. The survivors â€” Bharti Airtel â€” consolidated and emerged stronger. The pattern: industries with high fixed costs and low marginal costs eventually consolidate to 2-3 players, and survivors compound once pricing power returns.",
    companies: ["Bharti Airtel (2019â€“2023: 5x post-consolidation)", "Jio platforms (unlisted)", "Tata Tele (merged)"],
    rishis: ["Munger", "Marks", "Soros"],
    quote: "The best time to buy is when there's blood in the streets.",
    author: "Howard Marks",
  },

  Cement: {
    era: "India Cement Consolidation (2015â€“2023)",
    lesson: "UltraTech, Shree Cement, and Ambuja consolidated regional markets and raised pricing power. Cement is a regional oligopoly â€” freight cost creates natural barriers. The lesson: consolidating regional players outperform commodity producers over full cycles.",
    companies: ["Shree Cement (2010â€“2020: 8x)", "UltraTech Cement (2013â€“2022: 5x)", "Ramco Cement (2014â€“2021: 6x)"],
    rishis: ["Buffett", "Munger", "Damani"],
    quote: "Price is what you pay. Value is what you get.",
    author: "Warren Buffett",
  },

  Realty: {
    era: "India Real Estate Cycle (2003â€“2008 and 2021â€“)",
    lesson: "DLF, Godrej Properties, and Oberoi Realty showed that real estate stocks are highly cyclical. The 2003â€“2008 boom created 20-50x returns; the 2010â€“2020 bust wiped out most gains. The lesson: buy at the start of the upcycle when inventory is low and launches are beginning.",
    companies: ["DLF (2004â€“2007: 20x)", "Godrej Properties (2020â€“2022: 4x)", "Oberoi Realty (2020â€“2023: 3x)"],
    rishis: ["Soros", "Marks", "Graham"],
    quote: "Real estate cycles are driven by human psychology, not economics.",
    author: "Howard Marks",
  },

  Textiles: {
    era: "India Textile Export Cycle (2020â€“2022)",
    lesson: "Post-COVID supply chain shifts and China+1 created a window for Indian textile exporters. Companies like Vardhman Textiles and KPR Mill compounded at 4-6x in 2 years. The lesson: global supply chain disruptions create temporary but powerful earnings surges for well-positioned exporters.",
    companies: ["Vardhman Textiles (2020â€“2022: 4x)", "KPR Mill (2020â€“2022: 5x)", "Welspun India (2020â€“2021: 3x)"],
    rishis: ["Kacholia", "Porinju", "Lynch"],
    quote: "The key to making money in stocks is not to get scared out of them.",
    author: "Peter Lynch",
  },

  Hospitality: {
    era: "India Travel Recovery (2022â€“2024)",
    lesson: "Indian Hotels (Taj), EIH (Oberoi), and Lemon Tree Hotels recovered sharply post-COVID as revenge travel created record occupancies and ARRs. The pattern: capital-intensive businesses with strong brand equity are best bought during cyclical lows when occupancy is depressed.",
    companies: ["Indian Hotels (2020â€“2023: 8x)", "Lemon Tree (2020â€“2023: 6x)", "EIH (2020â€“2022: 4x)"],
    rishis: ["Pabrai", "Lynch", "Jhunjhunwala"],
    quote: "The time of maximum pessimism is the best time to buy.",
    author: "John Templeton",
  },

  Healthcare: {
    era: "India Healthcare Services Boom (2015â€“2022)",
    lesson: "Apollo Hospitals, Max Healthcare, and Narayana Health demonstrated that branded healthcare in India commands premium pricing with low price elasticity. The moat: brand trust in life-critical services is almost impossible to replicate.",
    companies: ["Apollo Hospitals (2020â€“2022: 4x)", "Max Healthcare (2020â€“2022: 6x)", "Narayana Hrudayalaya (2020â€“2022: 5x)"],
    rishis: ["Buffett", "Fisher", "Raamdeo"],
    quote: "The most important quality for an investor is temperament, not intellect.",
    author: "Warren Buffett",
  },

  Insurance: {
    era: "India Insurance Penetration Story (2016â€“2022)",
    lesson: "HDFC Life, SBI Life, and ICICI Prudential benefited from India's massive insurance underpenetration. The pattern: businesses with multi-decade structural tailwinds from low base penetration can compound regardless of near-term economic cycles.",
    companies: ["HDFC Life (2017â€“2021: 3x)", "SBI Life (2017â€“2021: 2.5x)", "Star Health (2021â€“2023: recovery)"],
    rishis: ["Buffett", "Munger", "Raamdeo"],
    quote: "Our favorite holding period is forever.",
    author: "Warren Buffett",
  },

  "Asset Management": {
    era: "India MF SIP Revolution (2015â€“2023)",
    lesson: "HDFC AMC and Nippon India MF benefited from the SIP revolution that added 10,000 Cr monthly into Indian equities. The key: asset-light businesses with AUM growth compounds both revenues and margins simultaneously.",
    companies: ["HDFC AMC (2018â€“2021: 3x)", "Nippon India MF (2020â€“2022: 3x)"],
    rishis: ["Munger", "Buffett", "Raamdeo"],
    quote: "Compound interest is the eighth wonder of the world.",
    author: "Charlie Munger",
  },

  Power: {
    era: "India Power Sector Privatization (2003â€“2008)",
    lesson: "Tata Power, NTPC, and Power Grid compounded during India's power deficit era. The lesson: regulated utilities with government backing provide stable, bond-like returns with equity-like upside during infrastructure buildout phases.",
    companies: ["NTPC (2004â€“2008: 5x)", "Power Grid (2007â€“2018: 6x)", "Tata Power (2003â€“2008: 15x)"],
    rishis: ["Graham", "Templeton", "Schloss"],
    quote: "In the short run, the market is a voting machine, but in the long run, it is a weighing machine.",
    author: "Benjamin Graham",
  },

  "Renewable Energy": {
    era: "India Green Energy Transition (2020â€“2024)",
    lesson: "Adani Green, Greenko, and ReNew Power captured the structural shift to renewable energy as India committed to 500 GW renewable capacity. The lesson: policy-backed structural transitions create decade-long compounding opportunities for early movers.",
    companies: ["Adani Green (2020â€“2022: 10x)", "NTPC Renewables (unlisted)", "Torrent Power (2020â€“2023: 3x)"],
    rishis: ["Templeton", "Fisher", "Soros"],
    quote: "The investor of today does not profit from yesterday's growth.",
    author: "Warren Buffett",
  },

  Defense: {
    era: "India Defense Indigenization (2020â€“2024)",
    lesson: "HAL, BEL, Bharat Forge, and Data Patterns compounded 5-10x as India committed to indigenous defense manufacturing under Make in India. The pattern: government-mandated import substitution creates monopoly-like dynamics for domestic suppliers.",
    companies: ["HAL (2021â€“2023: 5x)", "BEL (2020â€“2023: 6x)", "Data Patterns (2021â€“2022: 4x)", "Bharat Forge defense (2022â€“2023)"],
    rishis: ["Lynch", "Kacholia", "Porinju"],
    quote: "The person that turns over the most rocks wins.",
    author: "Peter Lynch",
  },

  Railway: {
    era: "India Railway Capex Supercycle (2022â€“2027)",
    lesson: "RVNL, IRFC, Titagarh Wagons, and Jupiter Wagons compounded as India's railway capex hit 2.5 lakh Cr annually. The pattern mirrors the US railway buildout of the 1880s â€” a structural capex boom that benefits suppliers and operators for 5-10 years.",
    companies: ["RVNL (2022â€“2023: 8x)", "Titagarh Wagons (2022â€“2023: 6x)", "Jupiter Wagons (2022â€“2023: 5x)"],
    rishis: ["Lynch", "Nemish", "Kacholia"],
    quote: "Investing without research is like playing stud poker and never looking at the cards.",
    author: "Peter Lynch",
  },

  Logistics: {
    era: "India GST + Logistics Revolution (2017â€“2022)",
    lesson: "Container Corporation, Delhivery, and VRL Logistics benefited from GST-driven supply chain formalization. The lesson: regulatory events that force industry formalization create 5-7 year structural tailwinds for organized players.",
    companies: ["Container Corp (2018â€“2022: 4x)", "VRL Logistics (2016â€“2021: 5x)", "Blue Dart (2020â€“2022: 3x)"],
    rishis: ["Lynch", "Pabrai", "Kacholia"],
    quote: "The simpler the better. The best business models are often the simplest ones.",
    author: "Peter Lynch",
  },

  Agrochemicals: {
    era: "India Agrochemical Export Boom (2018â€“2022)",
    lesson: "PI Industries, Rallis India, and Bayer CropScience captured export-led growth as Indian agrochemical manufacturers became global suppliers. The pattern: technical expertise + patent expiry opportunities + India cost advantage = durable export moat.",
    companies: ["PI Industries (2017â€“2021: 5x)", "Rallis India (2020â€“2021: 2x)", "Sumitomo Chemical India (2019â€“2021: 3x)"],
    rishis: ["Fisher", "Kacholia", "Pabrai"],
    quote: "The best stock to buy is the one you already own.",
    author: "Peter Lynch",
  },

  Fertilizers: {
    era: "India Fertilizer Cycle (2021â€“2022)",
    lesson: "Coromandel International and Chambal Fertilizers surged as global fertilizer prices spiked post-Ukraine conflict. The lesson: commodity fertilizer companies are price-takers â€” global supply disruptions create short, sharp earnings spikes that compress as quickly as they appear.",
    companies: ["Coromandel International (2020â€“2022: 4x)", "Chambal Fertilizers (2021â€“2022: 3x)"],
    rishis: ["Graham", "Marks", "Kedia"],
    quote: "Price is what you pay. Value is what you get.",
    author: "Warren Buffett",
  },

  "Consumer Durables": {
    era: "India Premiumization Wave (2015â€“2022)",
    lesson: "Voltas, Havells, and Crompton Greaves Consumer compounded as India's rising middle class upgraded from unbranded to branded appliances. The pattern: premiumization + distribution expansion + working capital efficiency = powerful compounding in consumer durable brands.",
    companies: ["Havells India (2012â€“2020: 8x)", "Voltas (2012â€“2018: 6x)", "Crompton Greaves Consumer (2016â€“2021: 5x)"],
    rishis: ["Damani", "Lynch", "Basant"],
    quote: "The best time to plant a tree was 20 years ago. The second best time is now.",
    author: "Charlie Munger",
  },

  "Building Materials": {
    era: "India Real Estate and Construction Recovery (2020â€“2024)",
    lesson: "Asian Paints, Pidilite, and Astral Poly compounded by dominating downstream real estate demand. These businesses have near-monopoly positions in their niches and benefit from every construction or renovation activity in India.",
    companies: ["Asian Paints (2010â€“2020: 8x)", "Pidilite (2012â€“2020: 10x)", "Astral Poly (2012â€“2020: 15x)"],
    rishis: ["Buffett", "Munger", "Damani"],
    quote: "It is not necessary to do extraordinary things to get extraordinary results.",
    author: "Warren Buffett",
  },

  Media: {
    era: "India Digital Media Transition (2016â€“2020)",
    lesson: "Traditional media companies like Zee Entertainment and Sun TV faced structural headwinds from streaming while digital-first platforms grew. The lesson: avoid businesses where the distribution model is being disrupted by technology, unless the company is leading the disruption.",
    companies: ["Sun TV (dividend compounder 2010â€“2018)", "Zee Entertainment (cautionary tale 2017â€“2021)", "PVR (hospitality recovery 2022)"],
    rishis: ["Munger", "Marks", "Soros"],
    quote: "Invert, always invert.",
    author: "Charlie Munger",
  },

  Paint: {
    era: "India Paint Industry Duopoly (2005â€“2020)",
    lesson: "Asian Paints and Berger Paints compounded at 20%+ annually for 15 years by dominating dealer networks and building sub-brand architecture. The insight: businesses with 20,000+ dealer touchpoints are almost impossible to displace, even by well-funded competitors.",
    companies: ["Asian Paints (2005â€“2020: 25x)", "Berger Paints (2010â€“2020: 10x)", "Kansai Nerolac (2009â€“2019: 7x)"],
    rishis: ["Damani", "Buffett", "Munger"],
    quote: "A wonderful company at a fair price is far better than a fair company at a wonderful price.",
    author: "Charlie Munger",
  },

  Jewellery: {
    era: "India Organized Jewellery Boom (2012â€“2020)",
    lesson: "Titan's Tanishq disrupted unorganized jewellers by offering trust, transparency, and hallmarking. The pattern mirrors the retail formalization theme â€” organized players gaining share from unorganized ones, with GST accelerating the shift.",
    companies: ["Titan (Tanishq division, 2012â€“2020: 15x)", "Kalyan Jewellers (2021â€“2023: 3x)", "PC Jeweller (cautionary tale)"],
    rishis: ["Damani", "Lynch", "Basant"],
    quote: "Know what you own and why you own it.",
    author: "Peter Lynch",
  },

};

// â”€â”€â”€ METRIC-BASED PARALLELS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// When sector match fails, use financial metric patterns

function getMetricBasedParallel(metadata: Record<string, any>): StockParallel | null {
  const roe = metadata.roe ?? 0;
  const pe = metadata.pe ?? 0;
  const de = metadata.de ?? 0;
  const roce = metadata.roce ?? 0;
  const revcagr = metadata.revcagr ?? 0;
  const promo = metadata.promo ?? 0;
  const opm = metadata.opm ?? 0;
  const fcf = metadata.fcf ?? 0;

  // Classic Compounder: High ROE + Low Debt + Consistent Growth
  if (roe > 20 && de < 0.5 && revcagr > 12) {
    return {
      era: "Classic Indian Compounder Pattern (2005â€“2020)",
      lesson: "Businesses with ROE above 20%, debt-to-equity below 0.5, and consistent double-digit revenue growth have historically been the greatest wealth creators on Indian exchanges. These are the stocks Damani, Jhunjhunwala, and Buffett seek â€” businesses that self-fund growth through internal cash flows.",
      companies: ["Asian Paints (ROE 30%+)", "HDFC Bank (ROE 15â€“18%)", "Pidilite (ROE 25%+)", "Page Industries (ROE 50%+)"],
      rishis: ["Buffett", "Damani", "Munger"],
      quote: "The most important thing to me is figuring out how big a moat there is around the business.",
      author: "Warren Buffett",
    };
  }

  // Deep Value: Low PE + High ROCE (Graham territory)
  if (pe > 0 && pe < 15 && roce > 15) {
    return {
      era: "Graham Deep Value Opportunities in India (2013â€“2016)",
      lesson: "During the 2013â€“2016 bear phase, many quality Indian companies traded at PE below 12 with ROCE above 20%. Those who deployed capital here saw 5-10x returns by 2020. The lesson: when quality businesses trade at discount PE due to cyclical or sentiment-driven fear, that is the maximum opportunity.",
      companies: ["Bajaj Finance (2013: PE~12, then 50x)", "Eicher Motors (2012: PE~14, then 20x)", "Titan (2013: PE~18, then 8x)"],
      rishis: ["Graham", "Klarman", "Pabrai"],
      quote: "The intelligent investor is a realist who sells to optimists and buys from pessimists.",
      author: "Benjamin Graham",
    };
  }

  // High Growth: Revenue CAGR > 20%
  if (revcagr > 20) {
    return {
      era: "India High-Growth Compounders (2014â€“2022)",
      lesson: "Companies with revenue growing above 20% annually tend to re-rate significantly as the market assigns higher multiples to sustained growth. The risk: growth must translate to free cash flow eventually. Pure revenue growth without margin improvement is a warning sign.",
      companies: ["Dixon Technologies (2018â€“2021: 15x)", "Divi's Labs (2019â€“2021: 4x)", "Deepak Nitrite (2017â€“2021: 10x)"],
      rishis: ["Fisher", "Lynch", "Kacholia"],
      quote: "The earnings power of a superior business will take care of the stock price.",
      author: "Philip Fisher",
    };
  }

  // High Promoter + Low Debt: Founder-led quality
  if (promo > 65 && de < 0.3) {
    return {
      era: "Founder-Led Indian Businesses (2010â€“2022)",
      lesson: "High promoter holding combined with zero debt is a powerful signal of capital discipline and long-term thinking. Founders with skin in the game tend to avoid value-destructive acquisitions and focus on organic growth. Bajaj twins, Eicher, and Asian Paints all share this pattern.",
      companies: ["Bajaj Finance (promoter 55%+)", "Eicher Motors (promoter 49%)", "Asian Paints (promoter 52%)", "Pidilite (promoter 70%+)"],
      rishis: ["Buffett", "Munger", "Raamdeo"],
      quote: "I want to be in businesses that are so wonderful that an idiot can run them â€” because sooner or later, one will.",
      author: "Warren Buffett",
    };
  }

  // High Operating Margin: Pricing power
  if (opm > 20) {
    return {
      era: "India Pricing Power Leaders (2008â€“2020)",
      lesson: "Businesses with operating margins above 20% demonstrate structural pricing power that persists through economic cycles. Nestle, Marico, and Colgate have maintained 18-25% margins for decades by dominating consumer mind-share. High margins attract competition, so the moat must be real â€” brand, network, or switching costs.",
      companies: ["Nestle India (OPM 22%+)", "Marico (OPM 18â€“20%)", "Colgate India (OPM 25%+)", "Hindustan Unilever (OPM 22%+)"],
      rishis: ["Buffett", "Munger", "Damani"],
      quote: "The key to investing is not how much an industry will affect society, but determining the competitive advantage of any given company.",
      author: "Warren Buffett",
    };
  }

  // Negative/Low FCF + High Capex: Investment Phase
  if (fcf < 0) {
    return {
      era: "Indian Investment Phase Turnarounds (2017â€“2022)",
      lesson: "Companies in heavy investment phase often look expensive on current earnings but are building future capacity. Reliance during Jio buildout, Adani during port expansion, and L&T during mega-project phases all showed negative FCF before the payoff cycle. The key question: is capex building a durable asset or burning cash?",
      companies: ["Reliance Industries (Jio era 2016â€“2019, then 4x)", "Adani Ports (2012â€“2016 expansion)", "L&T (2014â€“2017 order buildup)"],
      rishis: ["Munger", "Fisher", "Buffett"],
      quote: "The best thing that happens to us is when a great company gets into temporary trouble.",
      author: "Warren Buffett",
    };
  }

  return null;
}

// â”€â”€â”€ SCORE-BASED PARALLELS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Universal fallback â€” every stock gets something meaningful

function getScoreBasedParallel(score: number, symbol: string): StockParallel {
  if (score >= 75) {
    return {
      era: "Legendary Indian Compounders â€” The 100x Club",
      lesson: `The highest Rishi consensus scores correspond historically to stocks that went on to deliver 10-100x returns. Infosys (1993â€“2000: 1000x), HDFC Bank (1995â€“2008: 100x), Asian Paints (2000â€“2020: 60x), Bajaj Finance (2009â€“2020: 150x). The common thread: durable competitive advantage + capital-efficient reinvestment + patient management. A score this high suggests ${symbol} may share characteristics with these legendary compounders.`,
      companies: ["HDFC Bank (1995â€“2008: 100x)", "Asian Paints (2000â€“2020: 60x)", "Bajaj Finance (2009â€“2020: 150x)", "Infosys (1993â€“2000: 1000x)"],
      rishis: ["Buffett", "Munger", "Damani", "Raamdeo"],
      quote: "If a business does well, the stock eventually follows.",
      author: "Warren Buffett",
    };
  }

  if (score >= 60) {
    return {
      era: "Classic Value Compounders â€” The Quality at Fair Price Club",
      lesson: `Stocks scoring 60â€“74 often represent quality businesses trading at reasonable â€” but not cheap â€” valuations. Historically, stocks like Maruti Suzuki (2009), Titan (2013), and Marico (2014) fell in this range before compounding 5-8x over 5 years. The Rishis see value here, but require patience â€” these stocks reward holders who can wait through consolidation phases.`,
      companies: ["Maruti Suzuki (2009: 5x in 5 years)", "Titan (2013: 8x in 6 years)", "Marico (2014: 5x in 5 years)", "Godrej Consumer (2013: 4x)"],
      rishis: ["Lynch", "Fisher", "Raamdeo", "Basant"],
      quote: "The stock market is filled with individuals who know the price of everything, but the value of nothing.",
      author: "Philip Fisher",
    };
  }

  if (score >= 45) {
    return {
      era: "Speculative Merit â€” High Tension Historical Parallels",
      lesson: `Stocks in the 45â€“59 range reflect genuine philosophical disagreement among the 20 Rishis. Historically, these situations resolve either powerfully upward (when the bears were wrong about temporary headwinds) or painfully downward (when bears correctly identified structural issues). Tata Motors in 2012 (bears: JLR debt, bulls: JLR brand) eventually went 5x. Suzlon in 2012 (bulls: renewable growth, bears: debt) went bankrupt. Differentiation requires deep sector analysis.`,
      companies: ["Tata Motors (2012â€“2017: 5x â€” bulls won)", "JSPL (2014â€“2021: 8x â€” patience rewarded)", "Suzlon (2012: cautionary tale)", "Strides Pharma (2014â€“2018: 3x)"],
      rishis: ["Marks", "Klarman", "Graham", "Soros"],
      quote: "You can't make a good deal with a bad person.",
      author: "Warren Buffett",
    };
  }

  return {
    era: "High Philosophical Conflict â€” Contrarian Opportunity or Value Trap?",
    lesson: `Low Rishi consensus scores historically separate into two categories: genuine turnaround opportunities (DLF in 2013 before a 4x recovery, Tata Steel in 2020 before a 5x recovery) and structural value traps (Yes Bank 2018â€“2020, Jet Airways 2018â€“2019). The key differentiator is balance sheet strength and competitive position. With 20 Rishis disagreeing significantly, position sizing and stop-losses become critical.`,
    companies: ["DLF (2013 low â†’ 2020: 4x recovery)", "Tata Steel (2020: 5x in 18 months)", "Yes Bank (cautionary: 95% drawdown)", "Unitech (cautionary: permanent loss)"],
    rishis: ["Graham", "Klarman", "Templeton", "Schloss"],
    quote: "The time of maximum pessimism is the best time to buy, and the time of maximum optimism is the best time to sell.",
    author: "John Templeton",
  };
}

// â”€â”€â”€ MAIN EXPORT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function getStockParallel(asset: UniversalAsset, consensusScore: number): StockParallel {
  const metadata = asset.metadata || {};
  const sector = metadata.sector || asset.sector || '';

  // 1. Try exact sector match
  const exactSector = SECTOR_PARALLELS[sector];
  if (exactSector) return exactSector;

  // 2. Try partial sector match (e.g. "Specialty Chemicals" â†’ "Chemicals")
  const sectorKeys = Object.keys(SECTOR_PARALLELS);
  const partialMatch = sectorKeys.find(k =>
    sector.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(sector.toLowerCase())
  );
  if (partialMatch) return SECTOR_PARALLELS[partialMatch];

  // 3. Try metric-based parallel
  const metricParallel = getMetricBasedParallel(metadata);
  if (metricParallel) return metricParallel;

  // 4. Score-based fallback â€” always returns something
  return getScoreBasedParallel(consensusScore, asset.symbol);
}