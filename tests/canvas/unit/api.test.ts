import { createPaintStore, type PaintStore } from '@canvas/store/paintStore'
import type { ShapeEntity, ShapeInput } from '@canvas/types/Shapes'
import { describe, expect, it, vi } from 'vitest'
import { createLoadedStore, RECTS, stubPath2D } from './helpers'

vi.mock('@canvas/utils/data', async importOriginal => {
  const actual = await importOriginal<typeof import('@canvas/utils/data')>()
  return { ...actual, buildDataToExport: vi.fn(actual.buildDataToExport) }
})

stubPath2D()

const getIds = (store: PaintStore) => store.getState().document.shapes.map(shape => shape.id)

const getShape = <T extends ShapeEntity['type']>(store: PaintStore, id: string) => store.getShape(id) as ShapeEntity<Exclude<T, 'triangle'>>

const getHistoryLength = (store: PaintStore) => store.getState().document.history.states.length

const RECT: ShapeInput = { type: 'rect', x: 10, y: 20, width: 100, height: 50 }

describe('stable ids', () => {
  it('keeps the ids when the data are exported and loaded again', async () => {
    const store = await createLoadedStore()
    const ids = getIds(store)
    const data = store.getCurrentData()
    expect(data.shapes?.map(shape => shape.id)).toEqual(ids)

    const otherStore = createPaintStore()
    await otherStore.resetCanvas(data.shapes)
    expect(getIds(otherStore)).toEqual(ids)
  })

  it('creates a new id when the given one is missing or already used', async () => {
    const store = await createLoadedStore({}, [{ ...RECTS[0]!, id: 'a' }, { ...RECTS[1]!, id: 'a' }, RECTS[2]!])
    const [first, second, third] = getIds(store)
    expect(first).toBe('a')
    expect(second).not.toBe('a')
    expect(third).toMatch(/^rect_/)
    expect(new Set(getIds(store)).size).toBe(3)
  })

  it('leaves out the shapes of an unknown type when loading', async () => {
    const store = await createLoadedStore({}, [RECTS[0]!, { type: 'unknown' } as unknown as ShapeInput])
    expect(getIds(store)).toHaveLength(1)
  })
})

describe('addShapes', () => {
  it('creates shapes in the foreground, completes their style and saves one step', () => {
    const store = createPaintStore()
    const ids = store.actions.addShapes([RECT, { type: 'circle', x: 0, y: 0, radius: 10, style: { strokeColor: 'red' } }])
    expect(getIds(store)).toEqual(ids)
    expect(getShape(store, ids[0]!).style).toEqual({ strokeColor: 'black', fillColor: 'transparent', opacity: 100, lineWidth: 1, lineDash: 0 })
    expect(getShape(store, ids[1]!).style?.strokeColor).toBe('red')
    expect(store.getEditorState().history.canUndo).toBe(true)

    store.actions.undo()
    expect(getIds(store)).toEqual([])
  })

  it('keeps a free id, inserts at an index and selects the new shapes', async () => {
    const store = await createLoadedStore()
    const [first] = getIds(store)
    const ids = store.actions.addShapes(
      [
        { ...RECT, id: 'mine' },
        { ...RECT, id: first! }
      ],
      { index: 1, select: true }
    )
    expect(ids[0]).toBe('mine')
    expect(ids[1]).not.toBe(first)
    expect(getIds(store).slice(1, 3)).toEqual(ids)
    expect(store.getEditorState().selectedShapeIds).toEqual(ids)
  })

  it('computes the size of a text from its font size, or its font size from its width', () => {
    const store = createPaintStore()
    const [byFontSize, byWidth] = store.actions.addShapes([
      { type: 'text', x: 0, y: 0, value: ['Hello', 'world!'], fontSize: 20 },
      { type: 'text', x: 0, y: 0, value: ['Hello'], width: 60 }
    ])
    // approximate measure of jsdom: 0.6 em per character
    expect(getShape<'text'>(store, byFontSize!)).toMatchObject({ fontSize: 20, width: 6 * 20 * 0.6, height: 40 })
    expect(getShape<'text'>(store, byWidth!).fontSize).toBeCloseTo(20)
  })

  it('throws without creating any shape when one of them is invalid', () => {
    const store = createPaintStore()
    const add = (shape: unknown) => () => store.actions.addShapes([RECT, shape as ShapeInput])
    expect(add({ type: 'rect', x: 0, y: 0, width: 'big', height: 10 })).toThrow('"width" must be a finite number')
    expect(add({ type: 'line', points: [[0, 0]] })).toThrow('"points" must hold exactly 2 points')
    expect(add({ type: 'polygon', points: [[0, 0]] })).toThrow('at least 2 points')
    expect(add({ type: 'triangle', points: [] })).toThrow('unknown shape type "triangle"')
    expect(add({ ...RECT, radius: 3 })).toThrow('unknown field "radius" for a rect')
    expect(getIds(store)).toEqual([])
  })

  it('does not save a step when save is false, and gives the source of the change', () => {
    const store = createPaintStore()
    const onDataChanged = vi.fn()
    store.registerEvent('dataChanged', onDataChanged)
    store.actions.addShapes([RECT], { save: false })
    expect(store.getEditorState().history.canUndo).toBe(false)

    store.actions.addShapes([RECT], { source: 'remote' })
    expect(onDataChanged).toHaveBeenCalledTimes(1)
    expect(onDataChanged.mock.calls[0]![1]).toBe('remote')
  })
})

