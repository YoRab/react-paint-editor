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

const drawCanvas = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  canvasOffset: Point,
  shapes: DrawableShape[],
  selectedShape: DrawableShape | undefined
) => {
  ctx.clearRect(0, 0, width, height)
  for (let i = shapes.length - 1; i >= 0; i--) {
    drawShape(ctx, shapes[i], canvasOffset)
  }
  selectedShape && drawSelection({ ctx, shape: selectedShape, canvasOffset })
}

const throttledDrawCanvas = _.throttle(FRAMERATE_DRAW, drawCanvas)

const handleSelection = (
  e: MouseEvent,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  activeTool: ToolsType,
  canvasOffset: Point,
  selectedShape: DrawableShape | undefined,
  selectionMode: SelectionModeData,
  canvasOffsetStartPosition: Point | undefined,
  setHoverMode: React.Dispatch<React.SetStateAction<HoverModeData>>,
  setShapes: React.Dispatch<React.SetStateAction<DrawableShape[]>>,
  setCanvasOffset: React.Dispatch<React.SetStateAction<Point>>,
  setSelectedShape: React.Dispatch<React.SetStateAction<DrawableShape | undefined>>
) => {
  if (activeTool === ToolEnum.move && canvasOffsetStartPosition !== undefined) {
    const cursorPosition = getCursorPosition(e, canvasRef.current)
    setCanvasOffset([
      cursorPosition[0] - canvasOffsetStartPosition[0],
      cursorPosition[1] - canvasOffsetStartPosition[1]
    ])
  }
  if (selectedShape == undefined) return
  const cursorPosition = getCursorPosition(e, canvasRef.current)

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
    setShapes(prevMarkers =>
      prevMarkers.map(marker => {
        return marker.id === selectedShape.id ? newShape : marker
      })
    )
    setSelectedShape(newShape)
  }
}

const throttledHandleSelection = _.throttle(FRAMERATE_SELECTION, handleSelection)

const StyledCanvas = styled.canvas.attrs<{
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
  responsive: boolean
}>`
  user-select: none;
  border: 1px solid black;

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
  width?: number
  height?: number
  shapes: DrawableShape[]
  saveShapes: () => void
  setShapes: React.Dispatch<React.SetStateAction<DrawableShape[]>>
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

const Canvas = ({
  width = 1000,
  height = 600,
  shapes,
  setShapes,
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
}: DrawerType) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [selectionMode, setSelectionMode] = useState<SelectionModeData>({
    mode: SelectionModeLib.default
  })
  const [hoverMode, setHoverMode] = useState<HoverModeData>({ mode: SelectionModeLib.default })

  const handleMouseDown = useCallback(
    e => {
      // eslint-disable-next-line
      // e.preventDefault()
      const cursorPosition = getCursorPosition(e, canvasRef.current)

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
        setShapes(prevShapes => [newShape, ...prevShapes])
        setActiveTool(ToolEnum.selection)
        setSelectedShape(newShape)
        setSelectionMode({
          mode: SelectionModeLib.resize,
          cursorStartPosition: cursorPosition,
          originalShape: newShape,
          anchor: [1, 1]
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
      setShapes,
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
        canvasRef,
        activeTool,
        canvasOffset,
        selectedShape,
        selectionMode,
        canvasOffsetStartPosition,
        setHoverMode,
        setShapes,
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
      setShapes,
      activeTool,
      setCanvasOffset,
      setSelectedShape
    ]
  )

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    ctx && throttledDrawCanvas(ctx, width, height, canvasOffset, shapes, selectedShape)
  }, [shapes, selectedShape, canvasOffset, width, height])

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchend', handleMouseUp)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('touchmove', handleMouseMove)
    document.addEventListener('touchstart', handleMouseDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleMouseUp)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleMouseMove)
      document.removeEventListener('touchstart', handleMouseDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [handleMouseUp, handleMouseMove, handleMouseDown])

  return (
    <StyledCanvas
      activetool={activeTool}
      selectionmode={hoverMode.mode}
      // onTouchStart={handleMouseDown}
      // onMouseDown={handleMouseDown}
      // onMouseUp={handleMouseUp}
      // onTouchEnd={handleMouseUp}
      // onMouseMove={handleMouseMove}
      // onTouchMove={handleMouseMove}
      ref={canvasRef}
      width={width}
      height={height}
      responsive={true}
    />
  )
}

export default Canvas
