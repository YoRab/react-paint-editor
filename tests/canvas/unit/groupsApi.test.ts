import type { PaintStore } from '@canvas/store/paintStore'
import type { ShapeEntity, ShapeInput } from '@canvas/types/Shapes'
import { getSelectedShapes, getSelectedShapesTools } from '@canvas/utils/selectedShapes'
import { flattenShapes } from '@canvas/utils/shapes/tree'
import { describe, expect, it, vi } from 'vitest'
import { createLoadedStore, RECTS, stubPath2D } from './helpers'

stubPath2D()

/** outer holds inner and c, inner holds a and b, d is alone */
const TREE: ShapeInput[] = [
  {
    type: 'group',
    id: 'outer',
    name: 'Outer',
    shapes: [
      {
        type: 'group',
        id: 'inner',
        shapes: [
          { ...RECTS[0]!, id: 'a' },
          { ...RECTS[1]!, id: 'b' }
        ]
      },
      { ...RECTS[2]!, id: 'c' }
    ]
  },
  { type: 'rect', id: 'd', x: 100, y: 300, width: 100, height: 100 }
]

const createTreeStore = () => createLoadedStore({}, TREE)

const getIds = (shapes: readonly ShapeEntity[]) => shapes.map(shape => shape.id)

const getRootIds = (store: PaintStore) => getIds(store.getState().document.shapes)

const getChildIds = (store: PaintStore, id: string) => getIds((store.getShape(id) as ShapeEntity<'group'>).shapes)

const getSelectedIds = (store: PaintStore) => getIds(getSelectedShapes(store.getState().document.selectedShape))

const getHistoryLength = (store: PaintStore) => store.getState().document.history.states.length

