// SECTOR_REGISTRY_V1

export const CANONICAL_SECTORS = [
  "Banking", "NBFC", "Insurance", "Fintech",
  "IT", "Telecom",
  "Energy", "Oil & Gas", "Power", "Renewables",
  "Auto", "Auto Ancillary",
  "Pharma", "Healthcare", "Biotech",
  "Consumer", "Retail", "FMCG",
  "Chemicals", "Paints",
  "Metals", "Mining",
  "Infra", "Capital Goods", "Cement", "Building Materials",
  "Realty", "Hospitality", "Aviation", "Logistics",
  "Defense", "Railways",
  "Textiles", "Media", "Entertainment",
  "Agri", "Education",
  "E-commerce", "Exchange", "Internet", "Utilities",
] as const;

export type CanonicalSector = typeof CANONICAL_SECTORS[number];

const ALIASES: Record<string, CanonicalSector> = {
  "Financials": "Banking", "Financial": "Banking", "Banks": "Banking",
  "Software": "IT", "Technology": "IT", "Tech": "IT",
  "Consumer Tech": "Internet", "Internet Tech": "Internet",
  "Oil": "Oil & Gas", "Gas": "Oil & Gas",
  "Electricity": "Power",
  "Real Estate": "Realty", "RealEstate": "Realty",
  "Hospitals": "Healthcare",
  "Brokerage": "Fintech", "FinTech": "Fintech", "Finance": "Fintech",
  "Electricals": "Capital Goods", "Electronics": "Capital Goods",
  "Industrials": "Capital Goods", "Conglomerate": "Capital Goods",
  "Engineering": "Capital Goods", "Packaging": "Capital Goods",
  "Beverages": "FMCG", "Food": "FMCG",
  "Auto Ancillaries": "Auto Ancillary",
  "Defence": "Defense",
  "Steel": "Metals",
  "AgriTech": "Agri",
  "Jewelry": "Consumer",
};

export function normalizeSector(input?: string): CanonicalSector {
  if (!input) return "Utilities";
  const clean = input.trim();
  const exact = CANONICAL_SECTORS.find(s => s === clean);
  if (exact) return exact;
  if (ALIASES[clean]) return ALIASES[clean];
  return "Utilities";
}

// Sector benchmark averages for industry context
export const SECTOR_BENCHMARKS: Record<CanonicalSector, { pe: number; roe: number; opm: number; de: number }> = {
  "Banking":         { pe: 16, roe: 16, opm: 0,  de: 7.0 },
  "NBFC":            { pe: 18, roe: 15, opm: 0,  de: 5.0 },
  "Insurance":       { pe: 25, roe: 14, opm: 0,  de: 0.5 },
  "Fintech":         { pe: 35, roe: 12, opm: 18, de: 0.3 },
  "IT":              { pe: 27, roe: 25, opm: 22, de: 0.1 },
  "Telecom":         { pe: 30, roe: 10, opm: 35, de: 2.0 },
  "Energy":          { pe: 14, roe: 12, opm: 18, de: 0.8 },
  "Oil & Gas":       { pe: 12, roe: 14, opm: 16, de: 0.6 },
  "Power":           { pe: 18, roe: 12, opm: 25, de: 1.5 },
  "Renewables":      { pe: 32, roe: 11, opm: 28, de: 1.8 },
  "Auto":            { pe: 22, roe: 16, opm: 12, de: 0.7 },
  "Auto Ancillary":  { pe: 24, roe: 18, opm: 14, de: 0.5 },
  "Pharma":          { pe: 28, roe: 18, opm: 22, de: 0.3 },
  "Healthcare":      { pe: 35, roe: 16, opm: 18, de: 0.6 },
  "Biotech":         { pe: 40, roe: 12, opm: 20, de: 0.4 },
  "Consumer":        { pe: 45, roe: 35, opm: 18, de: 0.2 },
  "Retail":          { pe: 50, roe: 22, opm: 10, de: 0.8 },
  "FMCG":            { pe: 50, roe: 45, opm: 22, de: 0.1 },
  "Chemicals":       { pe: 22, roe: 16, opm: 18, de: 0.5 },
  "Paints":          { pe: 55, roe: 30, opm: 20, de: 0.2 },
  "Metals":          { pe: 10, roe: 12, opm: 16, de: 1.0 },
  "Mining":          { pe: 12, roe: 14, opm: 22, de: 0.8 },
  "Infra":           { pe: 18, roe: 11, opm: 14, de: 1.5 },
  "Capital Goods":   { pe: 28, roe: 16, opm: 14, de: 0.4 },
  "Cement":          { pe: 22, roe: 14, opm: 18, de: 0.5 },
  "Building Materials":{ pe: 28, roe: 18, opm: 15, de: 0.4 },
  "Realty":          { pe: 22, roe: 10, opm: 22, de: 0.8 },
  "Hospitality":     { pe: 30, roe: 12, opm: 18, de: 0.9 },
  "Aviation":        { pe: 18, roe: 14, opm: 12, de: 1.5 },
  "Logistics":       { pe: 25, roe: 15, opm: 12, de: 0.7 },
  "Defense":         { pe: 40, roe: 18, opm: 16, de: 0.3 },
  "Railways":        { pe: 30, roe: 14, opm: 18, de: 0.5 },
  "Textiles":        { pe: 16, roe: 12, opm: 10, de: 0.8 },
  "Media":           { pe: 24, roe: 12, opm: 15, de: 0.5 },
  "Entertainment":   { pe: 30, roe: 14, opm: 18, de: 0.6 },
  "Agri":            { pe: 22, roe: 14, opm: 12, de: 0.6 },
  "Education":       { pe: 35, roe: 18, opm: 22, de: 0.3 },
  "E-commerce":      { pe: 60, roe: 5,  opm: 3,  de: 0.4 },
  "Exchange":        { pe: 30, roe: 25, opm: 60, de: 0.1 },
  "Internet":        { pe: 50, roe: 15, opm: 20, de: 0.3 },
  "Utilities":       { pe: 18, roe: 12, opm: 25, de: 1.2 },
};

export function getSectorBenchmark(sectorInput?: string) {
  const sector = normalizeSector(sectorInput);
  return SECTOR_BENCHMARKS[sector];
}