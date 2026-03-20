import { DRAWCANVAS_CLASSNAME, SELECTIONCANVAS_CLASSNAME, type UtilsSettings } from '@canvas/constants/app'
import { PICTURE_DEFAULT_SIZE } from '@canvas/constants/picture'
import { buildDataToExport } from '@canvas/utils/data'
import { checkPositionIntersection, checkSelectionFrameCollision, checkSelectionIntersection } from '@canvas/utils/intersect'
import { addToSelectedShapes, buildShapesGroup, getSelectedShapes } from '@canvas/utils/selection'
import { copyShapes, flipShapes, refreshShape, rotateShape } from '@canvas/utils/shapes/index'
import { createPicture } from '@canvas/utils/shapes/picture'
import { isPointInsideRect } from '@canvas/utils/trigo'
import type { Point, SelectionType, ShapeEntity, StateData } from '@common/types/Shapes'
import { moveItemPosition } from '@common/utils/array'
import { isEqual, omit, set } from '@common/utils/object'
import { uniqueId } from '@common/utils/util'
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'

// --- Types ---

type HistoryEntry = {
  shapes: ShapeEntity[]
  selectedShape: SelectionType | undefined
  source: 'user' | 'remote'
}

type ShapesState = {
  shapes: ShapeEntity[]
  selectedShape: SelectionType | undefined
  history: { states: HistoryEntry[]; cursor: number }
}

type ShapesAction =
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

