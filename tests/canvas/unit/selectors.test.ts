import { createPaintStore } from '@canvas/store/paintStore'
import { memoizeLast } from '@canvas/store/selectors'
import { describe, expect, it, vi } from 'vitest'
import { createLoadedStore, stubPath2D } from './helpers'

stubPath2D()

describe('memoizeLast', () => {
  it('computes again only when an argument changes', () => {
    const compute = vi.fn((a: number, b: object) => ({ a, b }))
    const memoized = memoizeLast(compute)
    const object = {}
    const first = memoized(1, object)
    expect(memoized(1, object)).toBe(first)
    expect(memoized(1, {})).not.toBe(first)
    expect(memoized(2, object)).not.toBe(first)
    expect(compute).toHaveBeenCalledTimes(3)
  })
})

describe('selectors', () => {
  it('returns the same editor state while nothing changes', async () => {
    const store = await createLoadedStore()
    const state = store.getEditorState()
    expect(store.getEditorState()).toBe(state)

    // No-op updates
    store.actions.setGridGap(state.gridGap)
    store.setConfig({})
    expect(store.getEditorState()).toBe(state)
  })

  it('keeps the identity of the slices that did not change', async () => {
    const store = await createLoadedStore()
    const before = store.getEditorState()

    store.actions.selectShapes([before.shapes[0]!.id])
    const afterSelection = store.getEditorState()
    expect(afterSelection).not.toBe(before)
    expect(afterSelection.selection).not.toBe(before.selection)
    expect(afterSelection.shapes).toBe(before.shapes)
    expect(afterSelection.view).toBe(before.view)
    expect(afterSelection.history).toBe(before.history)
    expect(afterSelection.layout).toBe(before.layout)
    expect(afterSelection.features).toBe(before.features)
    expect(afterSelection.interaction).toBe(before.interaction)
    expect(afterSelection.tools).toBe(before.tools)
    expect(afterSelection.activeTool).toBe(before.activeTool)

    store.actions.copy()
    const afterCopy = store.getEditorState()
    expect(afterCopy.clipboard).toEqual({ hasContent: true })
    expect(afterCopy.view).toBe(afterSelection.view)
    expect(afterCopy.selectedShapes).toBe(afterSelection.selectedShapes)
    expect(afterCopy.history).toBe(afterSelection.history)
  })

  it('keeps the selected ids while the same shapes are selected', async () => {
    const store = await createLoadedStore()
    store.actions.selectAllShapes()
    const { selectedShapes, selectedShapeIds } = store.getEditorState()
    expect(selectedShapeIds).toEqual(selectedShapes.map(shape => shape.id))

    // the selected shapes are moved
    store.updateShapes(selectedShapes.map(shape => ({ ...shape, locked: false })))
    expect(store.getEditorState().selectedShapes).not.toBe(selectedShapes)
    expect(store.getEditorState().selectedShapeIds).toBe(selectedShapeIds)

    store.actions.selectShapes([selectedShapeIds[0]!])
    expect(store.getEditorState().selectedShapeIds).toEqual([selectedShapeIds[0]])
  })

  it('keeps the view of the Canvas component during the gestures', async () => {
    const store = await createLoadedStore({ options: { size: 'infinite' } })
    const view = store.selectors.selectCanvasView(store.getState())

    store.actions.selectAllShapes()
    store.setHoverMode({ mode: 'translate' })
    store.setSelectionMode({ mode: 'selectionFrame' })
    store.actions.setOffset([-20, -10])
    expect(store.selectors.selectCanvasView(store.getState())).toBe(view)

    store.setCanvasSize({ realWidth: 1000, realHeight: 600, width: 500, height: 300, scaleRatio: 0.5 })
    expect(store.selectors.selectCanvasView(store.getState()).canvasSize.width).toBe(500)
  })

  it('gives the text being edited to the Canvas component', async () => {
    const store = await createLoadedStore({}, [
      { type: 'text', x: 10, y: 10, width: 100, height: 20, rotation: 0, value: ['hello'], fontSize: 16, style: {} }
    ])
    store.actions.selectAllShapes()
    expect(store.selectors.selectCanvasView(store.getState()).textEdition).toBeUndefined()

    store.setSelectionMode({ mode: 'textedition', defaultValue: ['hello'] })
    expect(store.selectors.selectCanvasView(store.getState()).textEdition).toMatchObject({ shape: { type: 'text' }, defaultValue: ['hello'] })
  })

  it('gives the cursor of the canvas', () => {
    const store = createPaintStore()
    const getCursor = () => store.selectors.selectCursor(store.getState())
    expect(getCursor()).toBe('default')

    store.setHoverMode({ mode: 'translate' })
    expect(getCursor()).toBe('move')
    store.setHoverMode({ mode: 'resize', anchor: [1, 1] })
    expect(getCursor()).toBe('pointer')
    store.setHoverMode({ mode: 'default', outOfView: true })
    expect(getCursor()).toBe('default')

    store.setHoverMode({ mode: 'default' })
    store.actions.selectTool('react-paint-rect')
    expect(getCursor()).toBe('crosshair')
    store.setPanStart({ start: [0, 0], originalOffset: [0, 0] })
    expect(getCursor()).toBe('grabbing')
  })

  it('keeps the settings while the view and the options are unchanged', async () => {
    const store = await createLoadedStore()
    const settings = store.getSettings()

    store.actions.selectAllShapes()
    expect(store.getSettings()).toBe(settings)

    store.actions.setGridGap(20)
    expect(store.getSettings()).not.toBe(settings)
    expect(store.getSettings().gridGap).toBe(20)
  })
})
