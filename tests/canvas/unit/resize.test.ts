import type { UtilsSettings } from '@canvas/constants/app'
import type { SelectionModeResize } from '@canvas/types/Mode'
import type { Point, ShapeEntity } from '@canvas/types/Shapes'
import { getResizeAnchorCenter } from '@canvas/utils/selection/anchors'
import { drawBoundingBox, drawSelectionRect } from '@canvas/utils/selection/rectSelection'
import { resizeShape, resizeShapeInGroup } from '@canvas/utils/shapes'
import { buildGroupResizeContext, getMirroredRotation } from '@canvas/utils/shapes/group'
import { getBrushPointScaler } from '@canvas/utils/shapes/path'
import { rotatePoint } from '@canvas/utils/trigo'
import { describe, expect, it, vi } from 'vitest'
import { createShape, MEASURE_CONTEXT, stubPath2D, UTILS_SETTINGS } from './helpers'

stubPath2D()

/** Drags an anchor of a shape to a position, with Shift (keep the ratio) and Alt (resize from the center) */
const resize = <T extends ShapeEntity>(shape: T, anchor: Point, to: Point, { shift = false, alt = false } = {}) => {
  const selectionMode: SelectionModeResize = {
    mode: 'resize',
    anchor,
    cursorStartPosition: getResizeAnchorCenter(shape.computed.borders, anchor),
    originalShape: shape,
    selectedShapesLengthAtMouseDown: 1
  }
  return resizeShape(MEASURE_CONTEXT, to, shape, selectionMode, UTILS_SETTINGS, shift, alt)
}

const getRect = ({ x, y, width, height }: ShapeEntity<'rect' | 'square' | 'picture' | 'text'>) => ({ x, y, width, height })

// a 100×100 rect at the origin: its borders go from -5 to 105, its center is (50, 50)
const RECT = createShape<ShapeEntity<'rect'>>({ type: 'rect', x: 0, y: 0, width: 100, height: 100 })

