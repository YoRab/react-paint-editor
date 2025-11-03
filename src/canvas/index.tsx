import Canvas from '@canvas/components/Canvas'
import { DEFAULT_CANVAS_OPTIONS } from '@canvas/constants/app'
import useKeyboard from '@canvas/hooks/useKeyboard'
import type { UseReactPaintReturnType } from '@canvas/hooks/useReactPaint'
import useResizeObserver from '@canvas/hooks/useResizeObserver'
import type { ShapeEntity } from '@common/types/Shapes'
import { type CSSProperties, useCallback, useRef, useState } from 'react'
import './index.css'

type AppProps = {
  canvasProps: UseReactPaintReturnType['canvasProps']
  className?: string
  style?: CSSProperties
  options?: {
    canvasBackgroundColor?: string
    canvasSelectionColor?: string
    canvasSelectionWidth?: number
  }
}
const App = ({ options, className, style, canvasProps }: AppProps) => {
  const {
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
    selectShapes,
    activeTool,
    setActiveTool,
    isInsideComponent,
    isEditMode,
    canvas: { withSkeleton, withFrameSelection, canGrow, canShrink },
    canvasOffsetStartData,
    setCanvasOffsetStartData,
    selectionMode,
    setSelectionMode,
    setCanvasMoveAcceleration
  } = canvasProps

  const { canvasBackgroundColor, canvasSelectionColor, canvasSelectionWidth } = {
    ...DEFAULT_CANVAS_OPTIONS,
    ...options
  }

  const containerRef = useRef<HTMLDivElement>(null)

  const [isShiftPressed, setShiftPressed] = useState<boolean>(false)
  const [isAltPressed, setAltPressed] = useState<boolean>(false)

  const pasteShapes = useCallback(
    (shapes: ShapeEntity[]) => {
      addShape(shapes)
      selectShapes(shapes)
    },
    [addShape, selectShapes]
  )

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
    isEditingText: selectionMode.mode === 'textedition',
    settings,
    selectedShape,
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
    setSelectionFrame
  })
  useResizeObserver({ element: containerRef, onResized })

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
      <Canvas
        ref={refs.canvas}
        canGrow={canGrow}
        isInsideComponent={isInsideComponent}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        canvasOffsetStartData={canvasOffsetStartData}
        setCanvasOffsetStartData={setCanvasOffsetStartData}
        shapes={shapesRef.current}
        addShapes={addShape}
        updateSingleShape={updateShape}
        selectedShape={selectedShape}
        selectionFrame={selectionFrame}
        setSelectedShape={setSelectedShape}
        setSelectionFrame={setSelectionFrame}
        hoveredShape={hoveredShape}
        refreshHoveredShape={refreshHoveredShape}
        refreshSelectedShapes={refreshSelectedShapes}
        settings={settings}
        setCanvasOffset={setCanvasOffset}
        saveShapes={saveShapes}
        selectionMode={selectionMode}
        setSelectionMode={setSelectionMode}
        setCanvasMoveAcceleration={setCanvasMoveAcceleration}
        selectionColor={canvasSelectionColor}
        selectionWidth={canvasSelectionWidth}
        isEditMode={isEditMode}
        isShiftPressed={isShiftPressed}
        isAltPressed={isAltPressed}
        withFrameSelection={withFrameSelection}
        withSkeleton={withSkeleton}
      />
    </div>
  )
}

export default App
