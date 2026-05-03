"use client";
import { RishiScore } from "../../lib/consensus/types";

interface Props {
  scores: RishiScore[];
}

const RADAR_RISHIS = [
  "Buffett",
  "Graham",
  "Lynch",
  "Damani",
  "Munger",
  "Pabrai",
  "HowardMarks",
  "Greenblatt",
];

const SIZE    = 300;
const CENTER  = SIZE / 2;
const RADIUS  = 110;
const LEVELS  = 4;

function polarToXY(angleDeg: number, r: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CENTER + r * Math.cos(rad), CENTER + r * Math.sin(rad)];
}

export function PhilosophyRadar({ scores }: Props) {
  const scoreMap: Record<string, number> = {};
  for (const s of scores) scoreMap[s.name] = s.score;

  const n     = RADAR_RISHIS.length;
  const step  = 360 / n;

  const dataPoints = RADAR_RISHIS.map((name, i) => {
    const score = scoreMap[name] ?? 0;
    const r     = (score / 100) * RADIUS;
    return polarToXY(i * step, r);
  });

  const polygonPoints = dataPoints.map(([x, y]) => `${x},${y}`).join(" ");

  const axisLines = RADAR_RISHIS.map((name, i) => {
    const [x, y] = polarToXY(i * step, RADIUS);
    const [lx, ly] = polarToXY(i * step, RADIUS + 22);
    return { x, y, lx, ly, name };
  });

  const levelPolygons = Array.from({ length: LEVELS }, (_, lvl) => {
    const r = ((lvl + 1) / LEVELS) * RADIUS;
    return RADAR_RISHIS.map((_, i) => {
      const [x, y] = polarToXY(i * step, r);
      return `${x},${y}`;
    }).join(" ");
  });

  return (
    <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-6">
      <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">
        Philosophy Radar — 8 Key Rishis
      </p>
      <div className="flex justify-center">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-label="Philosophy radar chart showing scores for 8 key Rishis"
          role="img"
        >
          {/* Grid levels */}
          {levelPolygons.map((pts, i) => (
            <polygon
              key={i}
              points={pts}
              fill="none"
              stroke="#27272a"
              strokeWidth="1"
            />
          ))}

          {/* Axis lines */}
          {axisLines.map(({ x, y, lx, ly, name }) => (
            <g key={name}>
              <line
                x1={CENTER} y1={CENTER}
                x2={x}      y2={y}
                stroke="#3f3f46"
                strokeWidth="1"
              />
              <text
                x={lx} y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fill="#71717a"
                fontFamily="monospace"
              >
                {name}
              </text>
            </g>
          ))}

          {/* Data polygon */}
          <polygon
            points={polygonPoints}
            fill="rgba(16, 185, 129, 0.15)"
            stroke="#10b981"
            strokeWidth="1.5"
          />

          {/* Data points */}
          {dataPoints.map(([x, y], i) => (
            <circle
              key={i}
              cx={x} cy={y}
              r="3"
              fill="#10b981"
              stroke="#064e3b"
              strokeWidth="1"
            />
          ))}

          {/* Center dot */}
          <circle cx={CENTER} cy={CENTER} r="2" fill="#3f3f46" />
        </svg>
      </div>
    </div>
  );
}