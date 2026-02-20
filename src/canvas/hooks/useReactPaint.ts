import { DEFAULT_OPTIONS, type OptionalOptions, type UtilsSettings } from '@canvas/constants/app'
import useComponent from '@canvas/hooks/useComponent'
import useShapes from '@canvas/hooks/useShapes'
import useZoom from '@canvas/hooks/useZoom'
import { buildDataToExport } from '@canvas/utils/data'
import { decodeImportedData, decodeJson, downloadFile, encodeShapesInString, getCanvasImage } from '@canvas/utils/file'
import { buildShapesGroup } from '@canvas/utils/selection'
import { sanitizeTools } from '@canvas/utils/tools'
import { getNewOffset } from '@canvas/utils/zoom'
import type { CanvasSize } from '@common/types/Canvas'
import type { SelectionModeData } from '@common/types/Mode'
import type { ExportedDrawableShape, Point, SelectionType, ShapeEntity, StateData } from '@common/types/Shapes'
import type { CustomTool, ToolsType } from '@common/types/tools'
import { SELECTION_TOOL } from '@editor/constants/tools'
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'

type UseReactPaintProps = {
  width?: number | undefined
  height?: number | undefined
  shapes?: ExportedDrawableShape[] | undefined
  mode?: 'editor' | 'viewer' | undefined
  disabled?: boolean | undefined
  options?: OptionalOptions | undefined
}

type EditorProps = {
  shapesRef: React.RefObject<ShapeEntity[]>
  addPictureShape: (fileOrUrl: File | string, maxWidth?: number, maxHeight?: number) => Promise<ShapeEntity>
  moveShapes: (startPositionShapeId: string, endPositionShapeId: string) => void
  toggleShapeVisibility: (shapes: ShapeEntity[]) => void
  toggleShapeLock: (shapeGroup: ShapeEntity[]) => void
  canGoBackward: boolean
  canGoForward: boolean
  canClear: boolean
  selectedShape: SelectionType | undefined
  saveShapes: () => void
  removeShape: (shapes: ShapeEntity[]) => void
  updateShape: (updatedShapes: ShapeEntity[], withSave?: boolean) => void
  backwardShape: () => void
  forwardShape: () => void
  refs: {
    canvas: React.RefObject<HTMLCanvasElement | null>
    editor: React.RefObject<HTMLElement | null>
    setEditor: (node: HTMLElement | null) => void
  }

  width: number
  height: number
  selectTool: (tool: ToolsType) => void
  selectShapes: (shapes: ShapeEntity[]) => void
  activeTool: ToolsType
  setActiveTool: React.Dispatch<React.SetStateAction<ToolsType>>
  setAvailableTools: React.Dispatch<React.SetStateAction<CustomTool[]>>
  isEditMode: boolean
  availableTools: CustomTool[]
  gridGap: number
  setGridGap: React.Dispatch<React.SetStateAction<number>>
  loadFile: (file: File) => Promise<void>
  exportPicture: (view: 'fitToShapes' | 'defaultView' | 'currentZoom') => void
  exportData: () => void
  clearCanvas: () => void
  settings: UtilsSettings
  setCanvasZoom: (action: 'unzoom' | 'zoom' | 'default') => void
  resetZoom: () => void
  canvas: {
    canGrow: boolean
    canShrink: boolean
    layersManipulation: boolean
    withExport: boolean
    withLoadAndSave: boolean
    withUploadPicture: boolean
    withUrlPicture: boolean
  }
}

