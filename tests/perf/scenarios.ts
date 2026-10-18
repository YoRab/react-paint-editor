import { expect } from 'vitest'
import type { Point, ShapeInput, UseReactPaintOptions } from '../../src/index'
import type { PerfApp } from './fixture'
import { nextFrame, waitFor } from './metrics'
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  generateMixedShapes,
  generateOutlinedShapes,
  generatePictures,
  generateTransparentShapes,
  getShapeCenter,
  OUTLINE_ID,
  SHAPES_AREA
} from './shapes'

export type ScenarioContext = {
  app: PerfApp
  shapes: ShapeInput[]
  /** Number of events sent in each frame: 1 stands for a 60 Hz mouse, 2 for 120 Hz… */
  eventsPerFrame: number
}

/** Maximum counts during the gesture: they are deterministic, unlike the times */
export type Criteria = {
  /** Renders of the host, and of its sibling */
  hostRenders?: number
  probeCommits?: number
  canvasCommits?: number
}

export type Scenario = {
  id: string
  /** Options given to useReactPaint */
  options?: UseReactPaintOptions
  /** Shapes of the drawing, from the number of shapes measured: a grid of opaque rectangles by default */
  generate?: (count: number) => ShapeInput[] | Promise<ShapeInput[]>
  /** Listens to dataChanged, like an automatic save */
  listenData?: boolean
  /** Prepares the app, outside of the measure */
  setup?: (context: ScenarioContext) => Promise<void>
  /** The measured gesture */
  run: (context: ScenarioContext) => Promise<void>
  /** Checks that the gesture did its job, so that a gesture broken by an API change is never measured */
  verify: (context: ScenarioContext) => void
  criteria?: Criteria
}

// ─── DOM helpers ───────────────────────────────────────────────────────────────

const getDrawCanvas = () => {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="draw-canvas"]')
  if (!canvas) throw new Error('No draw canvas')
  return canvas
}

const toClient = ([x, y]: Point) => {
  const rect = getDrawCanvas().getBoundingClientRect()
  return { clientX: rect.left + (x * rect.width) / CANVAS_WIDTH, clientY: rect.top + (y * rect.height) / CANVAS_HEIGHT }
}

/** The selection canvas lets pointer events through: the draw canvas is the target of real events */
const dispatchPointer = (type: string, point: Point, init: PointerEventInit = {}) =>
  getDrawCanvas().dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      ...toClient(point),
      ...init
    })
  )

const dispatchWheel = (point: Point, init: WheelEventInit) =>
  getDrawCanvas().dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, ...toClient(point), ...init }))

const clickButton = (testId: string) => {
  const button = document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)
  if (!button) throw new Error(`No button ${testId}`)
  button.click()
}

/** Gives the focus to the canvas, which receives the keyboard shortcuts, then waits for the listeners to be set */
export const focusCanvas = async () => {
  getDrawCanvas().focus()
  await nextFrame()
  await nextFrame()
}

const interpolate = (from: Point, to: Point, steps: number): Point[] =>
  Array.from({ length: steps }, (_, index) => {
    const ratio = (index + 1) / steps
    return [from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio]
  })

/** Sends one event per item, `eventsPerFrame` events in each frame */
const playPoints = async <T>(items: T[], eventsPerFrame: number, send: (item: T) => void) => {
  for (let index = 0; index < items.length; index++) {
    send(items[index]!)
    if ((index + 1) % eventsPerFrame === 0) await nextFrame()
  }
  await nextFrame()
}

/** Presses the main button at the first point, moves through the others and releases it at the last one */
const drag = async (start: Point, points: Point[], eventsPerFrame: number) => {
  dispatchPointer('pointerdown', start, { button: 0, buttons: 1 })
  await nextFrame()
  await playPoints(points, eventsPerFrame, point => dispatchPointer('pointermove', point, { buttons: 1 }))
  dispatchPointer('pointerup', points[points.length - 1]!, { button: 0 })
  await nextFrame()
}

const getShapeX = (app: PerfApp, id: string) => {
  const shape = app.getState().shapes.find(item => item.id === id)
  return shape?.type === 'rect' || shape?.type === 'picture' ? shape.x : undefined
}

/** The brush tool may be inside a group of the toolbar, to open first */
const selectBrushTool = async (app: PerfApp) => {
  if (!document.querySelector('[data-testid="tool-brush"]')) {
    document.querySelector<HTMLButtonElement>('button[title="brush"]')?.click()
    await nextFrame()
  }
  clickButton('tool-brush')
  await waitFor(() => app.getState().activeTool.type === 'brush', 'brush tool selected')
  await focusCanvas()
}

// ─── Scenarios ─────────────────────────────────────────────────────────────────

const MOVES = 300

/** No render of the consumer nor of the canvas during a gesture, and a single save of the history at its end */
const GESTURE_CRITERIA: Criteria = { hostRenders: 0, probeCommits: 1, canvasCommits: 0 }

