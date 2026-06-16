"use client";

import { useTechnicalData } from "@/hooks/useTechnicalData";

interface Props {
  symbol: string;
}

export function TechnicalIndicators({ symbol }: Props) {
  const { indicators, loading, error } = useTechnicalData(symbol);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Technical Indicators</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !indicators) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Technical Indicators</h3>
        <p className="text-gray-500 dark:text-gray-400">OFFLINE - Price data unavailable</p>
      </div>
    );
  }

  const rsi = Number(indicators.rsi ?? 0);
  const adx = Number(indicators.adx ?? 0);

  const macdLine = Number(indicators.macd ?? 0);
  const macdSignal = Number(indicators.macdSignal ?? 0);
  const macdHistogram = Number(indicators.macdHistogram ?? 0);

  const bollUpper = Number(indicators.bollingerUpper ?? 0);
  const bollMiddle = Number(indicators.bollingerMiddle ?? 0);
  const bollLower = Number(indicators.bollingerLower ?? 0);

  const priceChange1d = Number(indicators.priceChange1d ?? 0);
  const priceChange5d = Number(indicators.priceChange5d ?? 0);

  const currentPrice = Number(indicators.lastPrice ?? 0);

  # RSI zones
  const rsiColor = rsi < 30 ? "text-green-600" : rsi > 70 ? "text-red-600" : "text-blue-600";
  const rsiLabel = rsi < 30 ? "Oversold" : rsi > 70 ? "Overbought" : "Neutral";

  # ADX zones
  const adxColor = adx < 20 ? "text-gray-500" : adx < 40 ? "text-yellow-600" : "text-green-600";
  const adxLabel = adx < 20 ? "Weak Trend" : adx < 40 ? "Strong Trend" : "Very Strong";

  # MACD
  const macdMomentum = macdHistogram > 0 ? "Bullish Momentum" : "Bearish Momentum";
  const macdColor = macdHistogram > 0 ? "text-green-600" : "text-red-600";

  # Bollinger position
  const bollPct =
    bollUpper > bollLower
      ? ((currentPrice - bollLower) / (bollUpper - bollLower)) * 100
      : 50;
  const bollPosition =
    bollPct < 20 ? "Near Lower Band" : bollPct > 80 ? "Near Upper Band" : "Mid-Range";

  # deterministic sparkline (no randomness)
  const sparkN = 14;
  const sparkData = Array.from({ length: sparkN }, (_, i) => {
    const t = i / (sparkN - 1);
    const base = (t - 0.5) * priceChange5d;
    const wiggle = Math.sin((i + 1) * 1.7) * (Math.abs(priceChange5d) + 1) * 0.08;
    return base + wiggle;
  });
  const maxSpark = Math.max(1, ...sparkData.map((v) => Math.abs(v)));
  const sparkPath = sparkData
    .map((v, i) => {
      const x = (i / (sparkN - 1)) * 100;
      const y = 50 - (v / maxSpark) * 40;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        Technical Indicators
        <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">LIVE</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* RSI Gauge */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">RSI (14)</span>
              <button className="text-gray-400 hover:text-gray-600 text-xs" title="RSI: <30 oversold, >70 overbought">ⓘ</button>
            </div>
            <span className={`font-bold ${rsiColor}`}>{rsi.toFixed(1)}</span>
          </div>

          <div className="relative h-8 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="absolute inset-0 flex">
              <div className="w-[30%] bg-green-200 dark:bg-green-900/30"></div>
              <div className="w-[40%] bg-blue-100 dark:bg-blue-900/20"></div>
              <div className="w-[30%] bg-red-200 dark:bg-red-900/30"></div>
            </div>
            <div
              className="absolute top-0 bottom-0 w-1 bg-black dark:bg-white"
              style={{ left: `${Math.max(0, Math.min(100, rsi))}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span><span>50</span><span>100</span>
          </div>
          <div className={`text-sm font-medium mt-2 ${rsiColor}`}>{rsiLabel}</div>
        </div>

        {/* ADX Gauge */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">ADX (14)</span>
              <button className="text-gray-400 hover:text-gray-600 text-xs" title="ADX: <20 weak, 20-40 strong, >40 very strong">ⓘ</button>
            </div>
            <span className={`font-bold ${adxColor}`}>{adx.toFixed(1)}</span>
          </div>

          <div className="relative h-8 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="absolute inset-0 flex">
              <div className="w-[20%] bg-gray-300 dark:bg-gray-600"></div>
              <div className="w-[20%] bg-yellow-200 dark:bg-yellow-900/30"></div>
              <div className="w-[60%] bg-green-200 dark:bg-green-900/30"></div>
            </div>
            <div
              className="absolute top-0 bottom-0 w-1 bg-black dark:bg-white"
              style={{ left: `${Math.max(0, Math.min(100, adx))}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span><span>20</span><span>40+</span>
          </div>
          <div className={`text-sm font-medium mt-2 ${adxColor}`}>{adxLabel}</div>
        </div>

        {/* MACD Histogram */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">MACD</span>
              <button className="text-gray-400 hover:text-gray-600 text-xs" title="MACD Histogram: >0 bullish momentum, <0 bearish">ⓘ</button>
            </div>
            <span className={`font-bold ${macdColor}`}>{macdHistogram.toFixed(2)}</span>
          </div>

          <div className="text-xs text-gray-500 mb-2">
            Line: {macdLine.toFixed(2)} | Signal: {macdSignal.toFixed(2)}
          </div>

          <div className="flex items-end justify-around h-16 gap-1">
            {Array.from({ length: 14 }, (_, i) => {
              const val = macdHistogram * (1 - i * 0.06);
              const denom = Math.max(1, Math.abs(macdLine), Math.abs(macdSignal), Math.abs(macdHistogram));
              const h = Math.max(6, (Math.abs(val) / denom) * 100);
              const cls = val >= 0 ? "bg-green-500" : "bg-red-500";
              return <div key={i} className={`w-full ${cls} rounded-t`} style={{ height: `${h}%` }} />;
            })}
          </div>

          <div className={`text-sm font-medium mt-2 ${macdColor}`}>{macdMomentum}</div>
        </div>

        {/* Bollinger Bands Slider */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Bollinger Bands</span>
              <button className="text-gray-400 hover:text-gray-600 text-xs" title="Shows volatility range; marker shows current price position">ⓘ</button>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="relative h-32 w-14 bg-gradient-to-b from-red-100 via-blue-100 to-green-100 dark:from-red-900/20 dark:via-blue-900/20 dark:to-green-900/20 rounded">
              <div className="absolute inset-x-0 top-1 text-[10px] text-center text-gray-600 dark:text-gray-300">↑{bollUpper.toFixed(0)}</div>
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-[10px] text-center text-gray-600 dark:text-gray-300">{bollMiddle.toFixed(0)}</div>
              <div className="absolute inset-x-0 bottom-1 text-[10px] text-center text-gray-600 dark:text-gray-300">↓{bollLower.toFixed(0)}</div>

              <div
                className="absolute left-0 right-0 h-1 bg-black dark:bg-white"
                style={{ top: `${Math.max(0, Math.min(100, 100 - bollPct))}%` }}
              />
            </div>

            <div className="flex-1">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Current: <span className="font-bold">{currentPrice.toFixed(2)}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{bollPosition}</div>
            </div>
          </div>
        </div>

        {/* Price Change + Sparkline */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Price Change</span>
            <button className="text-gray-400 hover:text-gray-600 text-xs" title="1D + 5D change with mini trend line">ⓘ</button>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <div className="text-xs text-gray-500">1 Day</div>
              <div className={`text-2xl font-bold ${priceChange1d >= 0 ? "text-green-600" : "text-red-600"}`}>
                {priceChange1d >= 0 ? "+" : ""}{priceChange1d.toFixed(2)}%
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <div>
                <div className="text-xs text-gray-500 text-right">5 Day</div>
                <div className={`text-2xl font-bold text-right ${priceChange5d >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {priceChange5d >= 0 ? "+" : ""}{priceChange5d.toFixed(2)}%
                </div>
              </div>

              <svg viewBox="0 0 100 100" className="w-24 h-12">
                <path
                  d={sparkPath}
                  fill="none"
                  stroke={priceChange5d >= 0 ? "#16a34a" : "#dc2626"}
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}