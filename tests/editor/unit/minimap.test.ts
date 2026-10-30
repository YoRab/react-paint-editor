import type { EditorState, Rect, ShapeEntity } from '@canvas/index'
import {
  canPanView,
  collectMinimapShapes,
  createMinimapShapesCollector,
  getMinimapBounds,
  getMinimapTransform,
  getOffsetToCenter,
  MINIMAP_SIZE,
  toDrawingPoint,
  toMinimapRect
} from '@editor/utils/minimap'
import { describe, expect, it } from 'vitest'

/** The fields of the shapes read by the minimap: only the box the shape is drawn in */
type ShapeFields = { id: string; type: string; visible?: boolean; shapes?: ShapeFields[]; computed?: { boundingBox: Rect } }

const rect = (id: string, boundingBox: Rect, fields: Partial<ShapeFields> = {}): ShapeFields => ({
  id,
  type: 'rect',
  computed: { boundingBox },
  ...fields
})
const group = (id: string, shapes: ShapeFields[], fields: Partial<ShapeFields> = {}): ShapeFields => ({ id, type: 'group', shapes, ...fields })

const asShapes = (shapes: ShapeFields[]) => shapes as unknown as ShapeEntity[]

const box = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height })

const NO_SELECTION = new Set<string>()

/** The fields of the state read by the geometry of the minimap */
const stateOf = (size: 'fixed' | 'infinite', width: number, height: number, visibleArea: Rect) =>
  ({ layout: { size, resize: 'scaleDown' }, width, height, view: { visibleArea } }) as unknown as EditorState

