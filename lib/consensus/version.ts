/**
 * Version tag of the consensus scoring engine (remediation T10.5).
 *
 * Persisted with every rishiMemory snapshot so historical scores stay
 * comparable across engine changes. Bump whenever scorer weights, scorer
 * logic or the input contract change, and record the change in
 * docs/DATA_SOURCES.md.
 */
export const SCORE_ENGINE_VERSION = "rishi-merit-v1";
