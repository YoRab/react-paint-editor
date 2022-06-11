import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { styled } from '@linaria/react'
import _ from 'lodash/fp'
import { DrawableShape, Point, ShapeEnum, StyledShape, ToolEnum, ToolsType } from 'types/Shapes'
import { drawSelection, drawShape } from 'utils/draw'
import { SelectionModeData, SelectionModeLib } from 'types/Mode'
import { calculateTextWidth } from 'utils/transform'
import EditTextBox from './toolbox/EditTextBox'
import useDrawableCanvas from 'hooks/useDrawableCanvas'
import { encodedTransparentIcon } from 'constants/icons'

const drawCanvas = (
  drawCtx: CanvasRenderingContext2D,
  selectionCtx: CanvasRenderingContext2D,
  selectionMode: SelectionModeData<number | Point>,
  canvasSize: {
    width: number
    height: number
    scaleRatio: number
  },
  activeTool: ToolsType,
  canvasOffset: Point,
  shapes: DrawableShape[],
  selectedShape: DrawableShape | undefined
) => {
  const { width, height, scaleRatio } = canvasSize
  drawCtx.clearRect(0, 0, width, height)
  selectionCtx.clearRect(0, 0, width, height)
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (selectionMode.mode !== SelectionModeLib.textedition || shapes[i] !== selectedShape) {
      drawShape(drawCtx, shapes[i], scaleRatio, canvasOffset)
    }
  }
  selectedShape &&
    activeTool !== ShapeEnum.brush &&
    drawSelection({
      ctx: selectionCtx,
      shape: selectedShape,
      scaleRatio,
      canvasOffset,
      withAnchors: selectionMode.mode !== SelectionModeLib.textedition
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
  background-color: white;
  background-repeat: repeat;
  background-size: 16px;
  overflow: hidden;

  &[data-grid='true'] {
    background-image: url('data:image/svg+xml,${encodedTransparentIcon}');
  }

  &[data-grow='true'] {
    width: 100%;
    height: 100%;
  }
`

const StyledDrawCanvas = styled.canvas`
  position: absolute;
  user-select: none;
  max-width: 100%;
  touch-action: none; /* prevent scroll on touch */
  display: block;

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
  cursor: ${({ cursor }) => cursor};

  &[data-grow='true'] {
    width: 100%;
  }
`

type DrawerType = {
  withGrid: boolean
  disabled?: boolean
  canGrow?: boolean
  canvasSize: {
    width: number
    height: number
    scaleRatio: number
  }
  shapes: DrawableShape[]
  saveShapes: () => void
  addShape: (newShape: DrawableShape) => void
  updateSingleShape: (updatedShape: DrawableShape) => void
  selectedShape: DrawableShape | undefined
  setSelectedShape: React.Dispatch<React.SetStateAction<DrawableShape | undefined>>
  activeTool: ToolsType
  setActiveTool: React.Dispatch<React.SetStateAction<ToolsType>>
  canvasOffsetStartPosition: Point | undefined
  setCanvasOffsetStartPosition: React.Dispatch<React.SetStateAction<Point | undefined>>
  canvasOffset: Point
  setCanvasOffset: React.Dispatch<React.SetStateAction<Point>>
  defaultConf: StyledShape
  isInsideComponent: boolean
  selectionMode: SelectionModeData<number | Point>
  setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeData<number | Point>>>
}

const Canvas = React.forwardRef<HTMLCanvasElement, DrawerType>(
  (
    {
      withGrid,
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
      defaultConf,
      isInsideComponent,
      selectionMode,
      setSelectionMode
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
      defaultConf,
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
      canvasOffset,
      saveShapes,
      setSelectionMode
    })

    const updateSelectedShapeText = useCallback(
      (newText: string[]) => {
        if (selectedShape?.type !== ShapeEnum.text) return

        const ctx = drawCanvasRef.current?.getContext('2d')
        if (!ctx) return
        const newShape = _.set('value', newText, selectedShape)
        const newWidth = calculateTextWidth(
          ctx,
          newShape.value,
          newShape.fontSize,
          newShape.style?.fontFamily
        )
        const resizedShape = {
          ...newShape,
          width: newWidth,
          height: newShape.fontSize * newShape.value.length
        }
        updateSingleShape(resizedShape)
      },
      [updateSingleShape, selectedShape]
    )

    useEffect(() => {
      const drawCtx = drawCanvasRef.current?.getContext('2d')
      const selectionCtx = selectionCanvasRef.current?.getContext('2d')

      drawCtx &&
        selectionCtx &&
        window.requestAnimationFrame(() =>
          drawCanvas(
            drawCtx,
            selectionCtx,
            selectionMode,
            canvasSize,
            activeTool,
            canvasOffset,
            shapes,
            selectedShape
          )
        )
    }, [shapes, selectionMode, selectedShape, activeTool, canvasOffset, canvasSize])

    return (
      <StyledCanvasBox>
        <StyledCanvasContainer data-grid={withGrid} data-grow={canGrow}>
          <StyledDrawCanvas
            ref={drawCanvasRef}
            data-grow={canGrow}
            width={canvasSize.width}
            height={canvasSize.height}
          />
          <StyledSelectionCanvas
            ref={selectionCanvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            data-grow={canGrow}
            cursor={
              (activeTool !== ToolEnum.selection && activeTool !== ToolEnum.move) ||
              hoverMode.mode === SelectionModeLib.resize
                ? 'crosshair'
                : activeTool === ToolEnum.move || hoverMode.mode === SelectionModeLib.translate
                ? 'move'
                : hoverMode.mode === SelectionModeLib.rotate
                ? 'grab'
                : 'default'
            }
          />
          {selectionMode.mode === SelectionModeLib.textedition &&
            selectedShape?.type === ShapeEnum.text && (
              <EditTextBox
                disabled={disabled}
                shape={selectedShape}
                defaultValue={selectionMode.defaultValue}
                updateValue={updateSelectedShapeText}
              />
            )}
        </StyledCanvasContainer>
      </StyledCanvasBox>
    )
  }
)

export default Canvas
