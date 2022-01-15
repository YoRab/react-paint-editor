import React, { RefObject, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import styled from 'styled-components'
import _ from 'lodash/fp'
import { DrawableShape, Point, ShapeEnum, StyledShape, ToolEnum, ToolsType } from 'types/Shapes'
import { drawSelection, drawShape } from 'utils/draw'
import { SelectionModeData, SelectionModeLib } from 'types/Mode'
import { calculateTextWidth } from 'utils/transform'
import { FRAMERATE_DRAW } from 'constants/draw'
import EditTextBox from './toolbox/EditTextBox'
import useDrawableCanvas from 'hooks/useDrawableCanvas'

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
  background: lightgray;
`

const StyledCanvasContainer = styled.div`
  position: relative;
  background: white;
  overflow: hidden;
`

const StyledDrawCanvas = styled.canvas.attrs<{
  width: number
  height: number
  ref: RefObject<HTMLCanvasElement>
}>(({ width, height }) => ({
  width: width,
  height: height
}))<{
  width: number
  height: number
}>`
  position: absolute;
  user-select: none;
  max-width: 100%;
  touch-action: none; /* prevent scroll on touch */
`

const StyledSelectionCanvas = styled.canvas.attrs<{
  width: number
  height: number
  ref: RefObject<HTMLCanvasElement>
}>(({ width, height }) => ({
  width: width,
  height: height
}))<{
  activetool: ToolsType
  selectionmode: SelectionModeLib
  width: number
  height: number
}>`
  user-select: none;
  position: relative;
  max-width: 100%;
  touch-action: none; /* prevent scroll on touch */

  ${({ selectionmode, activetool }) =>
    (activetool !== ToolEnum.selection && activetool !== ToolEnum.move) ||
    selectionmode === SelectionModeLib.resize
      ? 'cursor: crosshair'
      : activetool === ToolEnum.move || selectionmode === SelectionModeLib.translate
      ? 'cursor:move'
      : selectionmode === SelectionModeLib.rotate
      ? 'cursor:grab'
      : 'cursor:default'}
`

type DrawerType = {
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
            activetool={activeTool}
            selectionmode={hoverMode.mode}
            ref={selectionCanvasRef}
            width={width}
            height={height}
          />
          {selectionMode.mode === SelectionModeLib.textedition &&
            selectedShape?.type === ShapeEnum.text && (
              <EditTextBox
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