const shapesReducer = (state: ShapesState, action: ShapesAction): ShapesState => {
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

const useShapes = (
  settings: UtilsSettings,
  width: number,
  height: number,
  isShiftPressed: boolean
): {
  registerEvent: (event: 'dataChanged', fn: (data: StateData, source: 'user' | 'remote') => void) => void
  unregisterEvent: (event: 'dataChanged', fn?: (data: StateData, source: 'user' | 'remote') => void) => void
  shapes: ShapeEntity[]
  shapesRef: React.RefObject<ShapeEntity[]>
  selectedShape: SelectionType | undefined
  hoveredShape: ShapeEntity | undefined
  selectionFrame: { oldSelection: SelectionType | undefined; frame: [Point, Point] } | undefined
  setSelectionFrame: React.Dispatch<React.SetStateAction<{ oldSelection: SelectionType | undefined; frame: [Point, Point] } | undefined>>
  refreshSelectedShapes: (ctx: CanvasRenderingContext2D, cursorPosition: Point) => void
  addShapes: (newShapes: ShapeEntity[]) => void
  duplicateShapes: (shapesToDuplicate: ShapeEntity[], translate?: boolean, selectNewOnes?: boolean) => void
  addPictureShape: (fileOrUrl: File | string, maxWidth?: number, maxHeight?: number) => Promise<ShapeEntity>
  swapShapes: (startPositionShapeId: string, endPositionShapeId: string) => void
  moveShapes: (shapes: ShapeEntity[], action: 'first' | 'last' | 'forward' | 'backward') => void
  saveShapes: () => void
  setSelectedShape: React.Dispatch<React.SetStateAction<SelectionType | undefined>>
  refreshHoveredShape: (e: MouseEvent | TouchEvent, ctx: CanvasRenderingContext2D, cursorPosition: Point, isInsideMask: boolean) => void
  toggleShapeVisibility: (shapes: ShapeEntity[]) => void
  toggleShapeLock: (shapeGroup: ShapeEntity[]) => void
  removeShape: (shapes: ShapeEntity[]) => void
  updateShape: (updatedShapes: ShapeEntity[], withSave?: boolean) => void
  transformShape: (
    ctx: CanvasRenderingContext2D,
    shapes: ShapeEntity[],
    center: Point,
    action: 'flipHorizontally' | 'flipVertically' | 'rotateClockwise' | 'rotateCounterclockwise'
  ) => void
  backwardShape: () => void
  forwardShape: () => void
  clearShapes: (shapesToInit: ShapeEntity[], options: { clearHistory: boolean; source: 'user' | 'remote' }) => void
  canGoBackward: boolean
  canGoForward: boolean
  canClear: boolean
  copiedShape: SelectionType | undefined
  setCopiedShape: React.Dispatch<React.SetStateAction<SelectionType | undefined>>
} => {
  const [shapesState, dispatch] = useReducer(shapesReducer, {
    shapes: [],
    selectedShape: undefined,
    history: { states: [{ shapes: [], selectedShape: undefined, source: 'remote' }], cursor: 0 }
  })

  // Read-only mirror refs for synchronous access in callbacks
  const shapesRef = useRef<ShapeEntity[]>([])
  const selectedShapeRef = useRef<SelectionType | undefined>(undefined)
  const listeners = useRef<{
    dataChanged: ((data: StateData, source: 'user' | 'remote') => void)[]
  }>({ dataChanged: [] })

  useLayoutEffect(() => {
    shapesRef.current = shapesState.shapes
    selectedShapeRef.current = shapesState.selectedShape
  }, [shapesState.shapes, shapesState.selectedShape])

  const [selectionFrame, setSelectionFrame] = useState<{ oldSelection: SelectionType | undefined; frame: [Point, Point] } | undefined>(undefined)
  const [hoveredShape, setHoveredShape] = useState<ShapeEntity | undefined>(undefined)
  const [copiedShape, setCopiedShape] = useState<SelectionType | undefined>(undefined)

  const setSelectedShape = useCallback(
    (newVal: SelectionType | undefined | ((prev: SelectionType | undefined) => SelectionType | undefined)) => {
      const resolved = typeof newVal === 'function' ? newVal(selectedShapeRef.current) : newVal
      dispatch({ type: 'SET_SELECTION', newSelectedShape: resolved })
    },
    []
  )

  const canGoBackward = shapesState.history.cursor > 0
  const canGoForward = shapesState.history.cursor < shapesState.history.states.length - 1
  const canClear = shapesState.shapes.length > 0

  const saveShapes = useCallback(() => {
    dispatch({ type: 'SAVE' })
  }, [])

  const addShapes = useCallback((newShapes: ShapeEntity[]) => {
    dispatch({ type: 'ADD', newShapes })
  }, [])

  const duplicateShapes = useCallback(
    (shapesToDuplicate: ShapeEntity[], translate = false, selectNewOnes = false) => {
      const newShapesMap = new Map<string, ShapeEntity>()
      const newShapesList: ShapeEntity[] = []
      for (const marker of shapesRef.current) {
        const originalShape = shapesToDuplicate.find(shape => shape.id === marker.id)
        if (originalShape) {
          const newShape = translate
            ? copyShapes(buildShapesGroup([originalShape], settings)!, settings)[0]!
            : { ...originalShape, id: uniqueId(`${marker.type}_`) }
          newShapesMap.set(marker.id, newShape)
          newShapesList.push(newShape)
        }
      }
      const newSelectedShape = selectNewOnes ? buildShapesGroup(newShapesList, settings) : selectedShapeRef.current
      dispatch({ type: 'DUPLICATE', newShapesMap, newSelectedShape })
    },
    [settings]
  )

  const refreshHoveredShape = useCallback(
    (e: MouseEvent | TouchEvent, ctx: CanvasRenderingContext2D, cursorPosition: Point, isInsideMask: boolean) => {
      if (
        (e.target && 'className' in e.target && ![DRAWCANVAS_CLASSNAME, SELECTIONCANVAS_CLASSNAME].includes(e.target.className as string)) ||
        !isInsideMask
      ) {
        setHoveredShape(undefined)
        return
      }

      const candidates = shapesRef.current.filter(shape => !shape.locked && isPointInsideRect(shape.computed.boundingBox, cursorPosition))
      const foundShape = candidates.find(shape =>
        getSelectedShapes(shapesState.selectedShape)
          ?.map(s => s.id)
          .includes(shape.id)
          ? !!checkSelectionIntersection(ctx, shape, cursorPosition, settings)
          : !!checkPositionIntersection(ctx, shape, cursorPosition, settings)
      )
      setHoveredShape(foundShape)
    },
    [settings, shapesState.selectedShape]
  )

  const addPictureShape = useCallback(
    async (fileOrUrl: File | string, maxWidth = PICTURE_DEFAULT_SIZE, maxHeight = PICTURE_DEFAULT_SIZE) => {
      const pictureShape = await createPicture(fileOrUrl, maxWidth, maxHeight, settings)
      dispatch({ type: 'ADD', newShapes: [pictureShape] })
      dispatch({ type: 'SAVE' })
      return pictureShape
    },
    [settings]
  )

  const updateShapes = useCallback(
    (updatedShapes: ShapeEntity[], withSave = false) => {
      const updatedById = new Map(updatedShapes.map(shape => [shape.id, shape]))
      const prev = selectedShapeRef.current
      const newSelectedShape = prev
        ? buildShapesGroup(
            getSelectedShapes(prev).map(shape => updatedById.get(shape.id) ?? shape),
            settings
          )
        : prev
      dispatch({ type: 'UPDATE', updatedShapes, newSelectedShape, save: withSave })
    },
    [settings]
  )

  // newSelectedShape defaults to current selection when not provided (preserves it for swapShapes/moveShapes)
  const resetShapes = useCallback(
    (newShapes: ShapeEntity[], newSelectedShape: SelectionType | undefined = selectedShapeRef.current) => {
      dispatch({ type: 'RESET_AND_SAVE', shapes: newShapes, newSelectedShape })
    },
    []
  )

  const removeShape = useCallback(
    (shapes: ShapeEntity[]) => {
      const ids = new Set(shapes.map(item => item.id))
      const prev = selectedShapeRef.current
      const prevIds = getSelectedShapes(prev).map(item => item.id)
      const newSelectedShape = prevIds.find(value => ids.has(value)) ? undefined : prev
      dispatch({ type: 'REMOVE', ids, newSelectedShape })
    },
    []
  )

  const backwardShape = useCallback(() => {
    dispatch({ type: 'UNDO' })
  }, [])

  const forwardShape = useCallback(() => {
    dispatch({ type: 'REDO' })
  }, [])

  const clearShapes = useCallback(
    (shapesToInit: ShapeEntity[], options: { clearHistory: boolean; source: 'user' | 'remote' }) => {
      dispatch({ type: 'CLEAR', shapes: shapesToInit, clearHistory: options.clearHistory, source: options.source })
    },
    []
  )

  const swapShapes = useCallback(
    (startPositionShapeId: string, endPositionShapeId: string) => {
      const shapes = shapesRef.current
      const startPositionShapeIndex = shapes.findIndex(shape => shape.id === startPositionShapeId)
      const endPositionShapeIndex = shapes.findIndex(shape => shape.id === endPositionShapeId)
      resetShapes(moveItemPosition(shapes, startPositionShapeIndex, endPositionShapeIndex))
    },
    [resetShapes]
  )

  const moveShapes = useCallback(
    (selectedShapes: ShapeEntity[], action: 'first' | 'last' | 'forward' | 'backward') => {
      const shapes = [...shapesRef.current]
      const selectedIds = new Set(selectedShapes.map(s => s.id))
      const selectedIndices = shapes.map((s, i) => (selectedIds.has(s.id) ? i : -1)).filter(i => i >= 0)

      if (selectedIndices.length === 0) return

      switch (action) {
        case 'first':
        case 'last': {
          const selected = selectedIndices.map(i => shapes[i]!).filter(Boolean)
          const rest = shapes.filter((_, i) => !selectedIndices.includes(i))
          resetShapes(action === 'first' ? [...selected, ...rest] : [...rest, ...selected])
          break
        }

        case 'backward': {
          let newShapes = [...shapes]
          const idsByOriginalIndex = selectedIndices.sort((a, b) => b - a).map(i => shapes[i]!.id)
          for (const id of idsByOriginalIndex) {
            const from = newShapes.findIndex(s => s.id === id)
            if (from < newShapes.length - 1) {
              const to = from + 1
              if (!selectedIds.has(newShapes[to]!.id)) {
                newShapes = moveItemPosition(newShapes, from, to)
              }
            }
          }
          resetShapes(newShapes)
          break
        }
        case 'forward': {
          let newShapes = [...shapes]
          const idsByOriginalIndex = selectedIndices.sort((a, b) => a - b).map(i => shapes[i]!.id)
          for (const id of idsByOriginalIndex) {
            const from = newShapes.findIndex(s => s.id === id)
            if (from > 0) {
              const to = from - 1
              if (!selectedIds.has(newShapes[to]!.id)) {
                newShapes = moveItemPosition(newShapes, from, to)
              }
            }
          }
          resetShapes(newShapes)
          break
        }
      }
    },
    [resetShapes]
  )

  const transformShape = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      selectedShapes: ShapeEntity[],
      center: Point,
      action: 'flipHorizontally' | 'flipVertically' | 'rotateClockwise' | 'rotateCounterclockwise'
    ) => {
      const shapeIds = new Set(selectedShapes.map(item => item.id))

      const newShapes: ShapeEntity[] =
        action === 'rotateClockwise' || action === 'rotateCounterclockwise'
          ? shapesRef.current.map(shape => {
              if (shapeIds.has(shape.id)) {
                return refreshShape(rotateShape(shape, action === 'rotateClockwise' ? Math.PI / 2 : -Math.PI / 2, center), settings)
              }
              return shape
            })
          : flipShapes(ctx, shapesRef.current, selectedShapes, center, action, settings)

      const newSelectedShape = buildShapesGroup(
        newShapes.filter(shape => shapeIds.has(shape.id)),
        settings
      )
      resetShapes(newShapes, newSelectedShape)
    },
    [settings, resetShapes]
  )

  const toggleShapeVisibility = useCallback(
    (shapes: ShapeEntity[]) => {
      const shapeIds = new Set(shapes.map(item => item.id))
      const newShapes = shapesRef.current.map(shape => {
        if (shapeIds.has(shape.id)) {
          return set('visible', shape.visible === false, shape)
        }
        return shape
      })

      const newSelectedShape = buildShapesGroup(
        newShapes.filter(shape =>
          getSelectedShapes(selectedShapeRef.current)
            ?.map(oldShape => oldShape.id)
            .includes(shape.id)
        ),
        settings
      )

      resetShapes(newShapes, newSelectedShape)
    },
    [resetShapes, settings]
  )

  const toggleShapeLock = useCallback(
    (shapeGroup: ShapeEntity[]) => {
      const shapeIds = new Set(shapeGroup.map(item => item.id))
      const newShapes = shapesRef.current.map(shape => {
        if (shapeIds.has(shape.id)) {
          return set('locked', !shape.locked, shape)
        }
        return shape
      })

      const newSelectedShape = buildShapesGroup(
        newShapes.filter(shape =>
          getSelectedShapes(selectedShapeRef.current)
            ?.map(oldShape => oldShape.id)
            .includes(shape.id)
        ),
        settings
      )

      resetShapes(newShapes, newSelectedShape)
    },
    [resetShapes, settings]
  )

  const registerEvent = useCallback((event: 'dataChanged', fn: (data: StateData, source: 'user' | 'remote') => void) => {
    // biome-ignore lint/suspicious/noPrototypeBuiltins: be compliant with es2020
    if (!listeners.current.hasOwnProperty(event)) return
    listeners.current[event] = [...listeners.current[event], fn]
  }, [])

  const unregisterEvent = useCallback((event: 'dataChanged', fn?: (data: StateData, source: 'user' | 'remote') => void) => {
    // biome-ignore lint/suspicious/noPrototypeBuiltins: be compliant with es2020
    if (!listeners.current.hasOwnProperty(event)) return
    if (fn) {
      const currentFnIndex = listeners.current[event].indexOf(fn)
      listeners.current[event] = [...listeners.current[event].slice(0, currentFnIndex), ...listeners.current[event].slice(currentFnIndex + 1)]
    } else {
      listeners.current[event] = []
    }
  }, [])

  useEffect(() => {
    const entry = shapesState.history.states[shapesState.history.cursor]!
    const shapes = buildDataToExport(entry.shapes, width, height)
    for (const listener of listeners.current.dataChanged) {
      listener(shapes, entry.source)
    }
  }, [width, height, shapesState.history])

  useEffect(() => {
    const newShapes = shapesRef.current.map(shape => refreshShape(shape, settings))
    const prev = selectedShapeRef.current
    const newSelectedShape =
      prev === undefined
        ? undefined
        : buildShapesGroup(
            getSelectedShapes(prev).map(shape => refreshShape(shape, settings)),
            settings
          )
    dispatch({ type: 'REFRESH_ALL', shapes: newShapes, newSelectedShape })
  }, [settings])

  const refreshSelectedShapes = useCallback(
    (ctx: CanvasRenderingContext2D, cursorPosition: Point) => {
      setSelectionFrame(prev => {
        const newSelectionFrame: [Point, Point] = [prev?.frame[0] ?? [cursorPosition[0], cursorPosition[1]], [cursorPosition[0], cursorPosition[1]]]

        const foundShapes = shapesRef.current.filter(shape => {
          if (shape.locked) return false
          return checkSelectionFrameCollision(ctx, shape, newSelectionFrame)
        })

        const shapesGroup = buildShapesGroup(foundShapes, settings)
        setSelectedShape(isShiftPressed ? buildShapesGroup(addToSelectedShapes(prev?.oldSelection, foundShapes), settings) : shapesGroup)
        return { oldSelection: prev?.oldSelection, frame: newSelectionFrame }
      })
    },
    [settings, isShiftPressed, setSelectedShape]
  )

  return {
    registerEvent,
    unregisterEvent,
    shapes: shapesState.shapes,
    shapesRef,
    selectedShape: shapesState.selectedShape,
    hoveredShape,
    selectionFrame,
    setSelectionFrame,
    copiedShape,
    setCopiedShape,
    refreshSelectedShapes,
    addShapes,
    duplicateShapes,
    addPictureShape,
    moveShapes,
    swapShapes,
    saveShapes,
    setSelectedShape,
    refreshHoveredShape,
    toggleShapeVisibility,
    toggleShapeLock,
    removeShape,
    updateShape: updateShapes,
    transformShape,
    backwardShape,
    forwardShape,
    clearShapes,
    canGoBackward,
    canGoForward,
    canClear
  }
}

export default useShapes
