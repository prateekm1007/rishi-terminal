'use client';
import { useState } from 'react';
import { ComposedChart, Area, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  symbol: string;
  currentPrice: number;
}

const generateData = (timeframe: string, currentPrice: number) => {
  const basePrice = currentPrice * 0.85;
  const dataPoints: { date: string; price: number; volume: number; sma20: number; sma50: number }[] = [];
  
  const configs: Record<string, { count: number; dateFormat: (i: number) => string }> = {
    '1M': { count: 22, dateFormat: (i) => `D${i + 1}` },
    '3M': { count: 66, dateFormat: (i) => `W${Math.floor(i / 5) + 1}` },
    '6M': { count: 26, dateFormat: (i) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][Math.floor(i / 4)] || `M${i}` },
    '1Y': { count: 52, dateFormat: (i) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Math.floor(i / 4)] || `W${i}` },
    'ALL': { count: 100, dateFormat: (i) => `${2022 + Math.floor(i / 12)}-${(i % 12) + 1}` },
  };

  const config = configs[timeframe] || configs['6M'];
  
  for (let i = 0; i < config.count; i++) {
    const trend = (i / config.count) * 0.15;
    const volatility = (Math.sin(i * 0.3) * 0.05) + (Math.random() * 0.03 - 0.015);
    const price = Math.round(basePrice * (1 + trend + volatility));
    const volume = Math.floor(5000000 + Math.random() * 5000000);
    
    const sma20 = i >= 20 
      ? Math.round(dataPoints.slice(i - 20, i).reduce((sum, d) => sum + d.price, price) / 21)
      : price;
    const sma50 = i >= 50 
      ? Math.round(dataPoints.slice(i - 50, i).reduce((sum, d) => sum + d.price, price) / 51)
      : price * 0.98;
    
    dataPoints.push({
      date: config.dateFormat(i),
      price,
      volume,
      sma20,
      sma50,
    });
  }

  return dataPoints.filter((_, i) => i % Math.max(1, Math.floor(config.count / 30)) === 0 || i === config.count - 1);
};

export function PriceChart({ symbol, currentPrice }: Props) {
  const [timeframe, setTimeframe] = useState('6M');
  const data = generateData(timeframe, currentPrice);

  const change = ((data[data.length - 1].price - data[0].price) / data[0].price) * 100;
  const isPositive = change >= 0;

  return (
    <div style={{ border: '1px solid #27272a', background: '#18181b', borderRadius: 12, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#71717a', fontFamily: 'monospace', letterSpacing: 2 }}>PRICE CHART — {symbol}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', fontFamily: 'monospace', marginTop: 4 }}>
            {currentPrice.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 13, color: isPositive ? '#10b981' : '#ef4444', fontFamily: 'monospace', marginTop: 4 }}>
            {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}% ({timeframe})
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          {['1M', '3M', '6M', '1Y', 'ALL'].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                padding: '6px 14px',
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 600,
                borderRadius: 6,
                border: '1px solid',
                borderColor: timeframe === tf ? '#10b981' : '#3f3f46',
                background: timeframe === tf ? '#10b98120' : '#09090b',
                color: timeframe === tf ? '#10b981' : '#71717a',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              stroke="#3f3f46" 
              tick={{ fontSize: 11, fill: '#71717a' }} 
              interval={Math.max(0, Math.floor(data.length / 8))}
            />
            <YAxis yAxisId="price" stroke="#3f3f46" tick={{ fontSize: 11, fill: '#71717a' }} />
            <YAxis yAxisId="volume" orientation="right" stroke="#3f3f46" tick={{ fontSize: 10, fill: '#52525b' }} />
            <Tooltip 
              contentStyle={{ 
                background: '#09090b', 
                border: '1px solid #27272a', 
                borderRadius: 8, 
                fontFamily: 'monospace',
                fontSize: 11
              }} 
            />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
            
            <Bar yAxisId="volume" dataKey="volume" fill="#3f3f4650" name="Volume" />
            <Line yAxisId="price" type="monotone" dataKey="sma20" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="SMA 20" />
            <Line yAxisId="price" type="monotone" dataKey="sma50" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="SMA 50" />
            <Area 
              yAxisId="price" 
              type="monotone" 
              dataKey="price" 
              stroke={isPositive ? "#10b981" : "#ef4444"} 
              strokeWidth={2} 
              fill="url(#colorPrice)" 
              name="Price" 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { label: 'Open', value: data[0].price },
          { label: 'High', value: Math.max(...data.map(d => d.price)) },
          { label: 'Low', value: Math.min(...data.map(d => d.price)) },
          { label: `${timeframe} High`, value: Math.max(...data.map(d => d.price)) },
          { label: `${timeframe} Low`, value: Math.min(...data.map(d => d.price)) },
        ].map(item => (
          <div key={item.label} style={{ background: '#09090b', padding: 10, borderRadius: 6 }}>
            <div style={{ fontSize: 9, color: '#52525b', fontFamily: 'monospace' }}>{item.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e4e4e7', fontFamily: 'monospace', marginTop: 2 }}>
              {item.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}