describe('updateShapes', () => {
  it('updates the geometry, merges the style and replaces the data', () => {
    const store = createPaintStore()
    const [id] = store.actions.addShapes([{ ...RECT, style: { strokeColor: 'red', lineWidth: 3 }, data: { a: 1, b: 2 } }])
    store.actions.updateShapes([{ id: id!, x: 50, width: 10, style: { strokeColor: 'blue' }, data: { c: 3 } }])
    expect(getShape<'rect'>(store, id!)).toMatchObject({ x: 50, y: 20, width: 10, height: 50, data: { c: 3 } })
    expect(getShape(store, id!).style).toMatchObject({ strokeColor: 'blue', lineWidth: 3 })
    expect(getShape(store, id!).computed.borders.x).toBe(50)
  })

  it('keeps equal sides for a square, and adapts the size of a text', () => {
    const store = createPaintStore()
    const [square, text] = store.actions.addShapes([
      { type: 'square', x: 0, y: 0, width: 10, height: 10 },
      { type: 'text', x: 0, y: 0, value: ['Hi'], fontSize: 10 }
    ])
    store.actions.updateShapes([
      { id: square!, width: 30 },
      { id: text!, value: ['Hello'] }
    ])
    expect(getShape<'square'>(store, square!)).toMatchObject({ width: 30, height: 30 })
    expect(getShape<'text'>(store, text!)).toMatchObject({ fontSize: 10, width: 5 * 10 * 0.6, height: 10 })

    store.actions.updateShapes([{ id: text!, width: 60 }])
    expect(getShape<'text'>(store, text!).fontSize).toBeCloseTo(20)

    // like in the editor, a new font keeps the width of the text
    store.actions.updateShapes([{ id: text!, style: { fontBold: true } }])
    expect(getShape<'text'>(store, text!)).toMatchObject({ width: 60, style: { fontBold: true } })
  })

  it('updates locked shapes, and ignores unknown ids', async () => {
    const store = await createLoadedStore()
    const [first] = getIds(store)
    store.actions.setShapesLocked([first!], true)
    store.actions.updateShapes([
      { id: first!, x: 0 },
      { id: 'unknown', x: 0 }
    ])
    expect(getShape<'rect'>(store, first!).x).toBe(0)
  })

  it('throws without changing anything when a patch is invalid', async () => {
    const store = await createLoadedStore()
    const [first, second] = getIds(store)
    const { shapes } = store.getState().document
    expect(() => store.actions.updateShapes([{ id: first!, x: 0 }, { id: second!, radius: 4 } as never])).toThrow('unknown field "radius"')
    expect(() => store.actions.updateShapes([{ id: first!, type: 'circle' } as never])).toThrow('the type of a shape cannot change')
    expect(() => store.actions.updateShapes([{ id: first!, width: Number.NaN }])).toThrow('"width" must be a finite number')
    expect(store.getState().document.shapes).toBe(shapes)
  })

  it('does not save a step when save is false', async () => {
    const store = await createLoadedStore()
    const [first] = getIds(store)
    const length = getHistoryLength(store)
    store.actions.updateShapes([{ id: first!, x: 0 }], { save: false })
    expect(getHistoryLength(store)).toBe(length)
    store.actions.saveShapes()
    expect(getHistoryLength(store)).toBe(length + 1)
  })
})

