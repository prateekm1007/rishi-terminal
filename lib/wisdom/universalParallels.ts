import type { UniversalAsset } from "../types/asset";

export interface UniversalHistoricalParallel {
  id: string;
  category: "crypto" | "commodity";
  symbol: string;     // BTC, ETH, GOLD, CRUDE...
  title: string;      // episode name
  period: string;     // e.g. 2020-2022
  move: string;       // human summary
  driver: string;     // macro driver
  takeaway: string;   // what the committee should learn
}

const DEFAULT_CRYPTO: UniversalHistoricalParallel[] = [
  {
    id: "crypto-2017",
    category: "crypto",
    symbol: "CRYPTO",
    title: "2017 Mania → 2018 Crypto Winter",
    period: "2017-2018",
    move: "Vertical rally then deep multi-quarter drawdown",
    driver: "Speculative issuance + reflexive leverage",
    takeaway: "Crypto cycles historically overshoot during liquidity-driven narrative booms, then de-risk violently.",
  },
  {
    id: "crypto-2020",
    category: "crypto",
    symbol: "CRYPTO",
    title: "COVID Liquidity Boom → 2022 Tightening Drawdown",
    period: "2020-2022",
    move: "Strong upcycle then broad deleveraging drawdown",
    driver: "Liquidity expansion → rate hikes + risk-off",
    takeaway: "When real yields rise and leverage unwinds, high-beta crypto regimes compress first.",
  },
];

const DEFAULT_COMMODITY: UniversalHistoricalParallel[] = [
  {
    id: "cmdty-2008",
    category: "commodity",
    symbol: "COMMODITY",
    title: "2008 Commodity Boom → Crisis Crash",
    period: "2007-2009",
    move: "Boom then sharp crisis drawdown",
    driver: "Growth optimism → liquidity shock",
    takeaway: "Commodities can gap down in systemic stress; recovery depends on policy response and demand normalization.",
  },
  {
    id: "cmdty-2020",
    category: "commodity",
    symbol: "COMMODITY",
    title: "2020 Demand Shock → Dislocation",
    period: "2020",
    move: "Abrupt collapse then reflexive rebound",
    driver: "Demand collapse + positioning constraints",
    takeaway: "Commodity moves can be dominated by logistics/positioning during shocks, not fundamentals alone.",
  },
  {
    id: "cmdty-2022",
    category: "commodity",
    symbol: "COMMODITY",
    title: "2022 Inflation / Geopolitics → Spike then Normalization",
    period: "2022-2023",
    move: "Spike regime followed by normalization",
    driver: "Supply risk + inflation + policy tightening",
    takeaway: "Geopolitical spikes often fade; watch inventories, demand destruction, and policy signals.",
  },
];

const CRYPTO: Record<string, UniversalHistoricalParallel[]> = {
  BTC: [
    {
      id: "btc-2017",
      category: "crypto",
      symbol: "BTC",
      title: "ICO Mania → 2018 Crypto Winter",
      period: "2017-2018",
      move: "Massive boom then deep drawdown",
      driver: "Retail leverage + speculative issuance",
      takeaway: "BTC historically experiences large peak-to-trough drawdowns after speculative issuance waves.",
    },
    {
      id: "btc-2020",
      category: "crypto",
      symbol: "BTC",
      title: "COVID Liquidity Boom → 2022 Tightening Drawdown",
      period: "2020-2022",
      move: "Upcycle then deleveraging drawdown",
      driver: "Liquidity expansion → rate hikes + risk-off",
      takeaway: "BTC drawdowns correlate with global deleveraging and rising real yields.",
    },
  ],
  ETH: [
    {
      id: "eth-2017",
      category: "crypto",
      symbol: "ETH",
      title: "Platform Narrative Boom → 2018 Deleveraging",
      period: "2017-2018",
      move: "Stronger boom, harsher bust (higher beta)",
      driver: "Platform adoption narrative + reflexive demand",
      takeaway: "ETH historically behaves with higher beta than BTC—overshoots more and corrects harder.",
    },
    {
      id: "eth-2020",
      category: "crypto",
      symbol: "ETH",
      title: "DeFi / NFT Boom → 2022 Risk-off Reset",
      period: "2020-2022",
      move: "Boom then compression",
      driver: "Speculation + liquidity; later tightening",
      takeaway: "When capital becomes expensive, high-duration crypto narratives compress first.",
    },
  ],
};

const COMMODITY: Record<string, UniversalHistoricalParallel[]> = {
  GOLD: [
    {
      id: "gold-2008",
      category: "commodity",
      symbol: "GOLD",
      title: "Crisis Shock Dip → Multi-year Safety Bid",
      period: "2008-2011",
      move: "Initial shock volatility → multi-year rally",
      driver: "Systemic stress + policy response",
      takeaway: "Gold can dip during the initial shock, then rise as a monetary hedge when balance sheets expand.",
    },
    {
      id: "gold-2011",
      category: "commodity",
      symbol: "GOLD",
      title: "Peak → Long Consolidation / Real-yield Headwind",
      period: "2011-2015",
      move: "Multi-year consolidation/downcycle",
      driver: "Rising real yields + normalization narrative",
      takeaway: "Gold tends to struggle when real yields rise and crisis premium fades.",
    },
  ],
  SILVER: [
    {
      id: "silver-2011",
      category: "commodity",
      symbol: "SILVER",
      title: "Speculative Spike → Sharp Mean Reversion",
      period: "2010-2011",
      move: "Explosive rally then deep drawdown",
      driver: "Positioning + speculation",
      takeaway: "Silver behaves like leveraged gold: higher volatility and faster reversals.",
    },
    {
      id: "silver-2020",
      category: "commodity",
      symbol: "SILVER",
      title: "Reflation Burst → Volatile Range",
      period: "2020-2021",
      move: "Strong rally then range regime",
      driver: "Reflation + industrial demand uncertainty",
      takeaway: "Silver oscillates between monetary and industrial narratives—expect regime switches.",
    },
  ],
  CRUDE: [
    {
      id: "crude-2014",
      category: "commodity",
      symbol: "CRUDE",
      title: "Supply Shock / Shale Expansion → Multi-quarter Collapse",
      period: "2014-2016",
      move: "Large collapse then slow normalization",
      driver: "Supply growth outruns demand",
      takeaway: "Oil resets violently when supply outruns demand; mean reversion can take time.",
    },
    {
      id: "crude-2020",
      category: "commodity",
      symbol: "CRUDE",
      title: "COVID Demand Shock → Historic Dislocation",
      period: "2020",
      move: "Extreme crash then rebound",
      driver: "Demand collapse + positioning/logistics constraints",
      takeaway: "Oil can move beyond fundamentals during shocks due to storage/forced unwinds.",
    },
  ],
};

function norm(s: string): string {
  return (s || "").toUpperCase().trim();
}

export function getUniversalParallels(asset: Pick<UniversalAsset, "symbol" | "category">): UniversalHistoricalParallel[] {
  const symbol = norm(asset.symbol);

  if (asset.category === "crypto") {
    return CRYPTO[symbol] ?? DEFAULT_CRYPTO;
  }

  if (asset.category === "commodity") {
    return COMMODITY[symbol] ?? DEFAULT_COMMODITY;
  }

  return [];
}