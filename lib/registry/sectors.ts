// SECTOR_REGISTRY_V1

export const CANONICAL_SECTORS = [
  "Banking",
  "NBFC",
  "Insurance",
  "Fintech",
  "IT",
  "Telecom",
  "Energy",
  "Oil & Gas",
  "Power",
  "Renewables",
  "Auto",
  "Auto Ancillary",
  "Pharma",
  "Healthcare",
  "Biotech",
  "Consumer",
  "Retail",
  "FMCG",
  "Chemicals",
  "Paints",
  "Metals",
  "Mining",
  "Infra",
  "Capital Goods",
  "Cement",
  "Building Materials",
  "Realty",
  "Hospitality",
  "Aviation",
  "Logistics",
  "Defense",
  "Railways",
  "Textiles",
  "Media",
  "Entertainment",
  "Agri",
  "Education",
  "E-commerce",
  "Exchange",
  "Internet",
  "Utilities",
] as const;

export type CanonicalSector = typeof CANONICAL_SECTORS[number];

const ALIASES: Record<string, CanonicalSector> = {
  "Financials": "Banking",
  "Financial": "Banking",
  "Banks": "Banking",

  "Software": "IT",
  "Technology": "IT",

  "Consumer Tech": "Internet",
  "Internet Tech": "Internet",

  "Oil": "Oil & Gas",
  "Gas": "Oil & Gas",

  "Electricity": "Power",

  "Real Estate": "Realty",

  "Hospitals": "Healthcare",

  "Brokerage": "Fintech",

  "F&O": "Fintech",

  "Electricals": "Capital Goods",
  "Electronics": "Capital Goods",
  "RealEstate": "Realty",
  "Tech": "IT",
  "FinTech": "Fintech",
  "Pipes": "Chemicals",
  "Beverages": "FMCG",
  "Industrials": "Capital Goods",
  "Auto Ancillaries": "Auto Ancillary",
  "Defence": "Defense",
  "Conglomerate": "Capital Goods",

  "Transport": "Logistics",
  "Finance": "Fintech",
  "Steel": "Metals",
  "Food": "FMCG",
  "Jewellery": "Consumer",

  "Paper": "Chemicals",
  "Engineering": "Capital Goods",
  "Polymers": "Chemicals",
  "AgriTech": "Agri",
  "Jewelry": "Consumer",
  "Packaging": "Capital Goods",
};

export function normalizeSector(input?: string): CanonicalSector {
  if (!input) return "Utilities";

  const clean = input.trim();

  const exact = CANONICAL_SECTORS.find(s => s === clean);
  if (exact) return exact;

  if (ALIASES[clean]) return ALIASES[clean];

  return "Utilities";
}