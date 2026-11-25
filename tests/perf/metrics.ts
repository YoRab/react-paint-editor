// types of the CDP session given by the playwright provider
import type {} from '@vitest/browser-playwright'
import * as React from 'react'
import { cdp } from 'vitest/browser'
import { type Comparison, compareSamples, formatComparison, formatTextTable, median, round } from './report'

export type ReactBuild = 'production' | 'development'

declare module 'vitest' {
  export interface ProvidedContext {
    perfLabel: string
    perfShapes: string
    perfScenarios: string
    perfCpu: string
    perfEvents: string
    perfReact: ReactBuild
    perfBaseline: string
    perfUpdate: boolean
  }
}

/** The build of React running in the page: only the development one shares its debug internals */
export const getReactBuild = (): ReactBuild => {
  const internals = (React as unknown as { __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: object })
    .__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
  return 'ReactDebugCurrentFrame' in internals ? 'development' : 'production'
}

// ─── Collected during a run ────────────────────────────────────────────────────

export const PROFILER_IDS = ['root', 'sibling', 'editor', 'canvas', 'probe'] as const
export type ProfilerId = (typeof PROFILER_IDS)[number]

export type Recorder = {
  counters: { hostRenders: number; siblingRenders: number }
  profiles: Record<ProfilerId, { commits: number; actualDuration: number }>
  onRender: React.ProfilerOnRenderCallback
  reset: () => void
}

export const createRecorder = (): Recorder => {
  const recorder: Recorder = {
    counters: { hostRenders: 0, siblingRenders: 0 },
    profiles: Object.fromEntries(PROFILER_IDS.map(id => [id, { commits: 0, actualDuration: 0 }])) as Recorder['profiles'],
    onRender: (id, _phase, actualDuration) => {
      const profile = recorder.profiles[id as ProfilerId]
      profile.commits++
      profile.actualDuration += actualDuration
    },
    reset: () => {
      recorder.counters.hostRenders = 0
      recorder.counters.siblingRenders = 0
      for (const id of PROFILER_IDS) recorder.profiles[id] = { commits: 0, actualDuration: 0 }
    }
  }
  return recorder
}

export const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve))

/**
 * Longer than the timers the editor starts on a change, like the fade-out of the loader once loaded (300 ms) and the
 * announcement of the live region (200 ms)
 */
const SETTLE_MS = 400

/**
 * Waits for the timers started by the last changes to fire, then for a frame. Without it, they fire at a time which
 * depends on the speed of the machine: before or during a gesture, alone or in the same commit as another change
 */
export const settle = async () => {
  await new Promise(resolve => setTimeout(resolve, SETTLE_MS))
  await nextFrame()
}

/** Long enough for the 20000 shapes of the stress test to load, or to be selected, on a slowed down CPU */
const WAIT_TIMEOUT_MS = 60_000

export const waitFor = async (condition: () => boolean, message: string, timeout = WAIT_TIMEOUT_MS) => {
  const start = performance.now()
  while (!condition()) {
    if (performance.now() - start > timeout) throw new Error(`Timeout: ${message}`)
    await nextFrame()
  }
}

export type Frames = {
  /** Intervals between two animation frames */
  intervals: number[]
  /** Work of the main thread in each frame */
  work: number[]
}

/**
 * Records the frames until stopped: their intervals, and their work, like the benchmark of Excalidraw. The work of a
 * frame goes from its animation frame callback to a message posted from it, which runs once the frame is rendered:
 * after the other callbacks, like the draws of the library and the events sent by the scenarios, then the style, the
 * layout and the paint, and the tasks run before the message, like the renders React schedules. Unlike the intervals,
 * which stay at 16.7 ms on a fast machine, it shows how much of the frame is used. The callback asks for the next frame
 * first, so that it runs before the callbacks asked during the frame
 */
export const recordFrames = () => {
  const frames: Frames = { intervals: [], work: [] }
  // the start of each frame whose message has not come yet
  const starts: number[] = []
  const channel = new MessageChannel()
  channel.port1.onmessage = () => frames.work.push(performance.now() - starts.shift()!)
  let last: number | undefined
  let running = true
  const loop = (time: number) => {
    if (!running) return
    requestAnimationFrame(loop)
    starts.push(performance.now())
    channel.port2.postMessage(null)
    if (last !== undefined) frames.intervals.push(time - last)
    last = time
  }
  requestAnimationFrame(loop)
  return (): Frames => {
    running = false
    channel.port1.close()
    return frames
  }
}

