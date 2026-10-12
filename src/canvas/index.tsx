import CanvasElement from '@canvas/components/Canvas'
import { type CanvasOptions, DEFAULT_CANVAS_OPTIONS } from '@canvas/constants/app'
import CanvasContext from '@canvas/context/CanvasContext'
import useKeyboard from '@canvas/hooks/useKeyboard'
import useResizeObserver from '@canvas/hooks/useResizeObserver'
import type { CanvasProps, InternalCanvasProps } from '@canvas/types/canvasProps'
import { withDefaults } from '@common/utils/object'
import { type CSSProperties, useCallback, useMemo, useRef } from 'react'
import './index.css'

type CanvasComponentProps = {
  canvasProps: CanvasProps
  className?: string | undefined
  style?: CSSProperties | undefined
  options?: CanvasOptions | undefined
}

const Canvas = ({ options, className, style, canvasProps }: CanvasComponentProps) => {
  const {
    shapes,
    selectedShape,
    selectionFrame,
    hoveredShape,
    addShape,
    setSelectedShape,
    selectAllShapes,
    setSelectionFrame,
    refreshSelectedShapes,
    refreshHoveredShape,
    duplicateShapes,
    removeShape,
    updateShape,
    backwardShape,
    forwardShape,
    saveShapes,
    canvasRef,
    width,
    height,
    settings,
    setCanvasSize,
    setCanvasOffset,
    activeTool,
    setActiveTool,
    isInsideComponent,
    isInsideCanvas,
    isEditMode,
    canvas: { withSkeleton, withFrameSelection, withContextMenu, canGrow, canShrink },
    canvasOffsetStartData,
    setCanvasOffsetStartData,
    selectionMode,
    setSelectionMode,
    setCanvasMoveAcceleration,
    isShiftPressed,
    isAltPressed,
    isSpacePressed,
    hasCopiedShape,
    copy,
    cut,
    paste,
    setShiftPressed,
    setAltPressed,
    setCanvasZoom,
    resetZoom,
    setIsSpacePressed
  } = canvasProps as unknown as InternalCanvasProps

  const { canvasBackgroundColor, canvasSelectionColor, canvasSelectionWidth } = withDefaults(DEFAULT_CANVAS_OPTIONS, options)

  const containerRef = useRef<HTMLDivElement>(null)

  const onResized = useCallback(
    (measuredWidth: number) => {
      const measuredHeight = (height * measuredWidth) / width
      const scaleRatio = measuredWidth / width
      setCanvasSize({ realWidth: width, realHeight: height, width: measuredWidth, height: measuredHeight, scaleRatio })
    },
    [width, height, setCanvasSize]
  )

  useKeyboard({
    isInsideComponent,
    isInsideCanvas,
    isEditingText: selectionMode.mode === 'textedition',
    settings,
    selectedShape,
    hasCopiedShape,
    copy,
    cut,
    paste,
    selectAllShapes,
    setSelectedShape,
    removeShape,
    updateShapes: updateShape,
    backwardShape,
    forwardShape,
    setShiftPressed,
    setAltPressed,
    setActiveTool,
    setSelectionMode,
    setSelectionFrame,
    setCanvasZoom,
    resetZoom,
    setIsSpacePressed
  })
  useResizeObserver({ element: containerRef, onResized })

  const contextValue = useMemo(
    () => ({
      shapes,
      settings,
      selectedShape,
      hoveredShape,
      selectionFrame,
      selectionMode,
      activeTool,
      canvasOffsetStartData,
      isInsideComponent,
      isInsideCanvas,
      isShiftPressed,
      isAltPressed,
      isSpacePressed,
      selectionColor: canvasSelectionColor,
      selectionWidth: canvasSelectionWidth,
      isEditMode,
      canGrow,
      withFrameSelection,
      withSkeleton,
      withContextMenu,
      setSelectedShape,
      setSelectionFrame,
      setSelectionMode,
      setActiveTool,
      setCanvasOffsetStartData,
      setCanvasOffset,
      setCanvasMoveAcceleration,
      addShapes: addShape,
      updateSingleShape: updateShape,
      duplicateShapes,
      saveShapes,
      refreshHoveredShape,
      refreshSelectedShapes
    }),
    [
      shapes,
      settings,
      selectedShape,
      hoveredShape,
      selectionFrame,
      selectionMode,
      activeTool,
      canvasOffsetStartData,
      isInsideComponent,
      isInsideCanvas,
      isShiftPressed,
      isAltPressed,
      isSpacePressed,
      canvasSelectionColor,
      canvasSelectionWidth,
      isEditMode,
      canGrow,
      withFrameSelection,
      withSkeleton,
      withContextMenu,
      setSelectedShape,
      setSelectionFrame,
      setSelectionMode,
      setActiveTool,
      setCanvasOffsetStartData,
      setCanvasOffset,
      setCanvasMoveAcceleration,
      addShape,
      updateShape,
      duplicateShapes,
      saveShapes,
      refreshHoveredShape,
      refreshSelectedShapes
    ]
  )

  return (
    <div
      ref={containerRef}
      className={`react-paint-app-row${className ? ` ${className}` : ''}`}
      data-grow={canGrow}
      data-shrink={canShrink}
      style={{
        '--react-paint-app-row-width': settings.canvasSize.width,
        '--react-paint-app-canvaswidth': width,
        '--react-paint-app-canvasheight': height,
        '--react-paint-app-row-aspectratio': `calc(${settings.canvasSize.width} / ${settings.canvasSize.height})`,
        '--react-paint-app-canvas-bg': canvasBackgroundColor,
        ...style
      }}
    >
      <CanvasContext.Provider value={contextValue}>
        <CanvasElement ref={canvasRef} />
      </CanvasContext.Provider>
    </div>
  )
}

export { type CanvasOptions, DEFAULT_OPTIONS, type OptionalOptions, type OptionalOptions as UseReactPaintOptions } from '@canvas/constants/app'
export { DEFAULT_TOOLS } from '@canvas/constants/tools'
export { default as useReactPaint, type UseReactPaintProps, type UseReactPaintReturnType } from '@canvas/hooks/useReactPaint'
export type { CanvasProps } from '@canvas/types/canvasProps'
export { MOVE_TOOL, SELECTION_TOOL } from '@common/constants/tools'
export type {
  ContextMenuState,
  EditorActions,
  EditorProps,
  EditorState,
  ExportView,
  InteractionMode,
  InteractionState,
  ReactPaintEventName,
  ReactPaintEvents,
  ShapeStyleField,
  ShapesOrderAction,
  ShapesTransformAction,
  ToolSettingValue,
  ZoomAction
} from '@common/types/editor'
export type {
  ExportedDrawableShape as DrawableShape,
  ExportedDrawableShape,
  Point,
  ShapeEntity,
  ShapeType,
  StateData,
  StyleShape
} from '@common/types/Shapes'
export type { ActionsTool, CustomTool, CustomToolInput, ToolsType } from '@common/types/tools'
export { getSelectedShapes, getSelectedShapesTools } from '@common/utils/selection'
export type { CanvasComponentProps }
export { Canvas }
