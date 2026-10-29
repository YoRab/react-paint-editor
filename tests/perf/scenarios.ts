import { expect } from 'vitest'
import type { EditorState, Point, ShapeInput, UseReactPaintOptions } from '../../src/index'
import type { PerfApp } from './fixture'
import { nextFrame, waitFor } from './metrics'
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  generateGroup,
  generateLongBrush,
  generateMixedShapes,
  generateNestedGroups,
  generateOutlinedShapes,
  generatePictures,
  generateTransparentShapes,
  getGrabPoint,
  getLeaves,
  getPhotoFile,
  getShapeCenter,
  LONG_BRUSH_STROKES,
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

const getElement = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`No element ${selector}`)
  return element
}

const getDrawCanvas = () => getElement<HTMLCanvasElement>('[data-testid="draw-canvas"]')

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

const clickButton = (testId: string) => getElement<HTMLButtonElement>(`[data-testid="${testId}"]`).click()

/** Presses a key in the focused element, the canvas after a click or focusCanvas: it receives the keyboard shortcuts */
const pressKey = (key: string, init: KeyboardEventInit = {}) =>
  (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }))

/** The indexes of a number of clicks, to send with playPoints */
const clicks = (count: number) => Array.from({ length: count }, (_, index) => index)

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

type StateShape = EditorState['shapes'][number]

