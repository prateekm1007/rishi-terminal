// Security: Input validation for stock symbols
const VALID_SYMBOL_REGEX = /^[A-Z]{1,10}$/;
const VALID_EXCHANGES = ['NSE', 'BSE', 'NYSE', 'NASDAQ'];

export function validateSymbol(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') return false;
  return VALID_SYMBOL_REGEX.test(symbol.toUpperCase());
}

export function sanitizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10);
}

export function validateExchange(exchange: string): boolean {
  return VALID_EXCHANGES.includes(exchange.toUpperCase());
}

// Rate limiting (client-side basic protection)
const requestLog: number[] = [];
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 60;

export function checkRateLimit(): boolean {
  const now = Date.now();
  // Remove requests older than 1 minute
  while (requestLog.length > 0 && requestLog[0] < now - RATE_LIMIT_WINDOW) {
    requestLog.shift();
  }
  
  if (requestLog.length >= MAX_REQUESTS) {
    return false; // Rate limit exceeded
  }
  
  requestLog.push(now);
  return true;
}