import { createPaintStore, type PaintStore } from '@canvas/store/paintStore'
import { describe, expect, it, vi } from 'vitest'
import { createLoadedStore, RECTS, stubPath2D } from './helpers'

stubPath2D()

const getIds = (store: PaintStore) => store.getState().document.shapes.map(shape => shape.id)

const getSelectedIds = (store: PaintStore) => store.getEditorState().selectedShapes.map(shape => shape.id)

const listenEvents = (store: PaintStore) => {
  const events = { dataChanged: vi.fn(), selectionChanged: vi.fn(), toolChanged: vi.fn() }
  store.registerEvent('dataChanged', events.dataChanged)
  store.registerEvent('selectionChanged', events.selectionChanged)
  store.registerEvent('toolChanged', events.toolChanged)
  return events
}

describe('createPaintStore', () => {
  it('builds the state from the props', () => {
    const store = createPaintStore({ width: 800, height: 400, mode: 'viewer', options: { grid: 20, canZoom: 'always' } })
    const state = store.getEditorState()
    expect(state).toMatchObject({ width: 800, height: 400, mode: 'viewer', gridGap: 20, features: { edition: false, zoom: true } })
    expect(state.activeTool.type).toBe('selection')
    expect(state.tools.length).toBeGreaterThan(0)
    expect(state.shapes).toEqual([])
  })

  it('loads the shapes of the props once, as remote data', async () => {
    const store = createPaintStore({ shapes: RECTS })
    const events = listenEvents(store)
    store.init()
    store.init()

    await vi.waitFor(() => expect(store.getState().document.shapes).toHaveLength(3))
    expect(events.dataChanged).toHaveBeenCalledTimes(1)
    expect(events.dataChanged).toHaveBeenCalledWith(
      expect.objectContaining({ config: { width: 1000, height: 600 } }),
      'remote',
      expect.objectContaining({ added: expect.arrayContaining([expect.objectContaining({ type: 'rect' })]) })
    )
    expect(store.getEditorState().history.canUndo).toBe(false)
  })

  it('emits no event before any change', () => {
    const store = createPaintStore({ shapes: RECTS })
    const events = listenEvents(store)
    store.setConfig({ shapes: RECTS })
    expect(events.dataChanged).not.toHaveBeenCalled()
    expect(events.selectionChanged).not.toHaveBeenCalled()
    expect(events.toolChanged).not.toHaveBeenCalled()
  })
})

