import type { UtilsSettings } from '@canvas/constants/app'
import { SELECTION_RESIZE_ANCHOR_POSITIONS } from '@canvas/constants/shapes'
import type { Point, ShapeEntity, StyleShape } from '@canvas/types/Shapes'
import {
  checkSelectionFrameCollision,
  checkSelectionIntersection,
  getCursorPositionInTransformedCanvas,
  hasPointerMoved,
  shouldCancelLongPress
} from '@canvas/utils/intersect'
import { describe, expect, it, vi } from 'vitest'
import { createShape, stubPath2D } from './helpers'

stubPath2D()

const OUTLINED: StyleShape = { fillColor: 'transparent', strokeColor: 'black', lineWidth: 2 }

/** A context whose points are all in the shapes, or none of them */
const createContext = (isInShape: boolean) =>
  ({ lineWidth: 1, isPointInPath: vi.fn(() => isInShape), isPointInStroke: vi.fn(() => isInShape) }) as unknown as CanvasRenderingContext2D & {
    isPointInPath: ReturnType<typeof vi.fn>
    isPointInStroke: ReturnType<typeof vi.fn>
  }

const frame = (from: Point, to: Point): [Point, Point] => [from, to]

describe('checkSelectionFrameCollision', () => {
  const largeRect = createShape({ type: 'rect', x: 0, y: 0, width: 1000, height: 600, style: OUTLINED })

  it('does not search the stroke of a shape around the frame, which is not filled', () => {
    const shapesAroundFrames = [
      { shape: largeRect, selectionFrame: frame([400, 250], [550, 350]) },
      { shape: createShape({ type: 'square', x: 0, y: 0, width: 600, height: 600, style: OUTLINED }), selectionFrame: frame([400, 250], [550, 350]) },
      {
        shape: createShape({ type: 'rect', x: 0, y: 0, width: 1000, height: 600, rotation: 0.3, style: OUTLINED }),
        selectionFrame: frame([400, 250], [550, 350])
      },
      { shape: createShape({ type: 'circle', x: 300, y: 300, radius: 200, style: OUTLINED }), selectionFrame: frame([250, 250], [350, 350]) },
      {
        shape: createShape({ type: 'ellipse', x: 300, y: 300, radiusX: 300, radiusY: 100, style: OUTLINED }),
        selectionFrame: frame([200, 280], [400, 320])
      }
    ]
    const ctx = createContext(true)
    for (const { shape, selectionFrame } of shapesAroundFrames) expect(checkSelectionFrameCollision(ctx, shape, selectionFrame)).toBe(false)
    expect(ctx.isPointInStroke).not.toHaveBeenCalled()
  })

  it('searches the stroke when the frame comes close to it', () => {
    const ctx = createContext(true)
    // 6 from the outline: within half of the width searched, the stroke and the margin of the collisions
    expect(checkSelectionFrameCollision(ctx, largeRect, frame([400, 250], [994, 350]))).toBe(true)
    expect(ctx.isPointInStroke).toHaveBeenCalled()
  })

  it('searches the stroke of an ellipse when the frame is outside of its hole', () => {
    const ctx = createContext(false)
    const ellipse = createShape({ type: 'ellipse', x: 300, y: 300, radiusX: 300, radiusY: 100, style: OUTLINED })
    // in the corner of the box of the ellipse, outside of it
    expect(checkSelectionFrameCollision(ctx, ellipse, frame([10, 210], [40, 230]))).toBe(false)
    expect(ctx.isPointInStroke).toHaveBeenCalled()
  })

  describe('of a brush', () => {
    const brush = (points: Point[][]) => createShape({ type: 'brush', points, style: { ...OUTLINED, lineWidth: 10 } })

    it('touches a point drawn alone when the frame reaches its dot', () => {
      // the box of the dot goes from 40 to 60, its dot has a radius of 5
      const dot = brush([[[50, 50]]])
      const ctx = createContext(false)
      expect(checkSelectionFrameCollision(ctx, dot, frame([30, 30], [48, 48]))).toBe(true)
      expect(checkSelectionFrameCollision(ctx, dot, frame([30, 30], [42, 42]))).toBe(false)
    })

    it('searches the stroke of the segments crossing the frame only', () => {
      const strokes = brush([
        [
          [0, 0],
          [10, 10]
        ],
        [
          [90, 90],
          [100, 100]
        ]
      ])
      const ctx = createContext(true)
      expect(checkSelectionFrameCollision(ctx, strokes, frame([40, 40], [60, 60]))).toBe(false)
      expect(ctx.isPointInStroke).not.toHaveBeenCalled()

      expect(checkSelectionFrameCollision(ctx, strokes, frame([95, -20], [200, 95]))).toBe(true)
      expect(ctx.isPointInStroke).toHaveBeenCalled()
      expect(checkSelectionFrameCollision(createContext(false), strokes, frame([95, -20], [200, 95]))).toBe(false)
    })
  })

  it('searches the inside of a filled shape', () => {
    const ctx = createContext(true)
    const filledRect = createShape({ type: 'rect', x: 0, y: 0, width: 1000, height: 600, style: { ...OUTLINED, fillColor: 'red' } })
    expect(checkSelectionFrameCollision(ctx, filledRect, frame([400, 250], [550, 350]))).toBe(true)
    expect(ctx.isPointInPath).toHaveBeenCalled()
  })
})

