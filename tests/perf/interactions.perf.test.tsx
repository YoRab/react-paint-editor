// The benchmark: the times and the counts of each scenario, over several runs. Run by `pnpm bench` (see README.md)

import { afterAll, beforeAll, describe, inject, it } from 'vitest'
import { commands } from 'vitest/browser'
import { compareWithBaseline, formatTable, type MetricComparisons, type Metrics, medianMetrics, type Report } from './metrics'
import { formatJson, listSignificant } from './report'
import { CPU_RATE, checkCriteria, endRuns, getResultKey, MEASURED_SCENARIOS, prepareRuns, REACT_BUILD, runOnce } from './run'

const LABEL = inject('perfLabel')
const SIZES = inject('perfShapes')
  .split(',')
  .map(Number)
  .filter(size => size > 0)
const EVENTS_PER_FRAME = Math.max(1, Math.floor(Number(inject('perfEvents'))) || 1)
const BASELINE = inject('perfBaseline')

const WARMUP_RUNS = 1
const MEASURED_RUNS = 5

const COUNTS_LEGEND =
  '▲ more, ▼ fewer: the counts which changed. The gaps of time are not marked: they may come from the drift of the machine between the two benches. To compare two versions, use pnpm bench:compare'

/** Median of the runs, and the runs, by "scenario@shapes" */
const results: Record<string, Metrics> = {}
const samples: Record<string, Metrics[]> = {}
let baseline: Report | undefined
const comparisons: Record<string, MetricComparisons | undefined> = {}

beforeAll(async () => {
  await prepareRuns()
  // the baseline itself is compared to nothing
  if (!BASELINE || BASELINE === LABEL) return
  try {
    baseline = JSON.parse(await commands.readFile(`tests/perf/results/${BASELINE}.json`)) as Report
  } catch {
    baseline = undefined
  }
})

afterAll(async () => {
  await endRuns()
  if (!Object.keys(results).length) return
  const pixelRatio = window.devicePixelRatio
  const report: Report = {
    label: LABEL,
    date: new Date().toISOString(),
    userAgent: navigator.userAgent,
    react: REACT_BUILD,
    cpuRate: CPU_RATE,
    eventsPerFrame: EVENTS_PER_FRAME,
    pixelRatio,
    results,
    samples
  }
  await commands.writeFile(`tests/perf/results/${LABEL}.json`, formatJson(report))

  const cpu = CPU_RATE > 1 ? `, CPU slowed down ${CPU_RATE}×` : ''
  const events = EVENTS_PER_FRAME > 1 ? `, ${EVENTS_PER_FRAME} events per frame` : ''
  const density = pixelRatio !== 1 ? `, pixel ratio ${pixelRatio}` : ''
  const header = `Benchmark "${LABEL}", ${REACT_BUILD} build of React${cpu}${events}${density}${baseline ? `, compared to ${BASELINE}.json` : ''}`
  const tables = MEASURED_SCENARIOS.map(scenario => {
    const scenarioResults = Object.fromEntries(Object.entries(results).filter(([key]) => SIZES.some(size => key === getResultKey(scenario, size))))
    return Object.keys(scenarioResults).length ? formatTable(scenario.id, scenarioResults, comparisons) : ''
  })
  // only the counts get a verdict: see compareWithBaseline
  const changedCounts = listSignificant(comparisons)
  const summary = baseline
    ? [
        COUNTS_LEGEND,
        changedCounts.length ? `Counts changed since ${BASELINE}.json:\n${changedCounts.join('\n')}` : `No count changed since ${BASELINE}.json`
      ]
    : []
  console.log([header, ...tables.filter(Boolean), ...summary].join('\n\n'))
})

describe('interactions', () => {
  for (const scenario of MEASURED_SCENARIOS) {
    for (const size of SIZES) {
      it(`${scenario.id} with ${size} shapes`, async () => {
        for (let run = 0; run < WARMUP_RUNS; run++) await runOnce(scenario, size, EVENTS_PER_FRAME)
        const runs: Metrics[] = []
        for (let run = 0; run < MEASURED_RUNS; run++) runs.push(await runOnce(scenario, size, EVENTS_PER_FRAME))

        const key = getResultKey(scenario, size)
        const metrics = medianMetrics(runs)
        results[key] = metrics
        samples[key] = runs
        if (baseline) comparisons[key] = compareWithBaseline(runs, baseline, key)
        checkCriteria(metrics, scenario.criteria)
      })
    }
  }
})
