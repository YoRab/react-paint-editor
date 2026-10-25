import type { UtilsSettings } from '@canvas/constants/app'
import type { Point, ShapeEntity, StyleShape } from '@canvas/types/Shapes'
import type { CustomTool } from '@canvas/types/tools'
import { canRemoveShapePoint, createShape, isStyleFieldOfShape } from '@canvas/utils/shapes'
import { addNewPointGroupToShape, addNewPointToShape, getBrushBorder, refreshBrush } from '@canvas/utils/shapes/brush'
import { refreshCurve } from '@canvas/utils/shapes/curve'
import {
  catmullRomToBezier,
  createBrushPath,
  createPolygonPath,
  getCatmullRomPoints,
  getCornerRadius,
  getCubicBezierBounds
} from '@canvas/utils/shapes/path'
import { drawPicture } from '@canvas/utils/shapes/picture'
import { buildAvailableTools } from '@canvas/utils/tools'
import { type Bounds, getPointsBounds } from '@canvas/utils/trigo'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createShape as createEntity, MEASURE_CONTEXT, stubPath2D, UTILS_SETTINGS } from './helpers'

stubPath2D()

const withPoints = (type: 'polygon' | 'curve' | 'line', pointsCount: number) =>
  ({ id: `${type}_1`, type, points: Array.from({ length: pointsCount }, (_, index): Point => [index, index]) }) as unknown as ShapeEntity

describe('createShape', () => {
  it('gives a new shape the default values of all the settings of its tool', () => {
    const [rectTool, lineTool, textTool] = buildAvailableTools([
      { type: 'rect', settings: { fillColor: { default: 'red' } } },
      { type: 'line', settings: { lineArrow: { default: 2 } } },
      { type: 'text', settings: { fontBold: { default: true } } }
    ]) as Exclude<CustomTool, { type: 'picture' }>[]
    expect(createShape(MEASURE_CONTEXT, rectTool!, [10, 10], UTILS_SETTINGS)?.style).toEqual({
      strokeColor: 'black',
      fillColor: 'red',
      opacity: 100,
      lineWidth: 1,
      lineDash: 0,
      lineJoin: 'round',
      cornerRadius: 0
    })
    expect(createShape(MEASURE_CONTEXT, lineTool!, [10, 10], UTILS_SETTINGS)?.style).toEqual({
      strokeColor: 'black',
      opacity: 100,
      lineWidth: 1,
      lineDash: 0,
      lineArrow: 2,
      lineCap: 'round'
    })
    expect(createShape(MEASURE_CONTEXT, textTool!, [10, 10], UTILS_SETTINGS)?.style).toEqual({
      strokeColor: 'black',
      opacity: 100,
      fontFamily: 'serif',
      fontBold: true,
      fontItalic: false,
      textAlign: 'left',
      fillColor: 'transparent',
      fontUnderline: false,
      fontStrikethrough: false,
      outlineColor: 'transparent',
      outlineWidth: 2
    })
  })
})

describe('isStyleFieldOfShape', () => {
  it('applies the font fields to the texts only, and the other fields to all the shapes', () => {
    expect(isStyleFieldOfShape('text', 'fontBold')).toBe(true)
    expect(isStyleFieldOfShape('rect', 'fontFamily')).toBe(false)
    expect(isStyleFieldOfShape('picture', 'fontItalic')).toBe(false)
    expect(isStyleFieldOfShape('line', 'strokeColor')).toBe(true)
    expect(isStyleFieldOfShape('text', 'opacity')).toBe(true)
  })

  it('applies the decorations and the outline to the texts only, and the background of a text is its fill', () => {
    expect(isStyleFieldOfShape('text', 'fontUnderline')).toBe(true)
    expect(isStyleFieldOfShape('rect', 'fontStrikethrough')).toBe(false)
    expect(isStyleFieldOfShape('line', 'outlineColor')).toBe(false)
    expect(isStyleFieldOfShape('text', 'outlineWidth')).toBe(true)
    expect(isStyleFieldOfShape('text', 'fillColor')).toBe(true)
  })

  it('applies the joins to the shapes with corners, and the caps to the shapes with ends', () => {
    expect(isStyleFieldOfShape('rect', 'lineJoin')).toBe(true)
    expect(isStyleFieldOfShape('brush', 'lineJoin')).toBe(true)
    expect(isStyleFieldOfShape('circle', 'lineJoin')).toBe(false)
    expect(isStyleFieldOfShape('line', 'lineJoin')).toBe(false)
    expect(isStyleFieldOfShape('curve', 'lineCap')).toBe(true)
    expect(isStyleFieldOfShape('rect', 'lineCap')).toBe(false)
  })

  it('applies the rounded corners to the rectangles, the squares, the pictures and the polygons', () => {
    expect(isStyleFieldOfShape('square', 'cornerRadius')).toBe(true)
    expect(isStyleFieldOfShape('picture', 'cornerRadius')).toBe(true)
    expect(isStyleFieldOfShape('polygon', 'cornerRadius')).toBe(true)
    expect(isStyleFieldOfShape('curve', 'cornerRadius')).toBe(false)
  })
})