describe('batch', () => {
  it('gives a single step of the history and a single dataChanged event', async () => {
    const store = await createLoadedStore()
    const onDataChanged = vi.fn()
    store.registerEvent('dataChanged', onDataChanged)
    const [first, second] = getIds(store)
    const length = getHistoryLength(store)

    const result = store.transaction(() => {
      store.actions.translateShapes([first!], [10, 0])
      store.transaction(() => store.actions.removeShapes([second!]))
      store.actions.addShapes([RECT])
      return 'done'
    })
    expect(result).toBe('done')
    expect(getHistoryLength(store)).toBe(length + 1)
    expect(onDataChanged).toHaveBeenCalledTimes(1)

    store.actions.undo()
    expect(getIds(store)).toHaveLength(3)
    expect(getShape<'rect'>(store, first!).x).toBe(100)
  })

  it('keeps the changes made before an error', async () => {
    const store = await createLoadedStore()
    const [first] = getIds(store)
    expect(() =>
      store.transaction(() => {
        store.actions.translateShapes([first!], [10, 0])
        throw new Error('failure')
      })
    ).toThrow('failure')
    expect(getShape<'rect'>(store, first!).x).toBe(110)
  })
})

describe('transformations', () => {
  it('translates shapes, except the locked ones', async () => {
    const store = await createLoadedStore()
    const [first, second] = getIds(store)
    store.actions.setShapesLocked([second!], true)
    const [line] = store.actions.addShapes([
      {
        type: 'line',
        points: [
          [0, 0],
          [10, 10]
        ]
      }
    ])
    store.actions.translateShapes([first!, second!, line!], [5, -5])
    expect(getShape<'rect'>(store, first!)).toMatchObject({ x: 105, y: 95 })
    expect(getShape<'rect'>(store, second!)).toMatchObject({ x: 300, y: 100 })
    expect(getShape<'line'>(store, line!).points).toEqual([
      [5, -5],
      [15, 5]
    ])
  })

  it('rotates shapes clockwise around their center, or around a given point', () => {
    const store = createPaintStore()
    const [rect, line] = store.actions.addShapes([
      RECT,
      {
        type: 'line',
        points: [
          [0, 0],
          [100, 0]
        ]
      }
    ])
    store.actions.rotateShapes([rect!], Math.PI / 2)
    expect(getShape(store, rect!).rotation).toBeCloseTo(Math.PI / 2)
    expect(getShape(store, rect!).computed.center).toEqual([60, 45])

    store.actions.rotateShapes([line!], Math.PI / 2)
    const [start, end] = getShape<'line'>(store, line!).points
    expect(start[0]).toBeCloseTo(50)
    expect(start[1]).toBeCloseTo(-50)
    expect(end[0]).toBeCloseTo(50)
    expect(end[1]).toBeCloseTo(50)

    store.actions.rotateShapes([line!], -Math.PI / 2, { center: [0, 0] })
    const [rotatedStart] = getShape<'line'>(store, line!).points
    expect(rotatedStart[0]).toBeCloseTo(-50)
    expect(rotatedStart[1]).toBeCloseTo(-50)
  })

  it('resizes shapes to a box, keeping the proportions when a shape needs them', async () => {
    const store = await createLoadedStore()
    const [first, second] = getIds(store)
    store.actions.resizeShapes([first!], { x: 0, y: 0, width: 50, height: 300 })
    expect(getShape<'rect'>(store, first!)).toMatchObject({ x: 0, y: 0, width: 50, height: 300 })

    // two rects from x 0 to 400 are scaled to half of it
    store.actions.resizeShapes([first!, second!], { x: 0, y: 0, width: 200, height: 150 })
    expect(store.getBounds([first!, second!])).toMatchObject({ x: 0, y: 0, width: 200, height: 150, rotation: 0 })
    expect(getShape<'rect'>(store, second!)).toMatchObject({ x: 150, width: 50 })

    const [square] = store.actions.addShapes([{ type: 'square', x: 0, y: 0, width: 10, height: 10 }])
    store.actions.resizeShapes([square!], { x: 5, y: 5, width: 40, height: 20 })
    expect(getShape<'square'>(store, square!)).toMatchObject({ x: 5, y: 5, width: 20, height: 20 })
  })

  it('resizes turned shapes in their own frame', async () => {
    const store = await createLoadedStore()
    const [first, second] = getIds(store)
    store.actions.rotateShapes([first!], Math.PI / 4)
    const bounds = { x: 120, y: 90, width: 200, height: 60 }
    store.actions.resizeShapes([first!], bounds)
    const resized = store.getBounds([first!])!
    expect(resized.rotation).toBeCloseTo(Math.PI / 4)
    for (const key of ['x', 'y', 'width', 'height'] as const) expect(resized[key]).toBeCloseTo(bounds[key])

    // two shapes turned the same way keep their common frame
    store.actions.rotateShapes([second!], Math.PI / 4)
    store.actions.resizeShapes([first!, second!], { ...store.getBounds([first!, second!])!, width: 300 })
    // the borders of a group are rounded to 2 decimals
    expect(store.getBounds([first!, second!])?.width).toBeCloseTo(300, 1)
  })

  it('gives the box of shapes', async () => {
    const store = await createLoadedStore()
    const [first, , third] = getIds(store)
    expect(store.getBounds([first!])).toEqual({ x: 100, y: 100, width: 100, height: 100, rotation: 0, center: [150, 150] })
    expect(store.getBounds([first!, third!])).toMatchObject({ x: 100, y: 100, width: 500, height: 100 })
    expect(store.getBounds(['unknown'])).toBeUndefined()
  })

  it('flips and turns shapes without changing the selection', async () => {
    const store = await createLoadedStore()
    const [first, second] = getIds(store)
    store.actions.selectShapes([second!])
    store.actions.transformShapes([first!], 'rotateClockwise')
    expect(getShape(store, first!).rotation).toBeCloseTo(Math.PI / 2)
    expect(store.getEditorState().selectedShapeIds).toEqual([second])
  })
})

