// Commodities data for Rishi Terminal
export interface Commodity {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  unit: string;
  category: 'precious-metals' | 'energy' | 'agriculture' | 'base-metals';
  description: string;
  exchange: string;
}

export const COMMODITIES_DATA: Commodity[] = [
  {
    symbol: 'GOLD',
    name: 'Gold',
    price: 63500,
    change24h: 0.5,
    unit: '/gm',
    category: 'precious-metals',
    description: 'Gold - ultimate safe haven asset. Hedge against inflation and currency devaluation.',
    exchange: 'MCX'
  },
  {
    symbol: 'SILVER',
    name: 'Silver',
    price: 78500,
    change24h: -0.8,
    unit: '/kg',
    category: 'precious-metals',
    description: 'Silver - industrial and precious metal. Used in electronics, solar panels.',
    exchange: 'MCX'
  },
  {
    symbol: 'CRUDEOIL',
    name: 'Crude Oil',
    price: 6850,
    change24h: 2.1,
    unit: '/barrel',
    category: 'energy',
    description: 'Crude Oil - the lifeblood of global economy. Refines into petrol, diesel, plastics.',
    exchange: 'MCX'
  },
  {
    symbol: 'NATURALGAS',
    name: 'Natural Gas',
    price: 285,
    change24h: -1.2,
    unit: '/mmbtu',
    category: 'energy',
    description: 'Natural Gas - cleaner fossil fuel. Used for power generation, cooking.',
    exchange: 'MCX'
  },
  {
    symbol: 'COPPER',
    name: 'Copper',
    price: 725,
    change24h: 1.5,
    unit: '/kg',
    category: 'base-metals',
    description: 'Copper - Dr. Copper predicts economic growth. Used in construction, electronics.',
    exchange: 'MCX'
  },
  {
    symbol: 'ZINC',
    name: 'Zinc',
    price: 245,
    change24h: 0.3,
    unit: '/kg',
    category: 'base-metals',
    description: 'Zinc - anti-corrosion metal. Galvanizing steel, batteries, alloys.',
    exchange: 'MCX'
  }
];

export function getCommodityBySymbol(symbol: string): Commodity | undefined {
  return COMMODITIES_DATA.find(c => c.symbol.toUpperCase() === symbol.toUpperCase());
}