describe('resizeShape of a rect', () => {
  it('follows the cursor on both axes without modifier', () => {
    expect(getRect(resize(RECT, [1, 1], [205, 155]))).toEqual({ x: 0, y: 0, width: 200, height: 150 })
  })

  it('keeps the ratio from a corner with Shift, following the axis which moved the most', () => {
    expect(getRect(resize(RECT, [1, 1], [205, 155], { shift: true }))).toEqual({ x: 0, y: 0, width: 200, height: 200 })
    expect(getRect(resize(RECT, [1, 1], [155, 205], { shift: true }))).toEqual({ x: 0, y: 0, width: 200, height: 200 })
  })

  it('keeps the opposite corner still when the top left corner is dragged with Shift', () => {
    // the bottom right corner stays at (100, 100)
    expect(getRect(resize(RECT, [0, 0], [-55, -105], { shift: true }))).toEqual({ x: -100, y: -100, width: 200, height: 200 })
    expect(getRect(resize(RECT, [0, 0], [-105, -55], { shift: true }))).toEqual({ x: -100, y: -100, width: 200, height: 200 })
  })

  it('centers the other axis when a side is dragged with Shift', () => {
    expect(getRect(resize(RECT, [1, 0.5], [155, 50], { shift: true }))).toEqual({ x: 0, y: -25, width: 150, height: 150 })
    expect(getRect(resize(RECT, [0.5, 1], [50, 155], { shift: true }))).toEqual({ x: -25, y: 0, width: 150, height: 150 })
  })

  it('resizes from the center with Alt', () => {
    expect(getRect(resize(RECT, [1, 0.5], [155, 50], { alt: true }))).toEqual({ x: -50, y: 0, width: 200, height: 100 })
    expect(getRect(resize(RECT, [1, 1], [155, 155], { alt: true }))).toEqual({ x: -50, y: -50, width: 200, height: 200 })
  })

  it('keeps the center with Alt while the shape goes through a width of 0, then past its opposite side', () => {
    const alt = { alt: true }
    // the side of the borders follows the cursor, the padding away from the side of the rect: 0 wide from 45 to 55
    for (const cursorX of [55, 52, 50, 48, 45]) {
      expect(getRect(resize(RECT, [1, 0.5], [cursorX, 50], alt))).toEqual({ x: 50, y: 0, width: 0, height: 100 })
    }
    // past the center, then past the opposite side, the rect spreads again from its center
    expect(getRect(resize(RECT, [1, 0.5], [30, 50], alt))).toEqual({ x: 35, y: 0, width: 30, height: 100 })
    expect(getRect(resize(RECT, [1, 0.5], [0, 50], alt))).toEqual({ x: 5, y: 0, width: 90, height: 100 })
    expect(getRect(resize(RECT, [1, 0.5], [-30, 50], alt))).toEqual({ x: -25, y: 0, width: 150, height: 100 })
    // a corner, on both axes
    expect(getRect(resize(RECT, [0, 0], [50, 50], alt))).toEqual({ x: 50, y: 50, width: 0, height: 0 })
    expect(getRect(resize(RECT, [0, 0], [130, 75], alt))).toEqual({ x: -25, y: 30, width: 150, height: 40 })
  })

  it('mirrors a brush with Alt as soon as a side is dragged past its center', () => {
    const brush = createShape<ShapeEntity<'brush'>>({
      type: 'brush',
      points: [
        [
          [0, 0],
          [100, 50]
        ]
      ]
    })
    const resized = resize(brush, [1, 0.5], [30, 50], { alt: true })
    // 30 wide around the center 50: the first point goes from the left to the right
    const scale = getBrushPointScaler(resized)
    expect(resized.points[0]!.map(scale)).toEqual([
      [65, 0],
      [35, 50]
    ])
  })

  it('keeps the center and the ratio with Shift and Alt, the anchor following the cursor', () => {
    const shiftAlt = { shift: true, alt: true }
    // pressing an anchor does not resize the shape: the anchors are on the borders, the padding away from the shape
    for (const anchor of [
      [1, 1],
      [0, 0],
      [1, 0.5],
      [0.5, 0]
    ] as Point[]) {
      expect(getRect(resize(RECT, anchor, getResizeAnchorCenter(RECT.computed.borders, anchor), shiftAlt))).toEqual(getRect(RECT))
    }
    // the corner of the borders dragged to (155, 155) or (-55, -55): the corner of the rect is at 100 from its center on each axis
    expect(getRect(resize(RECT, [1, 1], [155, 155], shiftAlt))).toEqual({ x: -50, y: -50, width: 200, height: 200 })
    expect(getRect(resize(RECT, [0, 0], [-55, -55], shiftAlt))).toEqual({ x: -50, y: -50, width: 200, height: 200 })
    // off the diagonal, the corner follows the distance to the center: (140, 20) is as far as (100, 100)
    expect(getRect(resize(RECT, [1, 1], [195, 75], shiftAlt))).toEqual({ x: -50, y: -50, width: 200, height: 200 })
    // a side dragged to 130: the side of the rect is at 75 from its center
    expect(getRect(resize(RECT, [1, 0.5], [130, 50], shiftAlt))).toEqual({ x: -25, y: -25, width: 150, height: 150 })
    expect(getRect(resize(RECT, [0.5, 1], [50, 130], shiftAlt))).toEqual({ x: -25, y: -25, width: 150, height: 150 })
  })

  it('goes past the opposite side when the cursor crosses it', () => {
    // the right side is dragged to the left of the left side, which becomes the right side
    expect(getRect(resize(RECT, [1, 0.5], [-55, 50]))).toEqual({ x: -50, y: 0, width: 50, height: 100 })
    // and the left side to the right of the right side
    expect(getRect(resize(RECT, [0, 0.5], [155, 50]))).toEqual({ x: 100, y: 0, width: 50, height: 100 })
  })

  it('does not resize a locked shape', () => {
    const locked = { ...RECT, locked: true }
    expect(resize(locked, [1, 1], [205, 155])).toBe(locked)
  })
})