describe('checkSelectionIntersection', () => {
  const viewSettings = (scaleRatio: number) => ({ selectionPadding: 5, canvasSize: { scaleRatio }, canvasZoom: scaleRatio }) as UtilsSettings
  const atScale1 = viewSettings(1)
  const ctx = createContext(false)

  // a 200×100 rect at the origin: its borders go from (-5, -5) to (205, 105), its center is (100, 50)
  const rect = createShape({ type: 'rect', x: 0, y: 0, width: 200, height: 100 })

  /** The anchors are on the borders, 14 pixels of the screen wide: the cursor is over an anchor up to 7 pixels from its center */
  const check = (shape: ShapeEntity, position: Point, settings = atScale1, radius?: number) =>
    checkSelectionIntersection(ctx, shape, position, settings, true, radius)

  it('finds each anchor of the resize at its position on the borders', () => {
    for (const anchor of SELECTION_RESIZE_ANCHOR_POSITIONS) {
      const position: Point = [-5 + anchor[0] * 210, -5 + anchor[1] * 110]
      expect(check(rect, position)).toEqual({ mode: 'resize', anchor })
      expect(check(rect, [position[0] + 7, position[1] - 7])).toEqual({ mode: 'resize', anchor })
    }
  })

  it('finds the anchor of the rotation above the borders', () => {
    // 7 for the half of the anchor and 16 for its stem above the top of the borders
    expect(check(rect, [100, -28])).toEqual({ mode: 'rotate' })
  })

  it('translates the shape inside its borders and up to 15 pixels around them, and finds nothing farther', () => {
    expect(check(rect, [60, 60])).toEqual({ mode: 'translate' })
    expect(check(rect, [205 + 7.5, 50 + 7.5])).toEqual({ mode: 'translate' })
    expect(check(rect, [205 + 16, 50])).toBe(false)
  })

  it('only translates the shape when the anchors are not checked', () => {
    expect(checkSelectionIntersection(ctx, rect, [205, 105], atScale1)).toEqual({ mode: 'translate' })
  })

  it('finds the anchors of a turned shape where they are drawn', () => {
    // turned by a quarter around its center, the right side is at the bottom of the screen, and the rotation anchor on its right
    const turned = createShape({ type: 'rect', x: 0, y: 0, width: 200, height: 100, rotation: Math.PI / 2 })
    expect(check(turned, [100, 155])).toEqual({ mode: 'resize', anchor: [1, 0.5] })
    expect(check(turned, [178, 50])).toEqual({ mode: 'rotate' })
    expect(check(turned, [205, 50])).toBe(false)
  })

  it('keeps the size of the anchors on the screen whatever the zoom', () => {
    // zoomed twice, an anchor is 7 units of the drawing wide: 5 units from its center is outside of it
    expect(check(rect, [210, 105])).toEqual({ mode: 'resize', anchor: [1, 1] })
    expect(check(rect, [210, 105], viewSettings(2))).toEqual({ mode: 'translate' })
    expect(check(rect, [208, 105], viewSettings(2))).toEqual({ mode: 'resize', anchor: [1, 1] })
  })

  it('widens the anchors by the radius of a touch', () => {
    // 18 from the side of the anchor, 25 from the borders
    expect(check(rect, [230, 105])).toBe(false)
    expect(check(rect, [230, 105], atScale1, 20)).toEqual({ mode: 'resize', anchor: [1, 1] })
  })

  it('gives the index of the point under the cursor for a line or a polygon', () => {
    const line = createShape({
      type: 'line',
      points: [
        [0, 0],
        [100, 100]
      ]
    })
    const polygon = createShape({
      type: 'polygon',
      points: [
        [0, 0],
        [100, 0],
        [50, 80]
      ]
    })
    expect(check(line, [103, 98])).toEqual({ mode: 'resize', anchor: 1 })
    expect(check(polygon, [50, 85])).toEqual({ mode: 'resize', anchor: 2 })
    // between the points, the stroke of the shape is searched
    expect(check(line, [50, 50])).toBe(false)
    expect(ctx.isPointInStroke).toHaveBeenCalled()
  })
})

describe('getCursorPositionInTransformedCanvas', () => {
  const settings = { canvasSize: { width: 1000, height: 600, scaleRatio: 2 }, canvasOffset: [30, 40] } as unknown as UtilsSettings

  it('converts a position of the page into the drawing, through the size of the canvas on the page, the scale and the offset', () => {
    // the canvas is displayed half as large as its size, from (10, 20) of the page
    const canvas = { getBoundingClientRect: () => ({ left: 10, top: 20, width: 500, height: 300 }) } as HTMLElement
    expect(getCursorPositionInTransformedCanvas({ clientX: 260, clientY: 170 }, canvas, settings)).toEqual([220, 110])
  })

  it('places a canvas which is not mounted at the top left corner of the page, at its size', () => {
    expect(getCursorPositionInTransformedCanvas({ clientX: 260, clientY: 170 }, null, settings)).toEqual([100, 45])
  })
})

describe('pointer moves', () => {
  const start = { clientX: 100, clientY: 100 }
  const pointer = (clientX: number, clientY: number, pointerType = 'touch') => ({ clientX, clientY, pointerType }) as PointerEvent

  it('tells that the pointer has moved by more than 5 pixels', () => {
    expect(hasPointerMoved(pointer(103, 104), start)).toBe(false)
    expect(hasPointerMoved(pointer(103, 105), start)).toBe(true)
  })

  it('cancels a long press when the pointer moves, or when it is not a touch', () => {
    expect(shouldCancelLongPress(pointer(102, 102), start)).toBe(false)
    expect(shouldCancelLongPress(pointer(110, 100), start)).toBe(true)
    expect(shouldCancelLongPress(pointer(100, 100, 'mouse'), start)).toBe(true)
  })
})
