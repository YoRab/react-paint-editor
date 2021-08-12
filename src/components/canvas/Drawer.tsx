import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import _ from 'lodash/fp'
import { selectShape } from '../../utils/selection'
import { ShapeDrawable } from '../../types/Shapes'
import { checkPositionIntersection } from '../../utils/intersect'
import { drawSelection, drawShape } from '../../utils/draw'
import { HoverModeData, SelectionModeData, SelectionModeLib } from '../../types/Mode'
import { Marker } from '../../types/Markers'
import { transformShape } from '../../utils/transform'

const StyledCanvas = styled.canvas.attrs<{
  width: number
  height: number
  ref: RefObject<HTMLCanvasElement>
}>(({ width, height }) => ({
  width: width,
  height: height
}))<{ selectionmode: SelectionModeLib; width: number; height: number }>`
  user-select: none;
  width: ${_.get('width')}px;
  height: ${_.get('height')}px;
  ${({ selectionmode }) =>
    selectionmode === SelectionModeLib.translate
      ? 'cursor:move'
      : selectionmode === SelectionModeLib.rotate || selectionmode === SelectionModeLib.resize
      ? 'cursor:grab'
      : 'cursor:default'}
`

type DrawerType = {
  width?: number
  height?: number
  shapes: ShapeDrawable[]
  setShapes: React.Dispatch<React.SetStateAction<ShapeDrawable[]>>
  selectedShape: ShapeDrawable | undefined
  setSelectedShape: React.Dispatch<React.SetStateAction<ShapeDrawable | undefined>>
  activeMarker: Marker
}

const Drawer = ({
  width = 1000,
  height = 1000,
  shapes,
  setShapes,
  selectedShape,
  setSelectedShape,
  activeMarker
}: DrawerType) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [selectionMode, setSelectionMode] = useState<SelectionModeData>({
    mode: SelectionModeLib.default
  })
  const [hoverMode, setHoverMode] = useState<HoverModeData>({ mode: SelectionModeLib.default })

  const handleMouseDown = useCallback(
    e => {
      const selectionInfos = selectShape(
        activeMarker,
        shapes,
        [e.clientX, e.clientY],
        selectedShape,
        hoverMode
      )
      if (selectionInfos) {
        setSelectedShape(selectionInfos.shape)
        setSelectionMode(selectionInfos.mode)
      }
    },
    [selectedShape, hoverMode, activeMarker, shapes]
  )

  const handleMouseUp = useCallback(e => {
    setSelectionMode({ mode: SelectionModeLib.default })
  }, [])

  const handleMouseMove = useCallback(
    e => {
      if (selectedShape == undefined) return
      if (selectionMode.mode === SelectionModeLib.default) {
        const positionIntersection = checkPositionIntersection(
          selectedShape,
          [e.clientX, e.clientY],
          true
        ) || { mode: SelectionModeLib.default }
        setHoverMode(positionIntersection)
      } else {
        const newShape = transformShape(selectedShape, [e.clientX, e.clientY], selectionMode)
        setShapes(prevMarkers =>
          prevMarkers.map(marker => {
            return marker.id === selectedShape.id ? newShape : marker
          })
        )
        setSelectedShape(newShape)
      }
    },
    [selectedShape, shapes, selectionMode]
  )

  const drawCanvas = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      shapes: ShapeDrawable[],
      selectedShape: ShapeDrawable | undefined
    ) => {
      ctx.clearRect(0, 0, width, height)
      for (const marker of shapes) {
        drawShape(ctx, marker)
      }
      selectedShape && drawSelection({ ctx, shape: selectedShape })
    },
    []
  )

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    ctx && drawCanvas(ctx, shapes, selectedShape)
  }, [shapes, selectedShape])

  return (
    <StyledCanvas
      selectionmode={hoverMode.mode}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      ref={canvasRef}
      width={width}
      height={height}
    />
  )
}

export default Drawer
