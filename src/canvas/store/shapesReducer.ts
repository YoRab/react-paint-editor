import type { SelectionType, ShapeEntity } from '@canvas/types/Shapes'
import { isEqual, omit } from '@canvas/utils/object'

// --- Types ---

type HistoryEntry = {
  shapes: ShapeEntity[]
  selectedShape: SelectionType | undefined
  source: 'user' | 'remote'
}

export type ShapesState = {
  shapes: ShapeEntity[]
  selectedShape: SelectionType | undefined
  history: { states: HistoryEntry[]; cursor: number }
}

export type ShapesAction =
  | { type: 'ADD'; newShapes: ShapeEntity[] }
  | { type: 'UPDATE'; updatedShapes: ShapeEntity[]; newSelectedShape: SelectionType | undefined; save: boolean }
  | { type: 'REMOVE'; ids: Set<string>; newSelectedShape: SelectionType | undefined }
  | { type: 'DUPLICATE'; newShapesMap: Map<string, ShapeEntity>; newSelectedShape: SelectionType | undefined }
  | { type: 'RESET_AND_SAVE'; shapes: ShapeEntity[]; newSelectedShape: SelectionType | undefined }
  | { type: 'SET_SELECTION'; newSelectedShape: SelectionType | undefined }
  | { type: 'SAVE' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR'; shapes: ShapeEntity[]; clearHistory: boolean; source: 'user' | 'remote' }
  | { type: 'REFRESH_ALL'; shapes: ShapeEntity[]; newSelectedShape: SelectionType | undefined }

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
  source: 'user' | 'remote'
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
    case 'ADD':
      return { ...state, shapes: [...action.newShapes, ...state.shapes] }

    case 'UPDATE': {
      const byId = new Map(action.updatedShapes.map(s => [s.id, s]))
      const newShapes = state.shapes.map(s => byId.get(s.id) ?? s)
      const next = { ...state, shapes: newShapes, selectedShape: action.newSelectedShape }
      return action.save ? { ...next, history: addHistoryEntry(next.history, newShapes, action.newSelectedShape, 'user') } : next
    }

    case 'REMOVE': {
      const newShapes = state.shapes.filter(s => !action.ids.has(s.id))
      return {
        ...state,
        shapes: newShapes,
        selectedShape: action.newSelectedShape,
        history: addHistoryEntry(state.history, newShapes, action.newSelectedShape, 'user')
      }
    }

    case 'DUPLICATE': {
      const newShapes = state.shapes.flatMap(s => {
        const dup = action.newShapesMap.get(s.id)
        return dup ? [dup, s] : [s]
      })
      return { ...state, shapes: newShapes, selectedShape: action.newSelectedShape ?? state.selectedShape }
    }

    case 'RESET_AND_SAVE': {
      const pureShapes = action.shapes.map(s => omit(['chosen'], s))
      return {
        ...state,
        shapes: pureShapes,
        selectedShape: action.newSelectedShape,
        history: addHistoryEntry(state.history, pureShapes, action.newSelectedShape, 'user')
      }
    }

    case 'SET_SELECTION':
      return { ...state, selectedShape: action.newSelectedShape }

    case 'SAVE':
      return { ...state, history: addHistoryEntry(state.history, state.shapes, state.selectedShape, 'user') }

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

    case 'REFRESH_ALL':
      return { ...state, shapes: action.shapes, selectedShape: action.newSelectedShape }

    default:
      return state
  }
}