describe('editor/utils/minimap', () => {
  describe('collectMinimapShapes', () => {
    it('gives the box of each shape drawn, the shapes of the groups in place of the groups, and their bounds', () => {
      const shapes = asShapes([group('g', [rect('a', box(0, 0, 10, 10)), rect('b', box(90, 40, 10, 10))]), rect('c', box(20, 70, 10, 30))])

      const { boxes, selectedBoxes, bounds } = collectMinimapShapes(shapes, NO_SELECTION)

      expect(boxes).toEqual([box(0, 0, 10, 10), box(90, 40, 10, 10), box(20, 70, 10, 30)])
      expect(selectedBoxes).toEqual([])
      expect(bounds).toEqual(box(0, 0, 100, 100))
    })

    it('leaves out the hidden shapes and the shapes of the hidden groups, bounds included', () => {
      const shapes = asShapes([
        rect('a', box(0, 0, 10, 10)),
        rect('hidden', box(500, 500, 10, 10), { visible: false }),
        group('g', [rect('b', box(900, 900, 10, 10))], { visible: false })
      ])

      const { boxes, bounds } = collectMinimapShapes(shapes, NO_SELECTION)

      expect(boxes).toEqual([box(0, 0, 10, 10)])
      expect(bounds).toEqual(box(0, 0, 10, 10))
    })

    it('puts the selected shapes apart, the shapes of a selected group too', () => {
      const shapes = asShapes([group('g', [rect('a', box(0, 0, 10, 10)), rect('b', box(20, 0, 10, 10))]), rect('c', box(40, 0, 10, 10))])

      const { boxes, selectedBoxes } = collectMinimapShapes(shapes, new Set(['a', 'b']))

      expect(boxes).toEqual([box(40, 0, 10, 10)])
      expect(selectedBoxes).toEqual([box(0, 0, 10, 10), box(20, 0, 10, 10)])
    })

    it('selects the shapes of a selected group with it, at any depth', () => {
      const shapes = asShapes([
        group('outer', [group('inner', [rect('a', box(0, 0, 10, 10))]), rect('b', box(20, 0, 10, 10))]),
        rect('c', box(40, 0, 10, 10))
      ])

      const { boxes, selectedBoxes } = collectMinimapShapes(shapes, new Set(['outer']))

      expect(boxes).toEqual([box(40, 0, 10, 10)])
      expect(selectedBoxes).toEqual([box(0, 0, 10, 10), box(20, 0, 10, 10)])
    })

    it('has no bounds without a shape drawn', () => {
      expect(collectMinimapShapes(asShapes([]), NO_SELECTION).bounds).toBeUndefined()
      expect(collectMinimapShapes(asShapes([rect('a', box(0, 0, 10, 10), { visible: false })]), NO_SELECTION).bounds).toBeUndefined()
    })
  })

  describe('createMinimapShapesCollector', () => {
    const shapes = asShapes([rect('a', box(0, 0, 10, 10)), rect('b', box(20, 0, 10, 10))])

    it('gives the same boxes again while the shapes and the selection are the same', () => {
      const collect = createMinimapShapesCollector()
      const selectedShapeIds = ['a']

      const first = collect({ shapes, selectedShapeIds })

      expect(first.selectedBoxes).toEqual([box(0, 0, 10, 10)])
      expect(collect({ shapes, selectedShapeIds })).toBe(first)
    })

    it('collects them again when the shapes or the selection change', () => {
      const collect = createMinimapShapesCollector()
      const first = collect({ shapes, selectedShapeIds: ['a'] })

      const otherSelection = collect({ shapes, selectedShapeIds: ['b'] })
      expect(otherSelection).not.toBe(first)
      expect(otherSelection.selectedBoxes).toEqual([box(20, 0, 10, 10)])

      expect(collect({ shapes: asShapes([rect('c', box(5, 5, 5, 5))]), selectedShapeIds: ['b'] }).boxes).toEqual([box(5, 5, 5, 5)])
    })
  })

  describe('getMinimapBounds', () => {
    const visibleArea = box(-50, -50, 200, 200)

    it('shows the whole drawing when its size is fixed, whatever the shapes and the view', () => {
      const bounds = getMinimapBounds(box(0, 0, 10, 10), stateOf('fixed', 1000, 600, visibleArea))
      expect(bounds).toEqual(box(0, 0, 1000, 600))
    })

    it('shows the shapes and the view together when the size is infinite', () => {
      const bounds = getMinimapBounds(box(100, 20, 100, 100), stateOf('infinite', 1000, 600, visibleArea))
      expect(bounds).toEqual(box(-50, -50, 250, 200))
    })

    it('shows the view alone when nothing is drawn', () => {
      const bounds = getMinimapBounds(undefined, stateOf('infinite', 1000, 600, visibleArea))
      expect(bounds).toEqual(visibleArea)
    })

    it('never has a side of zero, so that it can be scaled', () => {
      // a single horizontal line, in a view of no height
      const bounds = getMinimapBounds(box(0, 5, 40, 0), stateOf('infinite', 10, 10, box(0, 5, 40, 0)))
      expect(bounds).toEqual(box(0, 5, 40, 1))
    })
  })

  describe('getMinimapTransform', () => {
    it('fits wide bounds to the width, centering them vertically', () => {
      const transform = getMinimapTransform(box(0, 0, 360, 120), MINIMAP_SIZE, 0)

      expect(transform.scale).toBe(0.5)
      expect(toMinimapRect(transform, box(0, 0, 360, 120))).toEqual(box(0, 30, 180, 60))
    })

    it('fits tall bounds to the height, centering them horizontally', () => {
      const transform = getMinimapTransform(box(0, 0, 120, 240), MINIMAP_SIZE, 0)

      expect(transform.scale).toBe(0.5)
      expect(toMinimapRect(transform, box(0, 0, 120, 240))).toEqual(box(60, 0, 60, 120))
    })

    it('keeps the margin on each side', () => {
      const transform = getMinimapTransform(box(0, 0, 180, 120), MINIMAP_SIZE, 0.1)
      const drawn = toMinimapRect(transform, box(0, 0, 180, 120))

      expect(drawn).toEqual(box(18, 12, 144, 96))
    })

    it('places the bounds wherever they are in the drawing', () => {
      const transform = getMinimapTransform(box(-1000, -500, 360, 120), MINIMAP_SIZE, 0)

      expect(toMinimapRect(transform, box(-1000, -500, 0, 0))).toMatchObject({ x: 0, y: 30 })
      expect(toMinimapRect(transform, box(-640, -380, 0, 0))).toMatchObject({ x: 180, y: 90 })
    })

    it('turns a position of the minimap back into a point of the drawing', () => {
      const transform = getMinimapTransform(box(-1000, -500, 360, 240), MINIMAP_SIZE, 0.06)
      const point = box(-912, -371, 0, 0)

      const { x, y } = toMinimapRect(transform, point)
      const [drawingX, drawingY] = toDrawingPoint(transform, [x, y])
      expect(drawingX).toBeCloseTo(point.x)
      expect(drawingY).toBeCloseTo(point.y)
    })
  })

  describe('getOffsetToCenter', () => {
    it('gives the offset putting the point in the middle of the view', () => {
      // the view starts at -offset: it then goes from (300, 200) to (700, 400), around (500, 300)
      expect(getOffsetToCenter(box(0, 0, 400, 200), [500, 300])).toEqual([-300, -200])
    })
  })

  describe('canPanView', () => {
    const visibleArea = box(0, 0, 400, 200)

    it('always pans an infinite drawing', () => {
      expect(canPanView(stateOf('infinite', 100, 100, visibleArea))).toBe(true)
    })

    it('pans a fixed drawing only where it is larger than the view', () => {
      expect(canPanView(stateOf('fixed', 400, 200, visibleArea))).toBe(false)
      expect(canPanView(stateOf('fixed', 1000, 200, visibleArea))).toBe(true)
      expect(canPanView(stateOf('fixed', 400, 600, visibleArea))).toBe(true)
    })
  })
})
