import type { PaintStore } from '@canvas/store/paintStore'
import type { InternalState } from '@canvas/store/types'
import type { InteractionMode } from '@canvas/types/editor'
import type { CanvasLayer, GestureMeasure, GestureType, LayerMeasure } from '@canvas/types/performance'
import { shallowEqual } from '@canvas/utils/equality'
import { getSelectedLeaves } from '@canvas/utils/selection'
import type { DrawStats } from '@canvas/utils/shapes'
import { getShapeLeaves } from '@canvas/utils/shapes/tree'

/** The changes of the view outside of a drag are one gesture until they pause this long */
const VIEW_GESTURE_PAUSE_MS = 100

/** A longer interval between two frames is seen as a stutter */
const LONG_FRAME_MS = 50

/** The gesture of each mode of the selection, undefined for the modes which are not a drag: a new mode must be told */
const GESTURE_OF_MODE: Record<InteractionMode, GestureType | undefined> = {
  translate: 'translate',
  resize: 'resize',
  rotate: 'rotate',
  selectionFrame: 'selectionFrame',
  brush: 'brush',
  eraser: 'eraser',
  laser: 'laser',
  default: undefined,
  preview: undefined,
  textedition: undefined,
  contextMenu: undefined,
  eyedropper: undefined
}

/** The drag of the pointer running: a pan of the view, or a gesture of a mode of the selection */
const getDragType = ({ interaction }: InternalState): GestureType | undefined =>
  interaction.panStart ? 'pan' : GESTURE_OF_MODE[interaction.selectionMode.mode]

/**
 * What a drag changes: a drag which changed none of them, like a click on a shape, is not measured. A part of the state
 * which a new gesture changes must be added
 */
const getDragTargets = ({ document, interaction, view }: InternalState): unknown[] => [
  document.shapes,
  interaction.selectionMode,
  interaction.selectionFrame,
  interaction.laserTrail,
  view.transformation
]

const createLayerMeasure = (): LayerMeasure => ({ draws: 0, totalDuration: 0, maxDuration: 0 })

type Gesture = {
  type: GestureType
  /** A drag of the pointer ends with its mode, the changes of the view with their pause */
  isDrag: boolean
  startTime: number
  /** Whether the gesture changed the drawing or the view */
  changed: boolean
  /** What the drag changes, when it started */
  targets: unknown[]
  /** Last change of the view, or end of the last draw of a layer: a gesture of the view ends there, after its pause */
  lastActivityTime: number
  pauseTimeout: ReturnType<typeof setTimeout> | undefined
  frameTimes: number[]
  frame: number
  layers: Record<CanvasLayer, LayerMeasure>
  shapeCount: number
  selectedCount: number
}

/** The value at a rank of sorted values, like 0.95 for the 95th percentile, 0 without values */
const getPercentile = (sorted: number[], rank: number) => (sorted.length ? sorted[Math.ceil(rank * sorted.length) - 1]! : 0)

const buildGestureMeasure = (gesture: Gesture, endTime: number, { view }: InternalState): GestureMeasure => {
  // the frames of the pause which ends a gesture of the view are left out
  const frameTimes = gesture.frameTimes.filter(time => time <= endTime)
  const intervals = frameTimes
    .slice(1)
    .map((time, index) => time - frameTimes[index]!)
    .sort((a, b) => a - b)
  const duration = endTime - gesture.startTime
  return {
    type: gesture.type,
    startTime: gesture.startTime,
    duration,
    frames: frameTimes.length,
    fps: duration > 0 ? (frameTimes.length / duration) * 1000 : 0,
    frameIntervals: { p50: getPercentile(intervals, 0.5), p95: getPercentile(intervals, 0.95), max: intervals.at(-1) ?? 0 },
    longFrames: intervals.filter(interval => interval > LONG_FRAME_MS).length,
    shapesLayer: gesture.layers.shapes,
    selectionLayer: gesture.layers.selection,
    shapeCount: gesture.shapeCount,
    selectedCount: gesture.selectedCount,
    zoom: view.transformation.zoom,
    pixelRatio: view.pixelRatio
  }
}

export type PerformanceMonitor = {
  /**
   * Draws a layer, and measures the draw while frameDrawn or gestureMeasured is listened. The draw of the shapes is given
   * counters of the shapes while frameDrawn is listened
   */
  measureDraw: <T>(layer: CanvasLayer, canvas: HTMLCanvasElement, draw: (stats: DrawStats | undefined) => T) => T
  stop: () => void
}

