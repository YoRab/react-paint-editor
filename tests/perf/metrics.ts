// types of the CDP session given by the playwright provider
import type {} from '@vitest/browser-playwright'
import * as React from 'react'
import { cdp } from 'vitest/browser'

export type ReactBuild = 'production' | 'development'

declare module 'vitest' {
  export interface ProvidedContext {
    perfLabel: string
    perfShapes: string
    perfCpu: string
    perfEvents: string
    perfReact: ReactBuild
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

export const waitFor = async (condition: () => boolean, message: string, timeout = 10_000) => {
  const start = performance.now()
  while (!condition()) {
    if (performance.now() - start > timeout) throw new Error(`Timeout: ${message}`)
    await nextFrame()
  }
}

/** Records the intervals between two animation frames until stopped */
export const recordFrames = () => {
  const intervals: number[] = []
  let last: number | undefined
  let running = true
  const loop = (time: number) => {
    if (!running) return
    if (last !== undefined) intervals.push(time - last)
    last = time
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
  return () => {
    running = false
    return intervals
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
  totalMs: number
  /** JavaScript run by the main thread */
  scriptMs: number
  /** All the work of the main thread: JavaScript, style, layout, paint... */
  taskMs: number
}

const percentile = (values: number[], ratio: number) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(ratio * sorted.length))]!
}

const round = (value: number) => Math.round(value * 100) / 100

export const buildMetrics = (
  recorder: Recorder,
  drawCounts: DrawCounts,
  frames: number[],
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
    frameP50: round(percentile(frames, 0.5)),
    frameP95: round(percentile(frames, 0.95)),
    frameMax: round(Math.max(0, ...frames)),
    slowFrames: frames.filter(frame => frame > 33).length,
    totalMs: round(totalMs),
    scriptMs: round(mainThread.scriptMs),
    taskMs: round(mainThread.taskMs)
  }
}

/** Median of each metric over several runs */
export const medianMetrics = (runs: Metrics[]): Metrics =>
  Object.fromEntries(
    Object.keys(runs[0]!).map(key => [
      key,
      percentile(
        runs.map(run => run[key as keyof Metrics]),
        0.5
      )
    ])
  ) as Metrics

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
  /** Metrics by "scenario@shapes" */
  results: Record<string, Metrics>
}

const formatDiff = (value: number, reference: number | undefined) => {
  if (reference === undefined) return ''
  if (reference === value) return ' (=)'
  if (reference === 0) return ' (new)'
  const diff = Math.round(((value - reference) / reference) * 100)
  return ` (${diff > 0 ? '+' : ''}${diff}%)`
}

/** Text table: one row per metric, one column per result, with the gap to the baseline if any */
export const formatTable = (title: string, results: Record<string, Metrics>, baseline?: Record<string, Metrics>) => {
  const keys = Object.keys(results)
  const metricNames = Object.keys(results[keys[0]!]!) as (keyof Metrics)[]
  const rows = [
    ['metric', ...keys],
    ...metricNames.map(name => [name, ...keys.map(key => `${results[key]![name]}${formatDiff(results[key]![name], baseline?.[key]?.[name])}`)])
  ]
  const widths = rows[0]!.map((_, column) => Math.max(...rows.map(row => row[column]!.length)))
  const lines = rows.map(row => row.map((cell, column) => cell.padEnd(widths[column]!)).join(' │ '))
  return [`── ${title} ──`, lines[0], widths.map(width => '─'.repeat(width)).join('─┼─'), ...lines.slice(1)].join('\n')
}
