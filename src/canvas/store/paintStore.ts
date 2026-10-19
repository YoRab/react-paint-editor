import { DEFAULT_OPTIONS, type OptionalOptions, type UtilsSettings } from '@canvas/constants/app'
import { SELECTION_TOOL } from '@canvas/constants/tools'
import { createStore } from '@canvas/store/createStore'
import { createEventEmitter } from '@canvas/store/eventEmitter'
import { createSelectors, findSelectableTool, memoizeLast } from '@canvas/store/selectors'
import { INITIAL_SHAPES_STATE, type ShapesAction, shapesReducer } from '@canvas/store/shapesReducer'
import type {
  CanvasTransformation,
  Focus,
  InternalState,
  Modifiers,
  PaintConfig,
  PanStart,
  SelectionFrameState,
  UseReactPaintProps
} from '@canvas/store/types'
import type { CanvasSize } from '@canvas/types/Canvas'
import type {
  ChangeSource,
  EditorActions,
  ExportImageOptions,
  ShapesActionOptions,
  ShapesBounds,
  ShapesOrderAction,
  ZoomAction
} from '@canvas/types/editor'
import type { HoverModeData, SelectionModeContextMenu, SelectionModeData } from '@canvas/types/Mode'
import type { Point, SelectionType, ShapeEntity, ShapeInput, ShapePatch, StateData, StyleShape } from '@canvas/types/Shapes'
import type { ToolsType } from '@canvas/types/tools'
import { compact, insertAt, moveItemPosition } from '@canvas/utils/array'
import { createApproximateTextContext, createDetachedContext } from '@canvas/utils/canvas'
import { buildDataToExport, getDataChanges } from '@canvas/utils/data'
import { shallowEqual } from '@canvas/utils/equality'
import { decodeJson, downloadFile, encodeShapesInString, getCanvasImage } from '@canvas/utils/file'
import {
  checkPositionIntersection,
  checkSelectionFrameCollision,
  checkSelectionIntersection,
  findShapeAt,
  findShapesAt,
  getCursorPositionInTransformedCanvas
} from '@canvas/utils/intersect'
import { isEqual, isRecord, mergeWith, omitUndefined, replaceArrays, set, withDefaults } from '@canvas/utils/object'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { addToSelectedShapes, buildShapesGroup, omitFromSelectedShapes } from '@canvas/utils/selection'
import { assertValidShapes, buildShapeEntity, decodeImportedData, loadPicture } from '@canvas/utils/shapeInput'
import { applyShapePatch, assertValidPatches } from '@canvas/utils/shapePatch'
import {
  canRemoveShapePoint,
  cloneShape,
  copyShapes,
  flipShapes,
  getSelectionBounds,
  refreshShape,
  resizeShapesToBounds,
  rotateShape,
  translateShape,
  updateShapeStyle
} from '@canvas/utils/shapes'
import { removeCurvePoint } from '@canvas/utils/shapes/curve'
import { createPicture } from '@canvas/utils/shapes/picture'
import { removePolygonPoint } from '@canvas/utils/shapes/polygon'
import { buildAvailableTools, findShapeTool } from '@canvas/utils/tools'
import { getBoundingRect, isPointInsideRect } from '@canvas/utils/trigo'
import { clamp } from '@canvas/utils/util'
import {
  calculateNewZoomAndOffset,
  clampZoom,
  getNewOffset,
  getNewZoomAndOffset,
  getNewZoomAndOffsetFromDelta,
  getZoomAndOffsetToFit
} from '@canvas/utils/zoom'

type ResetOptions = { clearHistory: boolean; source: ChangeSource }

type InsertOptions = ShapesActionOptions & { index?: number; select?: boolean }

type Interaction = InternalState['interaction']

type Listeners = { [K in keyof HTMLElementEventMap]?: (e: HTMLElementEventMap[K]) => void }

const DEFAULT_TRANSFORMATION: CanvasTransformation = { offset: [0, 0], zoom: 1 }

/** Config of the props of the hook, with the options overridden by setOptions. Arrays of options, like the tools, are replaced */
const resolveConfig = (
  { width = 1000, height = 600, mode = 'editor', disabled = false, options }: UseReactPaintProps,
  overrides: OptionalOptions
) => {
  const mergedOptions = mergeWith(replaceArrays, options ?? {}, overrides) as OptionalOptions
  const { clearCallback, ...resolvedOptions } = withDefaults(DEFAULT_OPTIONS, mergedOptions)
  const config: PaintConfig = { width, height, mode, disabled, options: resolvedOptions }
  return { config, clearCallback }
}

const createInitialState = (config: PaintConfig): InternalState => ({
  config,
  document: INITIAL_SHAPES_STATE,
  clipboard: undefined,
  tools: { available: buildAvailableTools(config.options.availableTools), activeToolId: SELECTION_TOOL.id },
  view: {
    canvasSize: { realWidth: config.width, realHeight: config.height, width: config.width, height: config.height, scaleRatio: 1 },
    transformation: DEFAULT_TRANSFORMATION,
    gridGap: config.options.grid
  },
  interaction: {
    selectionMode: { mode: 'default' },
    hoveredShape: undefined,
    hoverMode: { mode: 'default' },
    selectionFrame: undefined,
    modifiers: { shift: false, alt: false, space: false },
    panStart: undefined,
    moveAcceleration: [0, 0],
    focus: { component: false, canvas: false }
  }
})

const isSamePoint = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1]

const isSameTransformation = (a: CanvasTransformation, b: CanvasTransformation) => a.zoom === b.zoom && isSamePoint(a.offset, b.offset)

/**
 * Whether a setting read by refreshShape has changed: the padding of the selection, the algorithm of the brushes,
 * and the scale (canvas size and zoom) which gives the size of the selection anchors. Moving the view does not need it.
 */
const hasShapeSettingsChanged = (a: InternalState, b: InternalState) =>
  a.config.options.canvasSelectionPadding !== b.config.options.canvasSelectionPadding ||
  a.config.options.brushAlgo !== b.config.options.brushAlgo ||
  a.view.canvasSize.scaleRatio * a.view.transformation.zoom !== b.view.canvasSize.scaleRatio * b.view.transformation.zoom

