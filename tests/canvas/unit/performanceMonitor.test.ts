import type { PaintStore } from '@canvas/store/paintStore'
import { createPerformanceMonitor, type PerformanceMonitor } from '@canvas/store/performanceMonitor'
import type { SelectionModeData } from '@canvas/types/Mode'
import type { FrameMeasure, GestureMeasure } from '@canvas/types/performance'
import type { Point } from '@canvas/types/Shapes'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLoadedStore, stubPath2D } from './helpers'

/** The time of performance.now(), set by the tests */
let now = 0
/** The callbacks of the next animation frame */
const frameCallbacks = new Map<number, FrameRequestCallback>()
let lastFrameId = 0

/** Runs the callbacks of the next animation frame, at the time given */
const runFrame = (time: number) => {
  now = time
  const callbacks = [...frameCallbacks.values()]
  frameCallbacks.clear()
  for (const callback of callbacks) callback(time)
}

const canvas = { width: 800, height: 600 } as HTMLCanvasElement

/** A draw of a layer which lasts the given time, and draws the given shapes */
const draw = (monitor: PerformanceMonitor, layer: 'shapes' | 'selection', duration: number, drawnShapes = 0) =>
  monitor.measureDraw(layer, canvas, stats => {
    if (stats) stats.drawnShapes = drawnShapes
    now += duration
  })

const TRANSLATE = {
  mode: 'translate',
  cursorStartPosition: [0, 0],
  originalShape: undefined,
  selectedShapesLengthAtMouseDown: 1,
  hasBeenDuplicated: false,
  dateStart: 0
} as unknown as SelectionModeData<Point>

const moveFirstShape = (store: PaintStore, x: number) => {
  const [first] = store.getState().document.shapes
  store.actions.updateShapes([{ id: first!.id, x }])
}

const setup = async () => {
  const store = await createLoadedStore({ options: { canZoom: 'always' } })
  const monitor = createPerformanceMonitor(store)
  const frames: FrameMeasure[] = []
  const gestures: GestureMeasure[] = []
  const listen = () => {
    const stopFrames = store.registerEvent('frameDrawn', frame => frames.push(frame))
    const stopGestures = store.registerEvent('gestureMeasured', gesture => gestures.push(gesture))
    return () => {
      stopFrames()
      stopGestures()
    }
  }
  return { store, monitor, frames, gestures, listen }
}

