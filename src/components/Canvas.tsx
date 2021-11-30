import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import _ from 'lodash/fp'
import { createShape, selectShape } from 'utils/selection'
import { DrawableShape, Point, ShapeEnum, StyledShape, ToolEnum, ToolsType } from 'types/Shapes'
import { checkPositionIntersection, getCursorPosition } from 'utils/intersect'
import { drawSelection, drawShape } from 'utils/draw'
import { HoverModeData, SelectionModeData, SelectionModeLib } from 'types/Mode'
import { transformShape } from 'utils/transform'
import { FRAMERATE_DRAW, FRAMERATE_SELECTION } from 'constants/draw'
import { useCombinedRefs } from 'utils/reactUtils'

const drawCanvas = (
  drawCtx: CanvasRenderingContext2D,
  selectionCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  canvasOffset: Point,
  shapes: DrawableShape[],
  selectedShape: DrawableShape | undefined
) => {
  drawCtx.clearRect(0, 0, width, height)
  selectionCtx.clearRect(0, 0, width, height)
  for (let i = shapes.length - 1; i >= 0; i--) {
    drawShape(drawCtx, shapes[i], canvasOffset)
  }
  selectedShape && drawSelection({ ctx: selectionCtx, shape: selectedShape, canvasOffset })
}

const throttledDrawCanvas = _.throttle(FRAMERATE_DRAW, drawCanvas)

const handleSelection = (
  e: MouseEvent,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  activeTool: ToolsType,
  canvasOffset: Point,
  selectedShape: DrawableShape | undefined,
  selectionMode: SelectionModeData<Point | number>,
  canvasOffsetStartPosition: Point | undefined,
  width: number,
  height: number,
  setHoverMode: React.Dispatch<React.SetStateAction<HoverModeData>>,
  updateSingleShape: (updatedShape: DrawableShape) => void,
  setCanvasOffset: React.Dispatch<React.SetStateAction<Point>>,
  setSelectedShape: React.Dispatch<React.SetStateAction<DrawableShape | undefined>>
) => {
  if (activeTool === ToolEnum.move && canvasOffsetStartPosition !== undefined) {
    const cursorPosition = getCursorPosition(e, canvasRef.current, width, height)
    setCanvasOffset([
      cursorPosition[0] - canvasOffsetStartPosition[0],
      cursorPosition[1] - canvasOffsetStartPosition[1]
    ])
  }
  if (selectedShape == undefined) return
  const cursorPosition = getCursorPosition(e, canvasRef.current, width, height)

  if (selectionMode.mode === SelectionModeLib.default) {
    const positionIntersection = checkPositionIntersection(
      selectedShape,
      cursorPosition,
      canvasOffset,
      true
    ) || {
      mode: SelectionModeLib.default
    }
    setHoverMode(positionIntersection)
  } else {
    const newShape = transformShape(selectedShape, cursorPosition, canvasOffset, selectionMode)
    updateSingleShape(newShape)
    setSelectedShape(newShape)
  }
}

const throttledHandleSelection = _.throttle(FRAMERATE_SELECTION, handleSelection)

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
  border: 1px solid black;
  max-width: 100%;
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
  border: 1px solid black;
  position: relative;
  max-width: 100%;

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
      defaultConf
    },
    ref
  ) => {
    const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const selectionCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const combinedRef = useCombinedRefs(ref, drawCanvasRef)

    const [selectionMode, setSelectionMode] = useState<SelectionModeData<Point | number>>({
      mode: SelectionModeLib.default
    })
    const [hoverMode, setHoverMode] = useState<HoverModeData>({ mode: SelectionModeLib.default })

    const handleMouseDown = useCallback(
      e => {
        // eslint-disable-next-line
        // e.preventDefault()
        const cursorPosition = getCursorPosition(e, selectionCanvasRef.current, width, height)

        if (activeTool === ToolEnum.selection) {
          const { shape, mode } = selectShape(
            shapes,
            cursorPosition,
            canvasOffset,
            selectedShape,
            hoverMode
          )
          setSelectedShape(shape)
          setSelectionMode(mode)
        } else if (activeTool === ToolEnum.move) {
          setCanvasOffsetStartPosition(cursorPosition)
        }
        if (_.includes(activeTool, ShapeEnum)) {
          const newShape = createShape(activeTool as ShapeEnum, cursorPosition, defaultConf)
          addShape(newShape)
          setActiveTool(ToolEnum.selection)
          setSelectedShape(newShape)
          setSelectionMode({
            mode: SelectionModeLib.resize,
            cursorStartPosition: cursorPosition,
            originalShape: newShape,
            anchor: activeTool === ShapeEnum.line || activeTool === ShapeEnum.polygon ? 0 : [1, 1]
          })
        }
      },
      [
        selectedShape,
        hoverMode,
        activeTool,
        canvasOffset,
        setCanvasOffsetStartPosition,
        shapes,
        defaultConf,
        width,
        height,
        addShape,
        setActiveTool,
        setSelectedShape,
        setSelectionMode
      ]
    )

    const handleMouseUp = useCallback(() => {
      setSelectionMode({ mode: SelectionModeLib.default })
      saveShapes()
    }, [setSelectionMode, saveShapes])

    const handleMouseMove = useCallback(
      e => {
        // eslint-disable-next-line
        // e.preventDefault()
        throttledHandleSelection(
          e,
          selectionCanvasRef,
          activeTool,
          canvasOffset,
          selectedShape,
          selectionMode,
          canvasOffsetStartPosition,
          width,
          height,
          setHoverMode,
          updateSingleShape,
          setCanvasOffset,
          setSelectedShape
        )
      },
      [
        selectedShape,
        selectionMode,
        setHoverMode,
        canvasOffset,
        canvasOffsetStartPosition,
        width,
        height,
        updateSingleShape,
        activeTool,
        setCanvasOffset,
        setSelectedShape
      ]
    )
    useEffect(() => {
      const drawCtx = drawCanvasRef.current?.getContext('2d')
      const selectionCtx = selectionCanvasRef.current?.getContext('2d')
      drawCtx &&
        selectionCtx &&
        throttledDrawCanvas(
          drawCtx,
          selectionCtx,
          width,
          height,
          canvasOffset,
          shapes,
          selectedShape
        )
    }, [shapes, selectedShape, canvasOffset, width, height])

    useEffect(() => {
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchend', handleMouseUp)
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('touchmove', handleMouseMove)

      return () => {
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchend', handleMouseUp)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('touchmove', handleMouseMove)
      }
    }, [handleMouseUp, handleMouseMove, handleMouseDown])

    return (
      <StyledCanvasBox>
        <StyledCanvasContainer>
          <StyledDrawCanvas ref={combinedRef} width={width} height={height} />
          <StyledSelectionCanvas
            activetool={activeTool}
            selectionmode={hoverMode.mode}
            onTouchStart={handleMouseDown}
            onMouseDown={handleMouseDown}
            ref={selectionCanvasRef}
            width={width}
            height={height}
          />
        </StyledCanvasContainer>
      </StyledCanvasBox>
    )
  }
)

export default Canvas