describe('resizeShape of the shapes keeping their ratio', () => {
  it('always keeps the ratio of a square', () => {
    const square = createShape<ShapeEntity<'square'>>({ type: 'square', x: 0, y: 0, width: 100, height: 100 })
    expect(getRect(resize(square, [1, 1], [205, 155]))).toEqual({ x: 0, y: 0, width: 200, height: 200 })
  })

  it('keeps the ratio of a picture, and flips it when it goes past its opposite side', () => {
    const picture = createShape<ShapeEntity<'picture'>>({ type: 'picture', x: 0, y: 0, width: 200, height: 100, ratio: 2, src: '' })
    const larger = resize(picture, [1, 1], [305, 105])
    expect(getRect(larger)).toEqual({ x: 0, y: 0, width: 300, height: 150 })
    expect(larger.flipX).toBe(false)

    const flipped = resize(picture, [1, 0.5], [-105, 50])
    expect(getRect(flipped)).toEqual({ x: -100, y: 25, width: 100, height: 50 })
    expect(flipped).toMatchObject({ flipX: true, flipY: false })
  })

  it('keeps the ratio of a text and fits its font size to its new width', () => {
    const text = createShape<ShapeEntity<'text'>>({ type: 'text', x: 0, y: 0, width: 100, height: 20, value: ['Texte'], fontSize: 20 })
    const resized = resize(text, [1, 1], [205, 25])
    expect(getRect(resized)).toEqual({ x: 0, y: 0, width: 200, height: 40 })
    expect(resized.fontSize).toBe(40)
  })

  it('keeps the default font size of an emptied text when it is resized', () => {
    const text = createShape<ShapeEntity<'text'>>({ type: 'text', x: 0, y: 0, width: 100, height: 36, value: [''], fontSize: 36 })
    const resized = resize(text, [1, 1], [205, 41])
    expect(resized.width).toBe(200)
    expect(resized.fontSize).toBe(36)
  })

  it('keeps the ratio of an ellipse with Shift, and its center with Alt', () => {
    // borders from (-5, 20) to (105, 80)
    const ellipse = createShape<ShapeEntity<'ellipse'>>({ type: 'ellipse', x: 50, y: 50, radiusX: 50, radiusY: 25 })
    expect(resize(ellipse, [1, 1], [205, 80], { shift: true })).toMatchObject({ x: 100, y: 75, radiusX: 100, radiusY: 50 })
    expect(resize(ellipse, [1, 0.5], [155, 50], { alt: true })).toMatchObject({ x: 50, y: 50, radiusX: 100, radiusY: 25 })
  })
})