describe('performance monitor', () => {
  beforeEach(() => {
    stubPath2D()
    now = 0
    frameCallbacks.clear()
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        lastFrameId++
        frameCallbacks.set(lastFrameId, callback)
        return lastFrameId
      })
    )
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frameCallbacks.delete(id))
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('measures nothing while no listener is registered', async () => {
    const { store, monitor } = await setup()
    expect(monitor.measureDraw('shapes', canvas, stats => stats)).toBeUndefined()
    store.setSelectionMode(TRANSLATE)
    moveFirstShape(store, 150)
    store.setSelectionMode({ mode: 'default' })
    // no frame loop runs for a gesture nobody listens to
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('emits frameDrawn after each draw of a layer while it is listened', async () => {
    const { store, monitor, frames, listen } = await setup()
    const stop = listen()
    now = 100
    draw(monitor, 'shapes', 3, 2)
    draw(monitor, 'selection', 1)
    expect(frames).toEqual([
      {
        layer: 'shapes',
        startTime: 100,
        duration: 3,
        drawnShapes: 2,
        culledShapes: 0,
        layeredShapes: 0,
        pixelWidth: 800,
        pixelHeight: 600,
        pixelRatio: 1
      },
      {
        layer: 'selection',
        startTime: 103,
        duration: 1,
        drawnShapes: 0,
        culledShapes: 0,
        layeredShapes: 0,
        pixelWidth: 800,
        pixelHeight: 600,
        pixelRatio: 1
      }
    ])
    stop()
    draw(monitor, 'shapes', 3)
    expect(frames).toHaveLength(2)
    expect(store.hasListeners('frameDrawn')).toBe(false)
  })

  it('measures a gesture from its start to its end: its frames, the draws of the layers and the shapes', async () => {
    const { store, monitor, gestures, listen } = await setup()
    listen()
    const [first] = store.getState().document.shapes
    store.actions.selectShapes([first!.id])
    now = 1000
    store.setSelectionMode(TRANSLATE)
    runFrame(1016)
    moveFirstShape(store, 150)
    draw(monitor, 'shapes', 4)
    runFrame(1033)
    moveFirstShape(store, 160)
    draw(monitor, 'shapes', 6)
    draw(monitor, 'selection', 1)
    // a long frame
    runFrame(1100)
    now = 1110
    store.setSelectionMode({ mode: 'default' })

    expect(gestures).toHaveLength(1)
    const [gesture] = gestures
    expect(gesture).toEqual({
      type: 'translate',
      startTime: 1000,
      duration: 110,
      frames: 3,
      fps: expect.closeTo((3 / 110) * 1000),
      frameIntervals: { p50: 17, p95: 67, max: 67 },
      longFrames: 1,
      shapesLayer: { draws: 2, totalDuration: 10, maxDuration: 6 },
      selectionLayer: { draws: 1, totalDuration: 1, maxDuration: 1 },
      shapeCount: 3,
      selectedCount: 1,
      zoom: 1,
      pixelRatio: 1
    })
    // the frame loop stops with the gesture
    expect(frameCallbacks.size).toBe(0)
  })

  it('does not measure a gesture which changed nothing, like a click on a shape', async () => {
    const { store, gestures, listen } = await setup()
    listen()
    store.setSelectionMode(TRANSLATE)
    runFrame(16)
    store.setSelectionMode({ mode: 'default' })
    expect(gestures).toEqual([])
  })

  it('measures a pan of the view by the pointer', async () => {
    const { store, gestures, listen } = await setup()
    store.actions.zoomTo(2)
    listen()
    store.setPanStart({ start: [0, 0], originalOffset: [0, 0] })
    store.actions.setOffset([-10, -10])
    store.setPanStart(undefined)
    expect(gestures.map(gesture => gesture.type)).toEqual(['pan'])
  })

  it('measures the changes of the view outside of a gesture until they pause, as a zoom when the zoom changed', async () => {
    const { store, monitor, gestures, listen } = await setup()
    listen()
    store.actions.zoomTo(2)
    runFrame(16)
    draw(monitor, 'shapes', 5)
    now = 50
    store.actions.zoomTo(3)
    runFrame(66)
    draw(monitor, 'shapes', 5)
    vi.advanceTimersByTime(99)
    expect(gestures).toEqual([])
    vi.advanceTimersByTime(1)
    expect(gestures).toHaveLength(1)
    // it ends with the draw of its last change
    expect(gestures[0]).toMatchObject({ type: 'zoom', startTime: 0, duration: 71, frames: 2, zoom: 3, shapesLayer: { draws: 2 } })
    expect(frameCallbacks.size).toBe(0)

    store.actions.panBy([10, 10])
    vi.advanceTimersByTime(100)
    expect(gestures.map(gesture => gesture.type)).toEqual(['zoom', 'pan'])
  })

  it('measures nothing more once stopped', async () => {
    const { store, monitor, frames, gestures, listen } = await setup()
    listen()
    store.setSelectionMode(TRANSLATE)
    moveFirstShape(store, 150)
    monitor.stop()
    expect(frameCallbacks.size).toBe(0)
    store.setSelectionMode({ mode: 'default' })
    store.actions.zoomTo(2)
    vi.advanceTimersByTime(100)
    expect(gestures).toEqual([])
    draw(monitor, 'shapes', 1)
    expect(frames).toEqual([])
  })
})