/**
 * Time spent by the main thread of the page, read with the Chrome DevTools Protocol. Unlike the Profiler,
 * it counts all the work: event handlers, React, drawing of the canvas, style and layout.
 */
export const readMainThreadTimes = async () => {
  const { metrics } = await cdp().send('Performance.getMetrics')
  const getMs = (name: string) => (metrics.find(metric => metric.name === name)?.value ?? 0) * 1000
  return { scriptMs: getMs('ScriptDuration'), taskMs: getMs('TaskDuration') }
}

export const enableMainThreadTimes = () => cdp().send('Performance.enable')

/** Slows the CPU down by the rate, like a slower machine: 1 is the speed of the machine */
export const setCpuThrottling = (rate: number) => cdp().send('Emulation.setCPUThrottlingRate', { rate })

/** Calls of the 2D context which draw pixels */
const DRAW_METHODS = ['fill', 'stroke', 'drawImage', 'fillText', 'strokeText'] as const

type ContextMethod = 'reset' | (typeof DRAW_METHODS)[number]

export type DrawCounts = {
  /** Draws of the layer of the shapes, and of the layer of the selection: each one starts with `ctx.reset()` */
  shapesLayerDraws: number
  selectionLayerDraws: number
  /** Calls drawing pixels in each layer, and in the canvases out of the page, like the layers of semi-transparent shapes */
  shapesDrawCalls: number
  selectionDrawCalls: number
  offscreenDrawCalls: number
}

/**
 * Counts the calls of the 2D contexts until the returned function is called, by wrapping the methods of their
 * prototype, like the benchmark of Excalidraw. The layers are told apart by the context of their canvas element, not by
 * the code which draws them: the library of an older git ref is counted the same way
 */
export const countDrawCalls = (shapesCanvas: HTMLCanvasElement, selectionCanvas: HTMLCanvasElement | null) => {
  const counts: DrawCounts = { shapesLayerDraws: 0, selectionLayerDraws: 0, shapesDrawCalls: 0, selectionDrawCalls: 0, offscreenDrawCalls: 0 }
  // the contexts the library draws with: getContext gives back the one of a canvas. Comparing them is cheaper than
  // reading ctx.canvas on each of the hundreds of thousands of calls of a gesture, which lands in the measured times
  const shapesContext = shapesCanvas.getContext('2d')
  const selectionContext = selectionCanvas?.getContext('2d')
  const prototype = CanvasRenderingContext2D.prototype as unknown as Record<ContextMethod, (...args: unknown[]) => unknown>
  const originals = new Map<ContextMethod, (...args: unknown[]) => unknown>()
  const wrap = (method: ContextMethod, count: (context: CanvasRenderingContext2D) => void) => {
    const original = prototype[method]
    originals.set(method, original)
    prototype[method] = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      count(this)
      return original.apply(this, args)
    }
  }
  wrap('reset', context => {
    if (context === shapesContext) counts.shapesLayerDraws++
    else if (context === selectionContext) counts.selectionLayerDraws++
  })
  for (const method of DRAW_METHODS) {
    wrap(method, context => {
      if (context === shapesContext) counts.shapesDrawCalls++
      else if (context === selectionContext) counts.selectionDrawCalls++
      else counts.offscreenDrawCalls++
    })
  }
  return (): DrawCounts => {
    for (const [method, original] of originals) prototype[method] = original
    return counts
  }
}

// ─── Metrics of a run ──────────────────────────────────────────────────────────

export type Metrics = DrawCounts & {
  hostRenders: number
  siblingRenders: number
  rootCommits: number
  rootMs: number
  editorCommits: number
  editorMs: number
  canvasCommits: number
  canvasMs: number
  /** Time spent in the editor UI, outside the canvas */
  editorUiMs: number
  probeCommits: number
  frameP50: number
  frameP95: number
  frameMax: number
  slowFrames: number
  /** Work of the main thread in a frame, from its animation frame callback until it is rendered */
  frameWorkMean: number
  frameWorkP95: number
  totalMs: number
  /** JavaScript run by the main thread */
  scriptMs: number
  /** All the work of the main thread: JavaScript, style, layout, paint... */
  taskMs: number
}

/** The metrics which do not depend on the speed of the machine: `pnpm bench:counts` checks them on each pull request */
export const COUNT_NAMES = [
  'hostRenders',
  'siblingRenders',
  'rootCommits',
  'editorCommits',
  'canvasCommits',
  'probeCommits',
  'shapesLayerDraws',
  'selectionLayerDraws',
  'shapesDrawCalls',
  'selectionDrawCalls',
  'offscreenDrawCalls'
] as const satisfies readonly (keyof Metrics)[]

