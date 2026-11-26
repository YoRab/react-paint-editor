import type { Point, ReactPaint } from '../../../src/index'

type ClientPosition = { x: number; y: number }

/**
 * A replayed gesture sends one event in each of these frames, 2 seconds at 60 frames per second, like a pointer moved
 * at the speed of the screen
 */
const FRAMES = 120
/** Longer than the pause which ends a gesture of the view, measured on its own */
const VIEW_PAUSE_MS = 200
/** Radius of the circles of the drag and of the pan, in pixels */
const RADIUS = 100

const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve))
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** The point of a frame on a circle which starts at the top and ends there, from its center */
const getCirclePoint = (frame: number): Point => {
  const angle = (2 * Math.PI * (frame + 1)) / FRAMES
  return [RADIUS * Math.sin(angle), RADIUS * (1 - Math.cos(angle))]
}

/** Sends the event of each frame, then waits for the frame */
const playFrames = async (send: (frame: number) => void) => {
  for (let frame = 0; frame < FRAMES; frame++) {
    send(frame)
    await nextFrame()
  }
}

/** The position in the page of a point of the drawing */
const toClient = (paint: ReactPaint, point: Point) => {
  const position = paint.toClientPosition(point)
  if (!position) throw new Error('The canvas is not in the page')
  return position
}

/**
 * The position in the page of a point of the drawing, and the element there, which receives the events of the gesture
 * like the ones of a real pointer: the canvas of the shapes
 */
const getTarget = (paint: ReactPaint, point: Point) => {
  const position = toClient(paint, point)
  const element = document.elementFromPoint(position.x, position.y)
  if (!element) throw new Error(`The point ${point.join(', ')} of the drawing is out of the page`)
  return { position, element }
}

const dispatchPointer = (target: Element, type: string, { x, y }: ClientPosition, init: PointerEventInit) =>
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: x,
      clientY: y,
      ...init
    })
  )

const dispatchWheel = (target: Element, { x, y }: ClientPosition, init: WheelEventInit) =>
  target.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, ...init }))

/**
 * Resets the view and clears the selection, then waits for the end of the gesture of the view. A replay starts from
 * there, so that its figures compare from one replay, or one machine, to the other
 */
const resetView = async (paint: ReactPaint) => {
  paint.actions.resetZoom()
  paint.actions.selectShapes([])
  await wait(VIEW_PAUSE_MS)
}

/** Presses the main button at a point of the drawing, moves it along a path of points, and releases it at its end */
const drag = async (paint: ReactPaint, from: Point, getPoint: (frame: number) => Point) => {
  const { position, element } = getTarget(paint, from)
  dispatchPointer(element, 'pointerdown', position, { button: 0, buttons: 1 })
  await nextFrame()
  await playFrames(frame => dispatchPointer(element, 'pointermove', toClient(paint, getPoint(frame)), { buttons: 1 }))
  dispatchPointer(element, 'pointerup', toClient(paint, getPoint(FRAMES - 1)), { button: 0 })
}

/** Drags the shape under a point of the drawing around a circle, back to its place */
export const replayDrag = async (paint: ReactPaint, from: Point) => {
  await resetView(paint)
  await drag(paint, from, frame => {
    const [x, y] = getCirclePoint(frame)
    return [from[0] + x, from[1] + y]
  })
}

/** Scrolls the view around a circle with the wheel, over a point of the drawing */
export const replayPan = async (paint: ReactPaint, center: Point) => {
  await resetView(paint)
  const { position, element } = getTarget(paint, center)
  // whole pixels between rounded points of the circle: their sum is exactly a whole turn, and the view ends where it started
  let previous: Point = [0, 0]
  await playFrames(frame => {
    const [x, y] = getCirclePoint(frame).map(Math.round) as Point
    dispatchWheel(element, position, { deltaX: x - previous[0], deltaY: y - previous[1] })
    previous = [x, y]
  })
  await wait(VIEW_PAUSE_MS)
}

/**
 * Zooms in on a point of the drawing with the wheel, then out. The zoom of a step out does not undo the one of a step
 * in exactly: the view is reset at the end, in the same gesture, else the next replay would measure its reset first
 */
export const replayZoom = async (paint: ReactPaint, center: Point) => {
  await resetView(paint)
  const { position, element } = getTarget(paint, center)
  await playFrames(frame => dispatchWheel(element, position, { ctrlKey: true, deltaY: frame < FRAMES / 2 ? -10 : 10 }))
  await resetView(paint)
}

/** Draws a stroke of the brush along a wave between two points of the drawing, then selects the previous tool again */
export const replayBrush = async (paint: ReactPaint, from: Point, to: Point) => {
  await resetView(paint)
  const { activeTool, tools } = paint.getState()
  const brush = tools.find(tool => tool.type === 'brush')
  if (!brush) throw new Error('The canvas has no brush tool')
  paint.actions.selectTool(brush.id)
  try {
    await drag(paint, from, frame => {
      const ratio = (frame + 1) / FRAMES
      return [from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio + Math.sin(ratio * 8 * Math.PI) * 40]
    })
  } finally {
    paint.actions.selectTool(activeTool)
  }
}
