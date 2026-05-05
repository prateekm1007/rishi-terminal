'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ShareholdingPattern {
  quarter: string;
  promoter: number;
  fii: number;
  dii: number;
  public: number;
  promoterPledged: number;
}

interface Props {
  shareholdingHistory: ShareholdingPattern[];
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

export function ShareholdingChart({ shareholdingHistory }: Props) {
  const latest = shareholdingHistory[0];
  if (!latest) return null;

  const data = [
    { name: 'Promoter', value: latest.promoter },
    { name: 'FII', value: latest.fii },
    { name: 'DII', value: latest.dii },
    { name: 'Public', value: latest.public },
  ];

  return (
    <div style={{ border: '1px solid #27272a', background: '#18181b', borderRadius: 12, padding: 24 }}>
      <div style={{ fontSize: 11, color: '#71717a', fontFamily: 'monospace', letterSpacing: 2, marginBottom: 8 }}>SHAREHOLDING PATTERN — {latest.quarter}</div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="value" paddingAngle={3}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 8, fontFamily: 'monospace', fontSize: 11 }} formatter={(v: any) => `${v}%`} />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
        {data.map((d, i) => (
          <div key={d.name} style={{ background: '#09090b', borderRadius: 8, padding: 10, borderLeft: `3px solid ${COLORS[i]}` }}>
            <div style={{ fontSize: 10, color: '#71717a', fontFamily: 'monospace' }}>{d.name}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS[i], fontFamily: 'monospace' }}>{d.value}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}