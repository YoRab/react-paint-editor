import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { styled } from '@linaria/react'
import type { Point, ShapeEntity } from 'types/Shapes'
import { initCanvasContext } from 'utils/canvas'
import type { SelectionModeData } from 'types/Mode'
import EditTextBox from './toolbox/EditTextBox'
import useDrawableCanvas from 'hooks/useDrawableCanvas'
import type { ToolsType } from 'types/tools'
import type { GridFormatType } from 'constants/app'
import { drawShapeSelection, drawShape } from 'utils/shapes'
import { resizeTextShapeWithNewContent } from 'utils/shapes/text'
import { drawGrid } from 'utils/shapes/grid'

const renderDrawCanvas = (
  drawCtx: CanvasRenderingContext2D,
  selectionMode: SelectionModeData<number | Point>,
  canvasSize: {
    width: number
    height: number
    scaleRatio: number
  },
  gridFormat: GridFormatType,
  canvasOffset: Point,
  shapes: ShapeEntity[],
  selectionPadding: number,
  selectedShape: ShapeEntity | undefined
) => {
  const { width, height, scaleRatio } = canvasSize
  drawCtx.clearRect(0, 0, width, height)
  initCanvasContext(drawCtx)
  gridFormat && drawGrid(drawCtx, width, height, scaleRatio, canvasOffset, gridFormat)
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (selectionMode.mode !== 'textedition' || shapes[i] !== selectedShape) {
      drawShape(drawCtx, shapes[i], scaleRatio, canvasOffset, selectionPadding)
    }
  }
}

const renderSelectionCanvas = (
  selectionCtx: CanvasRenderingContext2D,
  selectionMode: SelectionModeData<number | Point>,
  canvasSize: {
    width: number
    height: number
    scaleRatio: number
  },
  activeTool: ToolsType,
  canvasOffset: Point,
  selectionPadding: number,
  selectionWidth: number,
  selectionColor: string,
  selectedShape: ShapeEntity | undefined
) => {
  const { width, height, scaleRatio } = canvasSize
  selectionCtx.clearRect(0, 0, width, height)
  selectedShape &&
    activeTool.type !== 'brush' &&
    drawShapeSelection({
      ctx: selectionCtx,
      shape: selectedShape,
      scaleRatio,
      canvasOffset,
      selectionPadding,
      selectionWidth,
      selectionColor,
      withAnchors: selectionMode.mode !== 'textedition'
    })
}

const StyledCanvasBox = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`

const StyledCanvasContainer = styled.div`
  position: relative;
  background-color: var(--canvas-bg);
  background-repeat: repeat;
  background-size: 16px;
  overflow: hidden;
  display: grid;

  &[data-grow='true'] {
    width: 100%;
    height: 100%;
  }
`

const StyledDrawCanvas = styled.canvas`
  user-select: none;
  max-width: 100%;
  touch-action: none; /* prevent scroll on touch */
  display: block;
  grid-area: 1 / 1;

  &[data-grow='true'] {
    width: 100%;
  }
`

const StyledSelectionCanvas = styled.canvas<{
  cursor: string
}>`
  user-select: none;
  position: relative;
  max-width: 100%;
  touch-action: none; /* prevent scroll on touch */
  display: block;
  grid-area: 1 / 1;
  cursor: ${({ cursor }) => cursor};

  &[data-grow='true'] {
    width: 100%;
  }