describe('rounded corners', () => {
  it('are drawn at most half of the smallest side, even when the shape is drawn backwards', () => {
    expect(getCornerRadius({ x: 0, y: 0, width: 100, height: 50, style: { cornerRadius: 10 } })).toBe(10)
    expect(getCornerRadius({ x: 0, y: 0, width: -100, height: 50, style: { cornerRadius: 40 } })).toBe(25)
    expect(getCornerRadius({ x: 0, y: 0, width: 100, height: 50, style: { cornerRadius: -5 } })).toBe(0)
    expect(getCornerRadius({ x: 0, y: 0, width: 100, height: 50 })).toBe(0)
  })

  it('round the path of a rectangle and of a picture, without changing the path of a sharp rectangle', () => {
    const roundRect = vi.spyOn(Path2D.prototype, 'roundRect')
    const rect = vi.spyOn(Path2D.prototype, 'rect')
    createEntity({ type: 'rect', x: 0, y: 0, width: 100, height: 50, style: { cornerRadius: 80 } })
    expect(roundRect).toHaveBeenLastCalledWith(0, 0, 100, 50, 25)
    createEntity({ type: 'picture', x: 0, y: 0, width: 100, height: 50, src: '', style: { cornerRadius: 8 } })
    expect(roundRect).toHaveBeenLastCalledWith(0, 0, 100, 50, 8)
    expect(rect).not.toHaveBeenCalled()
    createEntity({ type: 'square', x: 0, y: 0, width: 50, height: 50, style: { cornerRadius: 0 } })
    expect(rect).toHaveBeenCalledWith(0, 0, 50, 50)
    expect(roundRect).toHaveBeenCalledTimes(2)
    vi.restoreAllMocks()
  })
})

describe('outer borders of the strokes', () => {
  const triangle: Point[] = [
    [0, 0],
    [100, 0],
    [50, 10]
  ]

  it('go beyond the path by the half of the stroke', () => {
    // the borders of the points with the selection padding of 5, and the half of the stroke
    const polygon = createEntity({ type: 'polygon', points: triangle, style: { lineWidth: 4 } })
    expect(polygon.computed.outerBorders).toEqual({ x: -7, y: -7, width: 114, height: 24 })
  })

  it('go as far as the longest miter join of a polygon or of a brush', () => {
    const style = { lineWidth: 4, lineJoin: 'miter' } as const
    const polygon = createEntity({ type: 'polygon', points: triangle, style })
    expect(polygon.computed.outerBorders).toEqual({ x: -13, y: -13, width: 126, height: 36 })
    const brush = createEntity({ type: 'brush', points: [triangle], style })
    expect(brush.computed.outerBorders).toEqual({ x: -13, y: -13, width: 126, height: 36 })
  })

  it('keep the miter joins of a rectangle within the half of its stroke, at its right angles', () => {
    const rect = createEntity({ type: 'rect', x: 0, y: 0, width: 100, height: 50, style: { lineWidth: 4, lineJoin: 'miter' } })
    expect(rect.computed.outerBorders).toEqual({ x: -7, y: -7, width: 114, height: 64 })
  })

  it('go as far as the corners of the square caps', () => {
    const line = createEntity({ type: 'line', points: [triangle[0]!, triangle[1]!], style: { lineWidth: 4, lineCap: 'square' } })
    const { x, width } = line.computed.outerBorders
    expect(x).toBeCloseTo(-5 - 2 * Math.SQRT2)
    expect(width).toBeCloseTo(110 + 4 * Math.SQRT2)
  })
})

