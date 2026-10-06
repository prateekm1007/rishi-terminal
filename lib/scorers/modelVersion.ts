// lib/scorers/modelVersion.ts (round 20) — the Short Radar model identity
// (contract section 5, v2-4). Isomorphic: no server-only import — the UI
// renders the version alongside the status line.

export const QVPS_SHORT_MODEL = {
  id: "qvps-short",
  version: 2,
} as const;

export type QvpsShortModel = typeof QVPS_SHORT_MODEL;
