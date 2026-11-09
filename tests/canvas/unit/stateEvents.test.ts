import { createPaintStore, type PaintStore } from '@canvas/store/paintStore'
import type { EditorState, ReactPaintEventName } from '@canvas/types/editor'
import { describe, expect, it, vi } from 'vitest'
import { createLoadedStore, extendTo, getRootIds, RECTS, stubPath2D } from './helpers'

stubPath2D()

/**
 * The event telling each change of a slice of the editor state, or why it has none: 'props' when only the props and the
 * options of the consumer change it, 'subscribe' when only subscribe tells its changes (a choice of the library). A new
 * slice of the editor state does not compile until its event is chosen
 */
const STATE_EVENTS = {
  mode: 'props',
  disabled: 'props',
  features: 'props',
  width: 'props',
  height: 'props',
  layout: 'props',
  view: 'viewChanged',
  options: 'optionsChanged',
  gridGap: 'gridChanged',
  shapes: 'shapesChanged',
  selection: 'selectionChanged',
  selectedShapes: 'selectionChanged',
  selectedShapeIds: 'selectionChanged',
  activeTool: 'toolChanged',
  tools: 'toolsChanged',
  history: 'historyChanged',
  clipboard: 'clipboardChanged',
  withContextMenu: 'props',
  withDropPicture: 'props',
  interaction: 'subscribe',
  contextMenu: 'contextMenuChanged'
} as const satisfies Record<keyof EditorState, ReactPaintEventName | 'props' | 'subscribe'>

type SliceWithEvent = { [K in keyof EditorState]: (typeof STATE_EVENTS)[K] extends ReactPaintEventName ? K : never }[keyof EditorState]

const RECT_TOOL_ID = 'react-paint-rect'

/** Listens to the event of a slice of the state: its first argument is the slice */
const listenSlice = (store: PaintStore, slice: SliceWithEvent) => {
  const listener = vi.fn()
  store.registerEvent(STATE_EVENTS[slice] as ReactPaintEventName, listener)
  return listener
}

/** Runs the change and checks that the event of the slice is emitted once, with the new slice */
const expectSliceEvent = (store: PaintStore, slice: SliceWithEvent, change: () => void) => {
  const listener = listenSlice(store, slice)
  const previous = store.getEditorState()[slice]
  change()
  expect(store.getEditorState()[slice]).not.toBe(previous)
  expect(listener).toHaveBeenCalledTimes(1)
  expect(listener.mock.calls[0]![0]).toBe(store.getEditorState()[slice])
  store.unregisterEvent(STATE_EVENTS[slice] as ReactPaintEventName, listener)
}

