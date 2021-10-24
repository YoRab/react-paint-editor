import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import _ from 'lodash/fp'
import { createShape, selectShape } from 'utils/selection'
import { DrawableShape, ShapeType, StyledShape } from 'types/Shapes'
import { checkPositionIntersection, getCursorPosition } from 'utils/intersect'
import { drawSelection, drawShape } from 'utils/draw'
import { HoverModeData, SelectionModeData, SelectionModeLib } from 'types/Mode'
import { transformShape } from 'utils/transform'
import { FRAMERATE_DRAW, FRAMERATE_SELECTION } from 'constants/draw'

const drawCanvas = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shapes: DrawableShape[],
  selectedShape: DrawableShape | undefined
) => {
  ctx.clearRect(0, 0, width, height)
  for (let i = shapes.length - 1; i >= 0; i--) {
    drawShape(ctx, shapes[i])
  }
  selectedShape && drawSelection({ ctx, shape: selectedShape })
}

const throttledDrawCanvas = _.throttle(FRAMERATE_DRAW, drawCanvas)

const handleSelection = (
  e: MouseEvent,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  selectedShape: DrawableShape | undefined,
  selectionMode: SelectionModeData,
  setHoverMode: React.Dispatch<React.SetStateAction<HoverModeData>>,
  setShapes: React.Dispatch<React.SetStateAction<DrawableShape[]>>,
  setSelectedShape: React.Dispatch<React.SetStateAction<DrawableShape | undefined>>
) => {
  if (selectedShape == undefined) return
  const cursorPosition = getCursorPosition(e, canvasRef.current)

  if (selectionMode.mode === SelectionModeLib.default) {
    const positionIntersection = checkPositionIntersection(selectedShape, cursorPosition, true) || {
      mode: SelectionModeLib.default
    }
    setHoverMode(positionIntersection)
  } else {
    const newShape = transformShape(selectedShape, cursorPosition, selectionMode)
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
  activetool: ShapeType | undefined
  selectionmode: SelectionModeLib
  width: number
  height: number
}>`
  user-select: none;
  width: ${_.get('width')}px;
  height: ${_.get('height')}px;
  ${({ selectionmode, activetool }) =>
    activetool !== undefined || selectionmode === SelectionModeLib.resize
      ? 'cursor: crosshair'
      : selectionmode === SelectionModeLib.translate
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
  activeTool: ShapeType | undefined
  setActiveTool: React.Dispatch<React.SetStateAction<ShapeType | undefined>>
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

      if (activeTool === undefined) {
        const { shape, mode } = selectShape(shapes, cursorPosition, selectedShape, hoverMode)
        setSelectedShape(shape)
        setSelectionMode(mode)
      } else {
        const newShape = createShape(activeTool, cursorPosition, defaultConf)
        setShapes(prevShapes => [newShape, ...prevShapes])
        setActiveTool(undefined)
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
        selectedShape,
        selectionMode,
        setHoverMode,
        setShapes,
        setSelectedShape
      )
    },
    [selectedShape, selectionMode, setHoverMode, setShapes, setSelectedShape]
  )

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    ctx && throttledDrawCanvas(ctx, width, height, shapes, selectedShape)
  }, [shapes, selectedShape, width, height])

  return (
    <StyledCanvas
      activetool={activeTool}
      selectionmode={hoverMode.mode}
      onTouchStart={handleMouseDown}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
      ref={canvasRef}
      width={width}
      height={height}
    />
  )
}

export default Canvas
