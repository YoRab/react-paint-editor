import { type DocumentTrees, INITIAL_SHAPES_STATE, type ShapesState, shapesReducer } from '@canvas/store/shapesReducer'
import type { ShapeEntity } from '@canvas/types/Shapes'
import { describe, expect, it } from 'vitest'

const shape = (id: string, x = 0) => ({ id, type: 'rect', x, y: 0, width: 10, height: 10 }) as unknown as ShapeEntity

const withShapes = (shapes: ShapeEntity[]): ShapesState =>
  shapesReducer(INITIAL_SHAPES_STATE, { type: 'CLEAR', shapes, clearHistory: true, source: 'remote' })

const setShapes = (state: ShapesState, shapes: ShapeEntity[], save = true) =>
  shapesReducer(state, { type: 'SET_SHAPES', shapes, newSelectedShape: undefined, save })

/** Goes to a step without changes received: the trees are the shapes of the step, as the store gives them */
const goToStep = (state: ShapesState, cursor: number) => {
  const { shapes, selectedShape } = state.history.states[cursor]!
  return shapesReducer(state, { type: 'GO_TO_STEP', cursor, trees: { shapes, base: shapes, saved: shapes }, selectedShape })
}

/** Changes received, applied to the trees given */
const receive = (state: ShapesState, trees: DocumentTrees) =>
  shapesReducer(state, { type: 'RECEIVE', trees, newSelectedShape: undefined, source: 'remote' })

describe('shapesReducer', () => {
  it('saves each change in the history, from the shapes before it', () => {
    const initial = withShapes([shape('a'), shape('b')])
    const removed = setShapes(initial, [shape('b')])
    expect(removed.shapes.map(item => item.id)).toEqual(['b'])
    expect(removed.history.cursor).toBe(1)
    expect(removed.history.states[1]!.before).toBe(initial.shapes)
    expect(removed.base).toBe(removed.shapes)
    expect(removed.saved).toBe(removed.shapes)
    expect(removed.savedSource).toBe('user')
  })

  it('goes to a step with the trees given, as a change of the user', () => {
    const initial = withShapes([shape('a'), shape('b')])
    const removed = setShapes(initial, [shape('b')])
    const undone = goToStep(removed, 0)
    expect(undone.shapes).toBe(initial.shapes)
    expect(undone.saved).toBe(initial.shapes)
    expect(undone.history.cursor).toBe(0)
    expect(undone.history.states).toBe(removed.history.states)
    expect(undone.savedSource).toBe('user')
    expect(undone.source).toBe('user')
    expect(goToStep(undone, 0)).toBe(undone)
  })

  it('drops the redo entries on a new change', () => {
    const initial = withShapes([shape('a'), shape('b')])
    const undone = goToStep(setShapes(initial, [shape('b')]), 0)
    const updated = setShapes(undone, [shape('a'), shape('b', 50)])
    expect(updated.history.states).toHaveLength(2)
    expect(updated.history.cursor).toBe(1)
  })

  it('ignores a save without change since the base', () => {
    const initial = withShapes([shape('a')])
    expect(shapesReducer(initial, { type: 'SAVE' })).toBe(initial)

    const moved = setShapes(initial, [shape('a', 20)], false)
    expect(moved.history).toBe(initial.history)
    expect(moved.base).toBe(initial.shapes)
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
    expect(cleared.history).toEqual({
      states: [{ before: cleared.shapes, shapes: cleared.shapes, selectedShape: undefined, source: 'remote' }],
      cursor: 0
    })
    expect(cleared.base).toBe(cleared.shapes)
    expect(cleared.saved).toBe(cleared.shapes)

    const kept = shapesReducer(removed, { type: 'CLEAR', shapes: [shape('c')], clearHistory: false, source: 'user' })
    expect(kept.history.states).toHaveLength(3)
    expect(kept.history.cursor).toBe(2)
    expect(kept.history.states[2]!.source).toBe('user')
    expect(kept.history.states[2]!.before).toBe(removed.shapes)
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
    expect(changed.savedSource).toBe('remote')
  })

  it('saves the saved shapes given with a step, when changes received are not saved yet', () => {
    const initial = withShapes([shape('a')])
    // a gesture of another instance, received
    const live = [shape('a', 30)]
    const received = receive(initial, { shapes: live, base: live, saved: initial.saved })
    const drawn = [shape('b'), ...live]
    const savedWithStep = [shape('b'), ...initial.saved]
    const stepped = shapesReducer(received, { type: 'SET_SHAPES', shapes: drawn, newSelectedShape: undefined, save: true, saved: savedWithStep })
    expect(stepped.history.states[1]!.before).toBe(live)
    expect(stepped.base).toBe(drawn)
    expect(stepped.saved).toBe(savedWithStep)
  })

  it('applies changes received without a step, and saves them with their source when they are saved', () => {
    const initial = withShapes([shape('a')])
    const live = [shape('a', 30)]
    const received = receive(initial, { shapes: live, base: live, saved: initial.saved })
    expect(received.history).toBe(initial.history)
    expect(received.shapes).toBe(live)
    expect(received.base).toBe(live)
    expect(received.saved).toBe(initial.saved)
    expect(received.source).toBe('remote')

    const saved = receive(received, { shapes: live, base: live, saved: live })
    expect(saved.history).toBe(initial.history)
    expect(saved.saved).toBe(live)
    expect(saved.savedSource).toBe('remote')
    // nothing new
    expect(receive(saved, { shapes: live, base: live, saved: live })).toBe(saved)
  })

  it('merges the steps of a transaction, from the shapes before the first one', () => {
    const initial = withShapes([shape('a')])
    const first = setShapes(initial, [shape('a', 10)])
    const second = setShapes(first, [shape('a', 20)])
    const squashed = shapesReducer(second, { type: 'SQUASH_HISTORY', from: 0 })
    expect(squashed.history.states).toHaveLength(2)
    expect(squashed.history.states[1]!.before).toBe(initial.shapes)
    expect(squashed.history.states[1]!.shapes).toBe(second.shapes)
  })
})
