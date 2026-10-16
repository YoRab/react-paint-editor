import { DEFAULT_OPTIONS, DRAWCANVAS_CLASSNAME, SELECTIONCANVAS_CLASSNAME, type UtilsSettings } from '@canvas/constants/app'
import { SELECTION_TOOL } from '@canvas/constants/tools'
import { createStore } from '@canvas/store/createStore'
import { createEventEmitter } from '@canvas/store/eventEmitter'
import { createSelectors, findSelectableTool } from '@canvas/store/selectors'
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
import type { EditorActions, ExportView, ShapesOrderAction, ShapesTransformAction, ZoomAction } from '@canvas/types/editor'
import type { HoverModeData, SelectionModeData } from '@canvas/types/Mode'
import type { ExportedDrawableShape, Point, SelectionType, ShapeEntity, StateData } from '@canvas/types/Shapes'
import type { CustomTool, ToolsType } from '@canvas/types/tools'
import { compact, moveItemPosition } from '@canvas/utils/array'
import { buildDataToExport } from '@canvas/utils/data'
import { shallowEqual } from '@canvas/utils/equality'
import { decodeImportedData, decodeJson, downloadFile, encodeShapesInString, getCanvasImage } from '@canvas/utils/file'
import { checkPositionIntersection, checkSelectionFrameCollision, checkSelectionIntersection } from '@canvas/utils/intersect'
import { isEqual, set, withDefaults } from '@canvas/utils/object'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { addToSelectedShapes, buildShapesGroup } from '@canvas/utils/selection'
import { canRemoveShapePoint, copyShapes, flipShapes, refreshShape, rotateShape, updateShapeStyle } from '@canvas/utils/shapes'
import { removeCurvePoint } from '@canvas/utils/shapes/curve'
import { createPicture } from '@canvas/utils/shapes/picture'
import { removePolygonPoint } from '@canvas/utils/shapes/polygon'
import { buildAvailableTools } from '@canvas/utils/tools'
import { isPointInsideRect } from '@canvas/utils/trigo'
import { uniqueId } from '@canvas/utils/util'
import { getNewOffset, getNewZoomAndOffset, getNewZoomAndOffsetFromDelta } from '@canvas/utils/zoom'

type ResetOptions = { clearHistory: boolean; source: 'user' | 'remote' }

type Interaction = InternalState['interaction']

const DEFAULT_TRANSFORMATION: CanvasTransformation = { offset: [0, 0], zoom: 1 }

