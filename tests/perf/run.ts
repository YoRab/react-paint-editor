// Runs a scenario once and measures it: shared by the benchmark (interactions.perf.test.tsx), the check of the counts
// (counts.perf.test.tsx) and the stress test (stress.perf.test.tsx)

import { expect, inject } from 'vitest'
import { mountApp } from './fixture'
import {
  buildMetrics,
  countDrawCalls,
  createRecorder,
  type DrawCounts,
  enableMainThreadTimes,
  getReactBuild,
  type Metrics,
  type Report,
  readMainThreadTimes,
  recordFrames,
  setCpuThrottling,
  settle
} from './metrics'
import { type Criteria, focusCanvas, getLayerCanvases, type Scenario } from './scenarios'
import { generateShapes } from './shapes'

export const REACT_BUILD = inject('perfReact')
const CPU_RATE = Math.max(1, Number(inject('perfCpu')) || 1)
const EVENTS_PER_FRAME = Math.max(1, Math.floor(Number(inject('perfEvents'))) || 1)

/** The conditions of the runs, which a report records: compare only reports made in the same ones */
export const getConditions = (label: string): Omit<Report, 'results' | 'samples'> => ({
  label,
  date: new Date().toISOString(),
  userAgent: navigator.userAgent,
  react: REACT_BUILD,
  cpuRate: CPU_RATE,
  eventsPerFrame: EVENTS_PER_FRAME,
  pixelRatio: window.devicePixelRatio
})

/** The conditions of the runs for the header of the output, like "production build of React, CPU slowed down 4×" */
export const describeConditions = () =>
  [
    `${REACT_BUILD} build of React`,
    ...(CPU_RATE > 1 ? [`CPU slowed down ${CPU_RATE}×`] : []),
    ...(EVENTS_PER_FRAME > 1 ? [`${EVENTS_PER_FRAME} events per frame`] : []),
    ...(window.devicePixelRatio !== 1 ? [`pixel ratio ${window.devicePixelRatio}`] : [])
  ].join(', ')

/**
 * Prepares the page before the runs: checks the build of React, since a config which no longer gives the build asked
 * would measure another React silently, enables the times of the main thread and slows the CPU down by PERF_CPU
 */
export const prepareRuns = async () => {
  if (getReactBuild() !== REACT_BUILD) throw new Error(`The ${REACT_BUILD} build of React was asked, the ${getReactBuild()} one runs`)
  await enableMainThreadTimes()
  if (CPU_RATE > 1) await setCpuThrottling(CPU_RATE)
}

/** Gives the page its speed back after the runs */
export const endRuns = async () => {
  if (CPU_RATE > 1) await setCpuThrottling(1)
}

const SCENARIO_IDS = inject('perfScenarios')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean)

/** The scenarios measured: the ones of PERF_SCENARIOS among the scenarios of a test file, its defaults when it is empty */
export const selectScenarios = (scenarios: Scenario[], defaults = scenarios) => {
  if (!SCENARIO_IDS.length) return defaults
  const unknownIds = SCENARIO_IDS.filter(id => !scenarios.some(scenario => scenario.id === id))
  if (unknownIds.length) throw new Error(`Unknown scenarios in PERF_SCENARIOS: ${unknownIds.join(', ')}`)
  return scenarios.filter(scenario => SCENARIO_IDS.includes(scenario.id))
}

/** The numbers of shapes measured: the ones of PERF_SHAPES, the defaults of the test file when it is empty */
export const selectSizes = (defaults: number[]) => {
  const sizes = inject('perfShapes')
    .split(',')
    .map(Number)
    .filter(size => size > 0)
  return sizes.length ? sizes : defaults
}

/** The key of the result of a scenario at a size in the reports and the baseline: "scenario@shapes" */
export const getResultKey = ({ id }: Pick<Scenario, 'id'>, size: number) => `${id}@${size}`

/** Mounts the app with the drawing of the scenario, prepares it, then measures its gesture */
export const runOnce = async (scenario: Scenario, size: number, eventsPerFrame: number): Promise<Metrics> => {
  const shapes = await (scenario.generate ?? generateShapes)(size)
  const recorder = createRecorder()
  const app = await mountApp({ shapes, options: scenario.options, recorder, listenData: scenario.listenData })
  try {
    const context = { app, shapes, eventsPerFrame }
    await focusCanvas()
    await scenario.setup?.(context)
    // the timers started by the mount and the setup, like the announcement of the selection of the brush, fire before
    // the measure. Without this wait, they fired during the gesture, in a commit of their own or in the commit of
    // another change, from one run to the next
    await settle()

    // the production build of react-dom calls no onRender: the counts would all be 0
    if (!recorder.profiles.root.commits) throw new Error('The <Profiler> reported no commit: react-dom is not its profiling build')
    const mainThreadStart = await readMainThreadTimes()
    recorder.reset()
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

    scenario.verify(context, metrics)
    return metrics
  } finally {
    app.unmount()
  }
}

/** Runs a scenario with the events of PERF_EVENTS: the warm-up runs, whose metrics are dropped, then the measured runs */
export const measureRuns = async (scenario: Scenario, size: number, warmupRuns: number, measuredRuns: number) => {
  for (let run = 0; run < warmupRuns; run++) await runOnce(scenario, size, EVENTS_PER_FRAME)
  const runs: Metrics[] = []
  for (let run = 0; run < measuredRuns; run++) runs.push(await runOnce(scenario, size, EVENTS_PER_FRAME))
  return runs
}

/** The counts are deterministic: they are the acceptance criteria */
export const checkCriteria = (
  metrics: Metrics,
  { hostRenders, probeCommits, canvasCommits, shapesLayerDraws, selectionLayerDraws }: Criteria = {}
) => {
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
