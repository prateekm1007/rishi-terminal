// TICKER_REGISTRY_V1

import { STOCKS } from "../../data/stocks";
import { normalizeSector } from "./sectors";
import aliasMapRaw from "./tickerAliases.json";

/**
 * oldSymbol -> canonicalSymbol (remediation T12). Built from per-group
 * decisions against the currently trading NSE symbols; see the remediation
 * PR table for the evidence per group.
 */
export const TICKER_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(aliasMapRaw).filter(([k]) => !k.startsWith("$")),
);

/** Normalize a ticker key the way the seed data does for identity checks. */
export function normalizeTicker(symbol: string): string {
  return symbol
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Resolve any ticker (current, renamed or mangled legacy symbol) to the
 * canonical registry symbol. Returns null for unknown symbols.
 * Handles chained aliases and is safe for arbitrary user input.
 */
export function resolveTickerSymbol(symbol: string): string | null {
  if (!symbol || typeof symbol !== "string") return null;
  let sym = symbol.trim().toUpperCase();
  if (!sym) return null;
  if (STOCKS[sym]) return sym;

  const seen = new Set<string>([sym]);
  // Direct alias hops
  while (TICKER_ALIASES[sym] && !seen.has(TICKER_ALIASES[sym])) {
    sym = TICKER_ALIASES[sym];
    seen.add(sym);
    if (STOCKS[sym]) return sym;
  }
  // Mangled-ampersand forms (e.g. MANDM for M&M) via normalized identity
  const target = normalizeTicker(sym);
  for (const candidate of Object.keys(STOCKS)) {
    if (normalizeTicker(candidate) === target) return candidate;
  }
  return null;
}

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