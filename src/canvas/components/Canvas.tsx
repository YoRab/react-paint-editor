import { DRAWCANVAS_CLASSNAME, SELECTIONCANVAS_CLASSNAME, type UtilsSettings } from '@canvas/constants/app'
import useDrawableCanvas from '@canvas/hooks/useDrawableCanvas'
import { initCanvasContext } from '@canvas/utils/canvas'
import { drawGrid } from '@canvas/utils/grid'
import { drawSelectionFrame, drawShape, drawShapeSelection, refreshShape } from '@canvas/utils/shapes'
import { resizeTextShapeWithNewContent } from '@canvas/utils/shapes/text'
import type { HoverModeData, SelectionModeData } from '@common/types/Mode'
import type { Point, ShapeEntity } from '@common/types/Shapes'
import type { ToolsType } from '@common/types/tools'
import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import './Canvas.css'
import { clipMask, drawMask } from '@canvas/utils/zoom'
import EditTextBox from './EditTextBox'

const renderDrawCanvas = (
  drawCtx: CanvasRenderingContext2D,
  selectionMode: SelectionModeData<number | Point>,
  settings: UtilsSettings,
  shapes: ShapeEntity[],
  selectedShape: ShapeEntity | undefined
) => {
  initCanvasContext(drawCtx)
  drawMask(drawCtx, settings)
  drawGrid(drawCtx, settings)
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (selectionMode.mode === 'textedition' && shapes[i] === selectedShape) continue
    drawShape(drawCtx, shapes[i].id === selectedShape?.id ? selectedShape : shapes[i], settings)
  }
}

const renderSelectionCanvas = (
  selectionCtx: CanvasRenderingContext2D,
  selectionMode: SelectionModeData<number | Point>,
  settings: UtilsSettings,
  activeTool: ToolsType,
  selectionWidth: number,
  selectionColor: string,
  selectedShape: ShapeEntity | undefined,
  hoveredShape: ShapeEntity | undefined,
  hoverMode: HoverModeData,
  selectionFrame: [Point, Point] | undefined,
  withSkeleton: boolean
) => {
  selectionCtx.reset()
  clipMask(selectionCtx, settings)

  withSkeleton &&
    hoveredShape &&
    hoveredShape.id !== selectedShape?.id &&
    activeTool.type === 'selection' &&
    selectionMode.mode === 'default' &&
    drawShapeSelection({
      ctx: selectionCtx,
      shape: hoveredShape,
      settings,
      selectionWidth,
      selectionColor,
      hoverMode,
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
      withAnchors: selectionMode.mode !== 'textedition'
    })

  selectionFrame &&
    drawSelectionFrame({
      ctx: selectionCtx,
      selectionFrame,
      settings
    })
}

type DrawerType = {
  canGrow?: boolean
  selectionColor: string
  selectionWidth: number
  settings: UtilsSettings
  isEditMode: boolean
  shapes: ShapeEntity[]
  saveShapes: () => void
  addShape: (newShape: ShapeEntity) => void
  updateSingleShape: (updatedShape: ShapeEntity, withSave?: boolean) => void
  selectedShape: ShapeEntity | undefined
  setSelectedShape: React.Dispatch<React.SetStateAction<ShapeEntity | undefined>>
  setSelectionFrame: React.Dispatch<React.SetStateAction<[Point, Point] | undefined>>
  hoveredShape: ShapeEntity | undefined
  selectionFrame: [Point, Point] | undefined
  refreshHoveredShape: (e: MouseEvent | TouchEvent, ctx: CanvasRenderingContext2D, cursorPosition: Point, isInsideMask: boolean) => void
  refreshSelectedShapes: (ctx: CanvasRenderingContext2D, cursorPosition: Point, settings: UtilsSettings) => void
  activeTool: ToolsType
  setActiveTool: React.Dispatch<React.SetStateAction<ToolsType>>
  canvasOffsetStartData: { start: Point; originalOffset: Point } | undefined
  setCanvasOffsetStartData: React.Dispatch<React.SetStateAction<{ start: Point; originalOffset: Point } | undefined>>
  setCanvasOffset: (offset: Point) => void
  isInsideComponent: boolean
  selectionMode: SelectionModeData<number | Point>
  setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeData<number | Point>>>
  isShiftPressed: boolean
  isAltPressed: boolean
  withFrameSelection: boolean
  withSkeleton: boolean
}

const Canvas = React.forwardRef<HTMLCanvasElement, DrawerType>(
  (
    {
      canGrow,
      shapes,
      addShape,
      updateSingleShape,
      selectedShape,
      setSelectedShape,
      setSelectionFrame,
      hoveredShape,
      selectionFrame,
      refreshHoveredShape,
      refreshSelectedShapes,
      saveShapes,
      activeTool,
      setActiveTool,
      canvasOffsetStartData,
      setCanvasOffsetStartData,
      setCanvasOffset,
      isInsideComponent,
      selectionMode,
      setSelectionMode,
      selectionWidth,
      selectionColor,
      settings,
      isEditMode,
      isShiftPressed,
      isAltPressed,
      withFrameSelection,
      withSkeleton
    },
    ref
  ) => {
    const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const selectionCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const canvasSize = settings.canvasSize
    const withSelectionCanvas = isEditMode

    useImperativeHandle(ref, () => drawCanvasRef.current!)

    const { hoverMode } = useDrawableCanvas({
      addShape,
      drawCanvasRef,
      setActiveTool,
      shapes,
      selectionMode,
      activeTool,
      isInsideComponent,
      setCanvasOffset,
      selectedShape,
      canvasOffsetStartData,
      setCanvasOffsetStartData,
      setSelectedShape,
      setSelectionFrame,
      refreshHoveredShape,
      refreshSelectedShapes,
      updateSingleShape,
      saveShapes,
      setSelectionMode,
      isShiftPressed,
      isAltPressed,
      withFrameSelection,
      settings
    })
    const updateSelectedShapeText = useCallback(
      (newText: string[]) => {
        if (selectedShape?.type !== 'text') return

        const ctx = drawCanvasRef.current?.getContext('2d')
        if (!ctx) return

        const newShape = refreshShape(resizeTextShapeWithNewContent(ctx, selectedShape, newText, settings), settings)

        updateSingleShape(newShape)
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
                    : hoverMode.mode === 'rotate' || activeTool.type === 'move'
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
          {isEditMode && selectionMode.mode === 'textedition' && selectedShape?.type === 'text' && (
            <EditTextBox
              disabled={!settings.features.edition}
              shape={selectedShape}
              defaultValue={selectionMode.defaultValue}
              updateValue={updateSelectedShapeText}
              saveShapes={saveShapes}
              settings={settings}
            />
          )}
        </div>
      </div>
    )
  }
)

export default Canvas