describe('resizeShapeInGroup in a turned frame', () => {
  const ROTATION = Math.PI / 6
  // the frame of the group: a box 100×50 at the origin, turned around its center (50, 25)
  const FRAME = createShape<ShapeEntity<'rect'>>({ type: 'rect', x: 0, y: 0, width: 100, height: 50, rotation: ROTATION }, 'frame')
  const { center } = FRAME.computed
  // twice as wide: borders from (-5, -5) to (205, 55), turned around their center (100, 25)
  const NEW_BORDERS = { x: -5, y: -5, width: 210, height: 60 }
  const NEW_CENTER: Point = [100, 25]

  /** A point of the drawing at a position in the frame, turned with it */
  const inFrame = (point: Point, origin = center): Point => rotatePoint({ origin, point, rotation: -ROTATION })
  /** The position in the frame of a point of the drawing */
  const inFrameOf = (point: Point, origin: Point): Point => rotatePoint({ origin, point, rotation: ROTATION })

  const resizeInFrame = <T extends ShapeEntity>(shape: T, isXinverted = false) =>
    resizeShapeInGroup(MEASURE_CONTEXT, shape, buildGroupResizeContext(FRAME, NEW_BORDERS, UTILS_SETTINGS, { isXinverted })) as T

  const expectPointsInFrame = (points: Point[], expected: Point[]) => {
    points.forEach((point, index) => {
      const [x, y] = inFrameOf(point, NEW_CENTER)
      expect(x).toBeCloseTo(expected[index]![0])
      expect(y).toBeCloseTo(expected[index]![1])
    })
  }

  it('stretches a line, a polygon and a curve along the sides of the frame', () => {
    const corners: Point[] = [inFrame([0, 0]), inFrame([100, 50])]
    const line = createShape<ShapeEntity<'line'>>({ type: 'line', points: corners as [Point, Point] })
    const polygon = createShape<ShapeEntity<'polygon'>>({ type: 'polygon', points: [...corners, inFrame([100, 0])] })
    const curve = createShape<ShapeEntity<'curve'>>({ type: 'curve', points: [...corners, inFrame([50, 25])] })

    expectPointsInFrame(
      [...resizeInFrame(line).points],
      [
        [0, 0],
        [200, 50]
      ]
    )
    expectPointsInFrame(resizeInFrame(polygon).points, [
      [0, 0],
      [200, 50],
      [200, 0]
    ])
    expectPointsInFrame(resizeInFrame(curve).points, [
      [0, 0],
      [200, 50],
      [100, 25]
    ])
  })

  it('mirrors the points along the side of the frame which goes past the other one', () => {
    const line = createShape<ShapeEntity<'line'>>({ type: 'line', points: [inFrame([0, 0]), inFrame([100, 50])] })
    expectPointsInFrame(
      [...resizeInFrame(line, true).points],
      [
        [200, 0],
        [0, 50]
      ]
    )
  })

  it('turns a mirrored shape by twice the rotation of the frame, less its own', () => {
    const rect = createShape<ShapeEntity<'rect'>>({ type: 'rect', x: 0, y: 0, width: 100, height: 50, rotation: 0.2 })
    const ctx = buildGroupResizeContext(FRAME, FRAME.computed.borders, UTILS_SETTINGS, { isXinverted: true })
    expect(getMirroredRotation(0.2, ctx)).toBeCloseTo(2 * ROTATION - 0.2)
    expect(resizeShapeInGroup(MEASURE_CONTEXT, rect, ctx).rotation).toBeCloseTo(2 * ROTATION - 0.2)
    // mirrored along both sides, the shape is only turned by half a turn: it keeps its rotation
    expect(getMirroredRotation(0.2, { ...ctx, isYinverted: true })).toBe(0.2)
    // a shape turned like the frame keeps its rotation
    expect(getMirroredRotation(ROTATION, ctx)).toBe(ROTATION)
  })
})

describe('debug drawing of the selection', () => {
  const debugSettings = { ...UTILS_SETTINGS, debug: true, canvasSize: { scaleRatio: 1 }, canvasOffset: [0, 0] } as unknown as UtilsSettings
  const createDrawingContext = () =>
    ({
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      setLineDash: vi.fn(),
      strokeRect: vi.fn(),
      stroke: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn()
    }) as unknown as CanvasRenderingContext2D & { strokeRect: ReturnType<typeof vi.fn> }

  it('frames the bounding box of a shape in debug mode only', () => {
    const ctx = createDrawingContext()
    drawBoundingBox(ctx, RECT, 2, { ...debugSettings, debug: false })
    expect(ctx.strokeRect).not.toHaveBeenCalled()

    drawBoundingBox(ctx, RECT, 2, debugSettings)
    const { x, y, width, height } = RECT.computed.boundingBox
    expect(ctx.strokeRect).toHaveBeenCalledWith(x, y, width, height)
  })

  it('frames the outer borders of a selection in debug mode', () => {
    const ctx = createDrawingContext()
    drawSelectionRect(ctx, RECT, 'blue', 2, debugSettings, true)
    const { x, y, width, height } = RECT.computed.outerBorders
    expect(ctx.strokeRect).toHaveBeenCalledWith(x, y, width, height)
  })
})
