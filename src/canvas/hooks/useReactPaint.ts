import { DEFAULT_OPTIONS, type OptionalOptions, type UtilsSettings } from '@canvas/constants/app'
import useComponent from '@canvas/hooks/useComponent'
import useEventEmitter from '@canvas/hooks/useEventEmitter'
import useShapes from '@canvas/hooks/useShapes'
import useStableCallbacks from '@canvas/hooks/useStableCallbacks'
import useZoom from '@canvas/hooks/useZoom'
import type { CanvasProps, InternalCanvasProps } from '@canvas/types/canvasProps'
import { buildDataToExport } from '@canvas/utils/data'
import { decodeImportedData, decodeJson, downloadFile, encodeShapesInString, getCanvasImage } from '@canvas/utils/file'
import { buildShapesGroup } from '@canvas/utils/selection'
import { canRemoveShapePoint, copyShapes, updateShapeStyle } from '@canvas/utils/shapes'
import { removeCurvePoint } from '@canvas/utils/shapes/curve'
import { removePolygonPoint } from '@canvas/utils/shapes/polygon'
import { buildAvailableTools } from '@canvas/utils/tools'
import { getNewOffset } from '@canvas/utils/zoom'
import { MOVE_TOOL, SELECTION_TOOL } from '@common/constants/tools'
import type { CanvasSize } from '@common/types/Canvas'
import type {
  ContextMenuState,
  EditorActions,
  EditorProps,
  EditorState,
  ExportView,
  InteractionState,
  ReactPaintEventName,
  ReactPaintEvents,
  ZoomAction
} from '@common/types/editor'
import type { SelectionModeData } from '@common/types/Mode'
import type { ExportedDrawableShape, Point, ShapeEntity, StateData } from '@common/types/Shapes'
import type { CustomTool, ToolsType } from '@common/types/tools'
import { compact } from '@common/utils/array'
import { set, withDefaults } from '@common/utils/object'
import { getSelectedShapes } from '@common/utils/selection'
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type UseReactPaintProps = {
  width?: number | undefined
  height?: number | undefined
  shapes?: ExportedDrawableShape[] | undefined
  mode?: 'editor' | 'viewer' | undefined
  disabled?: boolean | undefined
  options?: OptionalOptions | undefined
}

export type UseReactPaintReturnType = {
  annotationsProps: {
    style: CSSProperties
  }
  editorProps: EditorProps
  canvasProps: CanvasProps
  registerEvent: <E extends ReactPaintEventName>(event: E, fn: ReactPaintEvents[E]) => void
  unregisterEvent: <E extends ReactPaintEventName>(event: E, fn?: ReactPaintEvents[E]) => void
  resetCanvas: (json?: ExportedDrawableShape[], clearHistory?: boolean) => void
  resetZoom: () => void
  getCurrentImage: (view: ExportView) => string
  getCurrentData: () => StateData
  setCanvasOffset: (offset: Point) => void
  setCanvasZoom: (action: ZoomAction) => void
}

