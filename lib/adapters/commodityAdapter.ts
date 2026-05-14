import type { UniversalAsset } from '../types/asset';
import type { CommodityData } from '../../data/markets';

export function adaptCommodity(commodity: CommodityData): UniversalAsset {
  return {
    symbol: commodity.symbol,
    name: commodity.name,
    category: 'commodity',
    price: commodity.price,
    change24h: commodity.changePct,
    metadata: commodity
  };
}