export type CountName = (typeof COUNT_NAMES)[number]
export type Counts = Pick<Metrics, CountName>

export const pickCounts = (metrics: Metrics): Counts => Object.fromEntries(COUNT_NAMES.map(name => [name, metrics[name]])) as Counts

const percentile = (values: number[], ratio: number) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(ratio * sorted.length))]!
}

export const buildMetrics = (
  recorder: Recorder,
  drawCounts: DrawCounts,
  { intervals, work }: Frames,
  totalMs: number,
  mainThread: { scriptMs: number; taskMs: number }
): Metrics => {
  const { counters, profiles } = recorder
  return {
    hostRenders: counters.hostRenders,
    siblingRenders: counters.siblingRenders,
    rootCommits: profiles.root.commits,
    rootMs: round(profiles.root.actualDuration),
    editorCommits: profiles.editor.commits,
    editorMs: round(profiles.editor.actualDuration),
    canvasCommits: profiles.canvas.commits,
    canvasMs: round(profiles.canvas.actualDuration),
    editorUiMs: round(profiles.editor.actualDuration - profiles.canvas.actualDuration),
    probeCommits: profiles.probe.commits,
    ...drawCounts,
    frameP50: round(percentile(intervals, 0.5)),
    frameP95: round(percentile(intervals, 0.95)),
    frameMax: round(Math.max(0, ...intervals)),
    slowFrames: intervals.filter(interval => interval > 33).length,
    frameWorkMean: round(work.reduce((sum, duration) => sum + duration, 0) / (work.length || 1)),
    frameWorkP95: round(percentile(work, 0.95)),
    totalMs: round(totalMs),
    scriptMs: round(mainThread.scriptMs),
    taskMs: round(mainThread.taskMs)
  }
}

/** Median of each metric over several runs */
export const medianMetrics = (runs: Metrics[]): Metrics =>
  Object.fromEntries(Object.keys(runs[0]!).map(key => [key, round(median(runs.map(run => run[key as keyof Metrics])))])) as Metrics

// ─── Report ────────────────────────────────────────────────────────────────────

export type Report = {
  label: string
  date: string
  userAgent: string
  /** Build of React measured: compare only reports made with the same one */
  react: ReactBuild
  /** Slowdown of the CPU during the run */
  cpuRate: number
  /** Pointer and wheel events sent in each frame */
  eventsPerFrame: number
  /** Pixels of the screen in a CSS pixel (devicePixelRatio) */
  pixelRatio: number
  /** Metrics by "scenario@shapes": the median of the measured runs */
  results: Record<string, Metrics>
  /** Metrics of each measured run, by "scenario@shapes". The reports made before 2026-11-25 only hold the medians */
  samples?: Record<string, Metrics[]>
}

/** The comparison of each metric of a result with the baseline. A metric the baseline does not know is left out */
export type MetricComparisons = Partial<Record<keyof Metrics, Comparison>>

/**
 * Compares the runs of a result with the ones of the baseline. Only the counts get a verdict: two benches made at
 * different times differ by the drift of the machine, which the runs of each one do not show. The same code measured
 * twice in a row once came out 34 % faster on undo@50, with p < 0.05. A report made before 2026-11-25 only holds
 * medians: each one stands for a single run
 */
export const compareWithBaseline = (runs: Metrics[], baseline: Report, key: string): MetricComparisons | undefined => {
  const baseRuns = baseline.samples?.[key] ?? (baseline.results[key] ? [baseline.results[key]] : undefined)
  if (!baseRuns) return undefined
  const metricNames = (Object.keys(runs[0]!) as (keyof Metrics)[]).filter(name => baseRuns[0]![name] !== undefined)
  return Object.fromEntries(
    metricNames.map(name => {
      const comparison = compareSamples(
        baseRuns.map(run => run[name]),
        runs.map(run => run[name])
      )
      return [name, comparison.constant ? comparison : { ...comparison, verdict: 'unchanged' }]
    })
  )
}

/** Text table: one row per metric, one column per result, with the gap to the baseline if any */
export const formatTable = (title: string, results: Record<string, Metrics>, comparisons: Record<string, MetricComparisons | undefined>) => {
  const keys = Object.keys(results)
  const metricNames = Object.keys(results[keys[0]!]!) as (keyof Metrics)[]
  return formatTextTable(title, [
    ['metric', ...keys],
    ...metricNames.map(name => [
      name,
      ...keys.map(key => {
        const comparison = comparisons[key]?.[name]
        return comparison ? `${results[key]![name]} ${formatComparison(comparison)}` : `${results[key]![name]}`
      })
    ])
  ])
}
