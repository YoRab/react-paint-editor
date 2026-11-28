// The capacity of the canvas for a gesture of the stress test: the largest drawing whose frames keep a frame rate.
// This module has no import at run time: scripts/perf-reference.mjs imports it in Node, out of Vitest
import type { Metrics } from './metrics'

/** The duration of a frame at each frame rate of the capacity */
export const BUDGETS = { fps60: 1000 / 60, fps30: 1000 / 30 }

/**
 * The intervals between frames vary by a few tenths of a millisecond around a multiple of the frame of the screen, 16.7 ms:
 * 10 % more than a budget keeps its frames, and leaves out the next multiple
 */
export const INTERVAL_TOLERANCE = 1.1

/** By frame rate, the largest drawing measured whose frames keep it, the smaller ones too. Null when the smallest one does not */
export type Capacity = Record<keyof typeof BUDGETS, number | null>

type FrameMetrics = Pick<Metrics, 'frameWorkP95' | 'frameP95'>

/**
 * Whether the frames of a gesture keep the frame rate of the budget, at p95: the main thread works at most a frame, and the
 * frames come at least at this rate. With a GPU, the work of the main thread leaves out the raster of the GPU process,
 * which delays the frames when it takes longer than a frame, while the main thread waits
 */
const keepsFrameRate = ({ frameWorkP95, frameP95 }: FrameMetrics, budget: number) => frameWorkP95 <= budget && frameP95 <= budget * INTERVAL_TOLERANCE

/** The capacity of a gesture, from its metrics on each drawing, in increasing sizes: undefined for a drawing not measured */
export const getCapacity = (sizes: number[], getMetrics: (size: number) => FrameMetrics | undefined): Capacity => {
  const getLargestFitting = (budget: number) => {
    let capacity: number | null = null
    for (const size of sizes) {
      const metrics = getMetrics(size)
      if (!metrics || !keepsFrameRate(metrics, budget)) break
      capacity = size
    }
    return capacity
  }
  return { fps60: getLargestFitting(BUDGETS.fps60), fps30: getLargestFitting(BUDGETS.fps30) }
}
