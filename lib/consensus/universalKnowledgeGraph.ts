import type { UniversalAsset } from '../types/asset';
import type { RishiScore } from '../consensus/types';
import type { Stock } from '../types';
import { buildEliteKnowledgeGraph as buildStockGraph } from './eliteGraph';

/**
 * Universal Knowledge Graph Builder
 * Adapts any asset type to work with the knowledge graph
 */
export function buildUniversalKnowledgeGraph(
  asset: UniversalAsset,
  scores: RishiScore[]
) {
  // For stocks, use the original function
  if (asset.category === 'stock') {
    return buildStockGraph(asset as unknown as Stock, scores);
  }

  // For other assets, create a minimal Stock-like object
  const mockStock: Stock = {
    symbol: asset.symbol,
    name: asset.name,
    sector: asset.metadata?.sector || 'Unknown',
    exchange: asset.exchange || 'N/A',
    price: asset.price,
    pe: 0,
    roe: 0,
    mktcap: asset.metadata?.marketCap || 0,
    ocf: 0,
    rev: 0,
    revcagr: 0,
    epscagr: 0,
    opm: 0,
    roce: 0,
    de: 0,
    fcf: 0,
    promo: 0,
    ca: 0,
    tl: 0,
    sh: 0,
    np: 0,
    dep: 0,
    capex: 0,
    bvps: 0,
  }

  return buildStockGraph(mockStock, scores);
}