/**
 * Measures the draws of the layers of a Canvas for frameDrawn, and its gestures for gestureMeasured. It costs nothing
 * while they are not listened: no time is read, and no frame loop runs
 */
export const createPerformanceMonitor = (store: PaintStore): PerformanceMonitor => {
  let gesture: Gesture | undefined
  let transformation = store.getState().view.transformation
  let isStopped = false

  const startGesture = (type: GestureType, isDrag: boolean, state: InternalState) => {
    const startTime = performance.now()
    const started: Gesture = {
      type,
      isDrag,
      startTime,
      changed: !isDrag,
      targets: isDrag ? getDragTargets(state) : [],
      lastActivityTime: startTime,
      pauseTimeout: undefined,
      frameTimes: [],
      frame: 0,
      layers: { shapes: createLayerMeasure(), selection: createLayerMeasure() },
      shapeCount: getShapeLeaves(state.document.shapes).length,
      selectedCount: getSelectedLeaves(state.document.selectedShape).length
    }
    // the frames are counted only during a gesture
    const countFrame = (time: number) => {
      started.frameTimes.push(time)
      started.frame = requestAnimationFrame(countFrame)
    }
    started.frame = requestAnimationFrame(countFrame)
    gesture = started
  }

  const dropGesture = () => {
    if (!gesture) return
    cancelAnimationFrame(gesture.frame)
    clearTimeout(gesture.pauseTimeout)
    gesture = undefined
  }

  /** A drag ends now, the changes of the view with the draw of their last change */
  const endGesture = () => {
    const ended = gesture
    dropGesture()
    if (!ended?.changed || !store.hasListeners('gestureMeasured')) return
    store.emit('gestureMeasured', buildGestureMeasure(ended, ended.isDrag ? performance.now() : ended.lastActivityTime, store.getState()))
  }

  const unsubscribe = store.subscribe(() => {
    const state = store.getState()
    const previousTransformation = transformation
    transformation = state.view.transformation
    if (!gesture && !store.hasListeners('gestureMeasured')) return

    const dragType = getDragType(state)
    if (gesture?.isDrag && dragType === gesture.type) {
      if (!gesture.changed && !shallowEqual(getDragTargets(state), gesture.targets)) gesture.changed = true
      return
    }
    // a drag ends with its mode, and ends the changes of the view before it
    if (gesture && (gesture.isDrag || dragType)) endGesture()
    if (dragType) {
      if (store.hasListeners('gestureMeasured')) startGesture(dragType, true, state)
      return
    }

    if (transformation === previousTransformation) return
    if (!gesture) startGesture('pan', false, state)
    const viewGesture = gesture!
    if (transformation.zoom !== previousTransformation.zoom) viewGesture.type = 'zoom'
    viewGesture.lastActivityTime = performance.now()
    clearTimeout(viewGesture.pauseTimeout)
    viewGesture.pauseTimeout = setTimeout(endGesture, VIEW_GESTURE_PAUSE_MS)
  })

  const measureDraw: PerformanceMonitor['measureDraw'] = (layer, canvas, draw) => {
    const isFrameListened = store.hasListeners('frameDrawn')
    if (isStopped || (!gesture && !isFrameListened)) return draw(undefined)
    const stats: DrawStats = { drawnShapes: 0, culledShapes: 0, layeredShapes: 0 }
    const startTime = performance.now()
    const result = draw(layer === 'shapes' && isFrameListened ? stats : undefined)
    const endTime = performance.now()
    const duration = endTime - startTime
    if (gesture) {
      const layerMeasure = gesture.layers[layer]
      layerMeasure.draws++
      layerMeasure.totalDuration += duration
      layerMeasure.maxDuration = Math.max(layerMeasure.maxDuration, duration)
      gesture.lastActivityTime = endTime
    }
    if (isFrameListened) {
      store.emit('frameDrawn', {
        layer,
        startTime,
        duration,
        ...stats,
        pixelWidth: canvas.width,
        pixelHeight: canvas.height,
        pixelRatio: store.getState().view.pixelRatio
      })
    }
    return result
  }

  return {
    measureDraw,
    stop: () => {
      isStopped = true
      unsubscribe()
      dropGesture()
    }
  }
}
