import { createPaintStore } from '@canvas/store/paintStore'
import type { DrawableShape, Point, SelectionType, ShapeEntity } from '@canvas/types/Shapes'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { applyToSelectedShape, buildShapesGroup, selectShape } from '@canvas/utils/selection'
import { mustKeepRatio, refreshShape } from '@canvas/utils/shapes'
import { describe, expect, it, vi } from 'vitest'
import { RECTS } from './helpers'

type RectArgs = [number, number, number, number]

/** Path2D keeping its rectangles, so that the context below finds the filled rects under a point */
vi.stubGlobal(
  'Path2D',
  class {
    rects: RectArgs[] = []
    rect(...args: RectArgs) {
      this.rects.push(args)
    }
    arc() {}
    closePath() {}
    lineTo() {}
    moveTo() {}
  }
)

const ctx = {
  lineWidth: 1,
  isPointInPath: (path: { rects: RectArgs[] }, x: number, y: number) =>
    path.rects.some(([rectX, rectY, width, height]) => x >= rectX && x <= rectX + width && y >= rectY && y <= rectY + height),
  isPointInStroke: () => false
} as unknown as CanvasRenderingContext2D

const settings = createPaintStore().getSettings()

// three filled 100×100 rects side by side, from x 100, 300 and 500, from y 100
const [A, B, C] = RECTS.map((rect, index) => refreshShape({ ...rect, id: `rect_${index}` } as DrawableShape & { id: string }, settings)) as [
  ShapeEntity,
  ShapeEntity,
  ShapeEntity
]
const LOCKED_C = { ...C, locked: true }
const SHAPES = [A, B, LOCKED_C]

// cover is inside the shape covering A below, outside of the selection frame of A
const CENTERS: Record<'A' | 'B' | 'C' | 'empty' | 'cover', Point> = {
  A: [150, 150],
  B: [350, 150],
  C: [550, 150],
  empty: [150, 400],
  cover: [60, 60]
}

const select = (
  target: keyof typeof CENTERS,
  selection: SelectionType | undefined,
  behavior?: 'add' | 'toggle' | 'replace',
  { withFrameSelection = false, shapes = SHAPES, preferSelection = true } = {}
) => selectShape(ctx, shapes, CENTERS[target], settings, selection, false, withFrameSelection, behavior, preferSelection)

const getIds = (selection: SelectionType | undefined) => getSelectedShapes(selection).map(shape => shape.id)

describe('selectShape', () => {
  it('replaces the selection by the shape under the cursor, and starts translating it', () => {
    const { shape, mode } = select('B', A)
    expect(shape).toBe(B)
    expect(mode).toMatchObject({ mode: 'translate', cursorStartPosition: CENTERS.B, originalShape: B })
  })

  it('keeps the selection when the cursor is on it', () => {
    const group = buildShapesGroup([A, B], settings)
    expect(select('B', group).shape).toBe(group)
  })

  it('clears the selection outside of the shapes, and starts a selection frame when it is allowed', () => {
    expect(select('empty', A)).toEqual({ shape: undefined, mode: { mode: 'default' } })
    expect(select('empty', A, 'replace', { withFrameSelection: true }).mode).toEqual({ mode: 'selectionFrame' })
  })

  it('adds the shape under the cursor to the selection', () => {
    expect(select('A', undefined, 'add').shape).toBe(A)
    const { shape, mode } = select('B', A, 'add')
    expect(getIds(shape)).toEqual([A.id, B.id])
    expect(mode).toMatchObject({ mode: 'translate', originalShape: shape, selectedShapesLengthAtMouseDown: 1 })
  })

  it('toggles the shape under the cursor in the selection', () => {
    const { shape, mode } = select('B', buildShapesGroup([A, B], settings), 'toggle')
    expect(shape).toBe(A)
    expect(mode).toMatchObject({ mode: 'translate', selectedShapesLengthAtMouseDown: 2 })
    expect(getIds(select('B', A, 'toggle').shape)).toEqual([A.id, B.id])
  })

  it('keeps the selection when the cursor is outside of the shapes while adding', () => {
    expect(select('empty', A, 'add')).toEqual({ shape: A, mode: { mode: 'default' } })
  })

  it('does not add a locked shape to the selection', () => {
    expect(select('C', A, 'add')).toEqual({ shape: A, mode: { mode: 'default' } })
    expect(select('C', A, 'add', { withFrameSelection: true }).mode).toEqual({ mode: 'selectionFrame' })
    expect(select('C', A, 'toggle')).toEqual({ shape: A, mode: { mode: 'default' } })
  })

  it('replaces a locked selection by the shape added to it', () => {
    const lockedA = { ...A, locked: true }
    const { shape } = select('B', lockedA, 'add', { shapes: [lockedA, B, LOCKED_C] })
    expect(shape).toBe(B)
  })

  describe('with a shape in front of A, covering it', () => {
    // a filled 200×200 rect from x 50 and y 50, beyond the selection frame of A
    const COVER = refreshShape({ ...RECTS[0], id: 'cover', x: 50, y: 50, width: 200, height: 200 } as DrawableShape & { id: string }, settings)
    const shapes = [COVER, A, B]
    const group = buildShapesGroup([A, B], settings)

    it('selects the shape in front', () => {
      expect(select('A', undefined, 'replace', { shapes }).shape).toBe(COVER)
      expect(select('A', B, 'replace', { shapes }).shape).toBe(COVER)
    })

    it('keeps A selected in its selection frame, and starts translating it: a drag moves it', () => {
      const { shape, mode } = select('A', A, 'replace', { shapes })
      expect(shape).toBe(A)
      expect(mode).toMatchObject({ mode: 'translate', originalShape: A })
      expect(select('A', group, 'replace', { shapes }).shape).toBe(group)
      // the press of a group mode keeps the selection too
      expect(getIds(select('A', group, 'add', { shapes }).shape)).toEqual([A.id, B.id])
    })

    it('selects the shape in front outside of the selection frame of A', () => {
      expect(select('cover', A, 'replace', { shapes }).shape).toBe(COVER)
    })

    it('selects or toggles the shape in front when the selection is not preferred, as on a click', () => {
      expect(select('A', A, 'replace', { shapes, preferSelection: false }).shape).toBe(COVER)
      expect(select('A', group, 'replace', { shapes, preferSelection: false }).shape).toBe(COVER)
      expect(getIds(select('A', group, 'toggle', { shapes, preferSelection: false }).shape)).toEqual([A.id, B.id, COVER.id])
    })
  })
})

