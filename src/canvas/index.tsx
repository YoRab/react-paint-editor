import Canvas from '@canvas/components/Canvas'
import { DEFAULT_CANVAS_OPTIONS } from '@canvas/constants/app'
import CanvasContext from '@canvas/context/CanvasContext'
import useKeyboard from '@canvas/hooks/useKeyboard'
import type { UseReactPaintReturnType } from '@canvas/hooks/useReactPaint'
import useResizeObserver from '@canvas/hooks/useResizeObserver'
import { type CSSProperties, useCallback, useMemo, useRef } from 'react'
import './index.css'

type AppProps = {
  canvasProps: UseReactPaintReturnType['canvasProps']
  className?: string
  style?: CSSProperties
  options?: {
    canvasBackgroundColor?: string | undefined
    canvasSelectionColor?: string | undefined
    canvasSelectionWidth?: number | undefined
  }
}
const App = ({ options, className, style, canvasProps }: AppProps) => {
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
    refs,
    width,
    height,
    settings,
    setCanvasSize,
    setCanvasOffset,
    pasteShapes,
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
    copiedShape,
    setCopiedShape,
    setShiftPressed,
    setAltPressed,
    setCanvasZoom,
    resetZoom,
    setIsSpacePressed
  } = canvasProps

  const { canvasBackgroundColor, canvasSelectionColor, canvasSelectionWidth } = {
    ...DEFAULT_CANVAS_OPTIONS,
    ...options
  } as typeof DEFAULT_CANVAS_OPTIONS

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
    copiedShape,
    setCopiedShape,
    selectAllShapes,
    setSelectedShape,
    removeShape,
    pasteShapes,
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
        <Canvas ref={refs.canvas} />
      </CanvasContext.Provider>
    </div>
  )
}

export default App

export { DEFAULT_OPTIONS } from '@canvas/constants/app'
export type { OptionalOptions } from '@canvas/constants/app'
export { default as useReactPaint } from '@canvas/hooks/useReactPaint'
export type { ExportedDrawableShape as DrawableShape, StateData } from '@common/types/Shapes'
