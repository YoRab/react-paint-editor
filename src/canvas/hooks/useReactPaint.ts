import { DEFAULT_OPTIONS, type OptionalOptions, type UtilsSettings } from '@canvas/constants/app'
import useComponent from '@canvas/hooks/useComponent'
import useShapes from '@canvas/hooks/useShapes'
import { buildDataToExport } from '@canvas/utils/data'
import { decodeImportedData, decodeJson, downloadFile, encodeShapesInString, getCanvasImage } from '@canvas/utils/file'
import { sanitizeTools } from '@canvas/utils/tools'
import type { DrawableShape, StateData, Point, ShapeEntity } from '@common/types/Shapes'
import type { ToolsType } from '@common/types/tools'
import { SELECTION_TOOL } from '@editor/constants/tools'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type UseReactPaintProps = {
  width?: number
  height?: number
  shapes?: DrawableShape[]
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
}: UseReactPaintProps) => {
  const {
    layersManipulation,
    brushAlgo,
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
    canvasSelectionPadding
  } = {
    ...DEFAULT_OPTIONS,
    ...options
  }

  const isEditMode = mode !== 'viewer'
  const isDisabled = disabled || !isEditMode

  const editorRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [init, setInit] = useState(false)

  const setEditor = useCallback((node: HTMLElement | null) => {
    editorRef.current = node
  }, [])

  const [activeTool, setActiveTool] = useState<ToolsType>(SELECTION_TOOL)
  const [gridGap, setGridGap] = useState<number>(grid)

  const [canvasSize, setCanvasSize] = useState({
    width,
    height,
    scaleRatio: 1
  })

  const [canvasOffset, setCanvasOffset] = useState<Point>([0, 0])

  const settings: UtilsSettings = useMemo(
    () => ({
      brushAlgo,
      canvasSize,
      canvasOffset,
      gridGap,
      selectionPadding: canvasSelectionPadding
    }),
    [canvasSelectionPadding, gridGap, brushAlgo, canvasOffset, canvasSize]
  )

  const [availableTools, setAvailableTools] = useState(sanitizeTools(availableToolsFromProps, withUploadPicture || withUrlPicture))

  const { isInsideComponent } = useComponent({
    disabled: isDisabled,
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
  } = useShapes(settings)

  const selectTool = useCallback(
    (tool: ToolsType) => {
      setSelectedShape(undefined)
      setActiveTool(tool)
    },
    [setSelectedShape]
  )

  const resetCanvasWithShapeEntity = useCallback(
    (shapesToInit: ShapeEntity[] = [], clearHistory = false) => {
      clearShapes(shapesToInit, clearHistory)
      selectTool(SELECTION_TOOL)
      setCanvasOffset([0, 0])
    },
    [selectTool, clearShapes]
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

  const getCurrentImage = () => {
    return canvasRef.current ? getCanvasImage(shapesRef.current, width, height, settings) : undefined
  }

  const getCurrentData = () => {
    return buildDataToExport(shapesRef.current, width, height)
  }

  useEffect(() => {
    if (!isInsideComponent) setSelectedShape(undefined)
  }, [isInsideComponent, setSelectedShape])

  const resetCanvas = useCallback(
    async (json: DrawableShape[], clearHistory = true) => {
      const shapes = await decodeImportedData(json, settings)
      resetCanvasWithShapeEntity(shapes, clearHistory)
    },
    [resetCanvasWithShapeEntity, settings]
  )

  if (!init) {
    setInit(true)
    defaultShapes && resetCanvas(defaultShapes)
  }

  const loadFile = useCallback(
    async (file: File) => {
      const json = await decodeJson(file)
      await resetCanvas((json as StateData).shapes ?? [])
    },
    [resetCanvas]
  )

  const clearCanvas = useCallback(() => {
    if (typeof clearCallback !== 'string') {
      void resetCanvas(clearCallback(), false)
    } else {
      if (clearCallback === 'defaultShapes' && defaultShapes !== undefined) {
        void resetCanvas(defaultShapes, false)
      } else {
        resetCanvasWithShapeEntity()
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
      canvasSize,
      selectTool,
      selectShape,
      activeTool,
      setActiveTool,
      setAvailableTools,
      isEditMode,
      isDisabled,
      availableTools,
      gridGap,
      setGridGap,
      loadFile,
      exportPicture,
      exportData,
      clearCanvas,
      settings,
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
      canvasSize,
      setCanvasSize,
      setCanvasOffset,
      selectShape,
      activeTool,
      setActiveTool,
      isInsideComponent,
      isEditMode,
      isDisabled,
      canvas: {
        withSkeleton,
        withFrameSelection,
        canGrow,
        canShrink
      }
    },
    registerEvent,
    unregisterEvent,
    resetCanvas,
    getCurrentImage,
    getCurrentData
  }
}

export type UseReactPaintReturnType = ReturnType<typeof useReactPaint>

export default useReactPaint
