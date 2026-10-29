import { INITIAL_SHAPES_STATE, type ShapesState, shapesReducer } from '@canvas/store/shapesReducer'
import type { ShapeEntity } from '@canvas/types/Shapes'
import { describe, expect, it } from 'vitest'

const shape = (id: string, x = 0) => ({ id, type: 'rect', x, y: 0, width: 10, height: 10 }) as unknown as ShapeEntity

const withShapes = (shapes: ShapeEntity[]): ShapesState =>
  shapesReducer(INITIAL_SHAPES_STATE, { type: 'CLEAR', shapes, clearHistory: true, source: 'remote' })

const setShapes = (state: ShapesState, shapes: ShapeEntity[], save = true) =>
  shapesReducer(state, { type: 'SET_SHAPES', shapes, newSelectedShape: undefined, save })

describe('shapesReducer', () => {
  it('saves each change in the history, and moves in it with undo and redo', () => {
    const initial = withShapes([shape('a'), shape('b')])
    const removed = setShapes(initial, [shape('b')])
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
    const removed = setShapes(initial, [shape('b')])
    const undone = shapesReducer(removed, { type: 'UNDO' })
    const updated = setShapes(undone, [shape('a'), shape('b', 50)])
    expect(updated.history.states).toHaveLength(2)
    expect(updated.history.cursor).toBe(1)
    expect(shapesReducer(updated, { type: 'REDO' })).toBe(updated)
  })

  it('ignores a save of a state identical to the current entry', () => {
    const initial = withShapes([shape('a')])
    const saved = shapesReducer(initial, { type: 'SAVE' })
    expect(saved.history).toBe(initial.history)

    const moved = setShapes(initial, [shape('a', 20)], false)
    expect(moved.history).toBe(initial.history)
    const movedAndSaved = shapesReducer(moved, { type: 'SAVE' })
    expect(movedAndSaved.history.cursor).toBe(1)
    expect(shapesReducer(movedAndSaved, { type: 'SAVE' }).history).toBe(movedAndSaved.history)
  })

  it('keeps the state when the shapes and the selection are the same, without saving', () => {
    const initial = withShapes([shape('a')])
    expect(setShapes(initial, initial.shapes, false)).toBe(initial)
    // the same shapes saved: the history does not change either
    expect(setShapes(initial, initial.shapes).history).toBe(initial.history)
  })

  it('clears the history, or keeps it with a new entry', () => {
    const initial = withShapes([shape('a')])
    const removed = setShapes(initial, [])

    const cleared = shapesReducer(removed, { type: 'CLEAR', shapes: [shape('c')], clearHistory: true, source: 'remote' })
    expect(cleared.history).toEqual({ states: [{ shapes: cleared.shapes, selectedShape: undefined, source: 'remote' }], cursor: 0 })

    const kept = shapesReducer(removed, { type: 'CLEAR', shapes: [shape('c')], clearHistory: false, source: 'user' })
    expect(kept.history.states).toHaveLength(3)
    expect(kept.history.cursor).toBe(2)
    expect(kept.history.states[2]!.source).toBe('user')
    expect(kept.selectedShape).toBeUndefined()
  })

  it('gives the source of a change to its step', () => {
    const changed = shapesReducer(withShapes([shape('a')]), {
      type: 'SET_SHAPES',
      shapes: [],
      newSelectedShape: undefined,
      save: true,
      source: 'remote'
    })
    expect(changed.history.states[1]!.source).toBe('remote')
  })
})
