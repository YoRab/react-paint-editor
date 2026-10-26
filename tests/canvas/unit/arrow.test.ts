import type { Point, ShapeEntity } from '@canvas/types/Shapes'
import { addCurveArrowHeads, addStraightArrowHeads, drawArrowHeads } from '@canvas/utils/shapes/arrow'
import type { BezierSegment } from '@canvas/utils/shapes/path'
import { getDistanceBetweenPoints } from '@canvas/utils/trigo'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createShape, stubPath2D } from './helpers'

stubPath2D()

afterEach(() => {
  vi.restoreAllMocks()
})

const expectPoints = (points: readonly Point[], expected: Point[]) => {
  expect(points).toHaveLength(expected.length)
  points.forEach((point, index) => {
    expect(point[0]).toBeCloseTo(expected[index]![0])
    expect(point[1]).toBeCloseTo(expected[index]![1])
  })
}

// 100 long along x: the heads of a stroke 1 wide are 12 long and 12 wide
const LINE: Point[] = [
  [0, 0],
  [100, 0]
]

describe('heads of the straight ends', () => {
  it('stops the stroke at the back of a triangle pointing to the end, as long and as wide as the arrows of the lines were', () => {
    const lineTo = vi.spyOn(Path2D.prototype, 'lineTo')
    const { points, arrows, bounds } = addStraightArrowHeads({ lineWidth: 1, arrowEnd: 'triangle' }, LINE)
    expectPoints(points, [
      [0, 0],
      [88, 0]
    ])
    expect(arrows).toHaveLength(1)
    expect(arrows[0]!.filled).toBe(true)
    expect(lineTo.mock.calls).toEqual([
      [88, 6],
      [88, -6]
    ])
    expect(bounds).toEqual({ x: 88, y: -6, width: 12, height: 12 })
  })

  it('grows the heads with the stroke and the arrow size, a size which is not positive giving the default one', () => {
    expectPoints(addStraightArrowHeads({ lineWidth: 5, arrowStart: 'triangle' }, LINE).points, [
      [20, 0],
      [100, 0]
    ])
    expectPoints(addStraightArrowHeads({ lineWidth: 1, arrowEnd: 'diamond', arrowSize: 2 }, LINE).points, [
      [0, 0],
      [76, 0]
    ])
    expectPoints(addStraightArrowHeads({ lineWidth: 1, arrowEnd: 'triangleOutline', arrowSize: -1 }, LINE).points, [
      [0, 0],
      [88, 0]
    ])
  })

  it('centers the circles and the bars on the end, the stroke going to the middle of a circle, to a bar and to an open head', () => {
    const arc = vi.spyOn(Path2D.prototype, 'arc')
    const circle = addStraightArrowHeads({ lineWidth: 1, arrowStart: 'circle', arrowEnd: 'circleOutline' }, LINE)
    expectPoints(circle.points, [
      [4.5, 0],
      [95.5, 0]
    ])
    expect(arc).toHaveBeenCalledWith(0, 0, 4.5, 0, 2 * Math.PI)
    expect(circle.arrows.map(({ filled }) => filled)).toEqual([true, false])
    expect(circle.bounds).toEqual({ x: -4.5, y: -4.5, width: 109, height: 9 })

    const stroked = addStraightArrowHeads({ lineWidth: 1, arrowStart: 'bar', arrowEnd: 'open' }, LINE)
    expectPoints(stroked.points, LINE)
    expect(stroked.arrows.map(({ filled }) => filled)).toEqual([false, false])
    expect(stroked.bounds).toEqual({ x: 0, y: -6, width: 100, height: 12 })
  })

  it('keeps each end of a stroke shorter than its heads at the next point, under the other head', () => {
    const short: Point[] = [
      [0, 0],
      [5, 0]
    ]
    expectPoints(addStraightArrowHeads({ lineWidth: 1, arrowStart: 'triangle', arrowEnd: 'triangle' }, short).points, [
      [5, 0],
      [0, 0]
    ])
  })

  it('draws no head without arrows, for an unknown head, on a closed stroke, and at an end of no length', () => {
    expect(addStraightArrowHeads({ arrowStart: 'none' }, LINE)).toEqual({ points: LINE, arrows: [], bounds: undefined })
    expect(addStraightArrowHeads({ arrowStart: 'triangle' }, LINE, true)).toEqual({ points: LINE, arrows: [], bounds: undefined })
    expect(addStraightArrowHeads({ arrowEnd: 'star' as 'bar' }, LINE).arrows).toEqual([])
    const point: Point[] = [
      [10, 10],
      [10, 10]
    ]
    expect(addStraightArrowHeads({ arrowStart: 'triangle', arrowEnd: 'triangle' }, point).arrows).toEqual([])
    expect(addStraightArrowHeads({ arrowEnd: 'triangle' }, [[10, 10]]).arrows).toEqual([])
  })
})