const useReactPaint = ({
  width = 1000,
  height = 600,
  shapes: defaultShapes,
  mode = 'editor',
  disabled = false,
  options
}: UseReactPaintProps = {}): UseReactPaintReturnType => {
  const {
    brushAlgo,
    isBrushShapeDoneOnMouseUp,
    debug,
    grid,
    canGrow,
    canShrink,
    withSkeleton,
    withFrameSelection,
    withContextMenu: withContextMenuFromProps,
    clearCallback,
    availableTools: availableToolsFromProps,
    canvasSelectionPadding,
    size,
    canZoom
  } = withDefaults(DEFAULT_OPTIONS, options)

  const isEditMode = mode !== 'viewer'
  const withContextMenu = withContextMenuFromProps && isEditMode && !disabled

  const editorRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const init = useRef(false)

  const setEditor = useCallback((node: HTMLElement | null) => {
    editorRef.current = node
  }, [])
  const [canvasOffsetStartData, setCanvasOffsetStartData] = useState<{ start: Point; originalOffset: Point } | undefined>(undefined)
  const [activeToolId, setActiveToolId] = useState(SELECTION_TOOL.id)
  const [selectionMode, setSelectionMode] = useState<SelectionModeData<Point | number>>({
    mode: 'default'
  })
  const [gridGap, setGridGap] = useState<number>(grid)

  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    realWidth: width,
    realHeight: height,
    width,
    height,
    scaleRatio: 1
  })

  const zoomEnabled = canZoom === 'always' && !disabled
  const { canvasTransformation, setCanvasTransformation, setCanvasOffset, setCanvasZoom, resetZoom } = useZoom({
    canvasSize,
    size,
    canvasElt: canvasRef.current,
    zoomEnabled
  })

  const { offset: canvasOffset, zoom: canvasZoom } = canvasTransformation
  const features = useMemo(() => ({ edition: isEditMode && !disabled, zoom: zoomEnabled }), [isEditMode, disabled, zoomEnabled])
  const settings: UtilsSettings = useMemo(
    () => ({
      brushAlgo,
      isBrushShapeDoneOnMouseUp,
      debug,
      canvasSize: {
        realWidth: canvasSize.realWidth,
        realHeight: canvasSize.realHeight,
        width: canvasSize.width,
        height: canvasSize.height,
        scaleRatioWithNoZoom: canvasSize.scaleRatio,
        scaleRatio: canvasSize.scaleRatio * canvasZoom
      },
      size,
      canvasOffset,
      canvasZoom,
      gridGap,
      selectionPadding: canvasSelectionPadding,
      features
    }),
    [canvasSelectionPadding, gridGap, brushAlgo, isBrushShapeDoneOnMouseUp, debug, canvasZoom, canvasOffset, canvasSize, size, features]
  )

  const toolsFromProps = useMemo(() => buildAvailableTools(availableToolsFromProps), [availableToolsFromProps])
  const [availableTools, setAvailableTools] = useState<CustomTool[]>(toolsFromProps)

  // the active tool is derived from the tools by its id, so that it follows their updates
  const selectableTools = useMemo<ToolsType[]>(() => [SELECTION_TOOL, MOVE_TOOL, ...availableTools], [availableTools])
  const activeTool = selectableTools.find(tool => tool.id === activeToolId) ?? SELECTION_TOOL
  const setActiveTool = useCallback((tool: ToolsType) => setActiveToolId(tool.id), [])

  const { isInsideComponent, isInsideCanvas } = useComponent({
    settings,
    componentRef: editorRef,
    canvasRef: canvasRef
  })

  const [isShiftPressed, setShiftPressed] = useState<boolean>(false)
  const [isAltPressed, setAltPressed] = useState<boolean>(false)
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false)

  const { registerEvent, unregisterEvent, emit } = useEventEmitter()

  const {
    shapes,
    shapesRef,
    selectedShape,
    selectionFrame,
    hoveredShape,
    copiedShape,
    setCopiedShape,
    addShapes: addShape,
    addPictureShape,
    moveShapes,
    swapShapes,
    setSelectedShape,
    setSelectionFrame,
    refreshSelectedShapes,
    refreshHoveredShape,
    duplicateShapes,
    removeShape,
    updateShape,
    backwardShape,
    forwardShape,
    clearShapes,
    saveShapes,
    toggleShapeVisibility,
    toggleShapeLock,
    transformShape,
    canGoBackward,
    canGoForward,
    canClear
  } = useShapes(settings, width, height, isShiftPressed, emit)

  const selectTool = useCallback(
    (tool: ToolsType) => {
      setSelectedShape(undefined)
      setActiveTool(tool)
    },
    [setSelectedShape, setActiveTool]
  )

  const [canvasMoveAcceleration, setCanvasMoveAcceleration] = useState<Point>([0, 0])

  const isModePreview = selectionMode.mode === 'preview'
  // biome-ignore lint/correctness/useExhaustiveDependencies: shape selection should reset selection mode when it is preview
  useEffect(() => {
    if (isModePreview) {
      return () => setSelectionMode(old => (old.mode === 'preview' ? { mode: 'default' } : old))
    }
  }, [selectedShape?.id, isModePreview])

  const isModeSelectionFrame = selectionMode.mode === 'selectionFrame'
  useEffect(() => {
    if (isModeSelectionFrame) {
      return () => setCanvasMoveAcceleration([0, 0])
    }
  }, [isModeSelectionFrame])

  useEffect(() => {
    const hasAcceleration = canvasMoveAcceleration[0] !== 0 || canvasMoveAcceleration[1] !== 0

    if (hasAcceleration) {
      const interval = setInterval(() => {
        setCanvasTransformation(({ offset, zoom }) => {
          const newOffset: Point = [offset[0] - canvasMoveAcceleration[0], offset[1] - canvasMoveAcceleration[1]]
          return getNewOffset({ zoom, size, canvasSize, newOffset })
        })
      }, 20)
      return () => clearInterval(interval)
    }
  }, [canvasMoveAcceleration[0], canvasMoveAcceleration[1], setCanvasTransformation, size, canvasSize])

  const resetCanvasWithShapeEntity = useCallback(
    (shapesToInit: ShapeEntity[], options: { clearHistory: boolean; source: 'user' | 'remote' }) => {
      clearShapes(shapesToInit, options)
      selectTool(SELECTION_TOOL)
      setCanvasTransformation({ offset: [0, 0], zoom: 1 })
    },
    [selectTool, clearShapes, setCanvasTransformation]
  )

  const selectShapes = useCallback(
    (shapes: ShapeEntity[]) => {
      setSelectedShape(old => {
        if (old?.id !== shapes.map(shape => shape.id).join('-')) setActiveTool(SELECTION_TOOL)
        return buildShapesGroup(shapes, settings)
      })
    },
    [setSelectedShape, setActiveTool, settings]
  )

  const pasteShapes = useCallback(
    (shapes: ShapeEntity[]) => {
      addShape(shapes)
      selectShapes(shapes)
    },
    [addShape, selectShapes]
  )

  const selectAllShapes = useCallback(() => {
    selectShapes(shapesRef.current.filter(shape => !shape.locked))
  }, [selectShapes, shapesRef])

  const getCurrentImage = useCallback(
    (view: ExportView) => {
      return getCanvasImage({ shapes: shapesRef.current, settings, view })
    },
    [shapesRef, settings]
  )

  const getCurrentData = useCallback(() => {
    return buildDataToExport(shapesRef.current, width, height)
  }, [shapesRef, width, height])

  const resetCanvas = useCallback(
    async (json: ExportedDrawableShape[], options: { clearHistory: boolean; source: 'user' | 'remote' }) => {
      const shapes = await decodeImportedData(json, settings)
      resetCanvasWithShapeEntity(shapes, options)
    },
    [resetCanvasWithShapeEntity, settings]
  )

  const resetCanvasRef = useRef<typeof resetCanvas>(resetCanvas)
  resetCanvasRef.current = resetCanvas

  const resetCanvasFromRemote = useCallback((json: ExportedDrawableShape[] = [], clearHistory = true) => {
    resetCanvasRef.current?.(json, { clearHistory, source: 'remote' })
  }, [])

  useEffect(() => {
    if (init.current) return
    init.current = true
    defaultShapes && resetCanvasRef.current?.(defaultShapes, { clearHistory: true, source: 'remote' })
  }, [defaultShapes])

  useEffect(() => {
    setAvailableTools(toolsFromProps)
  }, [toolsFromProps])

  // --- Events ---

  const selectedShapes = useMemo(() => getSelectedShapes(selectedShape), [selectedShape])

  // a group id is made of the ids of its shapes
  const selectionKey = selectedShape?.id
  const lastSelectionKey = useRef(selectionKey)
  useEffect(() => {
    if (selectionKey === lastSelectionKey.current) return
    lastSelectionKey.current = selectionKey
    emit('selectionChanged', selectedShapes)
  }, [selectionKey, selectedShapes, emit])

  const lastToolId = useRef(activeTool.id)
  useEffect(() => {
    if (activeTool.id === lastToolId.current) return
    lastToolId.current = activeTool.id
    emit('toolChanged', activeTool)
  }, [activeTool, emit])

  // --- Editor contract ---

  const resolveShapes = (ids: string[]): ShapeEntity[] => {
    // selected shapes come last to take precedence
    const shapesById = new Map([...shapesRef.current, ...selectedShapes].map(shape => [shape.id, shape] as const))
    return compact(ids.map(id => shapesById.get(id)))
  }

  const copyToClipboard = (ids: string[] | undefined) => {
    const shapesToCopy = ids ? resolveShapes(ids) : selectedShapes
    if (shapesToCopy.length) setCopiedShape(buildShapesGroup(shapesToCopy, settings))
    return shapesToCopy
  }

  const actions = useStableCallbacks<EditorActions>({
    selectTool: toolOrId => {
      const toolId = typeof toolOrId === 'string' ? toolOrId : toolOrId.id
      const tool = selectableTools.find(selectableTool => selectableTool.id === toolId)
      if (tool) selectTool(tool)
    },
    updateToolSettings: (toolId, field, value) =>
      setAvailableTools(tools => tools.map(tool => (tool.id === toolId ? set(['settings', field, 'default'], value, tool) : tool))),
    selectShapes: ids => selectShapes(resolveShapes(ids)),
    selectAllShapes,
    clearSelection: () => setSelectedShape(undefined),
    removeShapes: ids => removeShape(resolveShapes(ids)),
    duplicateShapes: (ids, { translate = false, select = false } = {}) => duplicateShapes(resolveShapes(ids), translate, select),
    moveShapes: (ids, action) => moveShapes(resolveShapes(ids), action),
    swapShapes,
    toggleShapesVisibility: ids => toggleShapeVisibility(resolveShapes(ids)),
    toggleShapesLock: ids => toggleShapeLock(resolveShapes(ids)),
    setShapesVisibility: (ids, visible) => {
      const shapesToToggle = resolveShapes(ids).filter(shape => (shape.visible !== false) !== visible)
      if (shapesToToggle.length) toggleShapeVisibility(shapesToToggle)
    },
    setShapesLocked: (ids, locked) => {
      const shapesToToggle = resolveShapes(ids).filter(shape => !!shape.locked !== locked)
      if (shapesToToggle.length) toggleShapeLock(shapesToToggle)
    },
    updateShapesStyle: (ids, field, value, { save = true } = {}) => {
      const ctx = canvasRef.current?.getContext('2d')
      updateShape(
        resolveShapes(ids).map(shape => updateShapeStyle(ctx, shape, field, value, settings)),
        save
      )
    },
    transformShapes: (ids, action) => {
      const ctx = canvasRef.current?.getContext('2d')
      const shapesToTransform = resolveShapes(ids)
      const group = buildShapesGroup(shapesToTransform, settings)
      if (!ctx || !group) return
      transformShape(ctx, shapesToTransform, group.computed.center, action)
    },
    removeShapePoint: (id, pointIndex) => {
      const shape = resolveShapes([id])[0]
      if (!canRemoveShapePoint(shape, pointIndex)) return
      updateShape([shape.type === 'curve' ? removeCurvePoint(shape, pointIndex, settings) : removePolygonPoint(shape, pointIndex, settings)], true)
    },
    addPicture: async (fileOrUrl, { maxWidth = width, maxHeight = height, select = true } = {}) => {
      const pictureShape = await addPictureShape(fileOrUrl, maxWidth, maxHeight)
      if (select) selectShapes([pictureShape])
      return pictureShape
    },
    copy: ids => {
      copyToClipboard(ids)
    },
    cut: ids => {
      const cutShapes = copyToClipboard(ids)
      if (cutShapes.length) removeShape(cutShapes)
    },
    paste: () => {
      if (copiedShape) pasteShapes(copyShapes(copiedShape, settings))
    },
    undo: backwardShape,
    redo: forwardShape,
    saveShapes,
    clearCanvas: () => {
      if (typeof clearCallback !== 'string') {
        void resetCanvas(clearCallback(), { clearHistory: false, source: 'user' })
      } else if (clearCallback === 'defaultShapes' && defaultShapes !== undefined) {
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
      const content = encodeShapesInString(shapesRef.current, width, height)
      if (!content) {
        throw new Error("L'encodage a échoué")
      }
      downloadFile(content, 'drawing.json')
    },
    setZoom: setCanvasZoom,
    resetZoom,
    setGridGap,
    closeContextMenu: () => {
      setSelectionMode({ mode: 'default' })
      canvasRef.current?.focus()
    }
  })

  const interaction: InteractionState = useMemo(
    () => ({
      mode: selectionMode.mode,
      hoveredShape,
      selectionFrame: selectionFrame?.frame,
      modifiers: { shift: isShiftPressed, alt: isAltPressed, space: isSpacePressed },
      isPanning: canvasOffsetStartData !== undefined,
      focus: { component: isInsideComponent, canvas: isInsideCanvas }
    }),
    [
      selectionMode.mode,
      hoveredShape,
      selectionFrame,
      isShiftPressed,
      isAltPressed,
      isSpacePressed,
      canvasOffsetStartData,
      isInsideComponent,
      isInsideCanvas
    ]
  )

  const contextMenu: ContextMenuState | undefined = useMemo(() => {
    if (!withContextMenu || selectionMode.mode !== 'contextMenu') return undefined
    const contextMenuShapes = getSelectedShapes(selectionMode.originalShape)
    const anchorIndex = typeof selectionMode.anchor === 'number' ? selectionMode.anchor : undefined
    return {
      shapes: contextMenuShapes,
      anchorIndex,
      canRemoveAnchor: contextMenuShapes.length === 1 && canRemoveShapePoint(contextMenuShapes[0], anchorIndex),
      canvasPosition: selectionMode.cursorStartPosition,
      clientPosition: selectionMode.clientPosition
    }
  }, [withContextMenu, selectionMode])

  // each slice keeps its identity while unchanged, so that editors can memoize on it
  const layout = useMemo(() => ({ size, canGrow, canShrink }), [size, canGrow, canShrink])
  const view = useMemo(
    () => ({
      zoom: canvasZoom,
      offset: canvasOffset,
      displayWidth: canvasSize.width,
      displayHeight: canvasSize.height,
      scaleRatio: canvasSize.scaleRatio * canvasZoom
    }),
    [canvasZoom, canvasOffset, canvasSize]
  )
  const history = useMemo(() => ({ canUndo: canGoBackward, canRedo: canGoForward, canClear }), [canGoBackward, canGoForward, canClear])
  const hasCopiedShape = copiedShape !== undefined
  const clipboard = useMemo(() => ({ hasContent: hasCopiedShape }), [hasCopiedShape])

  const state: EditorState = useMemo(
    () => ({
      mode,
      disabled,
      features,
      width,
      height,
      layout,
      view,
      gridGap,
      shapes,
      selection: selectedShape,
      selectedShapes,
      activeTool,
      tools: availableTools,
      history,
      clipboard,
      withContextMenu,
      interaction,
      contextMenu
    }),
    [
      mode,
      disabled,
      features,
      width,
      height,
      layout,
      view,
      gridGap,
      shapes,
      selectedShape,
      selectedShapes,
      activeTool,
      availableTools,
      history,
      clipboard,
      withContextMenu,
      interaction,
      contextMenu
    ]
  )

  const editorProps: EditorProps = useMemo(() => ({ state, actions, editorRef: setEditor }), [state, actions, setEditor])

  const internalCanvasProps: InternalCanvasProps = {
    shapes,
    selectedShape,
    selectionFrame,
    hoveredShape,
    hasCopiedShape,
    copy: actions.copy,
    cut: actions.cut,
    paste: actions.paste,
    addShape,
    setSelectedShape,
    setSelectionFrame,
    refreshSelectedShapes,
    refreshHoveredShape,
    removeShape,
    updateShape,
    duplicateShapes,
    backwardShape,
    forwardShape,
    saveShapes,
    canvasRef,
    width,
    height,
    settings,
    setCanvasSize,
    setCanvasOffset,
    setCanvasZoom,
    resetZoom,
    selectAllShapes,
    activeTool,
    setActiveTool,
    isInsideComponent,
    isInsideCanvas,
    isEditMode,
    canvas: {
      withSkeleton,
      withFrameSelection,
      withContextMenu,
      canGrow,
      canShrink
    },
    canvasOffsetStartData,
    setCanvasOffsetStartData,
    selectionMode,
    setSelectionMode,
    setCanvasMoveAcceleration,
    isShiftPressed,
    isAltPressed,
    isSpacePressed,
    setShiftPressed,
    setAltPressed,
    setIsSpacePressed
  }

  const annotationsProps = {
    style: {
      userSelect: 'none' as const,
      touchAction: 'none',
      transformOrigin: 'left top',
      transform:
        'scale(var(--react-paint-canvas-zoom)) translate(calc(var(--react-paint-canvas-offset-x) * 100% / var(--react-paint-app-canvaswidth)),      calc(var(--react-paint-canvas-offset-y) * 100% / var(--react-paint-app-canvasheight)))',
      '--react-paint-canvas-zoom': settings.canvasZoom,
      '--react-paint-canvas-offset-x': settings.canvasOffset[0],
      '--react-paint-canvas-offset-y': settings.canvasOffset[1],
      '--react-paint-app-canvaswidth': width,
      '--react-paint-app-canvasheight': height
    }
  }

  return {
    annotationsProps,
    editorProps,
    canvasProps: internalCanvasProps as unknown as CanvasProps,
    registerEvent,
    unregisterEvent,
    resetCanvas: resetCanvasFromRemote,
    resetZoom,
    getCurrentImage,
    getCurrentData,
    setCanvasOffset,
    setCanvasZoom
  }
}
export default useReactPaint
