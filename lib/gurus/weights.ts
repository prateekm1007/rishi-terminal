// lib/gurus/weights.ts — PUBLIC panel methodology metadata.
//
// N1 (round 3): RISHI_WEIGHT_CONFIG is display metadata (each Rishi's
// consensus weight and tier badge), rendered by the RishiGrid client
// components. It is public by design — docs/ROADMAP.md S2-01 publishes
// the full methodology — so it lives here, outside the server-only
// engine modules (lib/consensus/**). lib/consensus/weights.ts imports
// it for the engine (single source of truth maintained).

import type { RishiWeight } from '../consensus/types';

export const RISHI_WEIGHT_CONFIG: RishiWeight[] = [
  { name: 'Buffett',       weight: 3.0, tier: 'Legend'     },
  { name: 'Graham',        weight: 2.5, tier: 'Legend'     },
  { name: 'Lynch',         weight: 2.5, tier: 'Legend'     },
  { name: 'Munger',        weight: 2.0, tier: 'Master'     },
  { name: 'Damani',        weight: 2.0, tier: 'Master'     },
  { name: 'Jhunjhunwala',  weight: 2.0, tier: 'Master'     },
  { name: 'Pabrai',        weight: 2.0, tier: 'Master'     },
  { name: 'HowardMarks',   weight: 2.0, tier: 'Master'     },
  { name: 'SethKlarman',   weight: 2.0, tier: 'Master'     },
  { name: 'Soros',         weight: 2.0, tier: 'Master'     },
  { name: 'Kacholia',      weight: 1.0, tier: 'Specialist' },
  { name: 'Kedia',         weight: 1.0, tier: 'Specialist' },
  { name: 'Porinju',       weight: 1.0, tier: 'Specialist' },
  { name: 'Raamdeo',       weight: 1.0, tier: 'Specialist' },
  { name: 'Nemish',        weight: 1.0, tier: 'Specialist' },
  { name: 'Basant',        weight: 1.0, tier: 'Specialist' },
  { name: 'PhilipFisher',  weight: 1.0, tier: 'Specialist' },
  { name: 'Greenblatt',    weight: 1.0, tier: 'Specialist' },
  { name: 'Templeton',     weight: 1.0, tier: 'Specialist' },
  { name: 'Schloss',       weight: 1.0, tier: 'Specialist' },
];
