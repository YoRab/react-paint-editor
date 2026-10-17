import { expect } from 'vitest'
import type { DrawableShape, Point, UseReactPaintOptions } from '../../src/index'
import type { PerfApp } from './fixture'
import { nextFrame, waitFor } from './metrics'
import { CANVAS_HEIGHT, CANVAS_WIDTH, getShapeCenter, SHAPES_AREA } from './shapes'

export type ScenarioContext = {
  app: PerfApp
  shapes: DrawableShape[]
  /** Number of events sent in each frame: 1 stands for a 60 Hz mouse, 2 for 120 Hz… */
  eventsPerFrame: number
}

export type Scenario = {
  id: string
  /** Options given to useReactPaint */
  options?: UseReactPaintOptions
  /** Prepares the app, outside of the measure */
  setup?: (context: ScenarioContext) => Promise<void>
  /** The measured gesture */
  run: (context: ScenarioContext) => Promise<void>
  /** Checks that the gesture did its job, so that a gesture broken by an API change is never measured */
  verify: (context: ScenarioContext) => void
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

/** Sends one event per point, `eventsPerFrame` events in each frame */
const playPoints = async (points: Point[], eventsPerFrame: number, send: (point: Point) => void) => {
  for (let index = 0; index < points.length; index++) {
    send(points[index]!)
    if ((index + 1) % eventsPerFrame === 0) await nextFrame()
  }
  await nextFrame()
}

const getShapeX = (app: PerfApp, id: string) => {
  const shape = app.getState().shapes.find(item => item.id === id)
  return shape?.type === 'rect' ? shape.x : undefined
}

// ─── Scenarios ─────────────────────────────────────────────────────────────────

const MOVES = 300

const hover: Scenario = {
  id: 'hover',
  run: async ({ shapes, eventsPerFrame }) => {
    const points = interpolate(getShapeCenter(shapes[0]!), getShapeCenter(shapes[shapes.length - 1]!), MOVES)
    await playPoints(points, eventsPerFrame, point => dispatchPointer('pointermove', point))
  },
  verify: ({ app }) => {
    expect(app.getState().interaction.hoveredShape).toBeDefined()
    expect(app.getState().selectedShapes).toHaveLength(0)
  }
}

let translatedShape: { id: string; x: number | undefined } | undefined

const translate: Scenario = {
  id: 'translate',
  setup: async ({ app }) => {
    const shape = app.getState().shapes[Math.floor(app.getState().shapes.length / 2)]!
    translatedShape = { id: shape.id, x: getShapeX(app, shape.id) }
  },
  run: async ({ app, shapes, eventsPerFrame }) => {
    const index = app.getState().shapes.findIndex(shape => shape.id === translatedShape!.id)
    const start = getShapeCenter(shapes[index]!)
    dispatchPointer('pointerdown', start, { button: 0, buttons: 1 })
    await nextFrame()
    const points = interpolate(start, [start[0] + 150, start[1] + 30], MOVES)
    await playPoints(points, eventsPerFrame, point => dispatchPointer('pointermove', point, { buttons: 1 }))
    dispatchPointer('pointerup', points[points.length - 1]!, { button: 0 })
    await nextFrame()
  },
  verify: ({ app }) => {
    const { id, x } = translatedShape!
    expect(app.getState().selectedShapes.map(shape => shape.id)).toEqual([id])
    expect(getShapeX(app, id)).toBeCloseTo(x! + 150, 0)
  }
}

const frame: Scenario = {
  id: 'frame',
  run: async ({ eventsPerFrame }) => {
    // Starts in the empty band below the shapes, and ends close to the corner to trigger the auto scroll
    const start: Point = [SHAPES_AREA.width - 60, SHAPES_AREA.height + 40]
    dispatchPointer('pointerdown', start, { button: 0, buttons: 1 })
    await nextFrame()
    const points = interpolate(start, [20, 20], MOVES)
    await playPoints(points, eventsPerFrame, point => dispatchPointer('pointermove', point, { buttons: 1 }))
    dispatchPointer('pointerup', points[points.length - 1]!, { button: 0 })
    await nextFrame()
  },
  verify: ({ app, shapes }) => {
    expect(app.getState().selectedShapes.length).toBeGreaterThan(shapes.length / 2)
    expect(app.getState().interaction.selectionFrame).toBeUndefined()
  }
}

const WHEELS = 200

const pan: Scenario = {
  id: 'pan',
  options: { size: 'infinite', canZoom: 'always' },
  run: async ({ eventsPerFrame }) => {
    const center: Point = [CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2]
    const points = Array.from({ length: WHEELS }, () => center)
    await playPoints(points, eventsPerFrame, point =>
      getDrawCanvas().dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaX: 2, deltaY: 5, ...toClient(point) }))
    )
  },
  verify: ({ app }) => {
    const [x, y] = app.getState().view.offset
    expect(x).toBeCloseTo(-2 * WHEELS, 0)
    expect(y).toBeCloseTo(-5 * WHEELS, 0)
  }
}

const brush: Scenario = {
  id: 'brush',
  setup: async ({ app }) => {
    // The brush tool may be inside a group of the toolbar, to open first
    if (!document.querySelector('[data-testid="tool-brush"]')) {
      document.querySelector<HTMLButtonElement>('button[title="brush"]')?.click()
      await nextFrame()
    }
    clickButton('tool-brush')
    await waitFor(() => app.getState().activeTool.type === 'brush', 'brush tool selected')
    await focusCanvas()
  },
  run: async ({ eventsPerFrame }) => {
    const start: Point = [100, 550]
    dispatchPointer('pointerdown', start, { button: 0, buttons: 1 })
    await nextFrame()
    const points = interpolate(start, [900, 520], MOVES).map(([x, y], index): Point => [x, y + Math.sin(index / 10) * 20])
    await playPoints(points, eventsPerFrame, point => dispatchPointer('pointermove', point, { buttons: 1 }))
    dispatchPointer('pointerup', points[points.length - 1]!, { button: 0 })
    await nextFrame()
  },
  verify: ({ app, shapes }) => {
    const { shapes: currentShapes } = app.getState()
    expect(currentShapes).toHaveLength(shapes.length + 1)
    const brushShape = currentShapes.find(shape => shape.type === 'brush')
    expect(brushShape?.type === 'brush' ? brushShape.points.flat().length : 0).toBeGreaterThan(MOVES / 2)
  }
}

const UNDO_CLICKS = 20

const undo: Scenario = {
  id: 'undo',
  setup: async ({ shapes }) => {
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
  }
}

export const SCENARIOS: Scenario[] = [hover, translate, frame, pan, brush, undo]
