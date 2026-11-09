import type { ChangeSource } from '@canvas/types/editor'
import type { SelectionType, ShapeEntity } from '@canvas/types/Shapes'
import { isEqual } from '@canvas/utils/object'

// --- Types ---

/** A step of the user, from the shapes before it to the shapes after it */
type HistoryEntry = {
  /**
   * The shapes the step starts from: the ones of the previous step, with the changes received since (see applyChanges),
   * which are not part of the step
   */
  before: ShapeEntity[]
  shapes: ShapeEntity[]
  selectedShape: SelectionType | undefined
  source: ChangeSource
}

/** The trees of shapes of the document, see ShapesState */
export type DocumentTrees = Pick<ShapesState, 'shapes' | 'base' | 'saved'>

export type ShapesState = {
  shapes: ShapeEntity[]
  selectedShape: SelectionType | undefined
  /** The steps of the user: the changes received from other instances are not steps, an undo keeps them */
  history: { states: HistoryEntry[]; cursor: number }
  /**
   * The shapes the next step starts from: the shapes saved, with the changes received since, saved or not. A step holds only
   * the changes of the user, also when it is saved during a gesture of another instance. Mostly the same object as shapes
   */
  base: ShapeEntity[]
  /**
   * The shapes saved, given by dataChanged: after a step, an undo or a redo, with the changes received and saved since.
   * The changes of a gesture received are left out: they are saved by the other instance
   */
  saved: ShapeEntity[]
  /** Origin of the last change of the saved shapes */
  savedSource: ChangeSource
  /** Origin of the last change of the shapes, saved or not: an undo or a redo is a change of the user */
  source: ChangeSource
}

export type ShapesAction =
  /**
   * Sets the shapes of the drawing, built by the store, and the selection which follows them. With save, the change is a
   * step of the history. The saved shapes with the step are given when they are not the base (see ShapesState)
   */
  | {
      type: 'SET_SHAPES'
      shapes: ShapeEntity[]
      newSelectedShape: SelectionType | undefined
      save: boolean
      source?: ChangeSource | undefined
      saved?: ShapeEntity[] | undefined
    }
  | { type: 'SET_SELECTION'; newSelectedShape: SelectionType | undefined }
  | { type: 'SAVE'; source?: ChangeSource | undefined; saved?: ShapeEntity[] | undefined }
  /** Goes to a step of the history, with the trees where the steps between are undone or redone, built by the store */
  | { type: 'GO_TO_STEP'; cursor: number; trees: DocumentTrees; selectedShape: SelectionType | undefined }
  /** Changes received from another instance, applied to the trees by the store: they are not a step */
  | { type: 'RECEIVE'; trees: DocumentTrees; newSelectedShape: SelectionType | undefined; source: ChangeSource }
  | { type: 'CLEAR'; shapes: ShapeEntity[]; clearHistory: boolean; source: ChangeSource }
  /** Merges the steps added after the cursor `from` into a single one, the last */
  | { type: 'SQUASH_HISTORY'; from: number }

export const INITIAL_SHAPES_STATE: ShapesState = {
  shapes: [],
  selectedShape: undefined,
  history: { states: [{ before: [], shapes: [], selectedShape: undefined, source: 'remote' }], cursor: 0 },
  base: [],
  saved: [],
  savedSource: 'remote',
  source: 'remote'
}

// --- Helper ---

/** Saves the shapes as a step of the user, from the base. Nothing is saved when the user changed nothing */
const withStep = (state: ShapesState, source: ChangeSource = 'user', saved = state.shapes): ShapesState => {
  const { history, base, shapes, selectedShape } = state
  if (isEqual(base, shapes)) return state
  return {
    ...state,
    history: {
      states: [...history.states.slice(0, history.cursor + 1), { before: base, shapes, selectedShape, source }],
      cursor: history.cursor + 1
    },
    base: shapes,
    saved,
    savedSource: source
  }
}

// --- Reducer ---

export const shapesReducer = (state: ShapesState, action: ShapesAction): ShapesState => {
  switch (action.type) {
    case 'SET_SHAPES': {
      const { shapes, newSelectedShape, save, source, saved } = action
      // the source is the one of the last change of the shapes: a change of the selection alone keeps it
      const next =
        shapes === state.shapes && newSelectedShape === state.selectedShape
          ? state
          : { ...state, shapes, selectedShape: newSelectedShape, source: shapes === state.shapes ? state.source : (source ?? 'user') }
      return save ? withStep(next, source, saved) : next
    }

    case 'SET_SELECTION':
      return { ...state, selectedShape: action.newSelectedShape }

    case 'SAVE':
      return withStep(state, action.source, action.saved)

    case 'GO_TO_STEP': {
      const { cursor, trees, selectedShape } = action
      if (cursor === state.history.cursor) return state
      return { ...state, ...trees, selectedShape, history: { ...state.history, cursor }, savedSource: 'user', source: 'user' }
    }

    case 'RECEIVE': {
      const { trees, newSelectedShape, source } = action
      if (trees.shapes === state.shapes && trees.base === state.base && trees.saved === state.saved && newSelectedShape === state.selectedShape) {
        return state
      }
      return {
        ...state,
        ...trees,
        selectedShape: newSelectedShape,
        savedSource: trees.saved === state.saved ? state.savedSource : source,
        source: trees.shapes === state.shapes ? state.source : source
      }
    }

    case 'CLEAR':
      return action.clearHistory
        ? {
            shapes: action.shapes,
            selectedShape: undefined,
            history: { states: [{ before: action.shapes, shapes: action.shapes, selectedShape: undefined, source: action.source }], cursor: 0 },
            base: action.shapes,
            saved: action.shapes,
            savedSource: action.source,
            source: action.source
          }
        : withStep({ ...state, shapes: action.shapes, selectedShape: undefined, source: action.source }, action.source)

    case 'SQUASH_HISTORY': {
      const { states, cursor } = state.history
      if (cursor <= action.from + 1) return state
      const merged = { ...states[cursor]!, before: states[action.from + 1]!.before }
      return { ...state, history: { states: [...states.slice(0, action.from + 1), merged], cursor: action.from + 1 } }
    }

    default:
      return state
  }
}
