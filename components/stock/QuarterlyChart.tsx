'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface QuarterlyResult {
  quarter: string;
  revenue: number;
  netProfit: number;
  opm: number;
}

interface Props {
  quarterlyResults: QuarterlyResult[];
}

export function QuarterlyChart({ quarterlyResults }: Props) {
  return (
    <div style={{ border: '1px solid #27272a', background: '#18181b', borderRadius: 12, padding: 24 }}>
      <div style={{ fontSize: 11, color: '#71717a', fontFamily: 'monospace', letterSpacing: 2, marginBottom: 8 }}>QUARTERLY RESULTS</div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={quarterlyResults} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="quarter" stroke="#3f3f46" tick={{ fontSize: 10, fill: '#71717a' }} />
            <YAxis stroke="#3f3f46" tick={{ fontSize: 10, fill: '#71717a' }} />
            <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 8, fontFamily: 'monospace', fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
            <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4,4,0,0]} />
            <Bar dataKey="netProfit" fill="#10b981" name="Net Profit" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
        {quarterlyResults.slice(0,3).map(q => (
          <div key={q.quarter} style={{ background: '#09090b', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, color: '#71717a', fontFamily: 'monospace' }}>{q.quarter}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>{q.netProfit.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: '#71717a' }}>OPM: {q.opm}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}