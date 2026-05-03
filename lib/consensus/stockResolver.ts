import { STOCKS } from "../../data/stocks/index";
import { Stock }  from "./types";

/**
 * Pure resolver - no side effects, no mutations.
 * Returns null on miss - caller handles the 404 case.
 */
export function resolveStock(symbol: string): Stock | null {
  if (!symbol || typeof symbol !== "string") return null;
  return STOCKS[symbol.toUpperCase().trim()] ?? null;
}