describe('actions', () => {
  it('selects shapes, all the unlocked shapes, or none', async () => {
    const store = await createLoadedStore()
    const [first, second, third] = getIds(store)
    store.actions.selectShapes([second!])
    expect(getSelectedIds(store)).toEqual([second])

    store.actions.setShapesLocked([third!], true)
    store.actions.selectAllShapes()
    expect(getSelectedIds(store)).toEqual([first, second])

    store.actions.clearSelection()
    expect(store.getEditorState().selection).toBeUndefined()
  })

  it('removes shapes, and the selection with them', async () => {
    const store = await createLoadedStore()
    const [first, second, third] = getIds(store)
    store.actions.selectShapes([first!])
    store.actions.removeShapes([first!])
    expect(getIds(store)).toEqual([second, third])
    expect(store.getEditorState().selection).toBeUndefined()
    expect(store.getEditorState().history).toEqual({ canUndo: true, canRedo: false, canClear: true })

    store.actions.undo()
    expect(getIds(store)).toEqual([first, second, third])
    store.actions.redo()
    expect(getIds(store)).toEqual([second, third])
  })

  it('duplicates shapes and selects the copies', async () => {
    const store = await createLoadedStore()
    const [first] = getIds(store)
    store.actions.duplicateShapes([first!], { translate: true, select: true })
    const ids = getIds(store)
    expect(ids).toHaveLength(4)
    expect(ids[1]).toBe(first)
    expect(getSelectedIds(store)).toEqual([ids[0]])
  })

  it('reorders shapes', async () => {
    const store = await createLoadedStore()
    const [first, second, third] = getIds(store)
    store.actions.moveShapes([third!], 'first')
    expect(getIds(store)).toEqual([third, first, second])
    store.actions.moveShapes([third!], 'backward')
    expect(getIds(store)).toEqual([first, third, second])
    store.actions.swapShapes(first!, second!)
    expect(getIds(store)).toEqual([third, second, first])
  })

  it('moves shapes forward, keeping the selected shapes together', async () => {
    const store = await createLoadedStore()
    const [first, second, third] = getIds(store)
    store.actions.moveShapes([second!, third!], 'forward')
    expect(getIds(store)).toEqual([second, third, first])
    // the first one is already in the foreground, and the second one stays behind it
    store.actions.moveShapes([second!, third!], 'forward')
    expect(getIds(store)).toEqual([second, third, first])
  })

  it('sets the visibility and the lock whatever their current value', async () => {
    const store = await createLoadedStore()
    const ids = getIds(store)
    const getFlags = () => store.getState().document.shapes.map(shape => `${shape.visible !== false}/${!!shape.locked}`)

    store.actions.setShapesVisibility(ids, false)
    store.actions.setShapesVisibility(ids, false)
    expect(getFlags()).toEqual(['false/false', 'false/false', 'false/false'])

    store.actions.toggleShapesLock([ids[0]!])
    store.actions.setShapesLocked(ids, true)
    expect(getFlags()).toEqual(['false/true', 'false/true', 'false/true'])
  })

  it('copies, cuts and pastes shapes', async () => {
    const store = await createLoadedStore()
    const [first, second] = getIds(store)
    expect(store.getEditorState().clipboard.hasContent).toBe(false)

    store.actions.copy([first!])
    expect(store.getEditorState().clipboard.hasContent).toBe(true)
    store.actions.paste()
    const pasted = getIds(store)[0]!
    expect(getIds(store)).toHaveLength(4)
    expect(pasted).not.toBe(first)
    expect(getSelectedIds(store)).toEqual([pasted])

    store.actions.cut([second!])
    expect(getIds(store)).not.toContain(second)
  })

  it('selects the known tools only, and clears the selection', async () => {
    const store = await createLoadedStore()
    store.actions.selectShapes([getIds(store)[0]!])
    store.actions.selectTool('react-paint-rect')
    expect(store.getEditorState().activeTool.id).toBe('react-paint-rect')
    expect(store.getEditorState().selection).toBeUndefined()

    store.actions.selectTool('unknown-tool')
    expect(store.getEditorState().activeTool.id).toBe('react-paint-rect')
  })

  it('updates the settings of a tool', () => {
    const store = createPaintStore()
    store.actions.updateToolSettings('react-paint-rect', 'strokeColor', 'blue')
    const rectTool = store.getEditorState().tools.find(tool => tool.id === 'react-paint-rect')
    expect(rectTool?.type === 'rect' && rectTool.settings.strokeColor.default).toBe('blue')

    // same value, or unknown tool, like the group tool of a selection
    const { tools } = store.getEditorState()
    store.actions.updateToolSettings('react-paint-rect', 'strokeColor', 'blue')
    store.actions.updateToolSettings('react-paint-rect-react-paint-circle', 'strokeColor', 'red')
    expect(store.getEditorState().tools).toBe(tools)
  })

  it('clears the canvas with the last clear callback, keeping the history', async () => {
    const store = await createLoadedStore({ options: { clearCallback: () => [RECTS[0]!] } })
    store.setConfig({ options: { clearCallback: () => [RECTS[0]!, RECTS[1]!] } })
    store.actions.clearCanvas()
    await vi.waitFor(() => expect(getIds(store)).toHaveLength(2))
    expect(store.getEditorState().history.canUndo).toBe(true)

    store.setConfig({ options: { clearCallback: 'empty' } })
    store.actions.clearCanvas()
    expect(getIds(store)).toEqual([])
  })

  it('clears the canvas back to the shapes of the props, or empties it without them', async () => {
    const store = await createLoadedStore({ shapes: [RECTS[0]!], options: { clearCallback: 'defaultShapes' } })
    expect(getIds(store)).toHaveLength(3)
    store.actions.clearCanvas()
    await vi.waitFor(() => expect(getIds(store)).toHaveLength(1))

    const withoutShapes = await createLoadedStore({ options: { clearCallback: 'defaultShapes' } })
    withoutShapes.actions.clearCanvas()
    expect(getIds(withoutShapes)).toEqual([])
  })

  it('zooms, moves and resets the view', () => {
    const store = createPaintStore({ options: { size: 'infinite' } })
    store.actions.setZoom('zoom')
    expect(store.getEditorState().view.zoom).toBeGreaterThan(1)

    store.actions.setOffset([-50, -20])
    expect(store.getEditorState().view.offset).toEqual([-50, -20])

    store.actions.resetZoom()
    expect(store.getEditorState().view).toMatchObject({ zoom: 1, offset: [0, 0] })
  })

  it('keeps a fixed canvas inside its bounds', () => {
    const store = createPaintStore()
    store.actions.setOffset([-50, -20])
    expect(store.getEditorState().view.offset).toEqual([0, 0])
  })

  it('sets the grid gap', () => {
    const store = createPaintStore()
    store.actions.setGridGap(40)
    expect(store.getEditorState().gridGap).toBe(40)
  })
})