describe('shapes of the groups', () => {
  it('finds the shapes of the groups by their ids, and gives free ids at any depth', async () => {
    const store = await createTreeStore()
    expect(store.getShape('a')?.type).toBe('rect')
    expect(store.getEditorState().shapes).toHaveLength(2)
    const [groupId] = store.actions.addShapes([{ type: 'group', id: 'a', shapes: [{ ...RECTS[0]!, id: 'b' }, RECTS[1]!] }])
    const ids = flattenShapes(store.getState().document.shapes).map(shape => shape.id)
    expect(groupId).not.toBe('a')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('shows a change of a shape of a selected group in the selection, and in the history', async () => {
    const store = await createTreeStore()
    store.actions.selectShapes(['outer'])
    store.actions.updateShapes([{ id: 'a', x: 0 }])
    const { selectedShape, history } = store.getState().document
    expect(selectedShape).toBe(store.getShape('outer'))
    expect(selectedShape?.computed.borders.x).toBe(store.getShape('a')?.computed.borders.x)
    expect(history.states[history.cursor]!.selectedShape).toBe(selectedShape)
  })

  it('removes a shape of a group, and dissolves the group left with a single shape: the selection follows', async () => {
    const store = await createTreeStore()
    store.actions.selectShapes(['inner', 'd'])
    store.actions.removeShapes(['a'])
    expect(getChildIds(store, 'outer')).toEqual(['b', 'c'])
    expect(store.getShape('inner')).toBeUndefined()
    expect(getSelectedIds(store)).toEqual(['b', 'd'])

    store.actions.undo()
    expect(getChildIds(store, 'inner')).toEqual(['a', 'b'])
    store.actions.redo()
    expect(getSelectedIds(store)).toEqual(['b', 'd'])
  })

  it('moves a group but its locked shapes, and the shapes of a locked group do not move', async () => {
    const store = await createTreeStore()
    store.actions.setShapesLocked(['a'], true)
    store.actions.translateShapes(['outer'], [10, 0])
    expect((store.getShape('a') as ShapeEntity<'rect'>).x).toBe(100)
    expect((store.getShape('b') as ShapeEntity<'rect'>).x).toBe(310)
    expect((store.getShape('c') as ShapeEntity<'rect'>).x).toBe(510)

    store.actions.setShapesLocked(['inner'], true)
    store.actions.translateShapes(['b'], [10, 0])
    expect((store.getShape('b') as ShapeEntity<'rect'>).x).toBe(310)
  })

  it('selects the shapes as they act together: a group in place of its shapes, a locked group in place of its shapes', async () => {
    const store = await createTreeStore()
    store.actions.selectShapes(['a', 'inner', 'd'])
    expect(getSelectedIds(store)).toEqual(['inner', 'd'])
    store.actions.selectShapes(['outer'], { mode: 'add' })
    expect(getSelectedIds(store)).toEqual(['d', 'outer'])

    store.actions.selectShapes(['b'])
    store.actions.setShapesLocked(['inner'], true)
    expect(getSelectedIds(store)).toEqual(['inner'])
    store.actions.selectShapes(['a'])
    expect(getSelectedIds(store)).toEqual(['inner'])
  })

  it('sets the opacity of a group to the group, and the other fields to its shapes and to their tools', async () => {
    const store = await createTreeStore()
    store.actions.setShapesStyle(['inner'], { opacity: 40, strokeColor: 'red' }, { updateTool: true })
    expect(store.getShape('inner')?.style).toEqual({ opacity: 40 })
    expect(store.getShape('a')?.style).toMatchObject({ strokeColor: 'red', opacity: 100 })
    const rectTool = store.getState().tools.available.find(tool => tool.type === 'rect')!
    expect(rectTool.settings).toMatchObject({ strokeColor: { default: 'red' }, opacity: { default: 100 } })
  })

  it('renames a group, and removes its name set to undefined', async () => {
    const store = await createTreeStore()
    store.actions.updateShapes([{ id: 'inner', name: 'Inner' }])
    expect((store.getShape('inner') as ShapeEntity<'group'>).name).toBe('Inner')
    store.actions.updateShapes([{ id: 'outer', name: undefined }])
    expect(store.getShape('outer')).not.toHaveProperty('name')
  })

  it('gives the tool of the shapes of a selected group, which the settings bar shows', async () => {
    const store = await createTreeStore()
    const { available } = store.getState().tools
    store.actions.selectShapes(['inner'])
    expect(getSelectedShapesTools(store.getState().document.selectedShape, available)?.type).toBe('rect')
    store.actions.addShapes([{ type: 'text', id: 't', x: 0, y: 0, value: ['t'] }])
    store.actions.selectShapes(['outer', 't'])
    // the settings shared by the tools of a rect and of a text
    const tool = getSelectedShapesTools(store.getState().document.selectedShape, available)
    expect(tool?.type).toBe('group')
    expect(tool?.settings).toHaveProperty('opacity')
    expect(tool?.settings).not.toHaveProperty('fontFamily')
  })

  it('duplicates and copies a group with new ids for all its shapes, a copy in front of its shape', async () => {
    const store = await createTreeStore()
    store.actions.duplicateShapes(['inner', 'a'], { select: true })
    const [copyId, ...rest] = getChildIds(store, 'outer')
    expect(rest).toEqual(['inner', 'c'])
    expect(getSelectedIds(store)).toEqual([copyId])
    expect(getChildIds(store, copyId!)).toHaveLength(2)

    store.actions.copy(['outer'])
    store.actions.paste()
    // the copy of inner holds 2 shapes, the copy of outer the copies of the 2 groups and their shapes
    const ids = flattenShapes(store.getState().document.shapes).map(shape => shape.id)
    expect(ids).toHaveLength(17)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('orders the shapes among the shapes of their group only', async () => {
    const store = await createTreeStore()
    store.actions.moveShapes(['b', 'd'], 'first')
    expect(getChildIds(store, 'inner')).toEqual(['b', 'a'])
    expect(getRootIds(store)).toEqual(['d', 'outer'])

    store.actions.reorderShapes(['c', 'a'])
    expect(getChildIds(store, 'outer')).toEqual(['c', 'inner'])
    expect(getChildIds(store, 'inner')).toEqual(['a', 'b'])

    store.actions.setShapeIndex('c', 5)
    expect(getChildIds(store, 'outer')).toEqual(['inner', 'c'])

    const length = getHistoryLength(store)
    store.actions.swapShapes('a', 'd')
    expect(getHistoryLength(store)).toBe(length)
    store.actions.swapShapes('a', 'b')
    expect(getChildIds(store, 'inner')).toEqual(['b', 'a'])
  })
})

describe('groupShapes and ungroupShapes', () => {
  it('groups shapes of several groups, selects the group when they were selected, in a single step', async () => {
    const store = await createTreeStore()
    store.actions.selectShapes(['c', 'd'])
    const length = getHistoryLength(store)
    const groupId = store.actions.groupShapes(['d', 'c'])!
    expect(getRootIds(store)).toEqual(['outer'])
    expect(getChildIds(store, 'outer')).toEqual(['inner', groupId])
    expect(getChildIds(store, groupId)).toEqual(['c', 'd'])
    expect(getSelectedIds(store)).toEqual([groupId])
    expect(getHistoryLength(store)).toBe(length + 1)

    // the steps of the history keep their selection
    store.actions.undo()
    expect(getRootIds(store)).toEqual(['outer', 'd'])
    expect(getSelectedIds(store)).toEqual([])
    store.actions.redo()
    expect(getSelectedIds(store)).toEqual([groupId])
  })

  it('keeps the selection of other shapes', async () => {
    const store = await createTreeStore()
    store.actions.selectShapes(['a'])
    store.actions.groupShapes(['c', 'd'])
    expect(getSelectedIds(store)).toEqual(['a'])
  })

  it('refuses less than 2 shapes, or all the shapes of a group, without changing anything', async () => {
    const store = await createTreeStore()
    const { document } = store.getState()
    expect(store.actions.groupShapes(['a'])).toBeUndefined()
    expect(store.actions.groupShapes(['a', 'b'])).toBeUndefined()
    expect(store.actions.groupShapes(['inner', 'c'])).toBeUndefined()
    expect(store.actions.groupShapes(['missing', 'd'])).toBeUndefined()
    expect(store.getState().document).toBe(document)
  })

  it('ungroups a group: its shapes take its place, hidden and faded with it, and are selected when it was', async () => {
    const store = await createTreeStore()
    store.actions.setShapesVisibility(['inner'], false)
    store.actions.setShapesStyle(['inner'], { opacity: 50 })
    store.actions.selectShapes(['inner'])
    expect(store.actions.ungroupShapes(['inner', 'd'])).toEqual(['a', 'b'])
    expect(getChildIds(store, 'outer')).toEqual(['a', 'b', 'c'])
    expect(store.getShape('a')).toMatchObject({ visible: false, style: { opacity: 50 } })
    expect(getSelectedIds(store)).toEqual(['a', 'b'])
    expect(store.actions.ungroupShapes(['d'])).toEqual([])
  })

  it('ungroups a group and a group it holds', async () => {
    const store = await createTreeStore()
    expect(store.actions.ungroupShapes(['outer', 'inner'])).toEqual(['a', 'b', 'c'])
    expect(getRootIds(store)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('tells the context menu whether its shapes can be grouped or ungrouped', async () => {
    const store = await createTreeStore()
    const openOn = (ids: string[]) => {
      store.actions.openContextMenu({ clientPosition: { x: 0, y: 0 }, canvasPosition: [0, 0], ids })
      const { canGroup, canUngroup } = store.getEditorState().contextMenu!
      return { canGroup, canUngroup }
    }
    expect(openOn(['c', 'd'])).toEqual({ canGroup: true, canUngroup: false })
    expect(openOn(['inner'])).toEqual({ canGroup: false, canUngroup: true })
    expect(openOn(['inner', 'c'])).toEqual({ canGroup: false, canUngroup: true })
  })

  it('gives the changes of the groups to dataChanged', async () => {
    const store = await createTreeStore()
    const listener = vi.fn()
    store.registerEvent('dataChanged', listener)
    const groupId = store.actions.groupShapes(['c', 'd'])
    expect(listener.mock.lastCall?.[2]).toEqual({
      added: [expect.objectContaining({ id: groupId, type: 'group' })],
      updated: [expect.objectContaining({ shape: expect.objectContaining({ id: 'outer' }) })],
      removed: [],
      reordered: true
    })
    const data = listener.mock.lastCall?.[0]
    expect(data.shapes[0].shapes[1]).toMatchObject({ id: groupId, shapes: [{ id: 'c' }, { id: 'd' }] })
  })
})

describe('selectionChanged', () => {
  it('is emitted when the selected shapes change, also for a group whose id is the one of their selection', async () => {
    const store = await createLoadedStore({}, [
      {
        type: 'group',
        id: 'a-b',
        shapes: [
          { ...RECTS[0]!, id: 'a' },
          { ...RECTS[1]!, id: 'b' }
        ]
      }
    ])
    const listener = vi.fn()
    store.registerEvent('selectionChanged', listener)
    store.actions.selectShapes(['a-b'])
    store.actions.selectShapes(['a', 'b'])
    expect(listener).toHaveBeenCalledTimes(2)
    expect(getIds(listener.mock.lastCall?.[0])).toEqual(['a', 'b'])
  })
})
