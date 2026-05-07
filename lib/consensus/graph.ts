import { Stock } from '../types';
import { RishiScore } from './types';
import { detectArchetype, HISTORICAL_PARALLELS } from '../wisdom/parallels';

export interface GraphNode {
  id: string;
  label: string;
  type: 'stock' | 'rishi' | 'sector' | 'parallel' | 'metric';
  value: number;
  color: string;
  size: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  strength: number;
  label: string;
  color: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  insights: string[];
  centerNode: string;
}

export function buildKnowledgeGraph(
  stock: Stock,
  scores: RishiScore[],
  allStocks: Record<string, Stock>
): KnowledgeGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const insights: string[] = [];

  // Center node - the stock itself
  const centerNodeId = `stock_${stock.symbol}`;
  nodes.push({
    id: centerNodeId,
    label: stock.name,
    type: 'stock',
    value: 100,
    color: '#FFD700',
    size: 30,
  });

  // Add sector node
  const sectorNodeId = `sector_${stock.sector}`;
  nodes.push({
    id: sectorNodeId,
    label: stock.sector,
    type: 'sector',
    value: 50,
    color: '#60A5FA',
    size: 20,
  });
  edges.push({
    source: centerNodeId,
    target: sectorNodeId,
    strength: 5,
    label: 'belongs to',
    color: '#60A5FA66',
  });

  // Add top 6 Rishi nodes
  scores.slice(0, 6).forEach((rishi, idx) => {
    const rishiNodeId = `rishi_${rishi.name}`;
    const scoreColor = rishi.score >= 75 ? '#00BA7C' : rishi.score >= 55 ? '#FFD700' : '#F4212E';
    
    nodes.push({
      id: rishiNodeId,
      label: rishi.name,
      type: 'rishi',
      value: rishi.score,
      color: scoreColor,
      size: 15 + (rishi.score / 10),
    });

    edges.push({
      source: centerNodeId,
      target: rishiNodeId,
      strength: rishi.score / 20,
      label: `${rishi.score}/100`,
      color: scoreColor + '66',
    });

    if (idx === 0) {
      insights.push(`${rishi.name} is most bullish (${rishi.score}/100)`);
    }
  });

  // Add archetype parallel
  const archetype = detectArchetype(stock);
  if (archetype) {
    const archetypeKey = {
      consumer_moat: 'consumer_moat_india',
      cyclical_trap: 'cyclical_value_trap',
      growth_mania: 'growth_mania',
      quality_compound: 'quality_compound',
      turnaround_trap: 'turnaround_gamble',
      smallcap_gem: 'smallcap_rocket',
    }[archetype];

    if (archetypeKey && HISTORICAL_PARALLELS[archetypeKey]) {
      const parallel = HISTORICAL_PARALLELS[archetypeKey];
      const parallelNodeId = `parallel_${archetypeKey}`;
      
      nodes.push({
        id: parallelNodeId,
        label: parallel.title,
        type: 'parallel',
        value: 60,
        color: '#A78BFA',
        size: 18,
      });

      edges.push({
        source: centerNodeId,
        target: parallelNodeId,
        strength: 4,
        label: 'similar to',
        color: '#A78BFA66',
      });

      insights.push(`Matches ${parallel.era} pattern`);

      // Add historical companies from parallel
      parallel.companies.slice(0, 3).forEach((company) => {
        const companyName = company.name.split(' ')[0]; // e.g., "Titan (2010)" -> "Titan"
        const histNodeId = `hist_${companyName}`;
        
        nodes.push({
          id: histNodeId,
          label: companyName,
          type: 'stock',
          value: 30,
          color: '#FB923C',
          size: 12,
        });

        edges.push({
          source: parallelNodeId,
          target: histNodeId,
          strength: 2,
          label: company.year,
          color: '#FB923C66',
        });
      });
    }
  }

  // Add peer stocks from same sector
  const peers = Object.values(allStocks)
    .filter(s => s.sector === stock.sector && s.symbol !== stock.symbol)
    .slice(0, 4);

  peers.forEach((peer) => {
    const peerNodeId = `stock_${peer.symbol}`;
    nodes.push({
      id: peerNodeId,
      label: peer.symbol,
      type: 'stock',
      value: 40,
      color: '#34D399',
      size: 14,
    });

    edges.push({
      source: sectorNodeId,
      target: peerNodeId,
      strength: 3,
      label: 'peer',
      color: '#34D39966',
    });
  });

  // Add key metric nodes
  if (stock.roe > 20) {
    const metricNodeId = 'metric_quality';
    nodes.push({
      id: metricNodeId,
      label: `High ROE (${stock.roe}%)`,
      type: 'metric',
      value: stock.roe,
      color: '#10B981',
      size: 10,
    });
    edges.push({
      source: centerNodeId,
      target: metricNodeId,
      strength: stock.roe / 10,
      label: 'quality signal',
      color: '#10B98166',
    });
    insights.push('Strong return on equity indicates competitive advantage');
  }

  if (stock.de > 1) {
    const metricNodeId = 'metric_leverage';
    nodes.push({
      id: metricNodeId,
      label: `High Debt (${stock.de.toFixed(1)}x)`,
      type: 'metric',
      value: stock.de * 20,
      color: '#EF4444',
      size: 10,
    });
    edges.push({
      source: centerNodeId,
      target: metricNodeId,
      strength: stock.de * 2,
      label: 'risk factor',
      color: '#EF444466',
    });
    insights.push('Monitor leverage - refinancing risk exists');
  }

  if (stock.epscagr > 15) {
    const metricNodeId = 'metric_growth';
    nodes.push({
      id: metricNodeId,
      label: `Growth (${stock.epscagr}%)`,
      type: 'metric',
      value: stock.epscagr,
      color: '#8B5CF6',
      size: 10,
    });
    edges.push({
      source: centerNodeId,
      target: metricNodeId,
      strength: stock.epscagr / 5,
      label: 'earnings momentum',
      color: '#8B5CF666',
    });
    insights.push('Earnings compounding at healthy rate');
  }

  return {
    nodes,
    edges,
    insights,
    centerNode: centerNodeId,
  };
}