describe('dedicated actions', () => {
  it('sets several style fields, and the defaults of the tools of the shapes', () => {
    const store = createPaintStore()
    const [rect] = store.actions.addShapes([RECT])
    store.actions.setShapesStyle([rect!], { strokeColor: 'red', lineWidth: 4, fontBold: true }, { updateTool: true })
    expect(getShape(store, rect!).style).toMatchObject({ strokeColor: 'red', lineWidth: 4 })
    expect(getShape(store, rect!).style?.fontBold).toBeUndefined()
    const rectTool = store.getEditorState().tools.find(tool => tool.id === 'react-paint-rect')
    expect(rectTool?.type === 'rect' && [rectTool.settings.strokeColor.default, rectTool.settings.lineWidth.default]).toEqual(['red', 4])
  })

  it('sets the default style of a tool, ignoring the fields it has not', () => {
    const store = createPaintStore()
    store.actions.setToolStyle('react-paint-rect', { fillColor: 'blue', fontBold: true })
    const rectTool = store.getEditorState().tools.find(tool => tool.id === 'react-paint-rect')
    expect(rectTool?.type === 'rect' && rectTool.settings.fillColor.default).toBe('blue')
    expect(rectTool?.settings).not.toHaveProperty('fontBold')

    const [rect] = store.actions.addShapes([RECT])
    expect(getShape(store, rect!).style?.fillColor).toBe('blue')
  })

  it('moves a shape to an index, and orders the shapes', async () => {
    const store = await createLoadedStore()
    const [first, second, third] = getIds(store)
    store.actions.setShapeIndex(first!, 2)
    expect(getIds(store)).toEqual([second, third, first])
    store.actions.setShapeIndex(first!, -5)
    expect(getIds(store)).toEqual([first, second, third])

    store.actions.reorderShapes([third!, 'unknown', third!])
    expect(getIds(store)).toEqual([third, first, second])
    const length = getHistoryLength(store)
    store.actions.reorderShapes([third!, first!])
    expect(getHistoryLength(store)).toBe(length)
  })

  it('inserts and moves the points of a shape', () => {
    const store = createPaintStore()
    const [polygon, line] = store.actions.addShapes([
      {
        type: 'polygon',
        points: [
          [0, 0],
          [10, 0],
          [10, 10]
        ]
      },
      {
        type: 'line',
        points: [
          [0, 0],
          [10, 0]
        ]
      }
    ])
    store.actions.insertShapePoint(polygon!, 1, [5, -5])
    expect(getShape<'polygon'>(store, polygon!).points).toEqual([
      [0, 0],
      [5, -5],
      [10, 0],
      [10, 10]
    ])
    store.actions.moveShapePoint(line!, 1, [20, 20])
    expect(getShape<'line'>(store, line!).points[1]).toEqual([20, 20])
    store.actions.insertShapePoint(line!, 1, [5, 5])
    expect(getShape<'line'>(store, line!).points).toHaveLength(2)
  })

  it('adds shapes to the selection and removes them from it', async () => {
    const store = await createLoadedStore()
    const [first, second, third] = getIds(store)
    store.actions.selectShapes([first!])
    store.actions.selectShapes([second!, third!], { mode: 'add' })
    expect(store.getEditorState().selectedShapeIds).toEqual([first, second, third])
    store.actions.selectShapes([first!, third!], { mode: 'remove' })
    expect(store.getEditorState().selectedShapeIds).toEqual([second])
  })

  it('opens the context menu for given shapes', async () => {
    const store = await createLoadedStore()
    const [first] = getIds(store)
    store.actions.openContextMenu({ clientPosition: { x: 10, y: 20 }, canvasPosition: [150, 150], ids: [first!] })
    expect(store.getEditorState().contextMenu).toMatchObject({ canvasPosition: [150, 150], clientPosition: { x: 10, y: 20 } })
    expect(store.getEditorState().contextMenu?.shapes.map(shape => shape.id)).toEqual([first])
    store.actions.closeContextMenu()
    expect(store.getEditorState().contextMenu).toBeUndefined()

    // a menu which cannot be shown is not opened
    store.actions.setOptions({ withContextMenu: false })
    store.actions.openContextMenu({ clientPosition: { x: 10, y: 20 } })
    expect(store.getEditorState().interaction.mode).toBe('default')
  })

  it('does not edit a text when the Canvas is not mounted', () => {
    const store = createPaintStore()
    const [text] = store.actions.addShapes([{ type: 'text', x: 0, y: 0, value: ['Hi'], fontSize: 10 }])
    store.actions.editText(text!)
    expect(store.getEditorState().interaction.mode).toBe('default')
  })

  it('zooms to a level keeping a point of the drawing still, and scrolls the view', () => {
    const store = createPaintStore({ options: { size: 'infinite' } })
    store.actions.zoomTo(2, { center: [100, 100] })
    const { zoom, offset } = store.getEditorState().view
    expect(zoom).toBe(2)
    // the point is displayed at the same place: (point + offset) * zoom
    expect((100 + offset[0]) * zoom).toBeCloseTo(100)

    store.actions.zoomTo(100)
    expect(store.getEditorState().view.zoom).toBe(8)

    store.actions.resetZoom()
    store.actions.panBy([30, -10])
    expect(store.getEditorState().view.offset).toEqual([-30, 10])
  })

  it('zooms and scrolls the view so that the shapes fill it', () => {
    const store = createPaintStore({ width: 1000, height: 600, options: { size: 'infinite' } })
    const [id] = store.actions.addShapes([
      { type: 'rect', x: 100, y: 100, width: 200, height: 100 },
      { type: 'rect', x: 5000, y: 5000, width: 10, height: 10, visible: false }
    ])
    const box = getShape(store, id!).computed.boundingBox

    // the visible shapes by default
    store.actions.zoomToShapes(undefined, { padding: 50 })
    const { zoom, offset } = store.getEditorState().view
    expect(zoom).toBeCloseTo(Math.min(900 / box.width, 500 / box.height))
    // the center of the box is displayed in the center of the view: (point + offset) * zoom
    expect((box.x + box.width / 2 + offset[0]) * zoom).toBeCloseTo(500)
    expect((box.y + box.height / 2 + offset[1]) * zoom).toBeCloseTo(300)

    // the zoom stays within its limits
    const [dot] = store.actions.addShapes([{ type: 'rect', x: 0, y: 0, width: 1, height: 1 }])
    store.actions.zoomToShapes([dot!])
    expect(store.getEditorState().view.zoom).toBe(8)
  })

  it('loads data or their JSON string', async () => {
    const store = createPaintStore()
    await store.actions.loadData(JSON.stringify({ shapes: [{ ...RECT, id: 'from-json' }] }))
    expect(getIds(store)).toEqual(['from-json'])
    await store.actions.loadData({ shapes: [RECTS[0]!, RECTS[1]!] }, { clearHistory: false })
    expect(getIds(store)).toHaveLength(2)
    expect(store.getEditorState().history.canUndo).toBe(true)
  })
})

