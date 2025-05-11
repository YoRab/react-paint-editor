import { DEFAULT_OPTIONS, type OptionalOptions, type UtilsSettings } from '@canvas/constants/app'
import useComponent from '@canvas/hooks/useComponent'
import useShapes from '@canvas/hooks/useShapes'
import useZoom from '@canvas/hooks/useZoom'
import { buildDataToExport } from '@canvas/utils/data'
import { decodeImportedData, decodeJson, downloadFile, encodeShapesInString, getCanvasImage } from '@canvas/utils/file'
import { sanitizeTools } from '@canvas/utils/tools'
import type { CanvasSize } from '@common/types/Canvas'
import type { ExportedDrawableShape, Point, ShapeEntity, StateData } from '@common/types/Shapes'
import type { ToolsType } from '@common/types/tools'
import { SELECTION_TOOL } from '@editor/constants/tools'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type UseReactPaintProps = {
  width?: number
  height?: number
  shapes?: ExportedDrawableShape[]
  mode?: 'editor' | 'viewer'
  disabled?: boolean
  options?: OptionalOptions
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
  }

  const isEditMode = mode !== 'viewer'

  const editorRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const init = useRef(false)

  const setEditor = useCallback((node: HTMLElement | null) => {
    editorRef.current = node
  }, [])

  const [activeTool, setActiveTool] = useState<ToolsType>(SELECTION_TOOL)
  const [gridGap, setGridGap] = useState<number>(grid)

  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    realWidth: width,
    realHeight: height,
    width,
    height,
    scaleRatio: 1
  })

  const zoomEnabled = canZoom === 'always' && !disabled
  const { canvasTransformation, setCanvasTransformation, setCanvasOffset, setCanvasZoom } = useZoom({
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

  const {
    registerEvent,
    unregisterEvent,
    shapesRef,
    selectedShape,
    selectionFrame,
    hoveredShape,
    addShape,
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
  } = useShapes(settings, width, height)

  const selectTool = useCallback(
    (tool: ToolsType) => {
      setSelectedShape(undefined)
      setActiveTool(tool)
    },
    [setSelectedShape]
  )

  const resetCanvasWithShapeEntity = useCallback(
    (shapesToInit: ShapeEntity[], options: { clearHistory: boolean; source: 'user' | 'remote' }) => {
      clearShapes(shapesToInit, options)
      selectTool(SELECTION_TOOL)
      setCanvasTransformation({ offset: [0, 0], zoom: 1 })
    },
    [selectTool, clearShapes, setCanvasTransformation]
  )

  const selectShape = useCallback(
    (shape: ShapeEntity) => {
      setActiveTool(SELECTION_TOOL)
      setSelectedShape(shape)
    },
    [setSelectedShape]
  )

  const exportData = useCallback(() => {
    const content = encodeShapesInString(shapesRef.current, width, height)
    if (!content) {
      throw new Error("L'encodage a échoué")
    }
    downloadFile(content, 'drawing.json')
  }, [shapesRef, width, height])

  const exportPicture = useCallback(() => {
    const dataURL = getCanvasImage(shapesRef.current, width, height, settings)
    if (!dataURL) {
      throw new Error()
    }
    downloadFile(dataURL, 'drawing.png')
  }, [shapesRef, width, height, settings])

  const getCurrentImage = useCallback(() => {
    return getCanvasImage(shapesRef.current, width, height, settings)
  }, [shapesRef, width, height, settings])

  const getCurrentData = useCallback(() => {
    return buildDataToExport(shapesRef.current, width, height)
  }, [shapesRef, width, height])

  useEffect(() => {
    if (!isInsideComponent) setSelectedShape(undefined)
  }, [isInsideComponent, setSelectedShape])

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

  return {
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
      selectShape,
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
      selectShape,
      activeTool,
      setActiveTool,
      isInsideComponent,
      isEditMode,
      canvas: {
        withSkeleton,
        withFrameSelection,
        canGrow,
        canShrink
      }
    },
    registerEvent,
    unregisterEvent,
    resetCanvas: resetCanvasFromRemote,
    getCurrentImage,
    getCurrentData,
    setCanvasOffset,
    setCanvasZoom
  }
}

export type UseReactPaintReturnType = ReturnType<typeof useReactPaint>

export default useReactPaint
