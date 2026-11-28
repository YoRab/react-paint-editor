// The gestures of the stress test, measured by default by `pnpm bench:stress` and in each condition of `pnpm bench:reference`.
// This module imports nothing: scripts/perf-reference.mjs imports it in Node, out of Vitest

/** The ids of the scenarios of the gestures, in the order of the tables */
export const STRESS_GESTURES = ['hover', 'translate', 'translate-all', 'pan', 'zoom', 'brush', 'mixed', 'opacity']
