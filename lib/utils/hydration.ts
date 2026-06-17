/**
 * Hydration-safe utilities for SSR/CSR compatibility
 * Prevents React hydration mismatches
 */

/**
 * Safe localStorage wrapper that works in SSR
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Fail silently in SSR
    }
  },
  
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Fail silently in SSR
    }
  }
};

/**
 * Safe window/document access
 */
export const isBrowser = typeof window !== 'undefined';
export const isServer = typeof window === 'undefined';

/**
 * Deterministic random selection based on seed
 * Prevents Math.random() hydration mismatches
 */
export function deterministicSelect<T>(array: T[], seed: number): T {
  const index = Math.abs(Math.floor(seed)) % array.length;
  return array[index];
}

/**
 * Safe date initialization for useState
 */
export function getInitialDate(): Date | null {
  return isBrowser ? new Date() : null;
}

/**
 * Cache with TTL and hydration safety
 */
export class HydrationSafeCache<T> {
  private prefix: string;
  private ttl: number;

  constructor(prefix: string, ttlMs: number = 24 * 60 * 60 * 1000) {
    this.prefix = prefix;
    this.ttl = ttlMs;
  }

  get(key: string): T | null {
    if (!isBrowser) return null;
    
    try {
      const item = safeLocalStorage.getItem(`${this.prefix}_${key}`);
      if (!item) return null;

      const parsed = JSON.parse(item);
      const now = Date.now();

      if (now - parsed.timestamp > this.ttl) {
        this.delete(key);
        return null;
      }

      return parsed.data as T;
    } catch {
      return null;
    }
  }

  set(key: string, data: T): void {
    if (!isBrowser) return;
    
    try {
      const item = {
        data,
        timestamp: Date.now()
      };
      safeLocalStorage.setItem(`${this.prefix}_${key}`, JSON.stringify(item));
    } catch {
      // Fail silently
    }
  }

  delete(key: string): void {
    if (!isBrowser) return;
    safeLocalStorage.removeItem(`${this.prefix}_${key}`);
  }
}

/**
 * Safe numeric comparison for sorting
 * Prevents NaN issues in sort operations
 */
export function safeNumericCompare(a: any, b: any, ascending: boolean = true): number {
  const aVal = Number(a) || 0;
  const bVal = Number(b) || 0;
  
  if (!Number.isFinite(aVal) && !Number.isFinite(bVal)) return 0;
  if (!Number.isFinite(aVal)) return 1;
  if (!Number.isFinite(bVal)) return -1;
  
  return ascending ? aVal - bVal : bVal - aVal;
}