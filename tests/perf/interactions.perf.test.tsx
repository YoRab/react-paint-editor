import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { commands } from 'vitest/browser'
import { mountApp } from './fixture'
import {
  buildMetrics,
  compareWithBaseline,
  countDrawCalls,
  createRecorder,
  type DrawCounts,
  enableMainThreadTimes,
  formatTable,
  getReactBuild,
  type MetricComparisons,
  type Metrics,
  medianMetrics,
  type Report,
  readMainThreadTimes,
  recordFrames,
  setCpuThrottling
} from './metrics'
import { listSignificant } from './report'
import { type Criteria, focusCanvas, getLayerCanvases, SCENARIOS, type Scenario } from './scenarios'
import { generateShapes } from './shapes'

const LABEL = inject('perfLabel')
const SIZES = inject('perfShapes')
  .split(',')
  .map(Number)
  .filter(size => size > 0)
const CPU_RATE = Math.max(1, Number(inject('perfCpu')) || 1)
const EVENTS_PER_FRAME = Math.max(1, Math.floor(Number(inject('perfEvents'))) || 1)
const REACT_BUILD = inject('perfReact')
const BASELINE = inject('perfBaseline')

const WARMUP_RUNS = 1
const MEASURED_RUNS = 5

const COUNTS_LEGEND =
  '▲ more, ▼ fewer: the counts which changed. The gaps of time are not marked: they may come from the drift of the machine between the two benches'

/** Median of the runs, and the runs, by "scenario@shapes" */
const results: Record<string, Metrics> = {}
const samples: Record<string, Metrics[]> = {}
let baseline: Report | undefined
const comparisons: Record<string, MetricComparisons | undefined> = {}

const runOnce = async (scenario: Scenario, size: number): Promise<Metrics> => {
  const shapes = await (scenario.generate ?? generateShapes)(size)
  const recorder = createRecorder()
  const app = await mountApp({ shapes, options: scenario.options, recorder, listenData: scenario.listenData })
  try {
    const context = { app, shapes, eventsPerFrame: EVENTS_PER_FRAME }
    await focusCanvas()
    await scenario.setup?.(context)

    // the production build of react-dom calls no onRender: the counts would all be 0
    if (!recorder.profiles.root.commits) throw new Error('The <Profiler> reported no commit: react-dom is not its profiling build')
    recorder.reset()
    const mainThreadStart = await readMainThreadTimes()
    const { shapesCanvas, selectionCanvas } = getLayerCanvases()
    const stopCounting = countDrawCalls(shapesCanvas, selectionCanvas)
    const stopFrames = recordFrames()
    const start = performance.now()
    let drawCounts: DrawCounts
    try {
      await scenario.run(context)
    } finally {
      // the methods of the 2D context are given back even when the gesture fails
      drawCounts = stopCounting()
    }
    const totalMs = performance.now() - start
    const frames = stopFrames()
    const mainThreadEnd = await readMainThreadTimes()
    const metrics = buildMetrics(recorder, drawCounts, frames, totalMs, {
      scriptMs: mainThreadEnd.scriptMs - mainThreadStart.scriptMs,
      taskMs: mainThreadEnd.taskMs - mainThreadStart.taskMs
    })

    scenario.verify(context)
    return metrics
  } finally {
    app.unmount()
  }
}

/** The counts are deterministic: they are the acceptance criteria */
const checkCriteria = (metrics: Metrics, { hostRenders, probeCommits, canvasCommits, shapesLayerDraws, selectionLayerDraws }: Criteria = {}) => {
  if (hostRenders !== undefined) {
    expect(metrics.hostRenders, 'host renders').toBeLessThanOrEqual(hostRenders)
    expect(metrics.siblingRenders, 'sibling renders').toBeLessThanOrEqual(hostRenders)
  }
  if (probeCommits !== undefined) expect(metrics.probeCommits, 'probe commits').toBeLessThanOrEqual(probeCommits)
  if (canvasCommits !== undefined) expect(metrics.canvasCommits, 'canvas commits').toBeLessThanOrEqual(canvasCommits)
  if (shapesLayerDraws !== undefined) expect(metrics.shapesLayerDraws, 'draws of the layer of the shapes').toBeLessThanOrEqual(shapesLayerDraws)
  if (selectionLayerDraws !== undefined)
    expect(metrics.selectionLayerDraws, 'draws of the layer of the selection').toBeLessThanOrEqual(selectionLayerDraws)
}

beforeAll(async () => {
  // a config which no longer gives the build asked would measure another React silently
  if (getReactBuild() !== REACT_BUILD) throw new Error(`The ${REACT_BUILD} build of React was asked, the ${getReactBuild()} one runs`)
  await enableMainThreadTimes()
  if (CPU_RATE > 1) await setCpuThrottling(CPU_RATE)
  // the baseline itself is compared to nothing
  if (!BASELINE || BASELINE === LABEL) return
  try {
    baseline = JSON.parse(await commands.readFile(`tests/perf/results/${BASELINE}.json`)) as Report
  } catch {
    baseline = undefined
  }
})

afterAll(async () => {
  if (CPU_RATE > 1) await setCpuThrottling(1)
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
  await commands.writeFile(`tests/perf/results/${LABEL}.json`, `${JSON.stringify(report, null, 2)}\n`)

  const cpu = CPU_RATE > 1 ? `, CPU slowed down ${CPU_RATE}×` : ''
  const events = EVENTS_PER_FRAME > 1 ? `, ${EVENTS_PER_FRAME} events per frame` : ''
  const density = pixelRatio !== 1 ? `, pixel ratio ${pixelRatio}` : ''
  const header = `Benchmark "${LABEL}", ${REACT_BUILD} build of React${cpu}${events}${density}${baseline ? `, compared to ${BASELINE}.json` : ''}`
  const tables = SCENARIOS.map(scenario => {
    const scenarioResults = Object.fromEntries(Object.entries(results).filter(([key]) => key.startsWith(`${scenario.id}@`)))
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
  for (const scenario of SCENARIOS) {
    for (const size of SIZES) {
      it(`${scenario.id} with ${size} shapes`, async () => {
        for (let run = 0; run < WARMUP_RUNS; run++) await runOnce(scenario, size)
        const runs: Metrics[] = []
        for (let run = 0; run < MEASURED_RUNS; run++) runs.push(await runOnce(scenario, size))

        const key = `${scenario.id}@${size}`
        const metrics = medianMetrics(runs)
        results[key] = metrics
        samples[key] = runs
        if (baseline) comparisons[key] = compareWithBaseline(runs, baseline, key)
        checkCriteria(metrics, scenario.criteria)
      })
    }
  }
})
