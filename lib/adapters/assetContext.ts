import type { UniversalAsset } from "../types/asset";

export function buildAssetContext(asset: UniversalAsset): string {

  const meta = asset.metadata ?? {};

  switch (asset.category) {

    case "crypto":
      return `
Crypto Asset: ${asset.name} (${asset.symbol})
Price: ${asset.price.toLocaleString('en-US')}
Market Cap: ${(asset.marketCap ?? meta.marketCap ?? 0).toLocaleString('en-US')}
24h Volume: ${(asset.volume24h ?? meta.volume24h ?? 0).toLocaleString('en-US')}
24h Change: ${asset.change24h}%
RSI: ${meta.rsi ?? 'N/A'}
MACD: ${meta.macd ?? 'N/A'}
Distance from ATH: ${meta.fromAth ?? 'N/A'}%

Discuss: network effects, adoption, macro liquidity, speculative excess, digital gold thesis.
`;

    case "forex":
      return `
Forex Pair: ${asset.name} (${asset.symbol})
Spot Rate: ${asset.price}
24h Change: ${asset.change24h}%
Volatility: ${asset.volatility ?? meta.volatility ?? 'N/A'}
Spread: ${meta.spread ?? 'N/A'}
Interest Rate Diff: ${meta.interestDiff?.diff ?? 'N/A'}%

Discuss: interest rate differentials, carry trades, central banks, inflation, macro cycles.
`;

    case "commodity":
      return `
Commodity: ${asset.name} (${asset.symbol})
Price: ${asset.price} ${meta.unit ?? ''}
24h Change: ${asset.change24h}%
Category: ${asset.sector ?? meta.commodityCategory ?? 'N/A'}
Exchange: ${asset.exchange ?? meta.exchange ?? 'MCX'}

Discuss: geopolitics, supply/demand cycles, inflation hedge, commodity supercycles.
`;

    case "bond":
      return `
Bond: ${asset.name} (${asset.symbol})
Yield (YTM): ${asset.price}%
Type: ${asset.sector ?? meta.type ?? 'N/A'}
Duration: ${meta.duration ?? 'N/A'} years
Credit Rating: ${meta.riskRating ?? 'N/A'}
Country: ${asset.exchange ?? meta.country ?? 'India'}

Discuss: yield curves, recession risk, duration risk, central bank policy, inflation expectations.
`;

    default:
      return `
Asset: ${asset.name} (${asset.symbol})
Category: ${asset.category}
Price: ${asset.price}
24h Change: ${asset.change24h}%
`;
  }
}