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
import type { ExportedDrawableShape, Point, ShapeEntity, StateData } from '@common/types/Shapes'
import type { ToolsType } from '@common/types/tools'
import { SELECTION_TOOL } from '@editor/constants/tools'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type UseReactPaintProps = {
  width?: number | undefined
  height?: number | undefined
  shapes?: ExportedDrawableShape[] | undefined
  mode?: 'editor' | 'viewer' | undefined
  disabled?: boolean | undefined
  options?: OptionalOptions | undefined
}

const useReactPaint = ({
  width = 1000,
  height = 600,
  shapes: defaultShapes,
  mode = 'editor',
  disabled = false,
  options = DEFAULT_OPTIONS
}: UseReactPaintProps = {}) => {
  const {
    layersManipulation,
    brushAlgo,
    isBrushShapeDoneOnMouseUp,
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

  const { isInsideComponent } = useComponent({
    settings,
    componentRef: editorRef
  })

  const [isShiftPressed, setShiftPressed] = useState<boolean>(false)
  const [isAltPressed, setAltPressed] = useState<boolean>(false)

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
      userSelect: 'none',
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
      selectShapes,
      activeTool,
      setActiveTool,
      isInsideComponent,
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
      setShiftPressed,
      setAltPressed
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

export type UseReactPaintReturnType = ReturnType<typeof useReactPaint>

export default useReactPaint
