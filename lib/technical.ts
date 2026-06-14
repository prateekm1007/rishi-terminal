// lib/technical.ts
// Real technical indicators computed from OHLCV data

export interface TechnicalIndicators {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  adx: number; // approximated via trend strength
  priceChange1d: number;
  priceChange5d: number;
  volumeSMA: number;
  lastPrice: number;
}

/** Calculate RSI for given period (default 14) */
function computeRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50; // fallback
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Calculate MACD (12,26,9) */
function computeMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  if (closes.length < 35) return { macd: 0, signal: 0, histogram: 0 };

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12 - ema26;

  // Signal line: 9-period EMA of MACD line
  const macdSeries: number[] = [];
  // We need to compute MACD for last 9 periods to get signal.
  // Approximate: single point MACD signal from last N closes.
  // Better: compute MACD for each day in last 9 days.
  const len = closes.length;
  const values: number[] = [];
  for (let i = len - 9; i < len; i++) {
    const slice = closes.slice(0, i + 1);
    const e12 = ema(slice, 12);
    const e26 = ema(slice, 26);
    values.push(e12 - e26);
  }
  const signal = values.length > 0 ? simpleMovingAverage(values, 9) : macdLine;
  return {
    macd: Number(macdLine.toFixed(4)),
    signal: Number(signal.toFixed(4)),
    histogram: Number((macdLine - signal).toFixed(4)),
  };
}

function ema(data: number[], period: number): number {
  if (data.length < period) return simpleMovingAverage(data, data.length);
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

function simpleMovingAverage(data: number[], period: number): number {
  if (data.length < period) return data.reduce((a, b) => a + b, 0) / data.length;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/** Bollinger Bands (20,2) */
function computeBollinger(closes: number[]): { upper: number; middle: number; lower: number } {
  if (closes.length < 20) {
    const price = closes[closes.length - 1] || 100;
    return { upper: price * 1.05, middle: price, lower: price * 0.95 };
  }
  const period = 20;
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const squaredDiffs = slice.map(v => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(variance);
  return {
    upper: Number((mean + 2 * std).toFixed(2)),
    middle: Number(mean.toFixed(2)),
    lower: Number((mean - 2 * std).toFixed(2)),
  };
}

/** Approximate ADX using directional movement over 14 days */
function computeADX(highs: number[], lows: number[], closes: number[]): number {
  if (closes.length < 15) return 20;
  const period = 14;
  const trVals: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = closes.length - period; i < closes.length; i++) {
    const h = highs[i], l = lows[i], prevC = closes[i - 1];
    const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    trVals.push(tr);
    plusDM.push((h - highs[i - 1]) > (lows[i - 1] - l) ? Math.max(h - highs[i - 1], 0) : 0);
    minusDM.push((lows[i - 1] - l) > (h - highs[i - 1]) ? Math.max(lows[i - 1] - l, 0) : 0);
  }

  const atr = trVals.reduce((a, b) => a + b, 0) / period;
  const plusDI = plusDM.reduce((a, b) => a + b, 0) / period / atr * 100;
  const minusDI = minusDM.reduce((a, b) => a + b, 0) / period / atr * 100;
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
  return Number(dx.toFixed(1));
}

export function computeIndicators(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[]
): TechnicalIndicators {
  const rsi = computeRSI(closes);
  const { macd, signal, histogram } = computeMACD(closes);
  const bollinger = computeBollinger(closes);
  const adx = computeADX(highs, lows, closes);
  const lastPrice = closes[closes.length - 1] || 0;
  const priceChange1d = closes.length >= 2 ? ((lastPrice - closes[closes.length - 2]) / closes[closes.length - 2]) * 100 : 0;
  const priceChange5d = closes.length >= 6 ? ((lastPrice - closes[closes.length - 6]) / closes[closes.length - 6]) * 100 : 0;
  const volumeSMA = volumes.length >= 20 ? simpleMovingAverage(volumes, 20) : (volumes.length > 0 ? simpleMovingAverage(volumes, volumes.length) : 0);

  return {
    rsi: Number(rsi.toFixed(1)),
    macd,
    macdSignal: signal,
    macdHistogram: histogram,
    bollingerUpper: bollinger.upper,
    bollingerMiddle: bollinger.middle,
    bollingerLower: bollinger.lower,
    adx,
    priceChange1d: Number(priceChange1d.toFixed(2)),
    priceChange5d: Number(priceChange5d.toFixed(2)),
    volumeSMA: Number(volumeSMA.toFixed(0)),
    lastPrice,
  };
}