describe('options and settings', () => {
  it('keeps the overridden options over the props until they are reset', () => {
    const store = createPaintStore({ options: { canZoom: 'never', grid: 0 } })
    store.actions.setOptions({ canZoom: 'always', grid: 20 })
    expect(store.getEditorState()).toMatchObject({ features: { zoom: true }, gridGap: 20 })

    store.setConfig({ options: { canZoom: 'never', grid: 0 } })
    expect(store.getEditorState().features.zoom).toBe(true)

    store.actions.resetOptions()
    expect(store.getEditorState()).toMatchObject({ features: { zoom: false }, gridGap: 0 })
  })

  it('stops overriding an option set to undefined', () => {
    const store = createPaintStore({ options: { grid: 10 } })
    store.actions.setOptions({ grid: 40, canZoom: 'always' })
    store.actions.setOptions({ grid: undefined })
    expect(store.getEditorState()).toMatchObject({ gridGap: 10, features: { zoom: true } })
  })

  it('replaces the tools given to setOptions', () => {
    const store = createPaintStore()
    store.actions.setOptions({ availableTools: [{ type: 'brush', id: 'my-brush' }] })
    expect(store.getEditorState().tools.map(tool => tool.id)).toEqual(['my-brush'])
  })

  it('follows a change of the grid option', () => {
    const store = createPaintStore({ options: { grid: 10 } })
    store.setConfig({ options: { grid: 40 } })
    expect(store.getEditorState().gridGap).toBe(40)
  })

  it('restores the settings changed while editing', () => {
    const store = createPaintStore({ options: { grid: 10, size: 'infinite' } })
    store.actions.setToolStyle('react-paint-rect', { strokeColor: 'red' })
    store.actions.setGridGap(40)
    store.actions.zoomTo(2)
    store.actions.selectTool('react-paint-rect')

    store.actions.resetSettings()
    const state = store.getEditorState()
    const rectTool = state.tools.find(tool => tool.id === 'react-paint-rect')
    expect(rectTool?.type === 'rect' && rectTool.settings.strokeColor.default).toBe('black')
    expect(state).toMatchObject({ gridGap: 10, view: { zoom: 1, offset: [0, 0] }, activeTool: { type: 'selection' } })
  })
})

