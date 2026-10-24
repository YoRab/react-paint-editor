import type { ShapeEntity } from '@canvas/types/Shapes'
import { flipShapes } from '@canvas/utils/shapes'
import { getBrushPointScaler } from '@canvas/utils/shapes/path'
import { describe, expect, it } from 'vitest'
import { createShape, MEASURE_CONTEXT, stubPath2D, UTILS_SETTINGS } from './helpers'

stubPath2D()

// shapes from (0, 0) to (400, 200): a horizontal flip mirrors them around x = 200, a vertical one around y = 100
const RECT = createShape<ShapeEntity<'rect'>>({ type: 'rect', x: 0, y: 0, width: 100, height: 50 })
const LINE = createShape<ShapeEntity<'line'>>({
  type: 'line',
  points: [
    [200, 0],
    [300, 100]
  ]
})
const POLYGON = createShape<ShapeEntity<'polygon'>>({
  type: 'polygon',
  points: [
    [0, 100],
    [50, 150],
    [100, 100]
  ]
})
const PICTURE = createShape<ShapeEntity<'picture'>>({ type: 'picture', x: 300, y: 100, width: 100, height: 100, ratio: 1, src: '' })
const TEXT = createShape<ShapeEntity<'text'>>({ type: 'text', x: 150, y: 150, width: 50, height: 10, fontSize: 10, value: ['abcde'] })
const BRUSH = createShape<ShapeEntity<'brush'>>({
  type: 'brush',
  points: [
    [
      [0, 150],
      [100, 200]
    ]
  ]
})
const ELLIPSE = createShape<ShapeEntity<'ellipse'>>({ type: 'ellipse', x: 250, y: 175, radiusX: 50, radiusY: 25 })

const SHAPES = [RECT, LINE, POLYGON, PICTURE, TEXT, BRUSH, ELLIPSE]

type FlippedShapes = [
  ShapeEntity<'rect'>,
  ShapeEntity<'line'>,
  ShapeEntity<'polygon'>,
  ShapeEntity<'picture'>,
  ShapeEntity<'text'>,
  ShapeEntity<'brush'>,
  ShapeEntity<'ellipse'>
]

const flip = (shapes: ShapeEntity[], action: 'flipHorizontally' | 'flipVertically') => flipShapes(MEASURE_CONTEXT, shapes, action, UTILS_SETTINGS)

const getBox = ({ x, y, width, height }: ShapeEntity<'rect' | 'picture' | 'text'>) => ({ x, y, width, height })

const getBrushPoints = (brush: ShapeEntity<'brush'>) => brush.points.map(points => points.map(getBrushPointScaler(brush)))

/** The fields of a shape which a flip changes, to compare the shapes with their original */
const getGeometry = (shape: ShapeEntity) => {
  switch (shape.type) {
    case 'rect':
      return getBox(shape)
    case 'picture':
    case 'text':
      return { ...getBox(shape), flipX: !!shape.flipX, flipY: !!shape.flipY }
    case 'line':
    case 'polygon':
      return shape.points
    case 'brush':
      return getBrushPoints(shape)
    case 'ellipse':
      return { x: shape.x, y: shape.y, radiusX: shape.radiusX, radiusY: shape.radiusY }
    default:
      return shape
  }
}

describe('flipShapes', () => {
  it('mirrors shapes around the vertical axis of their group', () => {
    const [rect, line, polygon, picture, text, brush, ellipse] = flip(SHAPES, 'flipHorizontally') as FlippedShapes
    expect(getBox(rect)).toEqual({ x: 300, y: 0, width: 100, height: 50 })
    expect(line.points).toEqual([
      [200, 0],
      [100, 100]
    ])
    expect(polygon.points).toEqual([
      [400, 100],
      [350, 150],
      [300, 100]
    ])
    // a picture and a text are drawn mirrored
    expect(picture).toMatchObject({ x: 0, y: 100, width: 100, height: 100, flipX: true, flipY: false })
    expect(text).toMatchObject({ x: 200, y: 150, width: 50, height: 10, fontSize: 10, flipX: true, flipY: false })
    expect(getBrushPoints(brush)).toEqual([
      [
        [400, 150],
        [300, 200]
      ]
    ])
    expect(ellipse).toMatchObject({ x: 150, y: 175, radiusX: 50, radiusY: 25 })
  })

  it('mirrors shapes around the horizontal axis of their group', () => {
    const [rect, line, , picture, text, brush, ellipse] = flip(SHAPES, 'flipVertically') as FlippedShapes
    expect(getBox(rect)).toEqual({ x: 0, y: 150, width: 100, height: 50 })
    expect(line.points).toEqual([
      [200, 200],
      [300, 100]
    ])
    expect(picture).toMatchObject({ x: 300, y: 0, flipX: false, flipY: true })
    expect(text).toMatchObject({ x: 150, y: 40, flipX: false, flipY: true })
    expect(getBrushPoints(brush)).toEqual([
      [
        [0, 50],
        [100, 0]
      ]
    ])
    expect(ellipse).toMatchObject({ x: 250, y: 25 })
  })

  it('gives back the shapes when they are flipped twice', () => {
    for (const action of ['flipHorizontally', 'flipVertically'] as const) {
      const flippedTwice = flip(flip(SHAPES, action), action)
      expect(flippedTwice.map(getGeometry)).toEqual(SHAPES.map(getGeometry))
    }
  })

  it('turns a turned shape the other way, around its own center', () => {
    const turned = createShape<ShapeEntity<'rect'>>({ type: 'rect', x: 0, y: 0, width: 100, height: 50, rotation: Math.PI / 6 })
    const [flipped] = flip([turned], 'flipHorizontally') as [ShapeEntity<'rect'>]
    expect(flipped.rotation).toBeCloseTo(-Math.PI / 6)
    expect(getBox(flipped)).toEqual(getBox(turned))
  })

  it('keeps a locked shape', () => {
    const locked = createShape<ShapeEntity<'rect'>>({ type: 'rect', x: 300, y: 0, width: 100, height: 50, locked: true }, 'rect_2')
    const [rect, kept] = flip([RECT, locked], 'flipHorizontally') as [ShapeEntity<'rect'>, ShapeEntity<'rect'>]
    expect(rect.x).toBe(300)
    expect(kept).toBe(locked)
  })

  it('flips nothing without shapes', () => {
    expect(flip([], 'flipHorizontally')).toEqual([])
  })
})
