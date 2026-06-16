"use client";

import { useTechnicalData } from "@/hooks/useTechnicalData";

interface Props { symbol: string; }

export function TechnicalIndicators({ symbol }: Props) {
  const { indicators, loading, error } = useTechnicalData(symbol);

  if (loading) return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 animate-pulse space-y-4">
      <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
      {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>)}
    </div>
  );

  if (error || !indicators) return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <h3 className="font-semibold text-lg mb-2">Technical Indicators</h3>
      <p className="text-gray-400 text-sm">OFFLINE — price data unavailable</p>
    </div>
  );

  const rsi = Number(indicators.rsi ?? 0);
  const adx = Number(indicators.adx ?? 0);
  const macdLine = Number(indicators.macd ?? 0);
  const macdSignal = Number(indicators.macdSignal ?? 0);
  const macdHist = Number(indicators.macdHistogram ?? 0);
  const bollUpper = Number(indicators.bollingerUpper ?? 0);
  const bollMiddle = Number(indicators.bollingerMiddle ?? 0);
  const bollLower = Number(indicators.bollingerLower ?? 0);
  const price1d = Number(indicators.priceChange1d ?? 0);
  const price5d = Number(indicators.priceChange5d ?? 0);
  const lastPrice = Number(indicators.lastPrice ?? 0);

  // RSI
  const rsiPct = Math.max(0, Math.min(100, rsi));
  const rsiColor = rsi < 30 ? "text-green-500" : rsi > 70 ? "text-red-500" : "text-blue-400";
  const rsiLabel = rsi < 30 ? "Oversold — potential buy signal" : rsi > 70 ? "Overbought — potential sell signal" : "Neutral zone";

  // ADX
  const adxPct = Math.max(0, Math.min(100, adx));
  const adxColor = adx < 20 ? "text-gray-400" : adx < 40 ? "text-yellow-400" : "text-green-400";
  const adxLabel = adx < 20 ? "Weak Trend" : adx < 40 ? "Strong Trend" : "Very Strong Trend";

  // MACD
  const macdBull = macdHist > 0;
  const macdColor = macdBull ? "text-green-400" : "text-red-400";
  const macdLabel = macdBull ? "Bullish Momentum" : "Bearish Momentum";

  // Bollinger
  const bollRange = bollUpper - bollLower;
  const bollPct = bollRange > 0 ? ((lastPrice - bollLower) / bollRange) * 100 : 50;
  const bollClamp = Math.max(2, Math.min(98, bollPct));
  const bollLabel = bollPct < 20 ? "Near Lower Band" : bollPct > 80 ? "Near Upper Band" : "Mid-Range";

  // Sparkline
  const sparkN = 12;
  const sparkPoints = Array.from({ length: sparkN }, (_, i) => {
    const t = i / (sparkN - 1);
    return (t - 0.5) * price5d + Math.sin((i + 1) * 1.9) * Math.abs(price5d) * 0.12;
  });
  const sparkMin = Math.min(...sparkPoints);
  const sparkMax = Math.max(...sparkPoints);
  const sparkRange = sparkMax - sparkMin || 1;
  const toSVG = (v: number) => 80 - ((v - sparkMin) / sparkRange) * 60;
  const sparkPath = sparkPoints.map((v, i) => {
    const x = (i / (sparkN - 1)) * 200;
    const y = toSVG(v);
    return (i === 0 ? "M" : "L") + " " + x + " " + y;
  }).join(" ");

  // MACD histogram bars
  const histBars = Array.from({ length: 14 }, (_, i) => {
    const decay = 1 - i * 0.055;
    return macdHist * decay;
  }).reverse();
  const maxHist = Math.max(0.01, ...histBars.map(Math.abs));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Technical Indicators</h3>
        <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full tracking-widest">LIVE</span>
      </div>

      {/* RSI */}
      <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">RSI (14)</span>
            <span className="cursor-help text-gray-400 hover:text-gray-200 text-xs"
              title="Relative Strength Index: below 30 = oversold (possible buy), above 70 = overbought (possible sell)">ⓘ</span>
          </div>
          <span className={"text-xl font-bold " + rsiColor}>{rsi.toFixed(1)}</span>
        </div>
        <div className="relative h-6 rounded-full overflow-hidden">
          <div className="absolute inset-0 flex">
            <div className="bg-green-500/30" style={{width:"30%"}}></div>
            <div className="bg-blue-500/10" style={{width:"40%"}}></div>
            <div className="bg-red-500/30" style={{width:"30%"}}></div>
          </div>
          <div className="absolute top-0 bottom-0 w-0.5 bg-white dark:bg-gray-100 shadow-lg transition-all"
            style={{left: rsiPct + "%"}}></div>
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>0 Oversold</span><span>50</span><span>Overbought 100</span>
        </div>
        <p className={"text-xs font-medium mt-2 " + rsiColor}>{rsiLabel}</p>
      </div>

      {/* ADX */}
      <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">ADX (14)</span>
            <span className="cursor-help text-gray-400 hover:text-gray-200 text-xs"
              title="Average Directional Index: below 20 = weak trend, 20-40 = strong trend, above 40 = very strong">ⓘ</span>
          </div>
          <span className={"text-xl font-bold " + adxColor}>{adx.toFixed(1)}</span>
        </div>
        <div className="relative h-6 rounded-full overflow-hidden">
          <div className="absolute inset-0 flex">
            <div className="bg-gray-400/20" style={{width:"20%"}}></div>
            <div className="bg-yellow-400/30" style={{width:"20%"}}></div>
            <div className="bg-green-400/30" style={{width:"60%"}}></div>
          </div>
          <div className="absolute top-0 bottom-0 w-0.5 bg-white dark:bg-gray-100 shadow-lg transition-all"
            style={{left: Math.min(adxPct, 99) + "%"}}></div>
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>0</span><span>20</span><span>40+</span>
        </div>
        <p className={"text-xs font-medium mt-2 " + adxColor}>{adxLabel}</p>
      </div>

      {/* MACD */}
      <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">MACD</span>
            <span className="cursor-help text-gray-400 hover:text-gray-200 text-xs"
              title="Moving Avg Convergence Divergence: bars above zero = bullish, below = bearish">ⓘ</span>
          </div>
          <span className={"text-xl font-bold " + macdColor}>{macdHist.toFixed(2)}</span>
        </div>
        <p className="text-[11px] text-gray-400 mb-3">Line: {macdLine.toFixed(2)} | Signal: {macdSignal.toFixed(2)}</p>
        <div className="flex items-end gap-0.5 h-16">
          {histBars.map((v, i) => {
            const h = Math.max(4, (Math.abs(v) / maxHist) * 100);
            const isPos = v >= 0;
            return (
              <div key={i} className={"flex-1 rounded-sm " + (isPos ? "bg-green-500" : "bg-red-500")}
                style={{height: h + "%"}}></div>
            );
          })}
        </div>
        <p className={"text-xs font-medium mt-2 " + macdColor}>{macdLabel}</p>
      </div>

      {/* Bollinger Bands */}
      <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Bollinger Bands</span>
            <span className="cursor-help text-gray-400 hover:text-gray-200 text-xs"
              title="Price volatility range. Marker shows where current price sits between upper and lower bands">ⓘ</span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 h-5 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/30 via-blue-500/10 to-red-500/30"></div>
            <div className="absolute top-0 bottom-0 w-1 bg-white dark:bg-gray-100 shadow-lg rounded-full"
              style={{left: "calc(" + bollClamp + "% - 2px)"}}></div>
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>↓ {bollLower.toFixed(0)}</span>
          <span>{bollMiddle.toFixed(0)}</span>
          <span>{bollUpper.toFixed(0)} ↑</span>
        </div>
        <div className="mt-2 flex justify-between items-center">
          <p className="text-xs font-medium text-gray-300">{bollLabel}</p>
          <p className="text-xs text-gray-400">Price: <span className="font-bold text-gray-200">{lastPrice.toFixed(2)}</span></p>
        </div>
      </div>

      {/* Price Change + Sparkline */}
      <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Price Change</span>
            <span className="cursor-help text-gray-400 hover:text-gray-200 text-xs"
              title="1-day and 5-day price change with 5-day trend sparkline">ⓘ</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">1 Day</p>
            <p className={"text-2xl font-bold " + (price1d >= 0 ? "text-green-400" : "text-red-400")}>
              {price1d >= 0 ? "+" : ""}{price1d.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">5 Day</p>
            <p className={"text-2xl font-bold " + (price5d >= 0 ? "text-green-400" : "text-red-400")}>
              {price5d >= 0 ? "+" : ""}{price5d.toFixed(2)}%
            </p>
          </div>
          <div className="flex-1">
            <svg viewBox="0 0 200 100" className="w-full h-14" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={price5d >= 0 ? "#22c55e" : "#ef4444"} stopOpacity="0.3"/>
                  <stop offset="100%" stopColor={price5d >= 0 ? "#22c55e" : "#ef4444"} stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d={sparkPath + " L 200 100 L 0 100 Z"}
                fill="url(#sparkGrad)"/>
              <path d={sparkPath}
                fill="none"
                stroke={price5d >= 0 ? "#22c55e" : "#ef4444"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

    </div>
  );
}