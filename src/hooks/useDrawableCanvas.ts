import React, { useEffect, useState } from 'react'
import _ from 'lodash/fp'
import { selectShape } from 'utils/selection'
import { DrawableBrush, DrawableShape, DrawableText, Point, ShapeEnum } from 'types/Shapes'
import { checkPositionIntersection, getCursorPosition } from 'utils/intersect'
import { HoverModeData, SelectionModeData, SelectionModeLib } from 'types/Mode'
import { createNewPointGroupToShape, transformShape } from 'utils/transform'
import { createShape } from 'utils/data'
import { ActionsEnum, CustomTool, ToolsType } from 'types/tools'
import { SELECTION_TOOL } from 'constants/tools'

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
  scaleRatio: number,
  setHoverMode: React.Dispatch<React.SetStateAction<HoverModeData>>,
  updateSingleShape: (updatedShape: DrawableShape) => void,
  setCanvasOffset: React.Dispatch<React.SetStateAction<Point>>,
  setSelectedShape: React.Dispatch<React.SetStateAction<DrawableShape | undefined>>,
  selectionPadding: number
) => {
  if (activeTool.type === ActionsEnum.move && canvasOffsetStartPosition !== undefined) {
    const cursorPosition = getCursorPosition(e, canvasRef.current, width, height, scaleRatio)
    setCanvasOffset([
      cursorPosition[0] - canvasOffsetStartPosition[0],
      cursorPosition[1] - canvasOffsetStartPosition[1]
    ])
  }
  if (selectedShape == undefined) return
  if (selectedShape.locked) return

  const cursorPosition = getCursorPosition(e, canvasRef.current, width, height, scaleRatio)

  if (selectionMode.mode === SelectionModeLib.default) {
    const positionIntersection = checkPositionIntersection(
      selectedShape,
      cursorPosition,
      canvasOffset,
      selectionPadding,
      scaleRatio,
      true
    ) || {
      mode: SelectionModeLib.default
    }
    setHoverMode(positionIntersection)
  } else {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const newShape = transformShape(
      ctx,
      selectedShape,
      cursorPosition,
      canvasOffset,
      selectionMode,
      selectionPadding
    )
    updateSingleShape(newShape)
    setSelectedShape(newShape)
  }
}

type UseCanvasType = {
  disabled?: boolean
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
  isInsideComponent: boolean
  selectionMode: SelectionModeData<number | Point>
  setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeData<number | Point>>>
  drawCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>
  selectionCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>
  selectionPadding: number
}

const useDrawableCanvas = ({
  disabled = false,
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
  canvasOffset,
  saveShapes,
  setSelectionMode,
  selectionPadding
}: UseCanvasType) => {
  const { width, height, scaleRatio } = canvasSize
  const [hoverMode, setHoverMode] = useState<HoverModeData>({ mode: SelectionModeLib.default })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) =>
      window.requestAnimationFrame(() =>
        handleMove(
          e,
          selectionCanvasRef,
          activeTool,
          canvasOffset,
          selectedShape,
          selectionMode,
          canvasOffsetStartPosition,
          width,
          height,
          scaleRatio,
          setHoverMode,
          updateSingleShape,
          setCanvasOffset,
          setSelectedShape,
          selectionPadding
        )
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
    scaleRatio,
    updateSingleShape,
    activeTool,
    setCanvasOffset,
    setSelectedShape,
    selectionPadding
  ])

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent | TouchEvent) => {
      if (selectionMode.mode === SelectionModeLib.textedition) return
      if (activeTool.type === ShapeEnum.text) {
        const cursorPosition = getCursorPosition(
          e,
          selectionCanvasRef.current,
          width,
          height,
          scaleRatio
        )
        const drawCtx = drawCanvasRef.current?.getContext('2d')
        if (!drawCtx) return
        const newShape = createShape(drawCtx, activeTool, cursorPosition) as DrawableText
        addShape(newShape)
        setActiveTool(SELECTION_TOOL)
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
    width,
    height,
    scaleRatio,
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
      const cursorPosition = getCursorPosition(
        e,
        selectionCanvasRef.current,
        width,
        height,
        scaleRatio
      )

      if (activeTool.type === ActionsEnum.selection) {
        const { shape, mode } = selectShape(
          shapes,
          cursorPosition,
          scaleRatio,
          canvasOffset,
          selectedShape,
          selectionPadding
        )
        setSelectedShape(shape)
        setSelectionMode(mode)
      } else if (activeTool.type === ActionsEnum.move) {
        setCanvasOffsetStartPosition(cursorPosition)
      }

      if (_.includes(activeTool.type, ShapeEnum)) {
        const drawCtx = drawCanvasRef.current?.getContext('2d')
        if (!drawCtx) return
        if (activeTool.type === ShapeEnum.brush) {
          if (!!selectedShape) {
            const newShape = createNewPointGroupToShape(
              selectedShape as DrawableBrush,
              cursorPosition
            )
            updateSingleShape(newShape)
            setSelectedShape(newShape)
          } else {
            const newShape = createShape(drawCtx, activeTool, cursorPosition)
            if (!newShape) return
            addShape(newShape)
            setSelectedShape(newShape)
          }

          setSelectionMode({
            mode: SelectionModeLib.brush
          })
        } else if (activeTool.type !== ShapeEnum.text) {
          const newShape = createShape(drawCtx, activeTool as CustomTool, cursorPosition)
          if (!newShape) return
          addShape(newShape)
          setActiveTool(SELECTION_TOOL)
          setSelectedShape(newShape)

          setSelectionMode({
            mode: SelectionModeLib.resize,
            cursorStartPosition: cursorPosition,
            originalShape: newShape,
            anchor:
              activeTool.type === ShapeEnum.line ||
              activeTool.type === ShapeEnum.polygon ||
              activeTool.type === ShapeEnum.curve
                ? 0
                : [1, 1]
          })
        }
      }
    }

    ref.addEventListener('mousedown', handleMouseDown, { passive: false })
    ref.addEventListener('touchstart', handleMouseDown, { passive: false })

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
    width,
    height,
    scaleRatio,
    updateSingleShape,
    addShape,
    setActiveTool,
    setSelectedShape,
    setSelectionMode,
    selectionPadding
  ])

  useEffect(() => {
    const ref = selectionCanvasRef.current
    if (!ref) return

    const handleDoubleClick = (e: MouseEvent | TouchEvent) => {
      if (activeTool.type === ActionsEnum.selection) {
        if (selectedShape?.type === ShapeEnum.text) {
          const cursorPosition = getCursorPosition(
            e,
            selectionCanvasRef.current,
            width,
            height,
            scaleRatio
          )
          if (
            checkPositionIntersection(selectedShape, cursorPosition, canvasOffset, selectionPadding)
          ) {
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
    scaleRatio,
    canvasOffset,
    setSelectionMode,
    selectionPadding
  ])

  return { hoverMode }
}

export default useDrawableCanvas