describe('data of the application', () => {
  it('keeps the data in the export, the history and the copies', () => {
    const store = createPaintStore()
    const data = { comment: 'hello', tags: ['a'] }
    const [id] = store.actions.addShapes([{ ...RECT, data }])
    expect(store.getCurrentData().shapes?.[0]?.data).toEqual(data)

    store.actions.duplicateShapes([id!])
    store.actions.copy([id!])
    store.actions.paste()
    const copies = getIds(store).filter(shapeId => shapeId !== id)
    expect(copies).toHaveLength(2)
    for (const copy of copies) {
      expect(getShape(store, copy).data).toEqual(data)
      expect(getShape(store, copy).data).not.toBe(getShape(store, id!).data)
    }

    store.actions.updateShapes([{ id: id!, data: { comment: 'bye' } }])
    store.actions.undo()
    expect(getShape(store, id!).data).toEqual(data)
  })
})

describe('dataChanged', () => {
  it('builds the data only while they are listened', async () => {
    const { buildDataToExport } = await import('@canvas/utils/data')
    const store = createPaintStore()
    vi.mocked(buildDataToExport).mockClear()
    store.actions.addShapes([RECT])
    expect(buildDataToExport).not.toHaveBeenCalled()

    const listener = vi.fn()
    store.registerEvent('dataChanged', listener)
    store.actions.addShapes([RECT])
    expect(buildDataToExport).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('gives new objects on each change: the data received can be changed without changing the next ones', () => {
    const store = createPaintStore()
    const listener = vi.fn()
    store.registerEvent('dataChanged', listener)
    const [id] = store.actions.addShapes([RECT])
    const exported = listener.mock.lastCall?.[0].shapes[0]
    expect(exported).toMatchObject({ id, ...RECT })
    expect(exported).not.toHaveProperty('computed')
    expect(exported).not.toHaveProperty('path')
    exported.x = 999

    // the new shape is in the foreground, first
    store.actions.addShapes([{ ...RECT, y: 300 }])
    const kept = listener.mock.lastCall?.[0].shapes[1]
    expect(kept).not.toBe(exported)
    // the x of RECT
    expect(kept).toEqual({ ...exported, x: 10 })
    expect(store.getCurrentData().shapes?.[1]).toEqual(kept)
  })

  it('gives the shapes added, updated and removed since the previous state', () => {
    const store = createPaintStore()
    const listener = vi.fn()
    store.registerEvent('dataChanged', listener)
    const [first, second] = store.actions.addShapes([RECT, { ...RECT, id: 'second' }])
    expect(listener.mock.lastCall?.[2]).toEqual({
      added: [expect.objectContaining({ id: first }), expect.objectContaining({ id: 'second' })],
      updated: [],
      removed: [],
      reordered: false
    })

    store.transaction(() => {
      store.actions.translateShapes([first!], [10, 0])
      store.actions.removeShapes([second!])
    })
    expect(listener.mock.lastCall?.[2]).toEqual({
      added: [],
      updated: [{ shape: expect.objectContaining({ id: first, x: 20 }), previous: expect.objectContaining({ id: first, x: 10 }) }],
      removed: [expect.objectContaining({ id: second })],
      reordered: false
    })

    // an undo gives the reverse changes
    store.actions.undo()
    expect(listener.mock.lastCall?.[2]).toMatchObject({ added: [{ id: second }], updated: [{ shape: { x: 10 }, previous: { x: 20 } }], removed: [] })
  })

  it('tells when the order changes, and leaves out the shapes rebuilt without change', async () => {
    const store = await createLoadedStore()
    const listener = vi.fn()
    store.registerEvent('dataChanged', listener)
    store.actions.reorderShapes([...getIds(store)].reverse())
    expect(listener.mock.lastCall?.[2]).toEqual({ added: [], updated: [], removed: [], reordered: true })

    // loading the data again rebuilds every shape: only the one which differs is updated
    const [first, ...others] = store.getCurrentData().shapes ?? []
    await store.actions.loadData({ shapes: [{ ...first!, data: { checked: true } }, ...others] }, { clearHistory: false })
    expect(listener.mock.lastCall?.[2]).toEqual({
      added: [],
      updated: [{ shape: expect.objectContaining({ id: first!.id, data: { checked: true } }), previous: first }],
      removed: [],
      reordered: false
    })
  })
})
