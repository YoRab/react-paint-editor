import type { ChangeSource } from '@canvas/types/editor'
import type { SelectionType, ShapeEntity } from '@canvas/types/Shapes'
import { isEqual } from '@canvas/utils/object'

// --- Types ---

type HistoryEntry = {
  shapes: ShapeEntity[]
  selectedShape: SelectionType | undefined
  source: ChangeSource
}

export type ShapesState = {
  shapes: ShapeEntity[]
  selectedShape: SelectionType | undefined
  history: { states: HistoryEntry[]; cursor: number }
}

export type ShapesAction =
  /**
   * Sets the shapes of the drawing, built by the store, and the selection which follows them. With save, the change is a
   * step of the history
   */
  | { type: 'SET_SHAPES'; shapes: ShapeEntity[]; newSelectedShape: SelectionType | undefined; save: boolean; source?: ChangeSource | undefined }
  | { type: 'SET_SELECTION'; newSelectedShape: SelectionType | undefined }
  | { type: 'SAVE'; source?: ChangeSource | undefined }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR'; shapes: ShapeEntity[]; clearHistory: boolean; source: ChangeSource }
  /** Merges the steps added after the cursor `from` into a single one, the last */
  | { type: 'SQUASH_HISTORY'; from: number }

export const INITIAL_SHAPES_STATE: ShapesState = {
  shapes: [],
  selectedShape: undefined,
  history: { states: [{ shapes: [], selectedShape: undefined, source: 'remote' }], cursor: 0 }
}

// --- Helper ---

const addHistoryEntry = (
  history: ShapesState['history'],
  shapes: ShapeEntity[],
  selectedShape: SelectionType | undefined,
  source: ChangeSource = 'user'
): ShapesState['history'] => {
  if (isEqual(history.states[history.cursor]?.shapes, shapes)) return history
  return {
    states: [...history.states.slice(0, history.cursor + 1), { shapes, selectedShape, source }],
    cursor: history.cursor + 1
  }
}

// --- Reducer ---

export const shapesReducer = (state: ShapesState, action: ShapesAction): ShapesState => {
  switch (action.type) {
    case 'SET_SHAPES': {
      const { shapes, newSelectedShape, save, source } = action
      const next = shapes === state.shapes && newSelectedShape === state.selectedShape ? state : { ...state, shapes, selectedShape: newSelectedShape }
      return save ? { ...next, history: addHistoryEntry(next.history, shapes, newSelectedShape, source) } : next
    }

    case 'SET_SELECTION':
      return { ...state, selectedShape: action.newSelectedShape }

    case 'SAVE':
      return { ...state, history: addHistoryEntry(state.history, state.shapes, state.selectedShape, action.source) }

    case 'UNDO': {
      if (state.history.cursor <= 0) return state
      const cursor = state.history.cursor - 1
      const { shapes, selectedShape } = state.history.states[cursor]!
      return { ...state, shapes, selectedShape, history: { ...state.history, cursor } }
    }

    case 'REDO': {
      if (state.history.cursor >= state.history.states.length - 1) return state
      const cursor = state.history.cursor + 1
      const { shapes, selectedShape } = state.history.states[cursor]!
      return { ...state, shapes, selectedShape, history: { ...state.history, cursor } }
    }

    case 'CLEAR':
      return action.clearHistory
        ? {
            shapes: action.shapes,
            selectedShape: undefined,
            history: { states: [{ shapes: action.shapes, selectedShape: undefined, source: action.source }], cursor: 0 }
          }
        : {
            ...state,
            shapes: action.shapes,
            selectedShape: undefined,
            history: addHistoryEntry(state.history, action.shapes, undefined, action.source)
          }

    case 'SQUASH_HISTORY': {
      const { states, cursor } = state.history
      if (cursor <= action.from + 1) return state
      return { ...state, history: { states: [...states.slice(0, action.from + 1), states[cursor]!], cursor: action.from + 1 } }
    }

    default:
      return state
  }
}