describe('caps of the lines', () => {
  it('keeps the caps of a line with arrows, which cover its ends', () => {
    const points: [Point, Point] = [
      [0, 0],
      [100, 0]
    ]
    const square = createEntity({ type: 'line', points, style: { lineArrow: 2, lineCap: 'square' } })
    expect(square.style).toEqual({ lineArrow: 2, lineCap: 'square' })
    const withoutCap = createEntity({ type: 'line', points, style: { lineArrow: 3 } })
    expect(withoutCap.style).toEqual({ lineArrow: 3 })
  })
})

describe('createPolygonPath', () => {
  const points: Point[] = [
    [0, 0],
    [10, 0],
    [0, 10]
  ]

  it('closes the path of a closed polygon, joined at its first point like at its other corners', () => {
    const closePath = vi.spyOn(Path2D.prototype, 'closePath')
    const lineTo = vi.spyOn(Path2D.prototype, 'lineTo')
    createPolygonPath({ type: 'polygon', points, style: { closedPoints: 1 } })
    expect(closePath).toHaveBeenCalledTimes(1)
    expect(lineTo).toHaveBeenCalledTimes(2)

    closePath.mockClear()
    createPolygonPath({ type: 'polygon', points, style: { closedPoints: 0 } })
    expect(closePath).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  describe('with rounded corners', () => {
    const square: Point[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10]
    ]
    const spyPath = () => ({
      moveTo: vi.spyOn(Path2D.prototype, 'moveTo'),
      lineTo: vi.spyOn(Path2D.prototype, 'lineTo'),
      arcTo: vi.spyOn(Path2D.prototype, 'arcTo'),
      closePath: vi.spyOn(Path2D.prototype, 'closePath')
    })

    afterEach(() => vi.restoreAllMocks())

    it('rounds all the corners of a closed polygon, from the middle of its last side, at most half of its sides', () => {
      const path = spyPath()
      createPolygonPath({ type: 'polygon', points: square, style: { closedPoints: 1, cornerRadius: 100 } })
      expect(path.moveTo).toHaveBeenCalledWith(0, 5)
      expect(path.arcTo.mock.calls).toEqual([
        [0, 0, 10, 0, expect.closeTo(5)],
        [10, 0, 10, 10, expect.closeTo(5)],
        [10, 10, 0, 10, expect.closeTo(5)],
        [0, 10, 0, 0, expect.closeTo(5)]
      ])
      expect(path.closePath).toHaveBeenCalledTimes(1)
      expect(path.lineTo).not.toHaveBeenCalled()
    })

    it('keeps the ends of an open polygon sharp, their sides being all for the corners next to them', () => {
      const path = spyPath()
      createPolygonPath({ type: 'polygon', points: square, style: { closedPoints: 0, cornerRadius: 100 } })
      expect(path.moveTo).toHaveBeenCalledWith(0, 0)
      // the middle side is shared by the 2 corners
      expect(path.arcTo.mock.calls).toEqual([
        [10, 0, 10, 10, expect.closeTo(5)],
        [10, 10, 0, 10, expect.closeTo(5)]
      ])
      expect(path.lineTo).toHaveBeenCalledWith(0, 10)
      expect(path.closePath).not.toHaveBeenCalled()

      path.arcTo.mockClear()
      createPolygonPath({ type: 'polygon', points: square.slice(0, 3), style: { cornerRadius: 100 } })
      expect(path.arcTo).toHaveBeenCalledWith(10, 0, 10, 10, expect.closeTo(10))
    })

    it('rounds a corner with the given radius when the sides allow it, and keeps the corners of no angle sharp', () => {
      const path = spyPath()
      createPolygonPath({ type: 'polygon', points: square, style: { closedPoints: 1, cornerRadius: 2 } })
      expect(path.arcTo.mock.calls.map(call => call[4])).toEqual([2, 2, 2, 2])

      path.arcTo.mockClear()
      createPolygonPath({
        type: 'polygon',
        points: [
          [0, 0],
          [10, 0],
          [10, 0],
          [20, 0]
        ],
        style: { cornerRadius: 2 }
      })
      expect(path.arcTo.mock.calls.map(call => call[4])).toEqual([0, 0])
    })

    it('draws a polygon of 2 points as a line', () => {
      const path = spyPath()
      createPolygonPath({ type: 'polygon', points: square.slice(0, 2), style: { cornerRadius: 5 } })
      expect(path.arcTo).not.toHaveBeenCalled()
      expect(path.lineTo).toHaveBeenCalledWith(10, 0)
    })
  })
})

describe('canRemoveShapePoint', () => {
  it('allows removing a point of a polygon or a curve keeping at least 2 points', () => {
    expect(canRemoveShapePoint(withPoints('polygon', 3), 1)).toBe(true)
    expect(canRemoveShapePoint(withPoints('curve', 3), 0)).toBe(true)
  })

  it('refuses to leave less than 2 points', () => {
    expect(canRemoveShapePoint(withPoints('polygon', 2), 0)).toBe(false)
    expect(canRemoveShapePoint(withPoints('curve', 2), 1)).toBe(false)
  })

  it('refuses a missing or out of range point', () => {
    expect(canRemoveShapePoint(withPoints('polygon', 3), undefined)).toBe(false)
    expect(canRemoveShapePoint(withPoints('polygon', 3), -1)).toBe(false)
    expect(canRemoveShapePoint(withPoints('polygon', 3), 3)).toBe(false)
  })

  it('refuses other shapes', () => {
    expect(canRemoveShapePoint(withPoints('line', 3), 1)).toBe(false)
    expect(canRemoveShapePoint(undefined, 1)).toBe(false)
  })
})

describe('getBrushBorder', () => {
  it('measures a brush of any length, scaled from its top left corner', () => {
    // more points than a call accepts arguments
    const longStroke = Array.from({ length: 200_000 }, (_, index): Point => [index % 1000, Math.floor(index / 1000)])
    const brush = { type: 'brush' as const, points: [longStroke, [[-10, 500] as Point]], scaleX: 2, scaleY: 0.5 }

    // from [-10, 0] to [-10 + 1009 * 2, 500 * 0.5], with the padding
    expect(getBrushBorder(brush, { selectionPadding: 5 })).toEqual({ x: -15, y: -5, width: 2028, height: 260 })
  })
})

describe('addNewPointToShape', () => {
  const settings = { brushAlgo: 'simple', selectionPadding: 5 } as UtilsSettings
  // the bounds of new lists of points are measured again from all their points
  const rebuild = (brush: ShapeEntity<'brush'>) => refreshBrush({ ...brush, points: brush.points.map(points => [...points]) }, settings)

  it.each([1, 2])('gives the borders of the whole brush while its strokes grow, at the scale %d', scaleX => {
    let brush = refreshBrush({ id: 'brush_1', type: 'brush', points: [[[10.4, 20.6]]], scaleX, scaleY: 1 }, settings)
    // each point, and whether it starts a new stroke
    const steps: [Point, boolean][] = [
      [[30, 5], false],
      [[-12, 40], false],
      [[25, 60], false],
      [[100, -30], true],
      [[80, 10], false]
    ]
    for (const [point, isNewStroke] of steps) {
      brush = isNewStroke ? addNewPointGroupToShape(brush, point, settings) : addNewPointToShape(brush, point, settings)
      expect(brush.computed).toEqual(rebuild(brush).computed)
    }
    expect(brush.points).toEqual([
      [
        [10.4, 20.6],
        [30, 5],
        [-12, 40],
        [25, 60]
      ],
      [
        [100, -30],
        [80, 10]
      ]
    ])
  })
})

describe('createBrushPath', () => {
  const STROKE: Point[] = [
    [0, 0],
    [10, 0],
    [20, 10],
    [30, 0],
    [40, 0]
  ]
  const brush = { type: 'brush' as const, points: [STROKE, [[50, 50] as Point]], scaleX: 1, scaleY: 1 }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('draws the strokes with lines, and a point drawn alone with a dot', () => {
    const lineTo = vi.spyOn(Path2D.prototype, 'lineTo')
    const rect = vi.spyOn(Path2D.prototype, 'rect')
    createBrushPath(brush, { brushAlgo: 'simple' } as UtilsSettings)
    expect(lineTo).toHaveBeenCalledTimes(4)
    expect(rect).toHaveBeenCalledWith(50, 50, 1, 1)
  })

  it('smooths the strokes with quadratic curves controlled by each inner point, up to their last point', () => {
    const lineTo = vi.spyOn(Path2D.prototype, 'lineTo')
    const quadraticCurveTo = vi.spyOn(Path2D.prototype, 'quadraticCurveTo')
    createBrushPath(brush, { brushAlgo: 'quadratic' } as UtilsSettings)
    expect(lineTo).not.toHaveBeenCalled()
    // each curve ends in the middle of the next segment, the last one at the last point
    expect(quadraticCurveTo.mock.calls).toEqual([
      [10, 0, 15, 5],
      [20, 10, 25, 5],
      [30, 0, 40, 0]
    ])
  })

  it('draws a short stroke with a single quadratic curve', () => {
    const quadraticCurveTo = vi.spyOn(Path2D.prototype, 'quadraticCurveTo')
    const strokes: Point[][] = [
      [
        [0, 0],
        [10, 0]
      ],
      [
        [0, 0],
        [10, 10],
        [20, 0]
      ]
    ]
    createBrushPath({ type: 'brush', points: strokes, scaleX: 1, scaleY: 1 }, { brushAlgo: 'quadratic' } as UtilsSettings)
    expect(quadraticCurveTo.mock.calls).toEqual([
      [0, 0, 10, 0],
      [10, 10, 20, 0]
    ])
  })
})

describe('drawPicture', () => {
  type FakeCanvas = { width: number; height: number; source?: unknown }
  let copies: FakeCanvas[] = []

  // the copies are made on canvases out of the page
  beforeEach(() => {
    copies = []
    vi.stubGlobal('document', {
      createElement: () => {
        const canvas: FakeCanvas & { addEventListener: () => void; getContext: () => unknown } = {
          width: 0,
          height: 0,
          addEventListener: () => {},
          getContext: () => ({
            canvas,
            drawImage: (source: unknown) => {
              canvas.source = source
            }
          })
        }
        copies.push(canvas)
        return canvas
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    stubPath2D()
  })

  /** A context recording the operations of the drawing, scaled and rotated */
  const createPictureContext = (scale = 1, rotation = 0) => {
    const calls: string[] = []
    const record = (name: string) => vi.fn((..._args: unknown[]) => calls.push(name))
    const ctx = {
      globalAlpha: 1,
      getTransform: () => ({
        a: scale * Math.cos(rotation),
        b: scale * Math.sin(rotation),
        c: -scale * Math.sin(rotation),
        d: scale * Math.cos(rotation)
      }),
      beginPath: () => {},
      scale: () => {},
      save: record('save'),
      restore: record('restore'),
      clip: record('clip'),
      stroke: record('stroke'),
      drawImage: record('drawImage')
    }
    return { ctx, calls }
  }

  /** The source drawn for a picture of 300 × 200 pixels of the drawing, scaled and rotated by the canvas */
  const drawnSource = (img: HTMLImageElement, scale: number, rotation = 0) => {
    const { ctx } = createPictureContext(scale, rotation)
    drawPicture(ctx as unknown as CanvasRenderingContext2D, { type: 'picture', img, x: 0, y: 0, width: 300, height: 200 } as ShapeEntity<'picture'>)
    return ctx.drawImage.mock.calls[0]![0] as FakeCanvas | HTMLImageElement
  }

  const photo = (naturalWidth = 3000, naturalHeight = 2000) => ({ naturalWidth, naturalHeight }) as HTMLImageElement

  it('draws a picture much smaller than its image from the smallest copy at least as large, made once', () => {
    const img = photo()
    const source = drawnSource(img, 1)
    expect(source).toMatchObject({ width: 375, height: 250, source: img })
    expect(drawnSource(img, 1)).toBe(source)
    expect(copies).toHaveLength(1)
  })

  it('follows the scale and the rotation of the canvas', () => {
    const img = photo()
    expect(drawnSource(img, 2)).toMatchObject({ width: 750, height: 500 })
    expect(drawnSource(img, 2, Math.PI / 5)).toMatchObject({ width: 750, height: 500 })
    // more than half of the image
    expect(drawnSource(img, 6)).toBe(img)
  })

  it('draws the image itself until it is loaded', () => {
    const img = photo(0, 0)
    expect(drawnSource(img, 1)).toBe(img)
    expect(copies).toHaveLength(0)
  })

  it('cuts the image at its rounded corners, then draws its border over it, without the clip', () => {
    const drawnCalls = (style: StyleShape, flipX = false) => {
      const { ctx, calls } = createPictureContext()
      const picture = createEntity<ShapeEntity<'picture'>>({ type: 'picture', x: 0, y: 0, width: 300, height: 200, src: '', style })
      drawPicture(ctx as unknown as CanvasRenderingContext2D, { ...picture, img: photo(300, 200), flipX })
      return calls
    }
    // without a border, the caller restores the context after the shape
    expect(drawnCalls({})).toEqual(['drawImage'])
    expect(drawnCalls({ cornerRadius: 20, strokeColor: 'transparent' })).toEqual(['clip', 'drawImage'])
    expect(drawnCalls({ strokeColor: 'red' })).toEqual(['drawImage', 'stroke'])
    expect(drawnCalls({ strokeColor: 'red' }, true)).toEqual(['save', 'drawImage', 'restore', 'stroke'])
    expect(drawnCalls({ cornerRadius: 20, strokeColor: 'red' })).toEqual(['save', 'clip', 'drawImage', 'restore', 'stroke'])
  })
})

describe('bounds of the curves', () => {
  const STEPS = 1000

  /** Points of a cubic Bezier segment, sampled from its start to its end */
  const sampleBezier = (p0: Point, p1: Point, p2: Point, p3: Point): Point[] =>
    Array.from({ length: STEPS + 1 }, (_, index) => {
      const t = index / STEPS
      const at = (axis: 0 | 1) => (1 - t) ** 3 * p0[axis] + 3 * (1 - t) ** 2 * t * p1[axis] + 3 * (1 - t) * t ** 2 * p2[axis] + t ** 3 * p3[axis]
      return [at(0), at(1)]
    })

  const expectBoundsCloseTo = (bounds: Bounds, expected: Bounds) => {
    for (const key of ['minX', 'maxX', 'minY', 'maxY'] as const) expect(bounds[key]).toBeCloseTo(expected[key], 2)
  }

  it('bounds a straight segment by its ends', () => {
    expect(getCubicBezierBounds([0, 0], [10, 0], [20, 0], [30, 0])).toEqual({ minX: 0, maxX: 30, minY: 0, maxY: 0 })
  })

  it('bounds a curve going beyond its ends, at its extremum', () => {
    // the top of the arch is at the middle of the curve: 3/8 × -100 twice
    expect(getCubicBezierBounds([0, 0], [0, -100], [100, -100], [100, 0])).toEqual({ minX: 0, maxX: 100, minY: -75, maxY: 0 })
  })

  it('bounds an S-shaped curve going beyond its ends on both sides', () => {
    const points: [Point, Point, Point, Point] = [
      [0, 0],
      [-100, -100],
      [200, 200],
      [100, 100]
    ]
    const bounds = getCubicBezierBounds(...points)
    expectBoundsCloseTo(bounds, getPointsBounds([sampleBezier(...points)]))
    expect(bounds.minX).toBeLessThan(0)
    expect(bounds.maxX).toBeGreaterThan(100)
  })

  it('frames a closed curve, which goes beyond the triangle of its points, with the selection padding around it', () => {
    const curveSettings = { selectionPadding: 5 } as UtilsSettings
    const curve = refreshCurve(
      {
        id: 'curve_1',
        type: 'curve',
        points: [
          [0, 0],
          [100, 0],
          [50, 100]
        ],
        style: { closedPoints: 1 }
      },
      curveSettings
    )
    const pts = getCatmullRomPoints(curve, curve.points)
    const drawn = pts.slice(1, -2).flatMap((p1, index) => {
      const p0 = pts[index]!
      const p2 = pts[index + 2]!
      const p3 = pts[index + 3]!
      const { cp1, cp2 } = catmullRomToBezier(p0, p1, p2, p3)
      return sampleBezier(p1, cp1, cp2, p2)
    })
    const sampled = getPointsBounds([drawn])
    expect(sampled.minY).toBeLessThan(0)

    const { x, y, width, height } = curve.computed.outerBorders
    expectBoundsCloseTo({ minX: x + 5, maxX: x + width - 5, minY: y + 5, maxY: y + height - 5 }, sampled)
  })
})
