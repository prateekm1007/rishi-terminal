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
  if (asset.type === 'stock') {
    return buildStockGraph(asset as Stock, scores);
  }

  // For other assets, create a minimal Stock-like object
  const mockStock: Stock = {
    symbol: asset.symbol,
    name: asset.name,
    price: asset.price,
    sector: asset.metadata?.sector || 'Unknown',
    mcap: asset.metadata?.marketCap || 0,
    
    // Default values for missing stock metrics
    pe: 0,
    roe: 0,
    roce: 0,
    de: 0,
    opm: 0,
    revcagr: 0,
    epscagr: 0,
    pb: 0,
    ps: 0,
    pfcf: 0,
    ev: 0,
    
    // These won't be used but are required by Stock interface
    yh: asset.price * 1.2,
    yl: asset.price * 0.8,
    promoter: 0,
    pledged: 0,
    fii: 0,
    dii: 0
  };

  return buildStockGraph(mockStock, scores);
}