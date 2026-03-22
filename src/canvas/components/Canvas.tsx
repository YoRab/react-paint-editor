import { DRAWCANVAS_CLASSNAME, SELECTIONCANVAS_CLASSNAME, type UtilsSettings } from '@canvas/constants/app'
import { useCanvasContext } from '@canvas/context/CanvasContext'
import useDrawableCanvas from '@canvas/hooks/useDrawableCanvas'
import { initCanvasContext } from '@canvas/utils/canvas'
import { drawGrid } from '@canvas/utils/grid'
import { drawSelectionFrame, drawShape, drawShapeSelection, refreshShape } from '@canvas/utils/shapes'
import { resizeTextShapeWithNewContent } from '@canvas/utils/shapes/text'
import { clipMask, drawMask, getCurrentView } from '@canvas/utils/zoom'
import type { HoverModeData, SelectionModeData } from '@common/types/Mode'
import type { Point, SelectionType, ShapeEntity } from '@common/types/Shapes'
import type { ToolsType } from '@common/types/tools'
import { getSelectedShapes } from '@common/utils/selection'
import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import './Canvas.css'
import EditTextBox from './EditTextBox'

const renderDrawCanvas = (
  drawCtx: CanvasRenderingContext2D,
  selectionMode: SelectionModeData<number | Point>,
  settings: UtilsSettings,
  shapes: ShapeEntity[],
  selectedShape: SelectionType | undefined
) => {
  initCanvasContext(drawCtx)
  drawMask(drawCtx, settings)
  drawGrid(drawCtx, settings)
  const currentView = getCurrentView(settings)
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (selectionMode.mode === 'textedition' && shapes[i] === selectedShape) continue
    drawShape(drawCtx, getSelectedShapes(selectedShape).find(selected => selected.id === shapes[i]!.id) ?? shapes[i]!, settings, currentView)
  }
}

const renderSelectionCanvas = (
  selectionCtx: CanvasRenderingContext2D,
  selectionMode: SelectionModeData<number | Point>,
  settings: UtilsSettings,
  activeTool: ToolsType,
  selectionWidth: number,
  selectionColor: string,
  selectedShape: SelectionType | undefined,
  hoveredShape: ShapeEntity | undefined,
  hoverMode: HoverModeData,
  selectionFrame: { oldSelection: SelectionType | undefined; frame: [Point, Point] } | undefined,
  withSkeleton: boolean
) => {
  selectionCtx.reset()
  clipMask(selectionCtx, settings)

  withSkeleton &&
    hoveredShape &&
    !getSelectedShapes(selectedShape).find(selected => selected.id === hoveredShape.id) &&
    activeTool.type === 'selection' &&
    (selectionMode.mode === 'default' || selectionMode.mode === 'contextMenu' || selectionMode.mode === 'textedition') &&
    drawShapeSelection({
      ctx: selectionCtx,
      shape: hoveredShape,
      settings,
      selectionWidth,
      selectionColor,
      hoverMode,
      selectionMode,
      withAnchors: false
    })

  selectedShape &&
    activeTool.type !== 'brush' &&
    drawShapeSelection({
      ctx: selectionCtx,
      shape: selectedShape,
      settings,
      selectionWidth,
      selectionColor,
      hoverMode,
      selectionMode,
      withAnchors: selectionMode.mode !== 'textedition'
    })

  selectionFrame &&
    drawSelectionFrame({
      ctx: selectionCtx,
      selectionFrame,
      settings
    })
}

const Canvas = React.forwardRef<HTMLCanvasElement>((_, ref) => {
  const {
    shapes,
    settings,
    selectedShape,
    hoveredShape,
    selectionFrame,
    selectionMode,
    activeTool,
    canvasOffsetStartData,
    isSpacePressed,
    selectionColor,
    selectionWidth,
    isEditMode,
    canGrow,
    withSkeleton,
    updateSingleShape,
    saveShapes
  } = useCanvasContext()

  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const selectionCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasSize = settings.canvasSize
  const withSelectionCanvas = isEditMode
  const tabIndex = isEditMode ? 0 : -1

  useImperativeHandle(ref, () => drawCanvasRef.current!)

  const { hoverMode } = useDrawableCanvas(drawCanvasRef)

  const updateSelectedShapeText = useCallback(
    (newText: string[]) => {
      const firstShape = getSelectedShapes(selectedShape)[0]
      if (firstShape?.type !== 'text') return

      const ctx = drawCanvasRef.current?.getContext('2d')
      if (!ctx) return

      const newShape = refreshShape(resizeTextShapeWithNewContent(ctx, firstShape, newText, settings), settings)

      updateSingleShape([newShape])
    },
    [updateSingleShape, selectedShape, settings]
  )

  const preventRightClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isEditMode) return
    e.preventDefault()
    e.stopPropagation()
    return false
  }

  useEffect(() => {
    const drawCtx = drawCanvasRef.current?.getContext('2d')
    drawCtx && window.requestAnimationFrame(() => renderDrawCanvas(drawCtx, selectionMode, settings, shapes, selectedShape))
  }, [shapes, selectionMode, selectedShape, settings])

  useEffect(() => {
    const selectionCtx = selectionCanvasRef.current?.getContext('2d')

    selectionCtx &&
      window.requestAnimationFrame(() =>
        renderSelectionCanvas(
          selectionCtx,
          selectionMode,
          settings,
          activeTool,
          selectionWidth,
          selectionColor,
          selectedShape,
          hoveredShape,
          hoverMode,
          selectionFrame,
          withSkeleton
        )
      )
  }, [hoveredShape, hoverMode, selectionFrame, selectionMode, selectedShape, activeTool, settings, selectionWidth, selectionColor, withSkeleton])

  return (
    <div
      className='react-paint-canvas-box'
      style={{
        '--react-paint-canvas-cursor': canvasOffsetStartData
          ? 'grabbing'
          : hoverMode.outOfView
            ? 'default'
            : hoverMode.mode === 'resize'
              ? 'pointer'
              : activeTool.type !== 'selection' && activeTool.type !== 'move'
                ? 'crosshair'
                : hoverMode.mode === 'translate'
                  ? 'move'
                  : hoverMode.mode === 'rotate' || activeTool.type === 'move' || isSpacePressed
                    ? 'grab'
                    : 'default'
      }}
    >
      <div className='react-paint-canvas-container' data-grow={canGrow}>
        <canvas
          className={DRAWCANVAS_CLASSNAME}
          ref={drawCanvasRef}
          data-grow={canGrow}
          width={canvasSize.width}
          height={canvasSize.height}
          onContextMenu={preventRightClick}
          tabIndex={tabIndex}
        />
        {withSelectionCanvas && (
          <canvas
            className={SELECTIONCANVAS_CLASSNAME}
            ref={selectionCanvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            data-grow={canGrow}
            onContextMenu={preventRightClick}
          />
        )}
        {isEditMode && selectionMode.mode === 'textedition' && getSelectedShapes(selectedShape)[0]?.type === 'text' && (
          <EditTextBox
            disabled={!settings.features.edition}
            shape={getSelectedShapes(selectedShape)[0] as ShapeEntity<'text'>}
            defaultValue={selectionMode.defaultValue}
            updateValue={updateSelectedShapeText}
            saveShapes={saveShapes}
            settings={settings}
          />
        )}
      </div>
    </div>
  )
})

export default Canvas
