import React, { useEffect, useState } from 'react'
import _ from 'lodash/fp'
import { selectShape } from 'utils/selection'
import {
  DrawableBrush,
  DrawableShape,
  DrawableText,
  Point,
  ShapeEnum,
  StyledShape,
  ToolEnum,
  ToolsType
} from 'types/Shapes'
import { checkPositionIntersection, getCursorPosition } from 'utils/intersect'
import { HoverModeData, SelectionModeData, SelectionModeLib } from 'types/Mode'
import { createNewPointGroupToShape, transformShape } from 'utils/transform'
import { FRAMERATE_SELECTION } from 'constants/draw'
import { createShape } from 'utils/data'

const handleMove = (
  e: MouseEvent | TouchEvent,
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
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const newShape = transformShape(ctx, selectedShape, cursorPosition, canvasOffset, selectionMode)
    updateSingleShape(newShape)
    setSelectedShape(newShape)
  }
}

type UseCanvasType = {
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
  drawCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>
  selectionCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>
}

const useDrawableCanvas = ({
  disabled = false,
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
}: UseCanvasType) => {
  const [hoverMode, setHoverMode] = useState<HoverModeData>({ mode: SelectionModeLib.default })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) =>
      _.throttle(FRAMERATE_SELECTION, handleMove)(
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
    if (isInsideComponent) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('touchmove', handleMouseMove)
    }

    return () => {
      if (isInsideComponent) {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('touchmove', handleMouseMove)
      }
    }
  }, [
    isInsideComponent,
    selectionCanvasRef,
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
  ])

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent | TouchEvent) => {
      if (selectionMode.mode === SelectionModeLib.textedition) return
      if (activeTool === ShapeEnum.text) {
        const cursorPosition = getCursorPosition(e, selectionCanvasRef.current, width, height)
        const drawCtx = drawCanvasRef.current?.getContext('2d')
        if (!drawCtx) return
        const newShape = createShape(
          drawCtx,
          activeTool,
          cursorPosition,
          defaultConf
        ) as DrawableText
        addShape(newShape)
        setActiveTool(ToolEnum.selection)
        setSelectedShape(newShape)
        setSelectionMode({
          mode: SelectionModeLib.textedition,
          defaultValue: newShape.value
        })
        return
      }
      if (selectionMode.mode !== SelectionModeLib.default) {
        setSelectionMode({ mode: SelectionModeLib.default })
        saveShapes()
      }
    }

    if (isInsideComponent) {
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchend', handleMouseUp)
    }

    return () => {
      if (isInsideComponent) {
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchend', handleMouseUp)
      }
    }
  }, [
    isInsideComponent,
    selectionCanvasRef,
    drawCanvasRef,
    selectionMode,
    saveShapes,
    activeTool,
    addShape,
    defaultConf,
    width,
    height,
    setActiveTool,
    setSelectedShape,
    setSelectionMode
  ])

  useEffect(() => {
    const ref = selectionCanvasRef.current
    if (!ref) return
    if (disabled) return

    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const cursorPosition = getCursorPosition(e, selectionCanvasRef.current, width, height)

      if (activeTool === ToolEnum.selection) {
        const { shape, mode } = selectShape(shapes, cursorPosition, canvasOffset, selectedShape)
        setSelectedShape(shape)
        setSelectionMode(mode)
      } else if (activeTool === ToolEnum.move) {
        setCanvasOffsetStartPosition(cursorPosition)
      }
      if (_.includes(activeTool, ShapeEnum)) {
        const drawCtx = drawCanvasRef.current?.getContext('2d')
        if (!drawCtx) return
        if (activeTool === ShapeEnum.brush) {
          if (!!selectedShape) {
            const newShape = createNewPointGroupToShape(
              selectedShape as DrawableBrush,
              cursorPosition
            )
            updateSingleShape(newShape)
            setSelectedShape(newShape)
          } else {
            const newShape = createShape(drawCtx, activeTool, cursorPosition, defaultConf)
            addShape(newShape)
            setSelectedShape(newShape)
          }

          setSelectionMode({
            mode: SelectionModeLib.brush
          })
        } else if (activeTool !== ShapeEnum.text) {
          const newShape = createShape(
            drawCtx,
            activeTool as ShapeEnum,
            cursorPosition,
            defaultConf
          )
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
      }
    }

    ref.addEventListener('mousedown', handleMouseDown)
    ref.addEventListener('touchstart', handleMouseDown)

    return () => {
      ref.removeEventListener('mousedown', handleMouseDown)
      ref.removeEventListener('touchstart', handleMouseDown)
    }
  }, [
    disabled,
    selectionCanvasRef,
    drawCanvasRef,
    selectedShape,
    activeTool,
    canvasOffset,
    setCanvasOffsetStartPosition,
    shapes,
    defaultConf,
    width,
    height,
    updateSingleShape,
    addShape,
    setActiveTool,
    setSelectedShape,
    setSelectionMode
  ])

  useEffect(() => {
    const ref = selectionCanvasRef.current
    if (!ref) return

    const handleDoubleClick = (e: MouseEvent | TouchEvent) => {
      if (activeTool === ToolEnum.selection) {
        if (selectedShape?.type === ShapeEnum.text) {
          const cursorPosition = getCursorPosition(e, selectionCanvasRef.current, width, height)
          if (checkPositionIntersection(selectedShape, cursorPosition, canvasOffset)) {
            setSelectionMode({
              mode: SelectionModeLib.textedition,
              defaultValue: selectedShape.value
            })
          }
        }
      }
    }
    if (isInsideComponent) {
      ref.addEventListener('dblclick', handleDoubleClick)
    }

    return () => {
      if (isInsideComponent) {
        ref.removeEventListener('dblclick', handleDoubleClick)
      }
    }
  }, [
    isInsideComponent,
    selectionCanvasRef,
    activeTool,
    selectedShape,
    width,
    height,
    canvasOffset,
    setSelectionMode
  ])

  return { hoverMode }
}

export default useDrawableCanvas