describe('events of the slices of the state', () => {
  it('emits the event of the grid with the new gap', () => {
    const store = createPaintStore()
    expectSliceEvent(store, 'gridGap', () => store.actions.setGridGap(20))
  })

  it('emits the event of the view when it is zoomed, moved or resized', () => {
    const store = createPaintStore({ options: { canZoom: 'always', size: 'infinite' } })
    expectSliceEvent(store, 'view', () => store.actions.zoomTo(2))
    expectSliceEvent(store, 'view', () => store.actions.panBy([10, 0]))
    expectSliceEvent(store, 'view', () => store.actions.setOffset([50, 50]))
    expectSliceEvent(store, 'view', () => extendTo(store, 400, 300))
  })

  it('emits the event of the tools when their default values change', async () => {
    const store = await createLoadedStore()
    expectSliceEvent(store, 'tools', () => store.actions.updateToolSettings(RECT_TOOL_ID, 'strokeColor', '#ff0000'))
    expectSliceEvent(store, 'tools', () => store.actions.setToolStyle(RECT_TOOL_ID, { lineWidth: 7 }))
    expectSliceEvent(store, 'tools', () => store.actions.setShapesStyle([getRootIds(store)[0]!], { fillColor: '#00ff00' }, { updateTool: true }))
  })

  it('emits the event of the shapes for the changes which are not saved too', async () => {
    const store = await createLoadedStore()
    const onData = vi.fn()
    store.registerEvent('dataChanged', onData)
    expectSliceEvent(store, 'shapes', () => store.actions.translateShapes([getRootIds(store)[0]!], [10, 0], { save: false }))
    expect(onData).not.toHaveBeenCalled()
    store.actions.saveShapes()
    expect(onData).toHaveBeenCalledTimes(1)
  })

  it('emits the event of the history when it can be undone, redone or cleared', () => {
    const store = createPaintStore()
    expectSliceEvent(store, 'history', () => store.actions.addShapes([RECTS[0]!]))
    expect(store.getEditorState().history).toEqual({ canUndo: true, canRedo: false, canClear: true })
    expectSliceEvent(store, 'history', () => store.actions.undo())
    expect(store.getEditorState().history).toEqual({ canUndo: false, canRedo: true, canClear: false })
  })

  it('emits the event of the clipboard once it holds shapes', async () => {
    const store = await createLoadedStore()
    expectSliceEvent(store, 'clipboard', () => store.actions.copy([getRootIds(store)[0]!]))
    // it still holds shapes
    const listener = listenSlice(store, 'clipboard')
    store.actions.copy([getRootIds(store)[1]!])
    expect(listener).not.toHaveBeenCalled()
  })

  it('emits the event of the context menu when it opens and when it closes', async () => {
    const store = await createLoadedStore()
    expectSliceEvent(store, 'contextMenu', () =>
      store.actions.openContextMenu({ clientPosition: { x: 10, y: 10 }, canvasPosition: [10, 10], ids: [getRootIds(store)[0]!] })
    )
    expectSliceEvent(store, 'contextMenu', () => store.actions.closeContextMenu())
    expect(store.getEditorState().contextMenu).toBeUndefined()
  })

  it('emits the event of the options when setOptions or the props change them', () => {
    const store = createPaintStore()
    expectSliceEvent(store, 'options', () => store.actions.setOptions({ withContextMenu: false }))
    expectSliceEvent(store, 'options', () => store.actions.resetOptions())
    expectSliceEvent(store, 'options', () => store.setConfig({ options: { brushAlgo: 'quadratic' } }))
  })

  it('emits the events of the tool and of the selection with their slices', async () => {
    const store = await createLoadedStore()
    expectSliceEvent(store, 'activeTool', () => store.actions.selectTool(RECT_TOOL_ID))
    expectSliceEvent(store, 'selectedShapes', () => store.actions.selectShapes([getRootIds(store)[0]!]))
  })

  it('emits nothing when the values do not change', async () => {
    const store = await createLoadedStore({ options: { grid: 10 } })
    const listeners = (['view', 'gridGap', 'tools', 'options', 'history', 'contextMenu'] as const).map(slice => listenSlice(store, slice))
    store.actions.setGridGap(10)
    store.actions.resetSettings()
    store.actions.setOptions({ grid: 10 })
    store.actions.closeContextMenu()
    store.actions.zoomTo(1)
    for (const listener of listeners) expect(listener).not.toHaveBeenCalled()
  })

  it('emits the settings reset by resetSettings once', async () => {
    const store = await createLoadedStore({ options: { canZoom: 'always' } })
    store.actions.setGridGap(40)
    store.actions.zoomTo(2)
    store.actions.updateToolSettings(RECT_TOOL_ID, 'strokeColor', '#ff0000')
    const listeners = (['view', 'gridGap', 'tools'] as const).map(slice => listenSlice(store, slice))
    store.actions.resetSettings()
    for (const listener of listeners) expect(listener).toHaveBeenCalledTimes(1)
  })

  it('emits a single event for the changes of a batch', () => {
    const store = createPaintStore({ options: { canZoom: 'always' } })
    const listener = listenSlice(store, 'view')
    store.batch(() => {
      store.actions.zoomTo(2)
      store.actions.zoomTo(3)
    })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0]![0]).toMatchObject({ zoom: 3 })
  })
})

describe('shapesChanged', () => {
  it('gives the origin of the change and the changes since the previous shapes', async () => {
    const store = await createLoadedStore()
    const listener = vi.fn()
    store.registerEvent('shapesChanged', listener)
    const [first] = getRootIds(store)

    store.actions.translateShapes([first!], [10, 0], { save: false })
    store.actions.translateShapes([first!], [5, 0], { save: false })
    expect(listener).toHaveBeenCalledTimes(2)
    // from the previous shapes, not from the step of the history
    expect(listener.mock.lastCall?.[1]).toBe('user')
    expect(listener.mock.lastCall?.[2]).toMatchObject({
      added: [],
      updated: [{ shape: { id: first, x: 115 }, previous: { id: first, x: 110 } }],
      removed: [],
      reordered: false,
      order: []
    })

    store.actions.addShapes([{ ...RECTS[0]!, id: 'new' }], { source: 'remote' })
    expect(listener.mock.lastCall?.[1]).toBe('remote')
    expect(listener.mock.lastCall?.[2]).toMatchObject({
      added: [{ id: 'new' }],
      order: [{ parentId: undefined, ids: ['new', ...getRootIds(store).slice(1)] }]
    })

    // an undo is a change of the user, whatever the origin of the step
    store.actions.undo()
    expect(listener.mock.lastCall?.[1]).toBe('user')
    expect(listener.mock.lastCall?.[2]).toMatchObject({ removed: [{ id: 'new' }] })
  })

  it('is not emitted for a change of the selection', async () => {
    const store = await createLoadedStore()
    const listener = vi.fn()
    store.registerEvent('shapesChanged', listener)
    store.actions.selectAllShapes()
    store.actions.clearSelection()
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('dataChanged', () => {
  it('gives an undo and a redo as changes of the user', async () => {
    const store = await createLoadedStore()
    store.actions.addShapes([RECTS[0]!], { source: 'remote' })
    const listener = vi.fn()
    store.registerEvent('dataChanged', listener)
    store.actions.undo()
    store.actions.redo()
    expect(listener.mock.calls.map(call => call[1])).toEqual(['user', 'user'])
  })
})