const isSameHoverMode = (a: HoverModeData, b: HoverModeData) => {
  if (a.mode !== b.mode || a.outOfView !== b.outOfView) return false
  if (a.mode !== 'resize' || b.mode !== 'resize') return true
  return typeof a.anchor === 'number' || typeof b.anchor === 'number' ? a.anchor === b.anchor : isSamePoint(a.anchor, b.anchor)
}

/** Keeps the previous object when the values of the patch are unchanged */
const patchObject = <T extends object>(previous: T, patch: Partial<T>): T =>
  (Object.keys(patch) as (keyof T)[]).every(key => Object.is(patch[key], previous[key])) ? previous : { ...previous, ...patch }

const withInteraction = (state: InternalState, patch: Partial<Interaction>): InternalState => {
  const interaction = patchObject(state.interaction, patch)
  return interaction === state.interaction ? state : { ...state, interaction }
}

/** Sets default values of the settings of a tool. The fields the tool has not, and unchanged values, are ignored */
const setToolDefaults = (state: InternalState, toolId: string, style: Record<string, unknown>): InternalState => {
  let hasChanged = false
  const available = state.tools.available.map(tool => {
    if (tool.id !== toolId) return tool
    return Object.entries(style).reduce((newTool, [field, value]) => {
      const setting = (newTool.settings as Record<string, { default?: unknown } | undefined>)[field]
      if (!setting || value === undefined || Object.is(setting.default, value)) return newTool
      hasChanged = true
      return set(['settings', field, 'default'], value, newTool)
    }, tool)
  })
  return hasChanged ? { ...state, tools: { ...state.tools, available } } : state
}

/** Name of an exported file, with the extension of its format */
const getPictureFileName = (format: ExportImageOptions['format'] = 'png') => `drawing.${format === 'jpeg' ? 'jpg' : format}`

/** Turns shapes around a point, the center of their group by default */
const rotateShapesAround = (shapes: ShapeEntity[], angle: number, center: Point | undefined, settings: UtilsSettings): ShapeEntity[] => {
  const rotationCenter = center ?? buildShapesGroup(shapes, settings)?.computed.center
  return rotationCenter ? shapes.map(shape => refreshShape(rotateShape(shape, angle, rotationCenter), settings)) : []
}

// index of the shapes by id: the selected version of a shape, the one being changed, takes precedence
const indexShapes = (shapes: ShapeEntity[], selectedShape: SelectionType | undefined) =>
  new Map([...shapes, ...getSelectedShapes(selectedShape)].map(shape => [shape.id, shape] as const))

/**
 * Store of a react-paint instance: state of the canvas, of the selection and of the history,
 * and the engine that updates it. It knows nothing about React.
 */
