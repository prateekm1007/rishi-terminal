import type { Stock } from '../types';
import type { UniversalAsset } from '../types/asset';

/**
 * stockAdapter — converts Stock → UniversalAsset
 *
 * All 24 Stock fields are preserved in metadata so that:
 * - Existing scorers (orchestrator.ts) remain unchanged
 * - AssetMetricsPanel reads via asset.metadata.pe, etc.
 * - AssetWisdomSidebar reads via asset.metadata.sector, etc.
 * - RishiScoreDual reads via asset.metadata.* (already written this way)
 */
export function adaptStock(stock: Stock): UniversalAsset {
  return {
    // Core identity (UniversalAsset required fields)
    symbol:   stock.symbol,
    name:     stock.name,
    category: 'stock',

    // Core pricing
    price:     stock.price,
    change24h: 0, // live price fetched client-side by LivePriceWidget

    // Optional display fields (used by AssetTerminal header)
    sector:   stock.sector,
    exchange: stock.exchange,

    // Convenience fields
    marketCap: stock.mktcap,

    // ALL 24 Stock fields preserved in metadata
    // This ensures AssetMetricsPanel, AssetTechnicalIndicators,
    // AssetWisdomSidebar, and RishiScoreDual all work without changes
    metadata: {
      // Identity
      sector:   stock.sector,
      exchange: stock.exchange,

      // Valuation
      pe:    stock.pe,
      bvps:  stock.bvps,
      mktcap: stock.mktcap,

      // Quality
      roe:   stock.roe,
      roce:  stock.roce,
      opm:   stock.opm,
      de:    stock.de,

      // Growth
      revcagr:  stock.revcagr,
      epscagr:  stock.epscagr,

      // Cash flows
      ocf:   stock.ocf,
      fcf:   stock.fcf,
      rev:   stock.rev,
      np:    stock.np,

      // Balance sheet
      ca:    stock.ca,
      tl:    stock.tl,
      dep:   stock.dep,
      capex: stock.capex,
      sh:    stock.sh,

      // Governance
      promo: stock.promo,

      // Computed convenience fields for AssetMetricsPanel
      debt:      stock.de,
      marketCap: stock.mktcap,
    },
  };
}