import type { UtilsSettings } from '@canvas/constants/app'
import type { DrawableShape, Point, ShapeInput, StyleShape } from '@canvas/types/Shapes'
import { checkSelectionFrameCollision } from '@canvas/utils/intersect'
import { refreshShape } from '@canvas/utils/shapes'
import { describe, expect, it, vi } from 'vitest'
import { stubPath2D } from './helpers'

stubPath2D()

const settings = { selectionPadding: 5 } as UtilsSettings

const OUTLINED: StyleShape = { fillColor: 'transparent', strokeColor: 'black', lineWidth: 2 }

const createShape = (shape: ShapeInput) => refreshShape({ id: `${shape.type}_1`, ...shape } as DrawableShape & { id: string }, settings)

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

  it('searches the inside of a filled shape', () => {
    const ctx = createContext(true)
    const filledRect = createShape({ type: 'rect', x: 0, y: 0, width: 1000, height: 600, style: { ...OUTLINED, fillColor: 'red' } })
    expect(checkSelectionFrameCollision(ctx, filledRect, frame([400, 250], [550, 350]))).toBe(true)
    expect(ctx.isPointInPath).toHaveBeenCalled()
  })
})