const hover: Scenario = {
  id: 'hover',
  run: async ({ shapes, eventsPerFrame }) => {
    const points = interpolate(getShapeCenter(shapes[0]!), getShapeCenter(shapes[shapes.length - 1]!), MOVES)
    await playPoints(points, eventsPerFrame, point => dispatchPointer('pointermove', point))
  },
  verify: ({ app }) => {
    expect(app.getState().interaction.hoveredShape).toBeDefined()
    expect(app.getState().selectedShapes).toHaveLength(0)
  },
  criteria: { ...GESTURE_CRITERIA, probeCommits: 0 }
}

/** Drag of a shape by 150 px: the one found by `pick` among the generated shapes, the middle one by default */
const createTranslateScenario = ({
  id,
  pick = shapes => Math.floor(shapes.length / 2),
  ...scenario
}: Pick<Scenario, 'id' | 'generate' | 'options'> & { pick?: (shapes: ShapeInput[]) => number }): Scenario => {
  let translatedShape: { id: string; x: number | undefined } | undefined
  let index = 0
  return {
    id,
    ...scenario,
    setup: async ({ app, shapes }) => {
      index = pick(shapes)
      const shape = app.getState().shapes[index]!
      translatedShape = { id: shape.id, x: getShapeX(app, shape.id) }
    },
    run: async ({ shapes, eventsPerFrame }) => {
      const start = getShapeCenter(shapes[index]!)
      await drag(start, interpolate(start, [start[0] + 150, start[1] + 30], MOVES), eventsPerFrame)
    },
    verify: ({ app }) => {
      const { id: shapeId, x } = translatedShape!
      expect(app.getState().selectedShapes.map(shape => shape.id)).toEqual([shapeId])
      expect(getShapeX(app, shapeId)).toBeCloseTo(x! + 150, 0)
    },
    criteria: GESTURE_CRITERIA
  }
}

const translate = createTranslateScenario({ id: 'translate' })

const opacity = createTranslateScenario({ id: 'opacity', generate: generateTransparentShapes })

/** The rectangle closest to the middle of the drawing: the other types of shapes are not filled or not centered */
const pickMiddleRect = (shapes: ShapeInput[]) => {
  const middle = Math.floor(shapes.length / 2)
  const rects = shapes.map((shape, index) => (shape.type === 'rect' ? index : -1)).filter(index => index >= 0)
  return rects.reduce((closest, index) => (Math.abs(index - middle) < Math.abs(closest - middle) ? index : closest))
}

const mixed = createTranslateScenario({ id: 'mixed', generate: generateMixedShapes, pick: pickMiddleRect })

// the first picture is in the foreground
const pictures = createTranslateScenario({ id: 'pictures', generate: generatePictures, pick: () => 0 })

const frame: Scenario = {
  id: 'frame',
  run: async ({ eventsPerFrame }) => {
    // Starts in the empty band below the shapes, and ends close to the corner to trigger the auto scroll
    const start: Point = [SHAPES_AREA.width - 60, SHAPES_AREA.height + 40]
    await drag(start, interpolate(start, [20, 20], MOVES), eventsPerFrame)
  },
  verify: ({ app, shapes }) => {
    expect(app.getState().selectedShapes.length).toBeGreaterThan(shapes.length / 2)
    expect(app.getState().interaction.selectionFrame).toBeUndefined()
  },
  criteria: { ...GESTURE_CRITERIA, probeCommits: 0 }
}

const frameInside: Scenario = {
  id: 'frame-inside',
  generate: generateOutlinedShapes,
  run: async ({ eventsPerFrame }) => {
    // The frame stays inside the large rectangle, without crossing its stroke nor coming close to the borders
    const start: Point = [SHAPES_AREA.width - 60, SHAPES_AREA.height + 40]
    await drag(start, interpolate(start, [100, 100], MOVES / 2), eventsPerFrame)
  },
  verify: ({ app }) => {
    const selectedIds = app.getState().selectedShapes.map(shape => shape.id)
    expect(selectedIds.length).toBeGreaterThan(0)
    expect(selectedIds).not.toContain(OUTLINE_ID)
  },
  criteria: { ...GESTURE_CRITERIA, probeCommits: 0 }
}

const WHEELS = 200

const pan: Scenario = {
  id: 'pan',
  options: { size: 'infinite', canZoom: 'always' },
  run: async ({ eventsPerFrame }) => {
    const center: Point = [CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2]
    const points = Array.from({ length: WHEELS }, () => center)
    await playPoints(points, eventsPerFrame, point => dispatchWheel(point, { deltaX: 2, deltaY: 5 }))
  },
  verify: ({ app }) => {
    const [x, y] = app.getState().view.offset
    expect(x).toBeCloseTo(-2 * WHEELS, 0)
    expect(y).toBeCloseTo(-5 * WHEELS, 0)
  },
  criteria: { hostRenders: 0, probeCommits: 0 }
}

const ZOOM_IN_WHEELS = 150