const resolveConfig = ({ width = 1000, height = 600, mode = 'editor', disabled = false, options }: UseReactPaintProps) => {
  const { clearCallback, ...resolvedOptions } = withDefaults(DEFAULT_OPTIONS, options)
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

/**
 * Store of a react-paint instance: state of the canvas, of the selection and of the history,
 * and the engine that updates it. It knows nothing about React.
 */
export const createPaintStore = (props: UseReactPaintProps = {}) => {
  const { config: initialConfig, clearCallback } = resolveConfig(props)
  // Read when called, without being part of the state
  const latest = { clearCallback, defaultShapes: props.shapes }

  const store = createStore(createInitialState(initialConfig))
  const selectors = createSelectors()
  const { registerEvent, unregisterEvent, emit } = createEventEmitter()
  const { getState: get, batch } = store

  let canvasElement: HTMLCanvasElement | null = null
  let editorElement: HTMLElement | null = null
  let initialized = false

  const getSettings = (state = get()): UtilsSettings => selectors.selectSettings(state)

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

  // --- Events, emitted after each update ---

  store.watch(
    ({ document, config }) => [document.history, config.width, config.height] as const,
    ([history, width, height]) => {
      const entry = history.states[history.cursor]!
      emit('dataChanged', buildDataToExport(entry.shapes, width, height), entry.source)
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

  /** Synchronizes the props of the hook. Options are compared by value: inline options do not reset anything */
  const setConfig = (props: UseReactPaintProps) => {
    const { config, clearCallback } = resolveConfig(props)
    latest.clearCallback = clearCallback
    latest.defaultShapes = props.shapes

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
      return {
        ...state,
        config: { ...config, options },
        tools: toolsChanged ? { ...state.tools, available: buildAvailableTools(options.availableTools) } : state.tools
      }
    })
  }

  // --- Document ---

  const setSelectedShape = (newSelectedShape: SelectionType | undefined) =>
    update(state => {
      if (newSelectedShape === state.document.selectedShape) return state
      return { ...state, document: shapesReducer(state.document, { type: 'SET_SELECTION', newSelectedShape }) }
    })

  const addShapes = (newShapes: ShapeEntity[]) => dispatch({ type: 'ADD', newShapes })

  const saveShapes = () => dispatch({ type: 'SAVE' })

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
          const newShape = translate
            ? copyShapes(buildShapesGroup([originalShape], settings)!, settings)[0]!
            : { ...originalShape, id: uniqueId(`${marker.type}_`) }
          newShapesMap.set(marker.id, newShape)
          newShapesList.push(newShape)
        }
      }
      const newSelectedShape = selectNewOnes ? buildShapesGroup(newShapesList, settings) : state.document.selectedShape
      return { type: 'DUPLICATE', newShapesMap, newSelectedShape }
    })

  const refreshHoveredShape = (e: MouseEvent | TouchEvent, ctx: CanvasRenderingContext2D, cursorPosition: Point, isInsideMask: boolean) => {
    const isOverCanvas = !(
      e.target &&
      'className' in e.target &&
      ![DRAWCANVAS_CLASSNAME, SELECTIONCANVAS_CLASSNAME].includes(e.target.className as string)
    )
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

  const updateShapes = (updatedShapes: ShapeEntity[], withSave = false) =>
    dispatch(state => {
      const updatedById = new Map(updatedShapes.map(shape => [shape.id, shape]))
      const previousSelection = state.document.selectedShape
      const newSelectedShape = previousSelection
        ? buildShapesGroup(
            getSelectedShapes(previousSelection).map(shape => updatedById.get(shape.id) ?? shape),
            getSettings(state)
          )
        : previousSelection
      return { type: 'UPDATE', updatedShapes, newSelectedShape, save: withSave }
    })

  // newSelectedShape defaults to the current selection when not provided (preserves it for swapShapes/moveShapes)
  const resetShapes = (newShapes: ShapeEntity[], newSelectedShape: SelectionType | undefined | 'current' = 'current') =>
    dispatch(state => ({
      type: 'RESET_AND_SAVE',
      shapes: newShapes,
      newSelectedShape: newSelectedShape === 'current' ? state.document.selectedShape : newSelectedShape
    }))

  const removeShapes = (shapesToRemove: ShapeEntity[]) =>
    dispatch(state => {
      const ids = new Set(shapesToRemove.map(item => item.id))
      const previousSelection = state.document.selectedShape
      const previousIds = getSelectedShapes(previousSelection).map(item => item.id)
      const newSelectedShape = previousIds.find(value => ids.has(value)) ? undefined : previousSelection
      return { type: 'REMOVE', ids, newSelectedShape }
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

  const transformShapes = (ctx: CanvasRenderingContext2D, selectedShapes: ShapeEntity[], center: Point, action: ShapesTransformAction) => {
    const settings = getSettings()
    const { shapes } = get().document
    const shapeIds = new Set(selectedShapes.map(item => item.id))

    const newShapes: ShapeEntity[] =
      action === 'rotateClockwise' || action === 'rotateCounterclockwise'
        ? shapes.map(shape => {
            if (shapeIds.has(shape.id)) {
              return refreshShape(rotateShape(shape, action === 'rotateClockwise' ? Math.PI / 2 : -Math.PI / 2, center), settings)
            }
            return shape
          })
        : flipShapes(ctx, shapes, selectedShapes, center, action, settings)

    const newSelectedShape = buildShapesGroup(
      newShapes.filter(shape => shapeIds.has(shape.id)),
      settings
    )
    resetShapes(newShapes, newSelectedShape)
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

  const selectAllShapes = () => selectShapes(get().document.shapes.filter(shape => !shape.locked))

  // --- Data ---

  const resetCanvasWithShapeEntity = (shapesToInit: ShapeEntity[], options: ResetOptions) =>
    batch(() => {
      clearShapes(shapesToInit, options)
      selectTool(SELECTION_TOOL)
      setTransformation(DEFAULT_TRANSFORMATION)
    })

  const resetCanvas = async (json: ExportedDrawableShape[], options: ResetOptions) => {
    const shapes = await decodeImportedData(json, getSettings())
    resetCanvasWithShapeEntity(shapes, options)
  }

  /** Loads the shapes given in the props of the hook, once */
  const init = () => {
    if (initialized) return
    initialized = true
    if (latest.defaultShapes) void resetCanvas(latest.defaultShapes, { clearHistory: true, source: 'remote' })
  }

  const getCurrentImage = (view: ExportView) => getCanvasImage({ shapes: get().document.shapes, settings: getSettings(), view })

  const getCurrentData = (): StateData => {
    const { document, config } = get()
    return buildDataToExport(document.shapes, config.width, config.height)
  }

  // --- Elements ---

  const trackFocus = (key: keyof Focus) => ({
    onFocusIn: () => selectors.selectIsInteractive(get()) && setFocus({ [key]: true }),
    onFocusOut: () => selectors.selectIsInteractive(get()) && setFocus({ [key]: false })
  })

  const editorFocus = trackFocus('component')
  const canvasFocus = trackFocus('canvas')

  const listenFocus = (previous: HTMLElement | null, element: HTMLElement | null, { onFocusIn, onFocusOut }: ReturnType<typeof trackFocus>) => {
    previous?.removeEventListener('focusin', onFocusIn)
    previous?.removeEventListener('focusout', onFocusOut)
    element?.addEventListener('focusin', onFocusIn)
    element?.addEventListener('focusout', onFocusOut)
  }

  /** Callback ref of the editor root, which scopes the interactions and the keyboard shortcuts */
  const setEditorElement = (element: HTMLElement | null) => {
    if (element === editorElement) return
    listenFocus(editorElement, element, editorFocus)
    editorElement = element
  }

  /** Callback ref of the draw canvas */
  const setCanvasElement = (element: HTMLCanvasElement | null) => {
    if (element === canvasElement) return
    listenFocus(canvasElement, element, canvasFocus)
    canvasElement = element
  }

  // --- Editor contract ---

  const resolveShapes = (ids: string[]): ShapeEntity[] => {
    const { shapes, selectedShape } = get().document
    // selected shapes come last to take precedence
    const shapesById = new Map([...shapes, ...getSelectedShapes(selectedShape)].map(shape => [shape.id, shape] as const))
    return compact(ids.map(id => shapesById.get(id)))
  }

  const copyToClipboard = (ids: string[] | undefined) => {
    const shapesToCopy = ids ? resolveShapes(ids) : getSelectedShapes(get().document.selectedShape)
    if (shapesToCopy.length) {
      const clipboard = buildShapesGroup(shapesToCopy, getSettings())
      update(state => ({ ...state, clipboard }))
    }
    return shapesToCopy
  }

  const actions: EditorActions = {
    selectTool: toolOrId => {
      const tool = findSelectableTool(get().tools.available, typeof toolOrId === 'string' ? toolOrId : toolOrId.id)
      if (tool) selectTool(tool)
    },
    updateToolSettings: (toolId, field, value) =>
      update(state => {
        const { available } = state.tools
        const getDefault = (tool: CustomTool) => (tool.settings as Record<string, { default?: unknown } | undefined>)[field]?.default
        if (!available.some(tool => tool.id === toolId && !Object.is(getDefault(tool), value))) return state
        return {
          ...state,
          tools: { ...state.tools, available: available.map(tool => (tool.id === toolId ? set(['settings', field, 'default'], value, tool) : tool)) }
        }
      }),
    selectShapes: ids => selectShapes(resolveShapes(ids)),
    selectAllShapes,
    clearSelection: () => setSelectedShape(undefined),
    removeShapes: ids => removeShapes(resolveShapes(ids)),
    duplicateShapes: (ids, { translate = false, select = false } = {}) => duplicateShapes(resolveShapes(ids), translate, select),
    moveShapes: (ids, action) => moveShapes(resolveShapes(ids), action),
    swapShapes,
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
    updateShapesStyle: (ids, field, value, { save = true } = {}) => {
      const ctx = canvasElement?.getContext('2d')
      const settings = getSettings()
      updateShapes(
        resolveShapes(ids).map(shape => updateShapeStyle(ctx, shape, field, value, settings)),
        save
      )
    },
    transformShapes: (ids, action) => {
      const ctx = canvasElement?.getContext('2d')
      const shapesToTransform = resolveShapes(ids)
      const group = buildShapesGroup(shapesToTransform, getSettings())
      if (!ctx || !group) return
      transformShapes(ctx, shapesToTransform, group.computed.center, action)
    },
    removeShapePoint: (id, pointIndex) => {
      const shape = resolveShapes([id])[0]
      if (!canRemoveShapePoint(shape, pointIndex)) return
      const settings = getSettings()
      updateShapes([shape.type === 'curve' ? removeCurvePoint(shape, pointIndex, settings) : removePolygonPoint(shape, pointIndex, settings)], true)
    },
    addPicture: async (fileOrUrl, { maxWidth = get().config.width, maxHeight = get().config.height, select = true } = {}) => {
      const pictureShape = await createPicture(fileOrUrl, maxWidth, maxHeight, getSettings())
      batch(() => {
        addShapes([pictureShape])
        saveShapes()
        if (select) selectShapes([pictureShape])
      })
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
    saveShapes,
    clearCanvas: () => {
      const { clearCallback: callback, defaultShapes } = latest
      if (typeof callback !== 'string') {
        void resetCanvas(callback(), { clearHistory: false, source: 'user' })
      } else if (callback === 'defaultShapes' && defaultShapes !== undefined) {
        void resetCanvas(defaultShapes, { clearHistory: false, source: 'user' })
      } else {
        resetCanvasWithShapeEntity([], { clearHistory: false, source: 'user' })
      }
    },
    loadFile: async file => {
      const json = await decodeJson(file)
      await resetCanvas((json as StateData).shapes ?? [], { clearHistory: true, source: 'remote' })
    },
    exportPicture: view => downloadFile(getCurrentImage(view), 'drawing.png'),
    exportData: () => {
      const { document, config } = get()
      const content = encodeShapesInString(document.shapes, config.width, config.height)
      if (!content) {
        throw new Error("L'encodage a échoué")
      }
      downloadFile(content, 'drawing.json')
    },
    setZoom,
    resetZoom,
    setOffset,
    setGridGap,
    closeContextMenu: () => {
      setSelectionMode({ mode: 'default' })
      canvasElement?.focus()
    }
  }

  return {
    getState: get,
    subscribe: store.subscribe,
    watch: store.watch,
    batch,
    selectors,
    getSettings,
    getEditorState: () => selectors.selectEditorState(get()),
    actions,
    registerEvent,
    unregisterEvent,
    setConfig,
    init,
    /** Resets the shapes from data given by the consumer */
    resetCanvas: (json: ExportedDrawableShape[] = [], clearHistory = true) => resetCanvas(json, { clearHistory, source: 'remote' }),
    getCurrentImage,
    getCurrentData,
    setEditorElement,
    setCanvasElement,
    // engine used by the canvas
    setSelectedShape,
    addShapes,
    duplicateShapes,
    refreshHoveredShape,
    updateShapes,
    removeShapes,
    refreshSelectedShapes,
    setSelectionFrame,
    setActiveTool,
    setSelectionMode,
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