describe('applyToSelectedShape', () => {
  const moveRight = applyToSelectedShape(
    (shape, currentSettings) =>
      refreshShape({ ...shape, x: (shape as ShapeEntity<'rect'>).x + 10 } as DrawableShape & { id: string }, currentSettings),
    settings
  )

  it('changes the shape of a selection, or each shape of a group', () => {
    expect(moveRight(undefined)).toBeUndefined()
    expect(moveRight(A)).toMatchObject({ id: A.id, x: 110 })

    const group = moveRight(buildShapesGroup([A, B], settings))
    expect(group).toMatchObject({ type: 'group', x: 110, width: 300 })
    expect(getSelectedShapes(group).map(shape => (shape as ShapeEntity<'rect'>).x)).toEqual([110, 310])
  })
})

describe('buildShapesGroup', () => {
  const paddedSettings = { ...settings, selectionPadding: 5 }
  const rect = (id: string, x: number, rotation = 0, style = {}) =>
    refreshShape({ id, type: 'rect', x, y: 0, width: 100, height: 50, rotation, style } as DrawableShape & { id: string }, paddedSettings)

  const getFrame = (selection: SelectionType | undefined) => {
    const { x, y, width, height, rotation } = selection as ShapeEntity<'rect'>
    return { x, y, width, height, rotation }
  }

  it('gives no group without shapes, and the shape itself when it is alone', () => {
    expect(buildShapesGroup([], paddedSettings)).toBeUndefined()
    expect(buildShapesGroup([A], paddedSettings)).toBe(A)
  })

  it('frames the shapes, its borders keeping the padding of the selection around them', () => {
    const group = buildShapesGroup([rect('a', 0), rect('b', 200)], paddedSettings)
    expect(group).toMatchObject({ id: 'a-b', type: 'group', visible: true, locked: false })
    expect(getFrame(group)).toEqual({ x: 0, y: 0, width: 300, height: 50, rotation: 0 })
    expect(group?.computed.borders).toEqual({ x: -5, y: -5, width: 310, height: 60 })
  })

  it('turns the group like its shapes when they are turned the same way, and frames them in its own frame', () => {
    // turned by a quarter, the two shapes 100 wide are side by side along the height of the group
    const group = buildShapesGroup([rect('a', 0, Math.PI / 2), rect('b', 200, Math.PI / 2)], paddedSettings)
    expect(getFrame(group)).toEqual({ x: 100, y: -100, width: 100, height: 250, rotation: Math.PI / 2 })
    expect(group?.computed.center).toEqual([150, 25])
  })

  it('frames the turned corners of shapes turned differently, without turning the group', () => {
    // the second rect, turned by a quarter around its center (250, 25), goes from (225, -25) to (275, 75)
    const group = buildShapesGroup([rect('a', 0), rect('b', 200, Math.PI / 2)], paddedSettings)
    expect(getFrame(group)).toEqual({ x: 0, y: -25, width: 275, height: 100, rotation: 0 })
  })

  it('keeps the style fields shared by all the shapes', () => {
    const a = rect('a', 0, 0, { strokeColor: 'black', fillColor: 'red', lineWidth: 2 })
    const b = rect('b', 200, 0, { strokeColor: 'black', fillColor: 'blue', lineWidth: 2 })
    const c = rect('c', 400, 0, { strokeColor: 'black' })
    expect(buildShapesGroup([a, b], paddedSettings)?.style).toEqual({ strokeColor: 'black', lineWidth: 2 })
    expect(buildShapesGroup([a, b, c], paddedSettings)?.style).toEqual({ strokeColor: 'black' })
  })
})

describe('mustKeepRatio', () => {
  const shape = (type: ShapeEntity['type'], rotation = 0) => ({ type, rotation }) as ShapeEntity

  it('lets shapes turned the same way be stretched', () => {
    expect(mustKeepRatio([shape('rect'), shape('ellipse'), shape('brush')])).toBe(false)
    expect(mustKeepRatio([shape('rect', 0.5), shape('ellipse', 0.5)])).toBe(false)
    expect(mustKeepRatio([shape('rect'), shape('line')])).toBe(false)
  })

  it('keeps the proportions with a shape which keeps its own', () => {
    for (const type of ['square', 'circle', 'picture', 'text'] as const) {
      expect(mustKeepRatio([shape('rect'), shape(type)])).toBe(true)
    }
  })

  it('keeps the proportions of shapes turned differently, or of turned shapes with shapes made of points', () => {
    expect(mustKeepRatio([shape('rect'), shape('rect', 0.5)])).toBe(true)
    expect(mustKeepRatio([shape('rect', 0.5), shape('line')])).toBe(true)
  })
})