describe('events', () => {
  it('emits dataChanged once for each change of the history, as user data', async () => {
    const store = await createLoadedStore()
    const events = listenEvents(store)
    const [first] = getIds(store)

    store.actions.removeShapes([first!])
    expect(events.dataChanged).toHaveBeenCalledTimes(1)
    expect(events.dataChanged.mock.calls[0]![0].shapes).toHaveLength(2)
    expect(events.dataChanged.mock.calls[0]![1]).toBe('user')

    store.actions.selectAllShapes()
    store.actions.setGridGap(20)
    expect(events.dataChanged).toHaveBeenCalledTimes(1)

    store.actions.undo()
    expect(events.dataChanged).toHaveBeenCalledTimes(2)
    expect(events.dataChanged.mock.calls[1]![1]).toBe('remote')
  })

  it('emits dataChanged when the size of the canvas changes', async () => {
    const store = await createLoadedStore()
    const events = listenEvents(store)
    store.setConfig({ width: 800 })
    expect(events.dataChanged).toHaveBeenCalledTimes(1)
    expect(events.dataChanged.mock.calls[0]![0].config).toEqual({ width: 800, height: 600 })
  })

  it('emits selectionChanged only when the selected shapes change', async () => {
    const store = await createLoadedStore()
    const events = listenEvents(store)
    const [first, second] = getIds(store)

    store.actions.selectShapes([first!, second!])
    expect(events.selectionChanged).toHaveBeenCalledTimes(1)
    expect(events.selectionChanged.mock.calls[0]![0].map((shape: { id: string }) => shape.id)).toEqual([first, second])

    // The selection object is rebuilt, with the same shapes
    store.actions.selectShapes([first!, second!])
    store.actions.updateShapesStyle([first!], 'strokeColor', 'blue')
    expect(events.selectionChanged).toHaveBeenCalledTimes(1)

    store.actions.clearSelection()
    expect(events.selectionChanged).toHaveBeenCalledTimes(2)
    expect(events.selectionChanged).toHaveBeenLastCalledWith([])
  })

  it('emits toolChanged when the active tool changes', () => {
    const store = createPaintStore()
    const events = listenEvents(store)
    store.actions.selectTool('react-paint-rect')
    store.actions.selectTool('react-paint-rect')
    expect(events.toolChanged).toHaveBeenCalledTimes(1)
    expect(events.toolChanged).toHaveBeenCalledWith(expect.objectContaining({ id: 'react-paint-rect' }))

    // The active tool is removed from the tools: the selection tool is active
    store.setConfig({ options: { availableTools: [{ type: 'brush', id: 'react-paint-brush' }] } })
    expect(events.toolChanged).toHaveBeenCalledTimes(2)
    expect(events.toolChanged).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'react-paint-selection' }))
  })

  it('stops emitting to an unregistered listener', () => {
    const store = createPaintStore()
    const listener = vi.fn()
    const unregister = store.registerEvent('toolChanged', listener)
    unregister()
    store.actions.selectTool('react-paint-rect')
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('setConfig', () => {
  it('does not notify when the props are equal in value', () => {
    const store = createPaintStore({ options: { availableTools: [{ type: 'rect', id: 'react-paint-rect' }], canZoom: 'always' } })
    const listener = vi.fn()
    store.subscribe(listener)
    const stateBefore = store.getEditorState()

    store.setConfig({ options: { availableTools: [{ type: 'rect', id: 'react-paint-rect' }], canZoom: 'always', clearCallback: () => [] } })
    expect(listener).not.toHaveBeenCalled()
    expect(store.getEditorState()).toBe(stateBefore)
  })

  it('keeps the tool settings when the tools are unchanged', () => {
    const store = createPaintStore({ options: { availableTools: [{ type: 'rect', id: 'react-paint-rect' }] } })
    store.actions.updateToolSettings('react-paint-rect', 'strokeColor', 'blue')
    store.setConfig({ options: { availableTools: [{ type: 'rect', id: 'react-paint-rect' }], canZoom: 'always' } })
    const [rectTool] = store.getEditorState().tools
    expect(rectTool?.type === 'rect' && rectTool.settings.strokeColor.default).toBe('blue')
    expect(store.getEditorState().features.zoom).toBe(true)
  })

  it('resets the tools when they change in value', () => {
    const store = createPaintStore({ options: { availableTools: [{ type: 'rect', id: 'react-paint-rect' }] } })
    store.actions.updateToolSettings('react-paint-rect', 'strokeColor', 'blue')
    store.setConfig({ options: { availableTools: [{ type: 'rect', id: 'react-paint-rect', settings: { strokeColor: { default: 'red' } } }] } })
    const [rectTool] = store.getEditorState().tools
    expect(rectTool?.type === 'rect' && rectTool.settings.strokeColor.default).toBe('red')
  })
})

describe('consistency rules', () => {
  it('ends the drawing of a polygon when another shape is selected', async () => {
    const store = await createLoadedStore()
    const [first, second] = getIds(store)
    store.actions.selectShapes([first!])
    store.setSelectionMode({ mode: 'preview' })
    store.actions.selectShapes([second!])
    expect(store.getState().interaction.selectionMode).toEqual({ mode: 'default' })
  })

  it('notifies a change of the hover mode only when its values change', async () => {
    const store = await createLoadedStore()
    store.actions.selectAllShapes()
    const listener = vi.fn()
    store.subscribe(listener)

    store.setHoverMode({ mode: 'resize', anchor: [1, 1] })
    store.setHoverMode({ mode: 'resize', anchor: [1, 1] })
    expect(listener).toHaveBeenCalledTimes(1)
    store.setHoverMode({ mode: 'resize', anchor: [0, 1] })
    store.setHoverMode({ mode: 'resize', anchor: 2 })
    store.setHoverMode({ mode: 'resize', anchor: 2 })
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('refreshes the shapes only when a setting they depend on changes', async () => {
    const store = await createLoadedStore({ options: { size: 'infinite' } })
    const { shapes } = store.getState().document

    // Moving or zooming the view, resizing the canvas, or changing the grid keeps the computed shapes
    store.actions.setOffset([-30, -40])
    store.actions.setZoom('zoom')
    store.setCanvasSize({ realWidth: 1000, realHeight: 600, width: 500, height: 300, scaleRatio: 0.5 })
    store.actions.setGridGap(20)
    expect(store.getState().document.shapes).toBe(shapes)

    // The padding of the selection is part of their borders
    store.actions.setOptions({ canvasSelectionPadding: 10 })
    expect(store.getState().document.shapes).not.toBe(shapes)
    expect(store.getState().document.shapes.map(shape => shape.id)).toEqual(shapes.map(shape => shape.id))
  })

  it('keeps the selected shapes identical to the ones of the list when they are refreshed', async () => {
    const store = await createLoadedStore({ options: { size: 'infinite' } })
    store.actions.selectShapes(getIds(store).slice(0, 2))

    store.actions.setOptions({ canvasSelectionPadding: 10 })
    const { shapes } = store.getState().document
    const [first, second] = store.getEditorState().selectedShapes
    expect(first).toBe(shapes[0])
    expect(second).toBe(shapes[1])
  })

  it('scrolls the view by the auto scroll speed', () => {
    const store = createPaintStore({ options: { size: 'infinite' } })
    store.setMoveAcceleration([4, -2])
    store.applyMoveAcceleration()
    expect(store.getEditorState().view.offset).toEqual([-4, 2])
    store.applyMoveAcceleration(0.5)
    expect(store.getEditorState().view.offset).toEqual([-6, 3])
  })

  it('stops the auto scroll with the selection frame', () => {
    const store = createPaintStore()
    store.setSelectionMode({ mode: 'selectionFrame' })
    store.setMoveAcceleration([5, 0])
    store.setSelectionMode({ mode: 'default' })
    expect(store.getState().interaction.moveAcceleration).toEqual([0, 0])
  })

  it('tracks the focus, unless the canvas can neither be edited nor zoomed', () => {
    const store = createPaintStore()
    const scopeElement = new EventTarget() as HTMLElement
    store.setScopeElement(scopeElement)

    scopeElement.dispatchEvent(new Event('focusin'))
    expect(store.getEditorState().interaction.focus).toEqual({ component: true, canvas: false })

    store.setConfig({ mode: 'viewer' })
    expect(store.getEditorState().interaction.focus).toEqual({ component: false, canvas: false })
    scopeElement.dispatchEvent(new Event('focusin'))
    expect(store.getEditorState().interaction.focus.component).toBe(false)
  })

  it('tracks the focus inside the Canvas by default, or inside the scope when one is set', () => {
    const store = createPaintStore()
    const isFocused = () => store.getEditorState().interaction.focus.component
    const canvasRoot = new EventTarget() as HTMLElement
    const scopeElement = new EventTarget() as HTMLElement
    store.setCanvasRootElement(canvasRoot)

    canvasRoot.dispatchEvent(new Event('focusin'))
    expect(isFocused()).toBe(true)
    canvasRoot.dispatchEvent(new Event('focusout'))
    expect(isFocused()).toBe(false)

    store.setScopeElement(scopeElement)
    canvasRoot.dispatchEvent(new Event('focusin'))
    expect(isFocused()).toBe(false)
    scopeElement.dispatchEvent(new Event('focusin'))
    expect(isFocused()).toBe(true)

    store.setScopeElement(null)
    scopeElement.dispatchEvent(new Event('focusout'))
    expect(isFocused()).toBe(true)
    canvasRoot.dispatchEvent(new Event('focusout'))
    expect(isFocused()).toBe(false)
  })

  it('moves the listeners of the scope with it', () => {
    const store = createPaintStore()
    const canvasRoot = new EventTarget() as HTMLElement
    const scopeElement = new EventTarget() as HTMLElement
    const onKeyDown = vi.fn()
    store.setCanvasRootElement(canvasRoot)
    const stopListening = store.listenScope({ keydown: onKeyDown })

    canvasRoot.dispatchEvent(new Event('keydown'))
    expect(onKeyDown).toHaveBeenCalledTimes(1)

    store.setScopeElement(scopeElement)
    canvasRoot.dispatchEvent(new Event('keydown'))
    scopeElement.dispatchEvent(new Event('keydown'))
    expect(onKeyDown).toHaveBeenCalledTimes(2)

    stopListening()
    scopeElement.dispatchEvent(new Event('keydown'))
    expect(onKeyDown).toHaveBeenCalledTimes(2)
  })

  it('releases the modifiers when the focus leaves the scope, not when it moves inside it', () => {
    const store = createPaintStore()
    const inside = new EventTarget()
    const scopeElement = Object.assign(new EventTarget(), { contains: (node: unknown) => node === inside }) as unknown as HTMLElement
    const focusOut = (relatedTarget: EventTarget | null) => scopeElement.dispatchEvent(Object.assign(new Event('focusout'), { relatedTarget }))
    store.setScopeElement(scopeElement)
    scopeElement.dispatchEvent(new Event('focusin'))
    store.setModifiers({ shift: true, alt: true })

    focusOut(inside)
    expect(store.getEditorState().interaction.focus.component).toBe(true)
    expect(store.getEditorState().interaction.modifiers).toEqual({ shift: true, alt: true, space: false })

    focusOut(null)
    expect(store.getEditorState().interaction.focus.component).toBe(false)
    expect(store.getEditorState().interaction.modifiers).toEqual({ shift: false, alt: false, space: false })
  })
})

/** Context whose paths contain every point, or none */
const hitContext = (isHit: boolean) =>
  ({ lineWidth: 1, isPointInPath: () => isHit, isPointInStroke: () => isHit }) as unknown as CanvasRenderingContext2D

describe('selection frame', () => {
  // no point of the shapes is ever found: only the shapes inside the frame are selected
  const ctx = hitContext(false)

  it('selects the shapes inside the frame, and keeps the selection while they stay the same', async () => {
    const store = await createLoadedStore()
    store.setSelectionFrame({
      oldSelection: undefined,
      frame: [
        [50, 50],
        [50, 50]
      ]
    })

    store.refreshSelectedShapes(ctx, [450, 250])
    const selection = store.getState().document.selectedShape
    expect(getSelectedIds(store)).toEqual(getIds(store).slice(0, 2))

    store.refreshSelectedShapes(ctx, [460, 260])
    expect(store.getState().document.selectedShape).toBe(selection)
    expect(store.getState().interaction.selectionFrame?.frame[1]).toEqual([460, 260])

    store.refreshSelectedShapes(ctx, [650, 260])
    expect(getSelectedIds(store)).toEqual(getIds(store))
  })
})

describe('hovered shape', () => {
  // every point inside the box of a shape is over it
  const ctx = hitContext(true)
  const getHoveredShape = (store: PaintStore) => store.getEditorState().interaction.hoveredShape

  it('follows the changes of the hovered shape, and is gone with it', async () => {
    const store = await createLoadedStore()
    const [first] = getIds(store)
    store.refreshHoveredShape(true, ctx, store.getShape(first!)!.computed.center, true)
    expect(getHoveredShape(store)?.id).toBe(first)

    store.actions.updateShapes([{ id: first!, style: { strokeColor: 'red' } }])
    expect(getHoveredShape(store)).toBe(store.getShape(first!))

    store.actions.removeShapes([first!])
    expect(getHoveredShape(store)).toBeUndefined()
    // the shape put back by undo is under the pointer again
    store.actions.undo()
    expect(getHoveredShape(store)?.id).toBe(first)
  })

  it('is the shape in front, even in the selection frame of a selected shape it covers: a click selects it', async () => {
    const store = await createLoadedStore({}, [{ type: 'rect', x: 50, y: 50, width: 200, height: 200 }, RECTS[0]!])
    const [cover, covered] = getIds(store)
    const center = store.getShape(covered!)!.computed.center
    store.actions.selectShapes([covered!])
    store.refreshHoveredShape(true, ctx, center, true)
    expect(getHoveredShape(store)?.id).toBe(cover)
  })
})
