import type { Point, ShapeEntity } from '@canvas/types/Shapes'
import { canRemoveShapePoint } from '@canvas/utils/shapes'
import { getBrushBorder } from '@canvas/utils/shapes/brush'
import { describe, expect, it } from 'vitest'

const withPoints = (type: 'polygon' | 'curve' | 'line', pointsCount: number) =>
  ({ id: `${type}_1`, type, points: Array.from({ length: pointsCount }, (_, index): Point => [index, index]) }) as unknown as ShapeEntity

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
