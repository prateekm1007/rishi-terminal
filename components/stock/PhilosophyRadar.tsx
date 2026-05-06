'use client';

import { RishiScore } from '../../lib/types';
import dynamic from 'next/dynamic';

const RadarChart    = dynamic(() => import('recharts').then(m => m.RadarChart),    { ssr: false });
const Radar         = dynamic(() => import('recharts').then(m => m.Radar),         { ssr: false });
const PolarGrid     = dynamic(() => import('recharts').then(m => m.PolarGrid),     { ssr: false });
const PolarAngleAxis = dynamic(() => import('recharts').then(m => m.PolarAngleAxis), { ssr: false });
const PolarRadiusAxis = dynamic(() => import('recharts').then(m => m.PolarRadiusAxis), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });

interface Props {
  scores: RishiScore[];
}

export function PhilosophyRadar({ scores }: Props) {
  if (!scores || scores.length === 0) return null;

  const data = scores.slice(0, 8).map(s => ({
    name: s.name.length > 8 ? s.name.substring(0, 8) : s.name,
    value: s.score,
  }));

  return (
    <div className="card-sacred p-6">
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: 'var(--text-primary)' }}>
        Philosophy Radar
      </div>
      <div style={{ width: '100%', height: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="rgba(255,215,0,0.1)" />
            <PolarAngleAxis dataKey="name" stroke="#71767B" tick={{ fontSize: 11, fill: '#71767B' }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="rgba(255,215,0,0.15)" tick={{ fontSize: 9 }} />
            <Radar name="Score" dataKey="value" stroke="#FFD700" fill="#FFD700" fillOpacity={0.15} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px' }}>
        Top 8 Rishis • Distance from center = conviction strength
      </div>
    </div>
  );
}