/** Abscissa of a rectangle or a picture, or of the first point of a brush */
const getShapeX = (shape: StateShape) => {
  if (shape.type === 'brush') return shape.points[0]![0]![0]
  return shape.type === 'rect' || shape.type === 'picture' ? shape.x : undefined
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

/** 300 moves from the first shape drawn to the last one, without button: the shape hovered at the end has this type */
const createHoverScenario = ({ hoveredType, ...scenario }: Pick<Scenario, 'id' | 'generate'> & { hoveredType: StateShape['type'] }): Scenario => ({
  ...scenario,
  run: async ({ shapes, eventsPerFrame }) => {
    const leaves = getLeaves(shapes)
    const points = interpolate(getShapeCenter(leaves[0]!), getShapeCenter(leaves[leaves.length - 1]!), MOVES)
    await playPoints(points, eventsPerFrame, point => dispatchPointer('pointermove', point))
  },
  verify: ({ app }) => {
    expect(app.getState().interaction.hoveredShape?.type).toBe(hoveredType)
    expect(app.getState().selectedShapes).toHaveLength(0)
  },
  criteria: { ...GESTURE_CRITERIA, probeCommits: 0 }
})

const hover = createHoverScenario({ id: 'hover', hoveredType: 'rect' })

// a move over a group hovers the group
const hoverGroups = createHoverScenario({ id: 'hover-groups', generate: generateNestedGroups, hoveredType: 'group' })

/**
 * Drag of a shape by 150 px: the one found by `pick` among the generated shapes, the middle one by default. With
 * `selectAll`, all the shapes are selected first, and dragged together from this one
 */
const createTranslateScenario = ({
  id,
  pick = shapes => Math.floor(shapes.length / 2),
  selectAll = false,
  ...scenario
}: Pick<Scenario, 'id' | 'generate' | 'options'> & { pick?: (shapes: ShapeInput[]) => number; selectAll?: boolean }): Scenario => {
  let movedIds: string[] = []
  // the shapes drawn by the moved shapes, which move with them
  let movedLeaves: { id: string; x: number | undefined }[] = []
  let index = 0
  return {
    id,
    ...scenario,
    setup: async ({ app, shapes }) => {
      index = pick(shapes)
      if (selectAll) {
        pressKey('a', { ctrlKey: true })
        await waitFor(() => app.getState().selectedShapes.length === shapes.length, 'all the shapes selected')
      }
      const currentShapes = app.getState().shapes
      const movedShapes = selectAll ? currentShapes : [currentShapes[index]!]
      movedIds = movedShapes.map(shape => shape.id)
      movedLeaves = getLeaves(movedShapes).map(shape => ({ id: shape.id, x: getShapeX(shape) }))
    },
    run: async ({ shapes, eventsPerFrame }) => {
      const start = getGrabPoint(shapes[index]!)
      await drag(start, interpolate(start, [start[0] + 150, start[1] + 30], MOVES), eventsPerFrame)
    },
    verify: ({ app }) => {
      const { selectedShapes } = app.getState()
      expect(selectedShapes.map(shape => shape.id)).toEqual(movedIds)
      const leaves = getLeaves(selectedShapes)
      expect(leaves.map(shape => shape.id)).toEqual(movedLeaves.map(shape => shape.id))
      for (const [position, shape] of leaves.entries()) expect(getShapeX(shape)).toBeCloseTo(movedLeaves[position]!.x! + 150, 0)
    },
    criteria: GESTURE_CRITERIA
  }
}

const translate = createTranslateScenario({ id: 'translate' })

const translateAll = createTranslateScenario({ id: 'translate-all', selectAll: true })

// the shapes of translate-all, in a single group of 3 levels
const translateGroup = createTranslateScenario({ id: 'translate-group', generate: generateGroup, pick: () => 0 })

// the brush is in the foreground
const translateLongBrush = createTranslateScenario({ id: 'translate-long-brush', generate: generateLongBrush, pick: () => 0 })

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
const createUndoScenario = ({ id, listenData = false, ...scenario }: Pick<Scenario, 'id' | 'listenData' | 'generate'>): Scenario => {
  let dataEventsBefore = 0
  return {
    id,
    listenData,
    ...scenario,
    setup: async ({ app, shapes }) => {
      // Selects then removes a shape, to have an action to undo
      const center = getGrabPoint(shapes[0]!)
      dispatchPointer('pointerdown', center, { button: 0, buttons: 1 })
      await nextFrame()
      dispatchPointer('pointerup', center, { button: 0 })
      await nextFrame()
      pressKey('Delete')
      await nextFrame()
      dataEventsBefore = app.getDataEvents()
    },
    run: async () => playPoints(clicks(UNDO_CLICKS), 1, index => clickButton(index % 2 === 0 ? 'tool-undo' : 'tool-redo')),
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

// a group of 25 rectangles is removed: each click exports the groups and compares them
const undoGroupsAutosave = createUndoScenario({ id: 'undo-groups-autosave', generate: generateNestedGroups, listenData: true })

const LAYER_CLICKS = 20

const VISIBILITY_BUTTONS = '.react-paint-editor-layouts-visible-button'

/** Clicks alternating hiding and showing the middle shape in the panel of the layers: each click saves the shapes again */
const createLayersScenario = ({ id, listenData = false }: Pick<Scenario, 'id' | 'listenData'>): Scenario => {
  let visibilityButton: HTMLButtonElement | undefined
  let shapeId = ''
  let dataEventsBefore = 0
  return {
    id,
    listenData,
    setup: async ({ app }) => {
      getElement<HTMLButtonElement>('button[title="Toggle layers panel"]').click()
      await waitFor(() => document.querySelectorAll(VISIBILITY_BUTTONS).length === app.getState().shapes.length, 'layers panel shown')
      // the panel narrows the canvas, resized in the next frame
      await nextFrame()
      await nextFrame()
      const { shapes } = app.getState()
      const index = Math.floor(shapes.length / 2)
      shapeId = shapes[index]!.id
      // a layer keeps its element while its shape changes
      visibilityButton = document.querySelectorAll<HTMLButtonElement>(VISIBILITY_BUTTONS)[index]
      dataEventsBefore = app.getDataEvents()
    },
    run: async () => playPoints(clicks(LAYER_CLICKS), 1, () => visibilityButton?.click()),
    verify: ({ app }) => {
      // an even number of clicks shows the shape again
      expect(app.getState().shapes.find(shape => shape.id === shapeId)?.visible).toBe(true)
      expect(app.getState().history.canUndo).toBe(true)
      if (listenData) expect(app.getDataEvents() - dataEventsBefore).toBe(LAYER_CLICKS)
    },
    // the first click gives something to undo
    criteria: GESTURE_CRITERIA
  }
}

const layers = createLayersScenario({ id: 'layers' })

const layersAutosave = createLayersScenario({ id: 'layers-autosave', listenData: true })

const ADDED_PICTURES = 3

const UPLOAD_INPUT = 'label[title="Upload picture"] input[type="file"]'

/** Adds photos from the menu of the toolbar, as files chosen by the user. Each one is added once loaded, then exported if listened */
const createAddPictureScenario = ({ id, listenData = false }: Pick<Scenario, 'id' | 'listenData'>): Scenario => {
  let files: FileList | null = null
  let dataEventsBefore = 0
  return {
    id,
    listenData,
    setup: async ({ app }) => {
      const transfer = new DataTransfer()
      transfer.items.add(await getPhotoFile())
      files = transfer.files
      dataEventsBefore = app.getDataEvents()
    },
    run: async ({ app }) => {
      for (let added = 0; added < ADDED_PICTURES; added++) {
        const shapesBefore = app.getState().shapes.length
        const dataEventsBeforePicture = app.getDataEvents()
        getElement<HTMLButtonElement>('button[title="Menu"]').click()
        await waitFor(() => !!document.querySelector(UPLOAD_INPUT), 'menu open')
        const input = getElement<HTMLInputElement>(UPLOAD_INPUT)
        input.files = files
        input.dispatchEvent(new Event('change', { bubbles: true }))
        await waitFor(
          () => app.getState().shapes.length > shapesBefore && (!listenData || app.getDataEvents() > dataEventsBeforePicture),
          'picture added'
        )
        // the picture is drawn
        await nextFrame()
      }
    },
    verify: ({ app, shapes }) => {
      const pictures = app.getState().shapes.filter(shape => shape.type === 'picture')
      expect(pictures).toHaveLength(ADDED_PICTURES)
      expect(app.getState().shapes).toHaveLength(shapes.length + ADDED_PICTURES)
      // one save for each picture
      if (listenData) expect(app.getDataEvents() - dataEventsBefore).toBe(ADDED_PICTURES)
    },
    // the first picture gives something to undo
    criteria: GESTURE_CRITERIA
  }
}

const addPicture = createAddPictureScenario({ id: 'add-picture' })

const addPictureAutosave = createAddPictureScenario({ id: 'add-picture-autosave', listenData: true })

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
  undoAutosave,
  layers,
  layersAutosave,
  translateAll,
  translateLongBrush,
  addPicture,
  addPictureAutosave,
  hoverGroups,
  translateGroup,
  undoGroupsAutosave
]
