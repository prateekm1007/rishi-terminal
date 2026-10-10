// lib/gurus/weights.ts — PUBLIC panel methodology metadata.
//
// N1 (round 3): RISHI_WEIGHT_CONFIG is display metadata (each Rishi's
// consensus weight and tier badge), rendered by the RishiGrid client
// components. It is public by design — docs/ROADMAP.md S2-01 publishes
// the full methodology — so it lives here, outside the server-only
// engine modules (lib/consensus/**). lib/consensus/weights.ts imports
// it for the engine (single source of truth maintained).
//
// RISHI-COUNT (2026-10-10) — the documented 20-vs-21 boundary:
// the SCORING COUNCIL is 20 personas; the /rishis ROSTER is 21 (the
// full registry, since chanos/soros got marketing cards). The ONE
// persona on the roster but not in the council is CHANOS: he is a chat
// persona, not a scorer — his short-side forensic methodology has no
// long-only scoring implementation. Soros IS a council member (weight
// 2.0, Master). This membership is a METHODOLOGY decision, pinned by
// test/rishiCount.unification.test.ts (registry-minus-council must be
// exactly {chanos}); adding chanos as a scorer is a separate
// methodology change that rides in its own PR with the founder, never
// inside a display fix.

import type { RishiWeight } from '../consensus/types';

export const RISHI_WEIGHT_CONFIG: RishiWeight[] = [
  { name: 'Buffett',       weight: 3.0, tier: 'Legend'     },
  { name: 'Graham',        weight: 2.5, tier: 'Legend'     },
  { name: 'Lynch',         weight: 2.5, tier: 'Legend'     },
  { name: 'Munger',        weight: 2.0, tier: 'Master'     },
  { name: 'Damani',        weight: 2.0, tier: 'Master'     },
  { name: 'Jhunjhunwala',  weight: 2.0, tier: 'Master'     },
  { name: 'Pabrai',        weight: 2.0, tier: 'Master'     },
  { name: 'Howard Marks',  weight: 2.0, tier: 'Master'     },
  { name: 'Seth Klarman',  weight: 2.0, tier: 'Master'     },
  { name: 'Soros',         weight: 2.0, tier: 'Master'     },
  { name: 'Kacholia',      weight: 1.0, tier: 'Specialist' },
  { name: 'Kedia',         weight: 1.0, tier: 'Specialist' },
  { name: 'Porinju',       weight: 1.0, tier: 'Specialist' },
  { name: 'Raamdeo',       weight: 1.0, tier: 'Specialist' },
  { name: 'Nemish',        weight: 1.0, tier: 'Specialist' },
  { name: 'Basant',        weight: 1.0, tier: 'Specialist' },
  { name: 'Philip Fisher', weight: 1.0, tier: 'Specialist' },
  { name: 'Greenblatt',    weight: 1.0, tier: 'Specialist' },
  { name: 'John Templeton',weight: 1.0, tier: 'Specialist' },
  { name: 'Walter Schloss',weight: 1.0, tier: 'Specialist' },
];