type CanvasProps = {
  shapesRef: React.RefObject<ShapeEntity[]>
  selectedShape: SelectionType | undefined
  selectionFrame: { oldSelection: SelectionType | undefined; frame: [Point, Point] } | undefined
  hoveredShape: ShapeEntity | undefined
  addShape: (newShapes: ShapeEntity[]) => void
  setSelectedShape: React.Dispatch<React.SetStateAction<SelectionType | undefined>>
  setSelectionFrame: React.Dispatch<React.SetStateAction<{ oldSelection: SelectionType | undefined; frame: [Point, Point] } | undefined>>
  refreshSelectedShapes: (ctx: CanvasRenderingContext2D, cursorPosition: Point) => void
  refreshHoveredShape: (e: MouseEvent | TouchEvent, ctx: CanvasRenderingContext2D, cursorPosition: Point, isInsideMask: boolean) => void
  removeShape: (shapes: ShapeEntity[]) => void
  updateShape: (updatedShapes: ShapeEntity[], withSave?: boolean) => void
  duplicateShapes: (shapesToDuplicate: ShapeEntity[]) => void
  backwardShape: () => void
  forwardShape: () => void
  saveShapes: () => void
  refs: {
    canvas: React.RefObject<HTMLCanvasElement | null>
    editor: React.RefObject<HTMLElement | null>
    setEditor: (node: HTMLElement | null) => void
  }
  width: number
  height: number
  selectShapes: (shapes: ShapeEntity[]) => void
  activeTool: ToolsType
  setActiveTool: React.Dispatch<React.SetStateAction<ToolsType>>
  isEditMode: boolean
  settings: UtilsSettings
  setCanvasZoom: (action: 'unzoom' | 'zoom' | 'default') => void
  resetZoom: () => void
  setCanvasSize: React.Dispatch<React.SetStateAction<CanvasSize>>
  setCanvasOffset: (offset: Point) => void
  isInsideComponent: boolean
  isInsideCanvas: boolean
  canvas: {
    withSkeleton: boolean
    withFrameSelection: boolean
    canGrow: boolean
    canShrink: boolean
  }
  canvasOffsetStartData: { start: Point; originalOffset: Point } | undefined
  setCanvasOffsetStartData: React.Dispatch<React.SetStateAction<{ start: Point; originalOffset: Point } | undefined>>
  selectionMode: SelectionModeData<number | Point>
  setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeData<number | Point>>>
  setCanvasMoveAcceleration: React.Dispatch<React.SetStateAction<Point>>
  isShiftPressed: boolean
  isAltPressed: boolean
  isSpacePressed: boolean
  setShiftPressed: React.Dispatch<React.SetStateAction<boolean>>
  setAltPressed: React.Dispatch<React.SetStateAction<boolean>>
  setIsSpacePressed: React.Dispatch<React.SetStateAction<boolean>>
}
export type UseReactPaintReturnType = {
  annotationsProps: {
    style: CSSProperties
  }
  editorProps: EditorProps
  canvasProps: CanvasProps
  registerEvent: (event: 'dataChanged', fn: (data: StateData, source: 'user' | 'remote') => void) => void
  unregisterEvent: (event: 'dataChanged', fn?: (data: StateData, source: 'user' | 'remote') => void) => void
  resetCanvas: (json?: ExportedDrawableShape[], clearHistory?: boolean) => void
  resetZoom: () => void
  getCurrentImage: (view: 'fitToShapes' | 'defaultView' | 'currentZoom') => string
  getCurrentData: () => StateData
  setCanvasOffset: (offset: Point) => void
  setCanvasZoom: (action: 'unzoom' | 'zoom' | 'default') => void
}
const useReactPaint = ({
  width = 1000,
  height = 600,
  shapes: defaultShapes,
  mode = 'editor',
  disabled = false,
  options = DEFAULT_OPTIONS
}: UseReactPaintProps = {}): UseReactPaintReturnType => {
  const {
    layersManipulation,
    brushAlgo,
    isBrushShapeDoneOnMouseUp,
    debug,
    grid,
    canGrow,
    canShrink,
    withExport,
    withLoadAndSave,
    withUploadPicture,
    withUrlPicture,
    withSkeleton,
    withFrameSelection,
    clearCallback,
    availableTools: availableToolsFromProps,
    canvasSelectionPadding,
    size,
    canZoom
  } = {
    ...DEFAULT_OPTIONS,
    ...options
  } as typeof DEFAULT_OPTIONS

  const isEditMode = mode !== 'viewer'

  const editorRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const init = useRef(false)

  const setEditor = useCallback((node: HTMLElement | null) => {
    editorRef.current = node
  }, [])
  const [canvasOffsetStartData, setCanvasOffsetStartData] = useState<{ start: Point; originalOffset: Point } | undefined>(undefined)
  const [activeTool, setActiveTool] = useState<ToolsType>(SELECTION_TOOL)
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
      features: {
        edition: isEditMode && !disabled,
        zoom: zoomEnabled
      }
    }),
    [
      canvasSelectionPadding,
      gridGap,
      brushAlgo,
      isBrushShapeDoneOnMouseUp,
      debug,
      canvasZoom,
      canvasOffset,
      canvasSize,
      size,
      disabled,
      zoomEnabled,
      isEditMode
    ]
  )

  const [availableTools, setAvailableTools] = useState(sanitizeTools(availableToolsFromProps, withUploadPicture || withUrlPicture))

  const { isInsideComponent, isInsideCanvas } = useComponent({
    settings,
    componentRef: editorRef,
    canvasRef: canvasRef
  })

  const [isShiftPressed, setShiftPressed] = useState<boolean>(false)
  const [isAltPressed, setAltPressed] = useState<boolean>(false)
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false)

  const {
    registerEvent,
    unregisterEvent,
    shapesRef,
    selectedShape,
    selectionFrame,
    hoveredShape,
    addShapes: addShape,
    addPictureShape,
    moveShapes,
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
    canGoBackward,
    canGoForward,
    canClear
  } = useShapes(settings, width, height, isShiftPressed)

  const selectTool = useCallback(
    (tool: ToolsType) => {
      setSelectedShape(undefined)
      setActiveTool(tool)
    },
    [setSelectedShape]
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
    [setSelectedShape, settings]
  )

  const exportData = useCallback(() => {
    const content = encodeShapesInString(shapesRef.current, width, height)
    if (!content) {
      throw new Error("L'encodage a échoué")
    }
    downloadFile(content, 'drawing.json')
  }, [shapesRef, width, height])

  const exportPicture = useCallback(
    (view: 'fitToShapes' | 'defaultView' | 'currentZoom') => {
      const dataURL = getCanvasImage({ shapes: shapesRef.current, settings, view })
      downloadFile(dataURL, 'drawing.png')
    },
    [shapesRef, settings]
  )

  const getCurrentImage = useCallback(
    (view: 'fitToShapes' | 'defaultView' | 'currentZoom') => {
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

  const loadFile = useCallback(
    async (file: File) => {
      const json = await decodeJson(file)
      await resetCanvas((json as StateData).shapes ?? [], {
        clearHistory: true,
        source: 'remote'
      })
    },
    [resetCanvas]
  )

  const clearCanvas = useCallback(() => {
    if (typeof clearCallback !== 'string') {
      void resetCanvas(clearCallback(), {
        clearHistory: false,
        source: 'user'
      })
    } else {
      if (clearCallback === 'defaultShapes' && defaultShapes !== undefined) {
        void resetCanvas(defaultShapes, {
          clearHistory: false,
          source: 'user'
        })
      } else {
        resetCanvasWithShapeEntity([], { clearHistory: false, source: 'user' })
      }
    }
  }, [resetCanvasWithShapeEntity, resetCanvas, defaultShapes, clearCallback])

  useEffect(() => {
    setAvailableTools(sanitizeTools(availableToolsFromProps, withUploadPicture || withUrlPicture))
  }, [availableToolsFromProps, withUploadPicture, withUrlPicture])

  const refs = {
    canvas: canvasRef,
    editor: editorRef,
    setEditor
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
    editorProps: {
      shapesRef,
      addPictureShape,
      moveShapes,
      toggleShapeVisibility,
      toggleShapeLock,
      canGoBackward,
      canGoForward,
      canClear,
      selectedShape,
      saveShapes,
      removeShape,
      updateShape,
      backwardShape,
      forwardShape,
      refs,
      width,
      height,
      selectTool,
      selectShapes,
      activeTool,
      setActiveTool,
      setAvailableTools,
      isEditMode,
      availableTools,
      gridGap,
      setGridGap,
      loadFile,
      exportPicture,
      exportData,
      clearCanvas,
      settings,
      setCanvasZoom,
      resetZoom,
      canvas: {
        canGrow,
        canShrink,
        layersManipulation,
        withExport,
        withLoadAndSave,
        withUploadPicture,
        withUrlPicture
      }
    },
    canvasProps: {
      shapesRef,
      selectedShape,
      selectionFrame,
      hoveredShape,
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
      refs,
      width,
      height,
      settings,
      setCanvasSize,
      setCanvasOffset,
      setCanvasZoom,
      resetZoom,
      selectShapes,
      activeTool,
      setActiveTool,
      isInsideComponent,
      isInsideCanvas,
      isEditMode,
      canvas: {
        withSkeleton,
        withFrameSelection,
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
    },
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
