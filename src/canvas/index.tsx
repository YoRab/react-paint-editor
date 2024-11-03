import Canvas from '@canvas/components/Canvas'
import { DEFAULT_CANVAS_OPTIONS } from '@canvas/constants/app'
import useKeyboard from '@canvas/hooks/useKeyboard'
import type { UseReactPaintReturnType } from '@canvas/hooks/useReactPaint'
import useResizeObserver from '@canvas/hooks/useResizeObserver'
import type { SelectionModeData } from '@common/types/Mode'
import type { Point, ShapeEntity } from '@common/types/Shapes'
import React, { type CSSProperties, useCallback, useRef, useState } from 'react'
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
    canvasSize,
    setCanvasSize,
    setCanvasOffset,
    selectShape,
    activeTool,
    setActiveTool,
    isInsideComponent,
    isEditMode,
    isDisabled,
    canvas: { withSkeleton, withFrameSelection, canGrow, canShrink }
  } = canvasProps

  const { canvasBackgroundColor, canvasSelectionColor, canvasSelectionWidth } = {
    ...DEFAULT_CANVAS_OPTIONS,
    ...options
  }

  const containerRef = useRef<HTMLDivElement>(null)

  const [canvasOffsetStartData, setCanvasOffsetStartData] = useState<{ start: Point; originalOffset: Point } | undefined>(undefined)

  const [selectionMode, setSelectionMode] = useState<SelectionModeData<Point | number>>({
    mode: 'default'
  })

  const [isShiftPressed, setShiftPressed] = useState<boolean>(false)

  const pasteShape = useCallback(
    (shape: ShapeEntity) => {
      addShape(shape)
      selectShape(shape)
    },
    [addShape, selectShape]
  )

  const onResized = useCallback(
    (measuredWidth: number) => {
      const scaleRatio = measuredWidth / width
      setCanvasSize({ width: measuredWidth, height: height * scaleRatio, scaleRatio })
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
    pasteShape,
    updateShape,
    backwardShape,
    forwardShape,
    setShiftPressed
  })

  useResizeObserver({ element: containerRef, onResized })

  return (
    <div
      ref={containerRef}
      className={`react-paint-app-row${className ? ` ${className}` : ''}`}
      data-grow={canGrow}
      data-shrink={canShrink}
      style={{
        '--react-paint-app-row-width': canvasSize.width,
        '--react-paint-app-canvaswidth': `${width}px`,
        '--react-paint-app-row-aspectratio': `calc(${canvasSize.width} / ${canvasSize.height})`,
        '--react-paint-app-canvas-bg': canvasBackgroundColor,
        ...style
      }}
    >
      <Canvas
        ref={refs.canvas}
        canGrow={canGrow}
        disabled={isDisabled}
        isInsideComponent={isInsideComponent}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        canvasOffsetStartData={canvasOffsetStartData}
        setCanvasOffsetStartData={setCanvasOffsetStartData}
        shapes={shapesRef.current}
        addShape={addShape}
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
        canvasSize={canvasSize}
        selectionMode={selectionMode}
        setSelectionMode={setSelectionMode}
        selectionColor={canvasSelectionColor}
        selectionWidth={canvasSelectionWidth}
        isEditMode={isEditMode}
        isShiftPressed={isShiftPressed}
        withFrameSelection={withFrameSelection}
        withSkeleton={withSkeleton}
      />
    </div>
  )
}

export default App
