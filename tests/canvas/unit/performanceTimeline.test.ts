import { createEventEmitter } from '@canvas/store/eventEmitter'
import type { FrameMeasure, GestureMeasure } from '@canvas/types/performance'
import { connectPerformanceTimeline } from '@canvas/utils/performanceTimeline'
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'

const FRAME: FrameMeasure = {
  layer: 'shapes',
  startTime: 100,
  duration: 4,
  drawnShapes: 10,
  culledShapes: 2,
  layeredShapes: 1,
  pixelWidth: 800,
  pixelHeight: 600,
  pixelRatio: 2
}

const GESTURE: GestureMeasure = {
  type: 'translate',
  startTime: 200,
  duration: 500,
  frames: 30,
  fps: 60,
  frameIntervals: { p50: 16.7, p95: 17, max: 60 },
  longFrames: 1,
  shapesLayer: { draws: 30, totalDuration: 90, maxDuration: 5 },
  selectionLayer: { draws: 30, totalDuration: 15, maxDuration: 1 },
  shapeCount: 10,
  selectedCount: 1,
  zoom: 1,
  pixelRatio: 2
}

const DEVTOOLS = expect.objectContaining({ dataType: 'track-entry', trackGroup: 'React Paint' })

describe('connectPerformanceTimeline', () => {
  let measure: MockInstance<Performance['measure']>

  beforeEach(() => {
    measure = vi.spyOn(performance, 'measure').mockImplementation(() => undefined as unknown as PerformanceMeasure)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('adds a measure to the performance timeline for each draw of a layer and each gesture, with its fields', () => {
    const { registerEvent, emit } = createEventEmitter()
    connectPerformanceTimeline({ registerEvent })
    emit('frameDrawn', FRAME)
    emit('gestureMeasured', GESTURE)
    expect(measure.mock.calls).toEqual([
      ['react-paint draw shapes', { start: 100, duration: 4, detail: { ...FRAME, devtools: DEVTOOLS } }],
      ['react-paint gesture translate', { start: 200, duration: 500, detail: { ...GESTURE, devtools: DEVTOOLS } }]
    ])
  })

  it('stops listening with the function it returns', () => {
    const { registerEvent, emit, hasListeners } = createEventEmitter()
    const disconnect = connectPerformanceTimeline({ registerEvent })
    expect(hasListeners('frameDrawn') && hasListeners('gestureMeasured')).toBe(true)
    disconnect()
    expect(hasListeners('frameDrawn') || hasListeners('gestureMeasured')).toBe(false)
    emit('frameDrawn', FRAME)
    expect(measure).not.toHaveBeenCalled()
  })

  it('never throws to the draw of the canvas when a measure throws', () => {
    measure.mockImplementation(() => {
      throw new TypeError('Unsupported')
    })
    const { registerEvent, emit } = createEventEmitter()
    connectPerformanceTimeline({ registerEvent })
    expect(() => emit('frameDrawn', FRAME)).not.toThrow()
    expect(() => emit('gestureMeasured', GESTURE)).not.toThrow()
  })
})
