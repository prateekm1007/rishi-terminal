// TICKER_REGISTRY_V1

import { STOCKS } from "../../data/stocks";
import { normalizeSector } from "./sectors";

export interface RegistryIssue {
  symbol: string;
  severity: "warning" | "error";
  reason: string;
}

export interface RegistryEntry {
  symbol: string;
  name: string;
  sector: string;
  exchange: string;
  valid: boolean;
  issues: RegistryIssue[];
}

const VALID_SYMBOL = /^[A-Z0-9&_-]{2,25}$/;

export function buildTickerRegistry(): RegistryEntry[] {
  const symbols = Object.keys(STOCKS);

  return symbols.map(symbol => {
    const stock = STOCKS[symbol];

    const issues: RegistryIssue[] = [];

    if (!VALID_SYMBOL.test(symbol)) {
      issues.push({
        symbol,
        severity: "error",
        reason: "Invalid symbol format",
      });
    }

    if (!stock.name || stock.name.length < 2) {
      issues.push({
        symbol,
        severity: "error",
        reason: "Missing/invalid company name",
      });
    }

    if (!stock.price || stock.price <= 0) {
      issues.push({
        symbol,
        severity: "warning",
        reason: "Invalid price",
      });
    }

    if (!stock.sector) {
      issues.push({
        symbol,
        severity: "warning",
        reason: "Missing sector",
      });
    }

    const normalizedSector = normalizeSector(stock.sector);

    if (normalizedSector === "Utilities" && stock.sector !== "Utilities") {
      issues.push({
        symbol,
        severity: "warning",
        reason: `Unknown sector mapped to Utilities: ${stock.sector}`,
      });
    }

    return {
      symbol,
      name: stock.name,
      sector: normalizedSector,
      exchange: stock.exchange || "NSE",
      valid: issues.filter(i => i.severity === "error").length === 0,
      issues,
    };
  });
}

export function detectDuplicateSymbols(): string[] {
  const symbols = Object.keys(STOCKS);

  return symbols.filter((s, i) => symbols.indexOf(s) !== i);
}

export function registryHealthScore(): number {
  const entries = buildTickerRegistry();

  const total = entries.length;
  const valid = entries.filter(e => e.valid).length;

  return Math.round((valid / total) * 100);
}