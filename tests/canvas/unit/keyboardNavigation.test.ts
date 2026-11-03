import type { ShapeEntity } from '@canvas/types/Shapes'
import { getFirstShapeOfGroup, getNextShape, getOffsetShowingBox } from '@canvas/utils/keyboardNavigation'
import { describe, expect, it } from 'vitest'

/** The fields of the shapes read by the navigation */
type ShapeFields = { id: string; type: string; visible?: boolean; locked?: boolean; shapes?: ShapeFields[] }

const rect = (id: string, fields: Partial<ShapeFields> = {}): ShapeFields => ({ id, type: 'rect', ...fields })
const group = (id: string, shapes: ShapeFields[], fields: Partial<ShapeFields> = {}): ShapeFields => ({ id, type: 'group', shapes, ...fields })

const asShapes = (shapes: ShapeFields[]) => shapes as unknown as ShapeEntity[]

/** a, a hidden shape, a group of b and c, a locked shape and d, from the foreground */
const SHAPES = asShapes([
  rect('a'),
  rect('hidden', { visible: false }),
  group('g', [rect('b'), rect('c')]),
  rect('locked', { locked: true }),
  rect('d')
])

const find = (id: string) => {
  const walk = (shapes: ShapeEntity[]): ShapeEntity | undefined =>
    shapes.reduce<ShapeEntity | undefined>(
      (found, shape) => found ?? (shape.id === id ? shape : shape.type === 'group' ? walk(shape.shapes) : undefined),
      undefined
    )
  return walk(SHAPES)!
}

const next = (id: string | undefined, direction: 1 | -1) => getNextShape(SHAPES, id ? [find(id)] : [], direction)?.id

describe('canvas/utils/keyboardNavigation', () => {
  it('goes round the visible shapes which are not locked, from the foreground', () => {
    expect(next('a', 1)).toBe('g')
    expect(next('g', 1)).toBe('d')
    expect(next('d', 1)).toBe('a')
    expect(next('a', -1)).toBe('d')
    expect(next('g', -1)).toBe('a')
  })

  it('starts from the first shape, or from the last one backwards, without selection', () => {
    expect(next(undefined, 1)).toBe('a')
    expect(next(undefined, -1)).toBe('d')
    // a selected shape which Tab skips starts again from an end
    expect(next('locked', 1)).toBe('a')
    expect(getNextShape(asShapes([rect('only', { locked: true })]), [], 1)).toBeUndefined()
  })

  it('stays among the shapes of the group of the selection', () => {
    expect(next('b', 1)).toBe('c')
    expect(next('c', 1)).toBe('b')
    expect(next('b', -1)).toBe('c')
  })

  it('gives the first shape of a group which Tab goes through', () => {
    expect(getFirstShapeOfGroup(find('g'))?.id).toBe('b')
    expect(getFirstShapeOfGroup(asShapes([group('g2', [rect('x', { visible: false }), rect('y')])])[0]!)?.id).toBe('y')
    expect(getFirstShapeOfGroup(find('a'))).toBeUndefined()
  })

  it('moves the view to show a box in its middle, only when it is not inside', () => {
    const view = { x: 0, y: 0, width: 1000, height: 600 }
    expect(getOffsetShowingBox({ x: 100, y: 100, width: 50, height: 50 }, view)).toBeUndefined()
    // the center of the box, 1525 × 325, goes to the center of the view, 500 × 300
    expect(getOffsetShowingBox({ x: 1500, y: 300, width: 50, height: 50 }, view)).toEqual([-1025, -25])
  })
})