`

type DrawerType = {
  gridFormat: GridFormatType
  disabled?: boolean
  canGrow?: boolean
  canvasSize: {
    width: number
    height: number
    scaleRatio: number
  }
  selectionColor: string
  selectionWidth: number
  selectionPadding: number
  isEditMode: boolean
  shapes: ShapeEntity[]
  saveShapes: () => void
  addShape: (newShape: ShapeEntity) => void
  updateSingleShape: (updatedShape: ShapeEntity) => void
  selectedShape: ShapeEntity | undefined
  setSelectedShape: React.Dispatch<React.SetStateAction<ShapeEntity | undefined>>
  activeTool: ToolsType
  setActiveTool: React.Dispatch<React.SetStateAction<ToolsType>>
  canvasOffsetStartPosition: Point | undefined
  setCanvasOffsetStartPosition: React.Dispatch<React.SetStateAction<Point | undefined>>
  canvasOffset: Point
  setCanvasOffset: React.Dispatch<React.SetStateAction<Point>>
  isInsideComponent: boolean
  selectionMode: SelectionModeData<number | Point>
  setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeData<number | Point>>>
  isShiftPressed: boolean
}

const Canvas = React.forwardRef<HTMLCanvasElement, DrawerType>(
  (
    {
      gridFormat,
      canGrow,
      disabled = false,
      canvasSize,
      shapes,
      addShape,
      updateSingleShape,
      selectedShape,
      setSelectedShape,
      saveShapes,
      activeTool,
      setActiveTool,
      canvasOffsetStartPosition,
      setCanvasOffsetStartPosition,
      canvasOffset,
      setCanvasOffset,
      isInsideComponent,
      selectionMode,
      setSelectionMode,
      selectionWidth,
      selectionColor,
      selectionPadding,
      isEditMode,
      isShiftPressed
    },
    ref
  ) => {
    const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const selectionCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    useImperativeHandle(ref, () => drawCanvasRef.current!)

    const { hoverMode } = useDrawableCanvas({
      disabled,
      addShape,
      canvasSize,
      drawCanvasRef,
      setActiveTool,
      shapes,
      selectionMode,
      activeTool,
      isInsideComponent,
      setCanvasOffset,
      selectedShape,
      selectionCanvasRef,
      canvasOffsetStartPosition,
      setSelectedShape,
      setCanvasOffsetStartPosition,
      updateSingleShape,
      gridFormat,
      canvasOffset,
      saveShapes,
      setSelectionMode,
      selectionPadding,
      isShiftPressed
    })

    const updateSelectedShapeText = useCallback(
      (newText: string[]) => {
        if (selectedShape?.type !== 'text') return

        const ctx = drawCanvasRef.current?.getContext('2d')
        if (!ctx) return

        const newShape = resizeTextShapeWithNewContent(ctx, selectedShape, newText, canvasOffset)

        updateSingleShape(newShape)
      },
      [updateSingleShape, selectedShape, canvasOffset]
    )

    useEffect(() => {
      const drawCtx = drawCanvasRef.current?.getContext('2d')

      drawCtx &&
        window.requestAnimationFrame(() =>
          renderDrawCanvas(
            drawCtx,
            selectionMode,
            canvasSize,
            gridFormat,
            canvasOffset,
            shapes,
            selectionPadding,
            selectedShape
          )
        )
    }, [
      shapes,
      gridFormat,
      selectionMode,
      selectedShape,
      canvasOffset,
      canvasSize,
      selectionPadding
    ])

    useEffect(() => {
      const selectionCtx = selectionCanvasRef.current?.getContext('2d')

      selectionCtx &&
        window.requestAnimationFrame(() =>
          renderSelectionCanvas(
            selectionCtx,
            selectionMode,
            canvasSize,
            activeTool,
            canvasOffset,
            selectionPadding,
            selectionWidth,
            selectionColor,
            selectedShape
          )
        )
    }, [
      selectionMode,
      selectedShape,
      activeTool,
      canvasOffset,
      canvasSize,
      selectionPadding,
      selectionWidth,
      selectionColor
    ])

    return (
      <StyledCanvasBox>
        <StyledCanvasContainer data-grow={canGrow}>
          <StyledDrawCanvas
            ref={drawCanvasRef}
            data-grow={canGrow}
            width={canvasSize.width}
            height={canvasSize.height}
          />
          {isEditMode && (
            <StyledSelectionCanvas
              ref={selectionCanvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              data-grow={canGrow}
              cursor={
                (activeTool.type !== 'selection' && activeTool.type !== 'move') ||
                hoverMode.mode === 'resize'
                  ? 'crosshair'
                  : activeTool.type === 'move' || hoverMode.mode === 'translate'
                  ? 'move'
                  : hoverMode.mode === 'rotate'
                  ? 'grab'
                  : 'default'
              }
            />
          )}
          {isEditMode && selectionMode.mode === 'textedition' && selectedShape?.type === 'text' && (
            <EditTextBox
              scaleRatio={canvasSize.scaleRatio}
              disabled={disabled}
              shape={selectedShape}
              defaultValue={selectionMode.defaultValue}
              updateValue={updateSelectedShapeText}
              saveShapes={saveShapes}
              selectionPadding={selectionPadding}
            />
          )}
        </StyledCanvasContainer>
      </StyledCanvasBox>
    )
  }
)

export default Canvas
