import { Stock } from '../types';

export interface WisdomNode {
  id: string;
  label: string;
  type: 'principle' | 'metric' | 'risk';
  value?: number;
}

export interface WisdomEdge {
  from: string;
  to: string;
  strength: number;
  label: string;
}

export interface WisdomGraphData {
  nodes: WisdomNode[];
  edges: WisdomEdge[];
  insights: string[];
}

export function generateWisdomGraph(stock: Stock): WisdomGraphData {
  const nodes: WisdomNode[] = [
    { id: 'stock', label: stock.name, type: 'principle' },
  ];
  
  const edges: WisdomEdge[] = [];
  const insights: string[] = [];
  
  // Quality metrics
  if (stock.roe > 15) {
    nodes.push({ id: 'quality', label: 'High Quality', type: 'principle', value: stock.roe });
    edges.push({ from: 'stock', to: 'quality', strength: stock.roe, label: `ROE ${stock.roe}%` });
    insights.push(`Strong return on equity suggests competitive advantage`);
  }
  
  // Value metrics
  if (stock.pe < 20) {
    nodes.push({ id: 'value', label: 'Value Opportunity', type: 'principle', value: stock.pe });
    edges.push({ from: 'stock', to: 'value', strength: 100 - stock.pe * 3, label: `P/E ${stock.pe}` });
    insights.push(`Trading at reasonable valuation relative to market`);
  }
  
  // Growth metrics
  if (stock.epscagr > 10) {
    nodes.push({ id: 'growth', label: 'Growth Engine', type: 'principle', value: stock.epscagr });
    edges.push({ from: 'stock', to: 'growth', strength: stock.epscagr, label: `EPS CAGR ${stock.epscagr}%` });
    insights.push(`Earnings compounding at healthy rate`);
  }
  
  // Risk factors
  if (stock.de > 1) {
    nodes.push({ id: 'leverage', label: 'Leverage Risk', type: 'risk', value: stock.de });
    edges.push({ from: 'stock', to: 'leverage', strength: stock.de * 30, label: `D/E ${stock.de.toFixed(2)}` });
    insights.push(`Monitor debt levels — refinancing risk exists`);
  }
  
  // Moat indicator
  if (stock.roce > 20) {
    nodes.push({ id: 'moat', label: 'Economic Moat', type: 'principle', value: stock.roce });
    edges.push({ from: 'quality', to: 'moat', strength: stock.roce, label: `ROCE ${stock.roce}%` });
    insights.push(`Capital efficiency indicates pricing power`);
  }
  
  return { nodes, edges, insights };
}