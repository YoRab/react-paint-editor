import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { commands } from 'vitest/browser'
import { mountApp } from './fixture'
import {
  buildMetrics,
  createRecorder,
  enableMainThreadTimes,
  formatTable,
  type Metrics,
  medianMetrics,
  type Report,
  readMainThreadTimes,
  recordFrames,
  setCpuThrottling
} from './metrics'
import { type Criteria, focusCanvas, SCENARIOS, type Scenario } from './scenarios'
import { generateShapes } from './shapes'

const LABEL = inject('perfLabel')
const SIZES = inject('perfShapes')
  .split(',')
  .map(Number)
  .filter(size => size > 0)
const CPU_RATE = Math.max(1, Number(inject('perfCpu')) || 1)

const WARMUP_RUNS = 1
const MEASURED_RUNS = 5
const EVENTS_PER_FRAME = 1

const results: Record<string, Metrics> = {}
let baseline: Record<string, Metrics> | undefined

const runOnce = async (scenario: Scenario, size: number): Promise<Metrics> => {
  const shapes = await (scenario.generate ?? generateShapes)(size)
  const recorder = createRecorder()
  const app = await mountApp({ shapes, options: scenario.options, recorder, listenData: scenario.listenData })
  try {
    const context = { app, shapes, eventsPerFrame: EVENTS_PER_FRAME }
    await focusCanvas()
    await scenario.setup?.(context)

    recorder.reset()
    const mainThreadStart = await readMainThreadTimes()
    const stopFrames = recordFrames()
    const start = performance.now()
    await scenario.run(context)
    const totalMs = performance.now() - start
    const frames = stopFrames()
    const mainThreadEnd = await readMainThreadTimes()
    const metrics = buildMetrics(recorder, frames, totalMs, {
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
const checkCriteria = (metrics: Metrics, { hostRenders, probeCommits, canvasCommits }: Criteria = {}) => {
  if (hostRenders !== undefined) {
    expect(metrics.hostRenders, 'host renders').toBeLessThanOrEqual(hostRenders)
    expect(metrics.siblingRenders, 'sibling renders').toBeLessThanOrEqual(hostRenders)
  }
  if (probeCommits !== undefined) expect(metrics.probeCommits, 'probe commits').toBeLessThanOrEqual(probeCommits)
  if (canvasCommits !== undefined) expect(metrics.canvasCommits, 'canvas commits').toBeLessThanOrEqual(canvasCommits)
}

beforeAll(async () => {
  await enableMainThreadTimes()
  if (CPU_RATE > 1) await setCpuThrottling(CPU_RATE)
  try {
    baseline = (JSON.parse(await commands.readFile('tests/perf/results/baseline.json')) as Report).results
  } catch {
    baseline = undefined
  }
})

afterAll(async () => {
  if (CPU_RATE > 1) await setCpuThrottling(1)
  if (!Object.keys(results).length) return
  const report: Report = { label: LABEL, date: new Date().toISOString(), userAgent: navigator.userAgent, cpuRate: CPU_RATE, results }
  await commands.writeFile(`tests/perf/results/${LABEL}.json`, `${JSON.stringify(report, null, 2)}\n`)

  const cpu = CPU_RATE > 1 ? `, CPU slowed down ${CPU_RATE}×` : ''
  const header = `Benchmark "${LABEL}"${cpu}${baseline && LABEL !== 'baseline' ? ', compared to baseline.json' : ''}`
  const tables = SCENARIOS.map(scenario => {
    const scenarioResults = Object.fromEntries(Object.entries(results).filter(([key]) => key.startsWith(`${scenario.id}@`)))
    return Object.keys(scenarioResults).length ? formatTable(scenario.id, scenarioResults, LABEL !== 'baseline' ? baseline : undefined) : ''
  })
  console.log([header, ...tables.filter(Boolean)].join('\n\n'))
})

describe('interactions', () => {
  for (const scenario of SCENARIOS) {
    for (const size of SIZES) {
      it(`${scenario.id} with ${size} shapes`, async () => {
        for (let run = 0; run < WARMUP_RUNS; run++) await runOnce(scenario, size)
        const runs: Metrics[] = []
        for (let run = 0; run < MEASURED_RUNS; run++) runs.push(await runOnce(scenario, size))

        const metrics = medianMetrics(runs)
        results[`${scenario.id}@${size}`] = metrics
        checkCriteria(metrics, scenario.criteria)
      })
    }
  }
})
