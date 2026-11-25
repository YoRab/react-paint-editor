// Stress test: the work of the frames of the main gestures on larger and larger drawings, the capacity of the canvas,
// the largest drawing whose frames fit in 60 and 30 fps, and the duration of the load and of the exports. Run by
// `pnpm bench:stress` (see README.md)

import { afterAll, beforeAll, describe, inject, it } from 'vitest'
import { commands } from 'vitest/browser'
import { type Metrics, medianMetrics, type Report } from './metrics'
import { formatJson, formatTextTable } from './report'
import {
  checkCriteria,
  describeConditions,
  endRuns,
  getConditions,
  getResultKey,
  measureRuns,
  prepareRuns,
  selectScenarios,
  selectSizes
} from './run'
import { OPERATIONS, SCENARIOS, type Scenario } from './scenarios'

const LABEL = inject('perfLabel')
const GESTURE_IDS = ['hover', 'translate', 'translate-all', 'pan', 'zoom', 'brush', 'mixed', 'opacity']
const MEASURED_SCENARIOS = selectScenarios(
  [...SCENARIOS, ...OPERATIONS],
  [...SCENARIOS.filter(scenario => GESTURE_IDS.includes(scenario.id)), ...OPERATIONS]
)
const GESTURES = MEASURED_SCENARIOS.filter(scenario => !OPERATIONS.includes(scenario))
const MEASURED_OPERATIONS = MEASURED_SCENARIOS.filter(scenario => OPERATIONS.includes(scenario))
const SIZES = selectSizes([100, 500, 1000, 2000, 5000, 10_000, 20_000])
const MEASURED_RUNS = 3

/** The work of a frame, p95, which keeps each frame rate */
const BUDGETS = { fps60: 1000 / 60, fps30: 1000 / 30 }

/** Once the work of its frames, p95, goes over it, a gesture is not measured on the larger drawings: they would take minutes */
const STOP_MS = 50

type Capacity = Record<keyof typeof BUDGETS, number | null>

type StressReport = Report & {
  budgets: typeof BUDGETS
  /**
   * By gesture, the largest drawing measured whose frames fit in each budget, the smaller ones too: the real capacity lies
   * between it and the next size. Null when the smallest one does not fit
   */
  capacity: Record<string, Capacity>
}

const results: Record<string, Metrics> = {}
const samples: Record<string, Metrics[]> = {}
/** The gestures whose frames went over STOP_MS, or which failed: they would fail again on the larger drawings */
const stopped = new Set<string>()

const getCapacity = (scenario: Scenario): Capacity => {
  const getLargestFitting = (budget: number) => {
    let capacity: number | null = null
    for (const size of SIZES) {
      const metrics = results[getResultKey(scenario, size)]
      if (!metrics || metrics.frameWorkP95 > budget) break
      capacity = size
    }
    return capacity
  }
  return { fps60: getLargestFitting(BUDGETS.fps60), fps30: getLargestFitting(BUDGETS.fps30) }
}

/** A capacity for the table: "≥ 20000" at the top of the climb, "< 100" below its bottom */
const formatCapacity = (capacity: number | null) => {
  if (capacity === null) return `< ${SIZES[0]}`
  return capacity === SIZES[SIZES.length - 1] ? `≥ ${capacity}` : `${capacity}`
}

/** One row per scenario, one column per size: the value of a metric, "–" for a size not measured */
const formatSizeTable = (title: string, scenarios: Scenario[], metric: keyof Metrics) =>
  formatTextTable(title, [
    ['scenario', ...SIZES.map(String)],
    ...scenarios.map(scenario => [scenario.id, ...SIZES.map(size => `${results[getResultKey(scenario, size)]?.[metric] ?? '–'}`)])
  ])

beforeAll(async () => {
  await prepareRuns()
})

afterAll(async () => {
  await endRuns()
  if (!Object.keys(results).length) return
  const capacity = Object.fromEntries(GESTURES.map(scenario => [scenario.id, getCapacity(scenario)]))
  const report: StressReport = { ...getConditions(LABEL), budgets: BUDGETS, capacity, results, samples }
  await commands.writeFile(`tests/perf/results/stress-${LABEL}.json`, formatJson(report))

  const gestureTables = GESTURES.length
    ? [
        formatSizeTable('work of a frame, p95 (ms), by number of shapes', GESTURES, 'frameWorkP95'),
        formatSizeTable('work of a frame, mean (ms), by number of shapes', GESTURES, 'frameWorkMean'),
        formatTextTable('capacity, in shapes', [
          ['gesture', '60 fps', '30 fps'],
          ...GESTURES.map(({ id }) => [id, formatCapacity(capacity[id]!.fps60), formatCapacity(capacity[id]!.fps30)])
        ]),
        `Capacity: the largest drawing whose frames fit in ${Math.round(BUDGETS.fps60 * 10) / 10} ms (60 fps) and in ${Math.round(BUDGETS.fps30 * 10) / 10} ms (30 fps), at p95. ` +
          `A gesture whose frames take over ${STOP_MS} ms, or which fails, is not measured on larger drawings (–)`
      ]
    : []
  const operationTables = MEASURED_OPERATIONS.length
    ? [
        formatSizeTable('duration of an operation (ms), by number of shapes', MEASURED_OPERATIONS, 'totalMs'),
        formatSizeTable('work of the main thread during an operation (ms), by number of shapes', MEASURED_OPERATIONS, 'taskMs'),
        'The duration of load goes to the frame which draws the shapes: it includes the wait for this frame, up to 16.7 ms'
      ]
    : []
  console.log([`Stress test "${LABEL}", ${describeConditions()}`, ...gestureTables, ...operationTables].join('\n\n'))
})

describe('stress', () => {
  for (const scenario of MEASURED_SCENARIOS) {
    const isGesture = GESTURES.includes(scenario)
    for (const [index, size] of SIZES.entries()) {
      it(`${scenario.id} with ${size} shapes`, async ({ skip, onTestFailed }) => {
        skip(stopped.has(scenario.id), `a smaller drawing failed, or its frames took over ${STOP_MS} ms`)
        onTestFailed(() => {
          stopped.add(scenario.id)
        })
        // the first drawing of a scenario also warms its code up
        const runs = await measureRuns(scenario, size, index === 0 ? 1 : 0, MEASURED_RUNS)
        const key = getResultKey(scenario, size)
        const metrics = medianMetrics(runs)
        results[key] = metrics
        samples[key] = runs
        // an operation is measured on every drawing: a single call, it never takes minutes
        if (isGesture && metrics.frameWorkP95 > STOP_MS) stopped.add(scenario.id)
        checkCriteria(metrics, scenario.criteria)
      })
    }
  }
})
