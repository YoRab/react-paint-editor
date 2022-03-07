import React, { useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { styled } from '@linaria/react'
import _ from 'lodash/fp'
import { DrawableShape, Point, ShapeEnum, StyledShape, ToolEnum, ToolsType } from 'types/Shapes'
import { drawSelection, drawShape } from 'utils/draw'
import { SelectionModeData, SelectionModeLib } from 'types/Mode'
import { calculateTextWidth } from 'utils/transform'
import { FRAMERATE_DRAW } from 'constants/draw'
import EditTextBox from './toolbox/EditTextBox'
import useDrawableCanvas from 'hooks/useDrawableCanvas'
import { encodedTransparentIcon } from 'constants/icons'

const drawCanvas = (
  drawCtx: CanvasRenderingContext2D,
  selectionCtx: CanvasRenderingContext2D,
  selectionMode: SelectionModeData<number | Point>,
  width: number,
  height: number,
  activeTool: ToolsType,
  canvasOffset: Point,
  shapes: DrawableShape[],
  selectedShape: DrawableShape | undefined
) => {
  drawCtx.clearRect(0, 0, width, height)
  selectionCtx.clearRect(0, 0, width, height)
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (selectionMode.mode !== SelectionModeLib.textedition || shapes[i] !== selectedShape) {
      drawShape(drawCtx, shapes[i], canvasOffset)
    }
  }
  selectedShape &&
    activeTool !== ShapeEnum.brush &&
    drawSelection({
      ctx: selectionCtx,
      shape: selectedShape,
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
  background: white url('data:image/svg+xml,${encodedTransparentIcon}');
  background-repeat: repeat;
  background-size: 16px;
  overflow: hidden;
`

const StyledDrawCanvas = styled.canvas`
  position: absolute;
  user-select: none;
  max-width: 100%;
  touch-action: none; /* prevent scroll on touch */
  display: block;
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
`

type DrawerType = {
  disabled?: boolean
  width: number
  height: number
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
      disabled = false,
      width,
      height,
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
      drawCanvasRef,
      setActiveTool,
      shapes,
      defaultConf,
      selectionMode,
      width,
      height,
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
        _.throttle(FRAMERATE_DRAW, drawCanvas)(
          drawCtx,
          selectionCtx,
          selectionMode,
          width,
          height,
          activeTool,
          canvasOffset,
          shapes,
          selectedShape
        )
    }, [shapes, selectionMode, selectedShape, activeTool, canvasOffset, width, height])

    return (
      <StyledCanvasBox>
        <StyledCanvasContainer>
          <StyledDrawCanvas ref={drawCanvasRef} width={width} height={height} />
          <StyledSelectionCanvas
            ref={selectionCanvasRef}
            width={width}
            height={height}
            cursor={
              (activeTool !== ToolEnum.selection && activeTool !== ToolEnum.move) ||
              hoverMode.mode === SelectionModeLib.resize
                ? 'cursor: crosshair'
                : activeTool === ToolEnum.move || hoverMode.mode === SelectionModeLib.translate
                ? 'cursor:move'
                : hoverMode.mode === SelectionModeLib.rotate
                ? 'cursor:grab'
                : 'cursor:default'
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
