import type { UtilsSettings } from '@canvas/constants/app'
import type { Point, ShapeEntity } from '@canvas/types/Shapes'
import { canRemoveShapePoint } from '@canvas/utils/shapes'
import { addNewPointGroupToShape, addNewPointToShape, getBrushBorder, refreshBrush } from '@canvas/utils/shapes/brush'
import { drawPicture } from '@canvas/utils/shapes/picture'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubPath2D } from './helpers'

stubPath2D()

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

  /** The source drawn for a picture of 300 × 200 pixels of the drawing, scaled and rotated by the canvas */
  const drawnSource = (img: HTMLImageElement, scale: number, rotation = 0) => {
    const drawImage = vi.fn()
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
      drawImage
    } as unknown as CanvasRenderingContext2D
    drawPicture(ctx, { type: 'picture', img, x: 0, y: 0, width: 300, height: 200 } as ShapeEntity<'picture'>)
    return drawImage.mock.calls[0]![0] as FakeCanvas | HTMLImageElement
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
})
