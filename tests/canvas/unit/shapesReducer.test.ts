import { INITIAL_SHAPES_STATE, type ShapesState, shapesReducer } from '@canvas/store/shapesReducer'
import type { ShapeEntity } from '@canvas/types/Shapes'
import { describe, expect, it } from 'vitest'

const shape = (id: string, x = 0) => ({ id, type: 'rect', x, y: 0, width: 10, height: 10 }) as unknown as ShapeEntity

const withShapes = (shapes: ShapeEntity[]): ShapesState =>
  shapesReducer(INITIAL_SHAPES_STATE, { type: 'CLEAR', shapes, clearHistory: true, source: 'remote' })

describe('shapesReducer', () => {
  it('saves each change in the history, and moves in it with undo and redo', () => {
    const initial = withShapes([shape('a'), shape('b')])
    const removed = shapesReducer(initial, { type: 'REMOVE', ids: new Set(['a']), newSelectedShape: undefined })
    expect(removed.shapes.map(item => item.id)).toEqual(['b'])
    expect(removed.history.cursor).toBe(1)

    const undone = shapesReducer(removed, { type: 'UNDO' })
    expect(undone.shapes.map(item => item.id)).toEqual(['a', 'b'])
    expect(undone.history.cursor).toBe(0)

    const redone = shapesReducer(undone, { type: 'REDO' })
    expect(redone.shapes.map(item => item.id)).toEqual(['b'])
    expect(redone.history.cursor).toBe(1)
  })

  it('does not move beyond the history', () => {
    const initial = withShapes([shape('a')])
    expect(shapesReducer(initial, { type: 'UNDO' })).toBe(initial)
    expect(shapesReducer(initial, { type: 'REDO' })).toBe(initial)
  })

  it('drops the redo entries on a new change', () => {
    const initial = withShapes([shape('a'), shape('b')])
    const removed = shapesReducer(initial, { type: 'REMOVE', ids: new Set(['a']), newSelectedShape: undefined })
    const undone = shapesReducer(removed, { type: 'UNDO' })
    const updated = shapesReducer(undone, { type: 'UPDATE', updatedShapes: [shape('b', 50)], newSelectedShape: undefined, save: true })
    expect(updated.history.states).toHaveLength(2)
    expect(updated.history.cursor).toBe(1)
    expect(shapesReducer(updated, { type: 'REDO' })).toBe(updated)
  })

  it('ignores a save of a state identical to the current entry', () => {
    const initial = withShapes([shape('a')])
    const saved = shapesReducer(initial, { type: 'SAVE' })
    expect(saved.history).toBe(initial.history)

    const moved = shapesReducer(initial, { type: 'UPDATE', updatedShapes: [shape('a', 20)], newSelectedShape: undefined, save: false })
    expect(moved.history).toBe(initial.history)
    const movedAndSaved = shapesReducer(moved, { type: 'SAVE' })
    expect(movedAndSaved.history.cursor).toBe(1)
    expect(shapesReducer(movedAndSaved, { type: 'SAVE' }).history).toBe(movedAndSaved.history)
  })

  it('adds the new shapes on top, without saving', () => {
    const initial = withShapes([shape('a')])
    const added = shapesReducer(initial, { type: 'ADD', newShapes: [shape('b')] })
    expect(added.shapes.map(item => item.id)).toEqual(['b', 'a'])
    expect(added.history).toBe(initial.history)
  })

  it('clears the history, or keeps it with a new entry', () => {
    const initial = withShapes([shape('a')])
    const removed = shapesReducer(initial, { type: 'REMOVE', ids: new Set(['a']), newSelectedShape: undefined })

    const cleared = shapesReducer(removed, { type: 'CLEAR', shapes: [shape('c')], clearHistory: true, source: 'remote' })
    expect(cleared.history).toEqual({ states: [{ shapes: cleared.shapes, selectedShape: undefined, source: 'remote' }], cursor: 0 })

    const kept = shapesReducer(removed, { type: 'CLEAR', shapes: [shape('c')], clearHistory: false, source: 'user' })
    expect(kept.history.states).toHaveLength(3)
    expect(kept.history.cursor).toBe(2)
    expect(kept.history.states[2]!.source).toBe('user')
    expect(kept.selectedShape).toBeUndefined()
  })

  it('inserts the duplicates before their original shape', () => {
    const initial = withShapes([shape('a'), shape('b')])
    const duplicated = shapesReducer(initial, {
      type: 'DUPLICATE',
      newShapesMap: new Map([['b', shape('b2')]]),
      newSelectedShape: undefined
    })
    expect(duplicated.shapes.map(item => item.id)).toEqual(['a', 'b2', 'b'])
  })

  it('keeps the shapes of a new order, and leaves out the flag of an old list of layers', () => {
    const first = shape('a')
    const second = { ...shape('b'), chosen: true } as unknown as ShapeEntity
    const reordered = shapesReducer(withShapes([first, second]), { type: 'RESET_AND_SAVE', shapes: [second, first], newSelectedShape: undefined })
    expect(reordered.shapes[1]).toBe(first)
    expect(reordered.shapes[0]).toEqual(shape('b'))
    expect(reordered.history.states[reordered.history.cursor]?.shapes).toBe(reordered.shapes)
  })
})