export const createPaintStore = (props: UseReactPaintProps = {}) => {
  // The props and the overrides of setOptions, read when the config is resolved again
  const latest: { props: UseReactPaintProps; overrides: OptionalOptions } = { props, overrides: {} }

  const store = createStore(createInitialState(resolveConfig(props, latest.overrides).config))
  const selectors = createSelectors()
  const { registerEvent, unregisterEvent, emit, hasListeners } = createEventEmitter()
  const { getState: get, batch } = store

  let canvasElement: HTMLCanvasElement | null = null
  let canvasRootElement: HTMLElement | null = null
  let scopeElement: HTMLElement | null = null
  // the element whose focus is tracked: the scope set by the consumer, or else the root of the Canvas
  let focusScope: HTMLElement | null = null
  let initialized = false

  const getSettings = (state = get()): UtilsSettings => selectors.selectSettings(state)

  // --- Contexts ---

  let detachedContext: CanvasRenderingContext2D | null | undefined
  let approximateTextContext: CanvasRenderingContext2D | undefined

  /** A 2D context to measure the texts and to find the shapes under a point, even when the Canvas is not mounted */
  const getContext = (): CanvasRenderingContext2D | null => {
    const canvasContext = canvasElement?.getContext('2d')
    if (canvasContext) return canvasContext
    if (detachedContext === undefined) detachedContext = createDetachedContext()
    return detachedContext
  }

  /** A context able to measure texts: approximate outside of a browser */
  const getMeasureContext = (): CanvasRenderingContext2D => {
    const context = getContext()
    if (context) return context
    approximateTextContext ??= createApproximateTextContext()
    return approximateTextContext
  }

  // --- Updates ---

  const refreshAllShapes = (state: InternalState, settings: UtilsSettings): InternalState => {
    const shapes = state.document.shapes.map(shape => refreshShape(shape, settings))
    const previousSelection = state.document.selectedShape
    const newSelectedShape =
      previousSelection === undefined
        ? undefined
        : buildShapesGroup(
            getSelectedShapes(previousSelection).map(shape => refreshShape(shape, settings)),
            settings
          )
    return { ...state, document: shapesReducer(state.document, { type: 'REFRESH_ALL', shapes, newSelectedShape }) }
  }

  /** Rules keeping the state consistent, applied after each update */
  const reconcile = (previous: InternalState, next: InternalState): InternalState => {
    if (next === previous) return next
    let state = next
    const previousMode = previous.interaction.selectionMode.mode
    const mode = state.interaction.selectionMode.mode

    // A polygon or a curve being drawn is done when another shape is selected
    if (previousMode === 'preview' && mode === 'preview' && previous.document.selectedShape?.id !== state.document.selectedShape?.id) {
      state = withInteraction(state, { selectionMode: { mode: 'default' } })
    }

    // The auto scroll stops with the selection frame
    if (previousMode === 'selectionFrame' && mode !== 'selectionFrame' && !isSamePoint(state.interaction.moveAcceleration, [0, 0])) {
      state = withInteraction(state, { moveAcceleration: [0, 0] })
    }

    // The interactions are off when the canvas can neither be edited nor zoomed
    if (!selectors.selectIsInteractive(state) && (state.interaction.focus.component || state.interaction.focus.canvas)) {
      state = withInteraction(state, { focus: { component: false, canvas: false } })
    }

    // The computed data of the shapes depend on some settings
    if (hasShapeSettingsChanged(previous, state)) state = refreshAllShapes(state, getSettings(state))

    return state
  }

  const update = (updater: (state: InternalState) => InternalState) => store.setState(state => reconcile(state, updater(state)))

  const dispatch = (action: ShapesAction | ((state: InternalState) => ShapesAction)) =>
    update(state => {
      const document = shapesReducer(state.document, typeof action === 'function' ? action(state) : action)
      return document === state.document ? state : { ...state, document }
    })

  const setInteractionField = <K extends keyof Interaction>(key: K, value: Interaction[K]) =>
    update(state => withInteraction(state, { [key]: value } as Partial<Interaction>))

  let inTransaction = false

  /** Runs the function with a single notification, and merges the steps it adds to the history into one */
  const transaction = <R>(fn: () => R): R => {
    // a nested transaction is part of the outer one
    if (inTransaction) return fn()
    return batch(() => {
      const from = get().document.history.cursor
      inTransaction = true
      try {
        return fn()
      } finally {
        inTransaction = false
        dispatch({ type: 'SQUASH_HISTORY', from })
      }
    })
  }

  // --- Events, emitted after each update ---

  // the changes are computed from the step of the history seen before: after an undo, it is the next one
  store.watch(
    ({ document, config }) => [document.history, config.width, config.height] as const,
    ([history, width, height], [previousHistory]) => {
      // the data are only built when they are listened: pictures are encoded
      if (!hasListeners('dataChanged')) return
      const { shapes, source } = history.states[history.cursor]!
      const data = buildDataToExport(shapes, width, height)
      emit('dataChanged', data, source, getDataChanges(previousHistory.states[previousHistory.cursor]!.shapes, shapes, data.shapes))
    },
    shallowEqual
  )

  // a group id is made of the ids of its shapes
  store.watch(
    state => state.document.selectedShape?.id,
    () => emit('selectionChanged', selectors.selectSelectedShapes(get().document.selectedShape))
  )

  store.watch(
    selectors.selectActiveTool,
    activeTool => emit('toolChanged', activeTool),
    (a, b) => a.id === b.id
  )

  // --- Config ---

  /** Applies the props and the overrides. Options are compared by value: inline options do not reset anything */
  const applyConfig = () => {
    const { config } = resolveConfig(latest.props, latest.overrides)

    update(state => {
      const current = state.config
      const optionsChanged = !isEqual(current.options, config.options)
      if (
        !optionsChanged &&
        current.width === config.width &&
        current.height === config.height &&
        current.mode === config.mode &&
        current.disabled === config.disabled
      ) {
        return state
      }
      const options = optionsChanged ? config.options : current.options
      const toolsChanged = optionsChanged && !isEqual(current.options.availableTools, options.availableTools)
      const gridChanged = options.grid !== current.options.grid
      return {
        ...state,
        config: { ...config, options },
        tools: toolsChanged ? { ...state.tools, available: buildAvailableTools(options.availableTools) } : state.tools,
        view: gridChanged ? { ...state.view, gridGap: options.grid } : state.view
      }
    })
  }

  /** Synchronizes the props of the hook. The overrides of setOptions are kept over them */
  const setConfig = (newProps: UseReactPaintProps) => {
    latest.props = newProps
    applyConfig()
  }

  // --- Document ---

  const setSelectedShape = (newSelectedShape: SelectionType | undefined) =>
    update(state => {
      if (newSelectedShape === state.document.selectedShape) return state
      return { ...state, document: shapesReducer(state.document, { type: 'SET_SELECTION', newSelectedShape }) }
    })

  const addShapes = (newShapes: ShapeEntity[], index?: number) => dispatch({ type: 'ADD', newShapes, index })

  const saveShapes = (source?: ChangeSource) => dispatch({ type: 'SAVE', source })

  const undo = () => dispatch({ type: 'UNDO' })

  const redo = () => dispatch({ type: 'REDO' })

  const clearShapes = (shapesToInit: ShapeEntity[], { clearHistory, source }: ResetOptions) =>
    dispatch({ type: 'CLEAR', shapes: shapesToInit, clearHistory, source })

  const duplicateShapes = (shapesToDuplicate: ShapeEntity[], translate = false, selectNewOnes = false) =>
    dispatch(state => {
      const settings = getSettings(state)
      const newShapesMap = new Map<string, ShapeEntity>()
      const newShapesList: ShapeEntity[] = []
      for (const marker of state.document.shapes) {
        const originalShape = shapesToDuplicate.find(shape => shape.id === marker.id)
        if (originalShape) {
          const newShape = cloneShape(translate ? translateShape(originalShape, 20, 20, settings) : originalShape)
          newShapesMap.set(marker.id, newShape)
          newShapesList.push(newShape)
        }
      }
      const newSelectedShape = selectNewOnes ? buildShapesGroup(newShapesList, settings) : state.document.selectedShape
      return { type: 'DUPLICATE', newShapesMap, newSelectedShape }
    })

  const refreshHoveredShape = (isOverCanvas: boolean, ctx: CanvasRenderingContext2D, cursorPosition: Point, isInsideMask: boolean) => {
    if (!isOverCanvas || !isInsideMask) {
      setInteractionField('hoveredShape', undefined)
      return
    }

    const state = get()
    const settings = getSettings(state)
    const selectedIds = getSelectedShapes(state.document.selectedShape).map(shape => shape.id)
    const candidates = state.document.shapes.filter(shape => !shape.locked && isPointInsideRect(shape.computed.boundingBox, cursorPosition))
    const foundShape = candidates.find(shape =>
      selectedIds.includes(shape.id)
        ? !!checkSelectionIntersection(ctx, shape, cursorPosition, settings)
        : !!checkPositionIntersection(ctx, shape, cursorPosition, settings)
    )
    setInteractionField('hoveredShape', foundShape)
  }

  /** The pointer left the canvas */
  const clearHover = () =>
    batch(() => {
      setInteractionField('hoveredShape', undefined)
      setHoverMode({ mode: 'default' })
    })

  const updateShapes = (updatedShapes: ShapeEntity[], withSave = false, source?: ChangeSource) =>
    dispatch(state => {
      const updatedById = new Map(updatedShapes.map(shape => [shape.id, shape]))
      const previousSelection = state.document.selectedShape
      const newSelectedShape = previousSelection
        ? buildShapesGroup(
            getSelectedShapes(previousSelection).map(shape => updatedById.get(shape.id) ?? shape),
            getSettings(state)
          )
        : previousSelection
      return { type: 'UPDATE', updatedShapes, newSelectedShape, save: withSave, source }
    })

  /** Updates shapes for an action of the API: a step is saved unless save is false */
  const commitShapes = (updatedShapes: ShapeEntity[], { save = true, source }: ShapesActionOptions = {}) => {
    if (updatedShapes.length) updateShapes(updatedShapes, save, source)
  }

  // newSelectedShape defaults to the current selection when not provided (preserves it for swapShapes/moveShapes)
  const resetShapes = (newShapes: ShapeEntity[], newSelectedShape: SelectionType | undefined | 'current' = 'current') =>
    dispatch(state => ({
      type: 'RESET_AND_SAVE',
      shapes: newShapes,
      newSelectedShape: newSelectedShape === 'current' ? state.document.selectedShape : newSelectedShape
    }))

  const removeShapes = (shapesToRemove: ShapeEntity[], source?: ChangeSource) =>
    dispatch(state => {
      const ids = new Set(shapesToRemove.map(item => item.id))
      const previousSelection = state.document.selectedShape
      const previousIds = getSelectedShapes(previousSelection).map(item => item.id)
      const newSelectedShape = previousIds.find(value => ids.has(value)) ? undefined : previousSelection
      return { type: 'REMOVE', ids, newSelectedShape, source }
    })

  const swapShapes = (startPositionShapeId: string, endPositionShapeId: string) => {
    const { shapes } = get().document
    const startPositionShapeIndex = shapes.findIndex(shape => shape.id === startPositionShapeId)
    const endPositionShapeIndex = shapes.findIndex(shape => shape.id === endPositionShapeId)
    resetShapes(moveItemPosition(shapes, startPositionShapeIndex, endPositionShapeIndex))
  }

  const moveShapes = (selectedShapes: ShapeEntity[], action: ShapesOrderAction) => {
    const shapes = [...get().document.shapes]
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
  }

  /** Sets the order of the shapes when it changes */
  const reorder = (newShapes: ShapeEntity[]) => {
    if (!shallowEqual(newShapes, get().document.shapes)) resetShapes(newShapes)
  }

  const toggleShapesField = (shapesToToggle: ShapeEntity[], field: 'visible' | 'locked') => {
    const settings = getSettings()
    const { shapes, selectedShape } = get().document
    const shapeIds = new Set(shapesToToggle.map(item => item.id))
    const newShapes = shapes.map(shape => {
      if (!shapeIds.has(shape.id)) return shape
      return field === 'visible' ? set('visible', shape.visible === false, shape) : set('locked', !shape.locked, shape)
    })

    const selectedIds = getSelectedShapes(selectedShape).map(oldShape => oldShape.id)
    const newSelectedShape = buildShapesGroup(
      newShapes.filter(shape => selectedIds.includes(shape.id)),
      settings
    )

    resetShapes(newShapes, newSelectedShape)
  }

  const toggleShapesVisibility = (shapesToToggle: ShapeEntity[]) => toggleShapesField(shapesToToggle, 'visible')

  const toggleShapesLock = (shapesToToggle: ShapeEntity[]) => toggleShapesField(shapesToToggle, 'locked')

  /** Selects the shapes crossed by the selection frame, which ends at the cursor */
  const refreshSelectedShapes = (ctx: CanvasRenderingContext2D, cursorPosition: Point) =>
    update(state => {
      const previousFrame = state.interaction.selectionFrame
      const frame: [Point, Point] = [previousFrame?.frame[0] ?? [cursorPosition[0], cursorPosition[1]], [cursorPosition[0], cursorPosition[1]]]

      const foundShapes = state.document.shapes.filter(shape => {
        if (shape.locked) return false
        return checkSelectionFrameCollision(ctx, shape, frame)
      })

      const settings = getSettings(state)
      const newSelectedShape = state.interaction.modifiers.shift
        ? buildShapesGroup(addToSelectedShapes(previousFrame?.oldSelection, foundShapes), settings)
        : buildShapesGroup(foundShapes, settings)
      return {
        ...withInteraction(state, { selectionFrame: { oldSelection: previousFrame?.oldSelection, frame } }),
        document: shapesReducer(state.document, { type: 'SET_SELECTION', newSelectedShape })
      }
    })

  const setSelectionFrame = (selectionFrame: SelectionFrameState | undefined) => setInteractionField('selectionFrame', selectionFrame)

  // --- Tools ---

  const setActiveTool = (tool: ToolsType) =>
    update(state => (state.tools.activeToolId === tool.id ? state : { ...state, tools: { ...state.tools, activeToolId: tool.id } }))

  const selectTool = (tool: ToolsType) =>
    batch(() => {
      setSelectedShape(undefined)
      setActiveTool(tool)
    })

  // --- Interaction ---

  const setSelectionMode = (selectionMode: SelectionModeData<Point | number>) => setInteractionField('selectionMode', selectionMode)

  const setHoverMode = (hoverMode: HoverModeData) =>
    update(state => (isSameHoverMode(hoverMode, state.interaction.hoverMode) ? state : withInteraction(state, { hoverMode })))

  const setPanStart = (panStart: PanStart | undefined) => setInteractionField('panStart', panStart)

  const setMoveAcceleration = (moveAcceleration: Point) =>
    update(state => (isSamePoint(moveAcceleration, state.interaction.moveAcceleration) ? state : withInteraction(state, { moveAcceleration })))

  const setModifiers = (patch: Partial<Modifiers>) =>
    update(state => withInteraction(state, { modifiers: patchObject(state.interaction.modifiers, patch) }))

  const setFocus = (patch: Partial<Focus>) => update(state => withInteraction(state, { focus: patchObject(state.interaction.focus, patch) }))

  // --- View ---

  const setCanvasSize = (canvasSize: CanvasSize) =>
    update(state => (isEqual(canvasSize, state.view.canvasSize) ? state : { ...state, view: { ...state.view, canvasSize } }))

  const updateTransformation = (compute: (transformation: CanvasTransformation, state: InternalState) => CanvasTransformation) =>
    update(state => {
      const transformation = compute(state.view.transformation, state)
      return isSameTransformation(transformation, state.view.transformation) ? state : { ...state, view: { ...state.view, transformation } }
    })

  const setTransformation = (transformation: CanvasTransformation) => updateTransformation(() => transformation)

  /** Moves the view: the offset is kept inside the canvas when its size is fixed */
  const moveView = (getOffset: (transformation: CanvasTransformation, state: InternalState) => Point) =>
    updateTransformation((transformation, state) =>
      getNewOffset({
        zoom: transformation.zoom,
        size: state.config.options.size,
        canvasSize: state.view.canvasSize,
        newOffset: getOffset(transformation, state)
      })
    )

  const setOffset = (newOffset: Point) => moveView(() => newOffset)

  const setZoom = (action: ZoomAction) =>
    updateTransformation(({ offset, zoom }, { config, view }) =>
      getNewZoomAndOffset({ size: config.options.size, canvasSize: view.canvasSize, currentOffset: offset, currentZoom: zoom, action })
    )

  /** Sets the zoom level, keeping a point of the drawing still: the center of the view by default */
  const zoomTo = (level: number, center?: Point) =>
    updateTransformation(({ offset, zoom }, { config, view }) => {
      // the point is given in the drawing, the zoom computation needs it in the view
      const centerPoint: Point = center
        ? [(center[0] + offset[0]) * zoom, (center[1] + offset[1]) * zoom]
        : [view.canvasSize.realWidth / 2, view.canvasSize.realHeight / 2]
      return calculateNewZoomAndOffset({
        size: config.options.size,
        canvasSize: view.canvasSize,
        currentOffset: offset,
        currentZoom: zoom,
        zoom: clampZoom(level),
        centerPoint
      })
    })

  /** Zooms and scrolls so that the box of the shapes fills the view, with a margin in pixels of the screen */
  const zoomToShapes = (shapes: ShapeEntity[], padding: number) => {
    if (!shapes.length) return
    const box = getBoundingRect(shapes.map(shape => shape.computed.boundingBox))
    updateTransformation((_, { config, view }) => getZoomAndOffsetToFit({ size: config.options.size, canvasSize: view.canvasSize, box, padding }))
  }

  const resetZoom = () => setTransformation(DEFAULT_TRANSFORMATION)

  /** Zooms around a point of the canvas, by a wheel or a pinch delta */
  const zoomBy = (delta: number, centerPoint: Point) =>
    updateTransformation(({ offset, zoom }, { config, view }) =>
      getNewZoomAndOffsetFromDelta({
        size: config.options.size,
        canvasSize: view.canvasSize,
        currentOffset: offset,
        currentZoom: zoom,
        delta,
        centerPoint
      })
    )

  /** Scrolls the canvas by a distance in pixels. Returns whether the view has moved */
  const scrollBy = ([pixelX, pixelY]: Point) => {
    const previous = get().view.transformation
    moveView(({ offset, zoom }) => [offset[0] - pixelX / zoom, offset[1] - pixelY / zoom])
    return get().view.transformation !== previous
  }

  /** Moves the view by the auto scroll speed of the selection frame, multiplied by the ratio */
  const applyMoveAcceleration = (ratio = 1) =>
    moveView(({ offset }, { interaction: { moveAcceleration } }) => [
      offset[0] - moveAcceleration[0] * ratio,
      offset[1] - moveAcceleration[1] * ratio
    ])

  const setGridGap = (gridGap: number) => update(state => (state.view.gridGap === gridGap ? state : { ...state, view: { ...state.view, gridGap } }))

  // --- Selection ---

  const selectShapes = (shapesToSelect: ShapeEntity[]) =>
    update(state => {
      const newSelectedShape = buildShapesGroup(shapesToSelect, getSettings(state))
      const isNewSelection = state.document.selectedShape?.id !== shapesToSelect.map(shape => shape.id).join('-')
      return {
        ...state,
        document: shapesReducer(state.document, { type: 'SET_SELECTION', newSelectedShape }),
        tools: isNewSelection && state.tools.activeToolId !== SELECTION_TOOL.id ? { ...state.tools, activeToolId: SELECTION_TOOL.id } : state.tools
      }
    })

  const pasteShapes = (shapesToPaste: ShapeEntity[]) =>
    batch(() => {
      addShapes(shapesToPaste)
      selectShapes(shapesToPaste)
    })

  /** Adds new shapes, at the foreground by default: a step is saved unless save is false */
  const insertShapes = (newShapes: ShapeEntity[], { index = 0, save = true, source, select = false }: InsertOptions = {}) =>
    batch(() => {
      addShapes(newShapes, index)
      if (save) saveShapes(source)
      if (select) selectShapes(newShapes)
    })

  const selectAllShapes = () => selectShapes(get().document.shapes.filter(shape => !shape.locked))

  // --- Data ---

  const resetCanvasWithShapeEntity = (shapesToInit: ShapeEntity[], options: ResetOptions) =>
    batch(() => {
      clearShapes(shapesToInit, options)
      selectTool(SELECTION_TOOL)
      setTransformation(DEFAULT_TRANSFORMATION)
    })

  const resetCanvas = async (json: ShapeInput[], options: ResetOptions) => {
    const state = get()
    const shapes = await decodeImportedData(json, {
      ctx: getMeasureContext(),
      settings: getSettings(state),
      tools: state.tools.available,
      usedIds: new Set()
    })
    resetCanvasWithShapeEntity(shapes, options)
  }

  /** Loads the shapes given in the props of the hook, once */
  const init = () => {
    if (initialized) return
    initialized = true
    if (latest.props.shapes) void resetCanvas(latest.props.shapes, { clearHistory: true, source: 'remote' })
  }

  const getCurrentImage = (options?: ExportImageOptions) => getCanvasImage({ shapes: get().document.shapes, settings: getSettings(), options })

  const getCurrentData = (): StateData => {
    const { document, config } = get()
    return buildDataToExport(document.shapes, config.width, config.height)
  }

  // --- Elements ---

  const moveListeners = (previous: HTMLElement | null, element: HTMLElement | null, listeners: Listeners) => {
    for (const [type, listener] of Object.entries(listeners) as [string, EventListener][]) {
      previous?.removeEventListener(type, listener)
      element?.addEventListener(type, listener)
    }
  }

  const trackFocus = (key: keyof Focus): Listeners => ({
    focusin: () => selectors.selectIsInteractive(get()) && setFocus({ [key]: true }),
    focusout: () => selectors.selectIsInteractive(get()) && setFocus({ [key]: false })
  })

  const scopeFocus: Listeners = {
    focusin: () => selectors.selectIsInteractive(get()) && setFocus({ component: true }),
    focusout: e => {
      // a move of the focus inside the scope does not leave it
      if (e.relatedTarget && focusScope?.contains(e.relatedTarget as Node)) return
      batch(() => {
        // the keys released outside of the scope are not received
        setModifiers({ shift: false, alt: false, space: false })
        setFocus({ component: false })
      })
    }
  }
  const canvasFocus = trackFocus('canvas')
  // the listeners set on the scope: its focus and the keyboard shortcuts
  const scopeListeners = new Set<Listeners>([scopeFocus])

  /** Only one element is listened: the root of the Canvas is often inside the scope */
  const refreshFocusScope = () => {
    const element = scopeElement ?? canvasRootElement
    if (element === focusScope) return
    for (const listeners of scopeListeners) moveListeners(focusScope, element, listeners)
    focusScope = element
  }

  /** Listens to events of the scope, which follow it when it changes. Returns the function that stops listening */
  const listenScope = (listeners: Listeners) => {
    scopeListeners.add(listeners)
    moveListeners(null, focusScope, listeners)
    return () => {
      scopeListeners.delete(listeners)
      moveListeners(focusScope, null, listeners)
    }
  }

  /** Callback ref of the area where the keyboard shortcuts are active, the Canvas by default */
  const setScopeElement = (element: HTMLElement | null) => {
    scopeElement = element
    refreshFocusScope()
  }

  /** Callback ref of the root of the Canvas, the default scope */
  const setCanvasRootElement = (element: HTMLElement | null) => {
    canvasRootElement = element
    refreshFocusScope()
  }

  /** Callback ref of the draw canvas */
  const setCanvasElement = (element: HTMLCanvasElement | null) => {
    if (element === canvasElement) return
    moveListeners(canvasElement, element, canvasFocus)
    canvasElement = element
  }

  // --- Editor contract ---

  // built again only when the shapes or the selection change
  const memoizedIndexShapes = memoizeLast(indexShapes)

  const getShapesById = () => {
    const { shapes, selectedShape } = get().document
    return memoizedIndexShapes(shapes, selectedShape)
  }

  const resolveShapes = (ids: string[]): ShapeEntity[] => {
    const shapesById = getShapesById()
    return compact(ids.map(id => shapesById.get(id)))
  }

  /** Changes shapes for an action of the API, from the shapes found among the ids */
  const changeShapes = (ids: string[], change: (shapes: ShapeEntity[], settings: UtilsSettings) => ShapeEntity[], options?: ShapesActionOptions) => {
    const shapes = resolveShapes(ids)
    if (shapes.length) commitShapes(change(shapes, getSettings()), options)
  }

  /** Opens the context menu on the shapes of the menu */
  const showContextMenu = (menu: Omit<SelectionModeContextMenu<Point | number>, 'mode'>) =>
    batch(() => {
      setSelectedShape(menu.originalShape)
      setActiveTool(SELECTION_TOOL)
      setSelectionFrame(undefined)
      setSelectionMode({ mode: 'contextMenu', ...menu })
    })

  const copyToClipboard = (ids: string[] | undefined) => {
    const shapesToCopy = ids ? resolveShapes(ids) : getSelectedShapes(get().document.selectedShape)
    if (shapesToCopy.length) {
      const clipboard = buildShapesGroup(shapesToCopy, getSettings())
      update(state => ({ ...state, clipboard }))
    }
    return shapesToCopy
  }

  /** Redraws a picture once its image is loaded: the shape is replaced by a copy, without a step in the history */
  const loadPictureOf = (shape: ShapeEntity) => {
    if (shape.type !== 'picture') return
    loadPicture(shape.img, shape.src)
      .then(() => {
        const loaded = get().document.shapes.find(current => current.id === shape.id)
        if (loaded?.type === 'picture' && loaded.img === shape.img) updateShapes([{ ...loaded }])
      })
      .catch((error: unknown) => console.warn(`react-paint: the picture ${shape.id} could not be loaded`, error))
  }

  /** Creates shapes given by the consumer, and returns their ids */
  const addShapesFromInputs = (inputs: ShapeInput[], options?: InsertOptions): string[] => {
    assertValidShapes(inputs, 'addShapes')
    const state = get()
    const usedIds = new Set(state.document.shapes.map(shape => shape.id))
    const buildOptions = { ctx: getMeasureContext(), settings: getSettings(state), tools: state.tools.available, usedIds, completeStyle: true }
    const newShapes = inputs.map(input => buildShapeEntity(input, buildOptions))
    if (!newShapes.length) return []
    insertShapes(newShapes, options)
    for (const shape of newShapes) loadPictureOf(shape)
    return newShapes.map(shape => shape.id)
  }

  /** Applies patches of the consumer to the shapes. They are all checked before any change */
  const patchShapes = (patches: ShapePatch[], options?: ShapesActionOptions) => {
    const shapesById = getShapesById()
    assertValidPatches(patches, shapesById)

    const ctx = getMeasureContext()
    const settings = getSettings()
    const updatedShapes = new Map<string, ShapeEntity>()
    const reloadedPictures: ShapeEntity[] = []
    for (const patch of patches) {
      // several patches of a shape are applied in turn
      const shape = updatedShapes.get(patch.id) ?? shapesById.get(patch.id)
      if (!shape) continue
      let newShape = applyShapePatch(ctx, shape, patch, settings)
      if (newShape.type === 'picture' && shape.type === 'picture' && newShape.src !== shape.src) {
        newShape = { ...newShape, img: new Image() }
        reloadedPictures.push(newShape)
      }
      updatedShapes.set(patch.id, newShape)
    }
    commitShapes([...updatedShapes.values()], options)
    for (const shape of reloadedPictures) loadPictureOf(shape)
  }

  /** Points of a line, a polygon or a curve, to update one of them */
  const getPointShape = (id: string, types: ShapeEntity['type'][]) => {
    const shape = resolveShapes([id])[0]
    return shape && types.includes(shape.type) && 'points' in shape && shape.type !== 'brush'
      ? (shape as ShapeEntity<'line' | 'polygon' | 'curve'>)
      : undefined
  }

  const actions: EditorActions = {
    selectTool: toolOrId => {
      const tool = findSelectableTool(get().tools.available, typeof toolOrId === 'string' ? toolOrId : toolOrId.id)
      if (tool) selectTool(tool)
    },
    updateToolSettings: (toolId, field, value) => update(state => setToolDefaults(state, toolId, { [field]: value })),
    setToolStyle: (toolId, style) => update(state => setToolDefaults(state, toolId, style)),

    selectShapes: (ids, { mode = 'replace' } = {}) => {
      const shapes = resolveShapes(ids)
      const { selectedShape } = get().document
      if (mode === 'add') {
        selectShapes(addToSelectedShapes(selectedShape, shapes))
      } else if (mode === 'remove') {
        selectShapes(omitFromSelectedShapes(selectedShape, shapes))
      } else {
        selectShapes(shapes)
      }
    },
    selectAllShapes,
    clearSelection: () => setSelectedShape(undefined),

    addShapes: addShapesFromInputs,
    updateShapes: patchShapes,
    removeShapes: (ids, { source } = {}) => removeShapes(resolveShapes(ids), source),
    duplicateShapes: (ids, { translate = false, select = false } = {}) => duplicateShapes(resolveShapes(ids), translate, select),

    translateShapes: (ids, [x, y], options) =>
      changeShapes(ids, (shapes, settings) => shapes.map(shape => translateShape(shape, x, y, settings)), options),
    rotateShapes: (ids, angle, { center, ...options } = {}) =>
      changeShapes(ids, (shapes, settings) => rotateShapesAround(shapes, angle, center, settings), options),
    resizeShapes: (ids, bounds, options) =>
      changeShapes(ids, (shapes, settings) => resizeShapesToBounds(getMeasureContext(), shapes, bounds, settings), options),
    transformShapes: (ids, action) =>
      changeShapes(ids, (shapes, settings) =>
        action === 'rotateClockwise' || action === 'rotateCounterclockwise'
          ? rotateShapesAround(shapes, action === 'rotateClockwise' ? Math.PI / 2 : -Math.PI / 2, undefined, settings)
          : flipShapes(getMeasureContext(), shapes, action, settings)
      ),

    setShapesStyle: (ids, style, { updateTool = false, ...options } = {}) =>
      batch(() => {
        const ctx = getMeasureContext()
        changeShapes(ids, (shapes, settings) => shapes.map(shape => updateShapeStyle(ctx, shape, style, settings)), options)
        if (!updateTool) return
        const { available } = get().tools
        const toolIds = new Set(compact(resolveShapes(ids).map(shape => findShapeTool(available, shape)?.id)))
        update(state => [...toolIds].reduce((newState, toolId) => setToolDefaults(newState, toolId, style), state))
      }),
    updateShapesStyle: (ids, field, value, { save = true } = {}) => actions.setShapesStyle(ids, { [field]: value } as StyleShape, { save }),

    moveShapes: (ids, action) => moveShapes(resolveShapes(ids), action),
    swapShapes,
    setShapeIndex: (id, index) => {
      const { shapes } = get().document
      const from = shapes.findIndex(shape => shape.id === id)
      if (from === -1) return
      reorder(moveItemPosition(shapes, from, clamp(Math.round(index), 0, shapes.length - 1)))
    },
    reorderShapes: orderedIds => {
      const { shapes } = get().document
      const shapesById = new Map(shapes.map(shape => [shape.id, shape]))
      const ordered = compact([...new Set(orderedIds)].map(id => shapesById.get(id)))
      const orderedSet = new Set(ordered)
      reorder([...ordered, ...shapes.filter(shape => !orderedSet.has(shape))])
    },

    toggleShapesVisibility: ids => toggleShapesVisibility(resolveShapes(ids)),
    toggleShapesLock: ids => toggleShapesLock(resolveShapes(ids)),
    setShapesVisibility: (ids, visible) => {
      const shapesToToggle = resolveShapes(ids).filter(shape => (shape.visible !== false) !== visible)
      if (shapesToToggle.length) toggleShapesVisibility(shapesToToggle)
    },
    setShapesLocked: (ids, locked) => {
      const shapesToToggle = resolveShapes(ids).filter(shape => !!shape.locked !== locked)
      if (shapesToToggle.length) toggleShapesLock(shapesToToggle)
    },

    insertShapePoint: (id, index, point) => {
      const shape = getPointShape(id, ['polygon', 'curve'])
      if (shape) patchShapes([{ id, points: insertAt(shape.points, index, point) }])
    },
    moveShapePoint: (id, index, point) => {
      const shape = getPointShape(id, ['line', 'polygon', 'curve'])
      if (!shape || index < 0 || index >= shape.points.length) return
      patchShapes([{ id, points: shape.points.map((current, pointIndex) => (pointIndex === index ? point : current)) } as ShapePatch])
    },
    removeShapePoint: (id, pointIndex) => {
      const shape = resolveShapes([id])[0]
      if (!canRemoveShapePoint(shape, pointIndex)) return
      const settings = getSettings()
      updateShapes([shape.type === 'curve' ? removeCurvePoint(shape, pointIndex, settings) : removePolygonPoint(shape, pointIndex, settings)], true)
    },
    editText: id => {
      const shape = resolveShapes([id])[0]
      if (shape?.type !== 'text' || !canvasElement) return
      batch(() => {
        selectShapes([shape])
        setSelectionMode({ mode: 'textedition', defaultValue: shape.value })
      })
    },
    addPicture: async (fileOrUrl, { maxWidth = get().config.width, maxHeight = get().config.height, select = true } = {}) => {
      const pictureShape = await createPicture(fileOrUrl, maxWidth, maxHeight, getSettings())
      insertShapes([pictureShape], { select })
      return pictureShape
    },

    copy: ids => {
      copyToClipboard(ids)
    },
    cut: ids => {
      const cutShapes = copyToClipboard(ids)
      if (cutShapes.length) removeShapes(cutShapes)
    },
    paste: () => {
      const { clipboard } = get()
      if (clipboard) pasteShapes(copyShapes(clipboard, getSettings()))
    },

    undo,
    redo,
    saveShapes: () => saveShapes(),

    clearCanvas: () => {
      const { clearCallback: callback } = resolveConfig(latest.props, latest.overrides)
      const defaultShapes = latest.props.shapes
      if (typeof callback !== 'string') {
        void resetCanvas(callback(), { clearHistory: false, source: 'user' })
      } else if (callback === 'defaultShapes' && defaultShapes !== undefined) {
        void resetCanvas(defaultShapes, { clearHistory: false, source: 'user' })
      } else {
        resetCanvasWithShapeEntity([], { clearHistory: false, source: 'user' })
      }
    },
    loadFile: async file => actions.loadData((await decodeJson(file)) as StateData),
    loadData: async (data, { clearHistory = true } = {}) => {
      const parsed: unknown = typeof data === 'string' ? JSON.parse(data) : data
      const shapes = isRecord(parsed) && Array.isArray(parsed.shapes) ? (parsed.shapes as ShapeInput[]) : []
      await resetCanvas(shapes, { clearHistory, source: 'remote' })
    },
    exportPicture: ({ fileName, ...options } = {}) => downloadFile(getCurrentImage(options), fileName ?? getPictureFileName(options.format)),
    exportData: ({ fileName = 'drawing.json' } = {}) => {
      const { document, config } = get()
      const content = encodeShapesInString(document.shapes, config.width, config.height)
      if (!content) {
        throw new Error("L'encodage a échoué")
      }
      downloadFile(content, fileName)
    },

    setZoom,
    zoomTo: (level, { center } = {}) => zoomTo(level, center),
    zoomToShapes: (ids, { padding = 0 } = {}) =>
      zoomToShapes(ids ? resolveShapes(ids) : get().document.shapes.filter(shape => shape.visible !== false), padding),
    resetZoom,
    setOffset,
    panBy: ([x, y]) => moveView(({ offset }) => [offset[0] - x, offset[1] - y]),
    setGridGap,

    openContextMenu: ({ clientPosition, canvasPosition, ids }) => {
      const state = get()
      // a menu which cannot be shown would block the gestures
      if (!selectors.selectWithContextMenu(state)) return
      const settings = getSettings(state)
      const clientPoint = { clientX: clientPosition.x, clientY: clientPosition.y }
      showContextMenu({
        cursorStartPosition: canvasPosition ?? (canvasElement ? getCursorPositionInTransformedCanvas(clientPoint, canvasElement, settings) : [0, 0]),
        clientPosition,
        originalShape: buildShapesGroup(ids ? resolveShapes(ids) : getSelectedShapes(state.document.selectedShape), settings),
        anchor: undefined
      })
    },
    closeContextMenu: () => {
      // nothing to close: a gesture started since then keeps its mode
      if (get().interaction.selectionMode.mode !== 'contextMenu') return
      setSelectionMode({ mode: 'default' })
      canvasElement?.focus()
    },

    setOptions: options => {
      // an option set to undefined is no longer overridden: it comes back to the props
      latest.overrides = omitUndefined(mergeWith(replaceArrays, latest.overrides, options) as OptionalOptions)
      applyConfig()
    },
    resetOptions: () => {
      latest.overrides = {}
      applyConfig()
    },
    resetSettings: () =>
      update(state => {
        const { tools, view } = createInitialState(state.config)
        return { ...state, tools, view: { ...state.view, transformation: view.transformation, gridGap: view.gridGap } }
      })
  }

  const getBounds = (ids: string[]): ShapesBounds | undefined => {
    const settings = getSettings()
    const selection = buildShapesGroup(resolveShapes(ids), settings)
    if (!selection) return undefined
    return { ...getSelectionBounds(selection, settings), rotation: selection.rotation ?? 0, center: selection.computed.center }
  }

  /** Visible shapes under a point of the drawing, from the foreground */
  const getShapesAt = (point: Point): ShapeEntity[] => {
    const ctx = getContext()
    return ctx ? findShapesAt(ctx, get().document.shapes, point, getSettings()) : []
  }

  /** The visible shape of the foreground under a point of the drawing */
  const getShapeAt = (point: Point): ShapeEntity | undefined => {
    const ctx = getContext()
    return ctx ? findShapeAt(ctx, get().document.shapes, point, getSettings()) : undefined
  }

  return {
    getState: get,
    subscribe: store.subscribe,
    watch: store.watch,
    batch,
    transaction,
    selectors,
    getSettings,
    getEditorState: () => selectors.selectEditorState(get()),
    actions,
    registerEvent,
    unregisterEvent,
    emit,
    hasListeners,
    setConfig,
    init,
    /** Resets the shapes from data given by the consumer */
    resetCanvas: (json: ShapeInput[] = [], clearHistory = true) => resetCanvas(json, { clearHistory, source: 'remote' }),
    getCurrentImage,
    getCurrentData,
    getShape: (id: string): ShapeEntity | undefined => getShapesById().get(id),
    getBounds,
    getShapesAt,
    getShapeAt,
    setScopeElement,
    setCanvasRootElement,
    setCanvasElement,
    listenScope,
    // engine used by the canvas
    setSelectedShape,
    addShapes,
    duplicateShapes,
    refreshHoveredShape,
    clearHover,
    updateShapes,
    removeShapes,
    refreshSelectedShapes,
    setSelectionFrame,
    setActiveTool,
    setSelectionMode,
    showContextMenu,
    setHoverMode,
    setPanStart,
    setMoveAcceleration,
    setModifiers,
    setCanvasSize,
    setTransformation,
    zoomBy,
    scrollBy,
    applyMoveAcceleration
  }
}

export type PaintStore = ReturnType<typeof createPaintStore>