describe('heads of the shapes', () => {
  it('hold the heads of a line in its outer borders, with their stroke', () => {
    const line = createShape<ShapeEntity<'line'>>({
      type: 'line',
      points: [LINE[0]!, LINE[1]!],
      style: { lineWidth: 1, arrowEnd: 'circle', arrowSize: 3 }
    })
    expect(line.arrows).toHaveLength(1)
    // the borders of the points with the selection padding of 5 and the half of the stroke, and the circle of radius 13.5
    expect(line.computed.outerBorders).toEqual({ x: -5.5, y: -14, width: 119.5, height: 28 })
    expect(line.computed.borders).toEqual({ x: -5, y: -5, width: 110, height: 10 })
  })

  it('point along the first and the last sides of an open polygon, and leave a closed polygon without heads', () => {
    const points: Point[] = [
      [0, 0],
      [50, 0],
      [50, 50]
    ]
    const lineTo = vi.spyOn(Path2D.prototype, 'lineTo')
    const moveTo = vi.spyOn(Path2D.prototype, 'moveTo')
    const style = { lineWidth: 1, arrowStart: 'triangle', arrowEnd: 'triangle' } as const
    const polygon = createShape<ShapeEntity<'polygon'>>({ type: 'polygon', points, style })
    expect(polygon.arrows).toHaveLength(2)
    // the heads, then the stroke
    expect(moveTo.mock.calls).toEqual([
      [0, 0],
      [50, 50],
      [12, 0]
    ])
    expect(lineTo.mock.calls.slice(-2)).toEqual([
      [50, 0],
      [50, 38]
    ])

    lineTo.mockClear()
    const closed = createShape<ShapeEntity<'polygon'>>({ type: 'polygon', points, style: { ...style, closedPoints: 1 } })
    expect(closed.arrows).toEqual([])
    expect(lineTo.mock.calls).toEqual([
      [50, 0],
      [50, 50]
    ])
  })

  it('cut a curve where it goes under its heads, which point to its ends from the curve at their length', () => {
    const bezierCurveTo = vi.spyOn(Path2D.prototype, 'bezierCurveTo')
    const moveTo = vi.spyOn(Path2D.prototype, 'moveTo')
    const lineTo = vi.spyOn(Path2D.prototype, 'lineTo')
    const curve = createShape<ShapeEntity<'curve'>>({
      type: 'curve',
      points: [
        [0, 0],
        [50, 50],
        [100, 0]
      ],
      style: { lineWidth: 1, arrowEnd: 'triangle' }
    })
    expect(curve.arrows).toHaveLength(1)
    // the head from its tip, then the stroke from its start
    expect(moveTo.mock.calls).toEqual([
      [100, 0],
      [0, 0]
    ])
    expect(bezierCurveTo).toHaveBeenCalledTimes(2)
    const end = bezierCurveTo.mock.calls[1]!.slice(4) as Point
    expect(getDistanceBetweenPoints(end, [100, 0])).toBeCloseTo(12)
    // the middle of the back of the triangle is the end of the stroke
    const [[x1, y1], [x2, y2]] = lineTo.mock.calls as [Point, Point]
    expectPoints([[(x1 + x2) / 2, (y1 + y2) / 2]], [end])
  })

  it('cut the same segment of a curve at its two ends', () => {
    const segment: BezierSegment = [
      [0, 0],
      [0, 30],
      [100, 30],
      [100, 0]
    ]
    const { segments, arrows } = addCurveArrowHeads({ lineWidth: 1, arrowStart: 'triangle', arrowEnd: 'circle' }, [segment], false)
    expect(arrows).toHaveLength(2)
    expect(getDistanceBetweenPoints(segments[0]![0], [0, 0])).toBeCloseTo(12)
    expect(getDistanceBetweenPoints(segments[0]![3], [100, 0])).toBeCloseTo(4.5)
  })
})

describe('drawArrowHeads', () => {
  it('fills the filled heads and strokes the other ones with the color of the stroke, without its dashes', () => {
    const ctx = { setLineDash: vi.fn(), fill: vi.fn(), stroke: vi.fn(), strokeStyle: 'red', fillStyle: '' }
    const { arrows } = addStraightArrowHeads({ arrowStart: 'diamond', arrowEnd: 'diamondOutline' }, LINE)
    drawArrowHeads(ctx as unknown as CanvasRenderingContext2D, arrows)
    expect(ctx.setLineDash).toHaveBeenCalledWith([])
    expect(ctx.fillStyle).toBe('red')
    expect(ctx.fill).toHaveBeenCalledWith(arrows[0]!.path)
    expect(ctx.stroke).toHaveBeenCalledWith(arrows[1]!.path)
  })
})