const createZoomScenario = (scenario: Pick<Scenario, 'id' | 'generate'>): Scenario => ({
  ...scenario,
  options: { size: 'infinite', canZoom: 'always' },
  run: async ({ eventsPerFrame }) => {
    // ctrl + wheel, as a pinch of a trackpad: zooms in, then out a little. Each event changes the zoom
    const center: Point = [CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2]
    const deltas = Array.from({ length: WHEELS }, (_, index) => (index < ZOOM_IN_WHEELS ? -5 : 5))
    await playPoints(deltas, eventsPerFrame, deltaY => dispatchWheel(center, { ctrlKey: true, deltaY }))
  },
  verify: ({ app }) => {
    const expectedZoom = 1.005 ** ZOOM_IN_WHEELS * 0.995 ** (WHEELS - ZOOM_IN_WHEELS)
    expect(app.getState().view.zoom).toBeCloseTo(expectedZoom, 2)
  },
  criteria: { hostRenders: 0, probeCommits: 0 }
})

const zoom = createZoomScenario({ id: 'zoom' })

const zoomMixed = createZoomScenario({ id: 'zoom-mixed', generate: generateMixedShapes })

/** A stroke of the brush, along a wave */
const drawStroke = (from: Point, to: Point, moves: number, eventsPerFrame: number) =>
  drag(
    from,
    interpolate(from, to, moves).map(([x, y], index): Point => [x, y + Math.sin(index / 10) * 20]),
    eventsPerFrame
  )

const brush: Scenario = {
  id: 'brush',
  setup: async ({ app }) => selectBrushTool(app),
  run: async ({ eventsPerFrame }) => drawStroke([100, 550], [900, 520], MOVES, eventsPerFrame),
  verify: ({ app, shapes }) => {
    const { shapes: currentShapes } = app.getState()
    expect(currentShapes).toHaveLength(shapes.length + 1)
    const brushShape = currentShapes.find(shape => shape.type === 'brush')
    expect(brushShape?.type === 'brush' ? brushShape.points.flat().length : 0).toBeGreaterThan(MOVES / 2)
  },
  criteria: GESTURE_CRITERIA
}

const LONG_BRUSH_STROKES = 4

const longBrush: Scenario = {
  id: 'long-brush',
  // the strokes are added to the same shape, which keeps growing
  options: { isBrushShapeDoneOnMouseUp: false },
  setup: async ({ app }) => selectBrushTool(app),
  run: async ({ eventsPerFrame }) => {
    for (let stroke = 0; stroke < LONG_BRUSH_STROKES; stroke++) {
      const y = 100 + stroke * 120
      await drawStroke([50, y], [950, y + 30], MOVES, eventsPerFrame)
    }
  },
  verify: ({ app, shapes }) => {
    const { shapes: currentShapes } = app.getState()
    expect(currentShapes).toHaveLength(shapes.length + 1)
    const brushShape = currentShapes.find(shape => shape.type === 'brush')
    expect(brushShape?.type === 'brush' ? brushShape.points.length : 0).toBe(LONG_BRUSH_STROKES)
    expect(brushShape?.type === 'brush' ? brushShape.points.flat().length : 0).toBeGreaterThan((LONG_BRUSH_STROKES * MOVES) / 2)
  },
  criteria: { ...GESTURE_CRITERIA, probeCommits: LONG_BRUSH_STROKES }
}

const UNDO_CLICKS = 20

/** Clicks alternating undo and redo in the toolbar, after the removal of a shape */
const createUndoScenario = ({ id, listenData = false }: Pick<Scenario, 'id' | 'listenData'>): Scenario => {
  let dataEventsBefore = 0
  return {
    id,
    listenData,
    setup: async ({ app, shapes }) => {
      // Selects then removes a shape, to have an action to undo
      const center = getShapeCenter(shapes[0]!)
      dispatchPointer('pointerdown', center, { button: 0, buttons: 1 })
      await nextFrame()
      dispatchPointer('pointerup', center, { button: 0 })
      await nextFrame()
      // the keyboard events are sent to the focused element, the canvas after a click
      const focusedElement = document.activeElement ?? document.body
      focusedElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }))
      await nextFrame()
      dataEventsBefore = app.getDataEvents()
    },
    run: async () => {
      for (let index = 0; index < UNDO_CLICKS; index++) {
        clickButton(index % 2 === 0 ? 'tool-undo' : 'tool-redo')
        await nextFrame()
      }
      await nextFrame()
    },
    verify: ({ app, shapes }) => {
      expect(app.getState().shapes).toHaveLength(shapes.length - 1)
      expect(app.getState().history.canUndo).toBe(true)
      // one event for each click
      if (listenData) expect(app.getDataEvents() - dataEventsBefore).toBe(UNDO_CLICKS)
    }
  }
}

const undo = createUndoScenario({ id: 'undo' })

const undoAutosave = createUndoScenario({ id: 'undo-autosave', listenData: true })

export const SCENARIOS: Scenario[] = [
  hover,
  translate,
  frame,
  pan,
  brush,
  undo,
  zoom,
  zoomMixed,
  opacity,
  mixed,
  pictures,
  longBrush,
  frameInside,
  undoAutosave
]
