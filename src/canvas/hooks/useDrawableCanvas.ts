import type { UtilsSettings } from '@canvas/constants/app'
import { ShapeTypeArray } from '@canvas/constants/shapes'
import useDoubleClick from '@canvas/hooks/useDoubleClick'
import { checkSelectionIntersection, getCursorPositionInTransformedCanvas, isTouchGesture } from '@canvas/utils/intersect'
import { selectShape } from '@canvas/utils/selection'
import { createShape } from '@canvas/utils/shapes'
import { addNewPointGroupToShape } from '@canvas/utils/shapes/brush'
import { transformShape } from '@canvas/utils/transform'
import { isCursorInsideMask } from '@canvas/utils/zoom'
import type { HoverModeData, SelectionModeData } from '@common/types/Mode'
import type { Point, ShapeEntity } from '@common/types/Shapes'
import type { CustomTool, ToolsType } from '@common/types/tools'
import { SELECTION_TOOL } from '@editor/constants/tools'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'

const handleMove = (
  e: MouseEvent | TouchEvent,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  selectedShape: ShapeEntity | undefined,
  selectionMode: SelectionModeData<Point | number>,
  canvasOffsetStartData: { start: Point; originalOffset: Point } | undefined,
  setHoverMode: React.Dispatch<React.SetStateAction<HoverModeData>>,
  refreshHoveredShape: (e: MouseEvent | TouchEvent, ctx: CanvasRenderingContext2D, cursorPosition: Point, isInsideMask: boolean) => void,
  updateSingleShape: (updatedShape: ShapeEntity) => void,
  setCanvasOffset: (offset: Point) => void,
  refreshSelectedShapes: (ctx: CanvasRenderingContext2D, cursorPosition: Point, settings: UtilsSettings) => void,
  settings: UtilsSettings,
  isShiftPressed: boolean
) => {
  if (isTouchGesture(e) && e.touches.length > 1) return

  const drawCtx = canvasRef.current?.getContext('2d')
  if (!drawCtx) return
  const cursorPosition = getCursorPositionInTransformedCanvas(e, canvasRef.current, settings)

  if (canvasOffsetStartData !== undefined) {
    setCanvasOffset([
      cursorPosition[0] + settings.canvasOffset[0] - canvasOffsetStartData.start[0],
      cursorPosition[1] + settings.canvasOffset[1] - canvasOffsetStartData.start[1]
    ])
    return
  }
  if (selectionMode.mode === 'selectionFrame') {
    refreshSelectedShapes(drawCtx, cursorPosition, settings)
    return
  }

  const isInsideMask = isCursorInsideMask(cursorPosition, settings)

  if (!isTouchGesture(e)) {
    refreshHoveredShape(e, drawCtx, cursorPosition, isInsideMask)
  }

  if (selectedShape === undefined || selectedShape.locked) {
    setHoverMode({
      mode: 'default',
      outOfView: !isInsideMask
    })
    return
  }

  if (selectionMode.mode === 'default' || selectionMode.mode === 'textedition') {
    if (!isInsideMask) {
      setHoverMode({
        mode: 'default'
      })
      return
    }
    const positionIntersection = checkSelectionIntersection(selectedShape, cursorPosition, settings, true) || {
      mode: 'default'
    }
    setHoverMode(positionIntersection)
  } else {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const newShape = transformShape(ctx, selectedShape, cursorPosition, selectionMode, settings, isShiftPressed)
    updateSingleShape(newShape)
  }
}

type UseCanvasType = {
  shapes: ShapeEntity[]
  saveShapes: () => void
  addShape: (newShape: ShapeEntity) => void
  updateSingleShape: (updatedShape: ShapeEntity) => void
  selectedShape: ShapeEntity | undefined
  setSelectedShape: React.Dispatch<React.SetStateAction<ShapeEntity | undefined>>
  activeTool: ToolsType
  setActiveTool: React.Dispatch<React.SetStateAction<ToolsType>>
  refreshHoveredShape: (e: MouseEvent | TouchEvent, ctx: CanvasRenderingContext2D, cursorPosition: Point, isInsideMask: boolean) => void
  refreshSelectedShapes: (ctx: CanvasRenderingContext2D, cursorPosition: Point, settings: UtilsSettings) => void
  canvasOffsetStartData: { start: Point; originalOffset: Point } | undefined
  setCanvasOffsetStartData: React.Dispatch<React.SetStateAction<{ start: Point; originalOffset: Point } | undefined>>
  setCanvasOffset: (offset: Point) => void
  isInsideComponent: boolean
  selectionMode: SelectionModeData<number | Point>
  setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeData<number | Point>>>
  setSelectionFrame: React.Dispatch<React.SetStateAction<[Point, Point] | undefined>>
  drawCanvasRef: React.RefObject<HTMLCanvasElement | null>
  isShiftPressed: boolean
  withFrameSelection: boolean
  settings: UtilsSettings
}

const useDrawableCanvas = ({
  addShape,
  drawCanvasRef,
  setActiveTool,
  refreshHoveredShape,
  shapes,
  selectionMode,
  activeTool,
  isInsideComponent,
  setCanvasOffset,
  selectedShape,
  canvasOffsetStartData,
  refreshSelectedShapes,
  setSelectedShape,
  setSelectionFrame,
  setCanvasOffsetStartData,
  updateSingleShape,
  saveShapes,
  setSelectionMode,
  settings,
  isShiftPressed,
  withFrameSelection
}: UseCanvasType) => {
  const [hoverMode, setHoverMode] = useState<HoverModeData>({
    mode: 'default'
  })
  const { registerDoubleClickEvent, unRegisterDoubleClickEvent } = useDoubleClick()

  const handleMoveRef = useRef<(e: MouseEvent | TouchEvent) => void>(null)
  handleMoveRef.current = (e: MouseEvent | TouchEvent) =>
    handleMove(
      e,
      drawCanvasRef,
      selectedShape,
      selectionMode,
      canvasOffsetStartData,
      setHoverMode,
      refreshHoveredShape,
      updateSingleShape,
      setCanvasOffset,
      refreshSelectedShapes,
      settings,
      isShiftPressed
    )

  useEffect(() => {
    if (isInsideComponent) {
      const handleMouseMove = (e: MouseEvent | TouchEvent) => handleMoveRef.current?.(e)
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('touchmove', handleMouseMove)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('touchmove', handleMouseMove)
      }
    }
  }, [isInsideComponent])

  const { isBrushShapeDoneOnMouseUp } = settings

  const handleUpRef = useRef<(e: MouseEvent | TouchEvent) => void>(null)

  handleUpRef.current = (e: MouseEvent | TouchEvent) => {
    if (isTouchGesture(e) && e.touches.length > 1) return

    if (canvasOffsetStartData) {
      setCanvasOffsetStartData(undefined)
      return
    }

    if (selectionMode.mode === 'textedition') return
    if (selectionMode.mode !== 'default') {
      if (selectionMode.mode === 'brush' && isBrushShapeDoneOnMouseUp) setSelectedShape(undefined)
      setSelectionMode({ mode: 'default' })
      setSelectionFrame(undefined)
      saveShapes()
    }
  }

  useEffect(() => {
    if (isInsideComponent) {
      const handleMouseUp = (e: MouseEvent | TouchEvent) => handleUpRef.current?.(e)

      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchend', handleMouseUp)

      return () => {
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchend', handleMouseUp)
      }
    }
  }, [isInsideComponent])

  const onlyCheckZoom = !settings.features.edition && settings.features.zoom
  const disableCheck = !settings.features.edition && !settings.features.zoom

  const handleDownRef = useRef<(e: MouseEvent | TouchEvent, ref: HTMLCanvasElement) => void>(null)
  handleDownRef.current = (e: MouseEvent | TouchEvent, ref: HTMLCanvasElement) => {
    e.preventDefault()
    if (isTouchGesture(e) && e.touches.length > 1) return
    const ctx = ref?.getContext('2d')
    if (!ctx) return

    const cursorPosition = getCursorPositionInTransformedCanvas(e, drawCanvasRef.current, settings)

    const isWheelPressed = 'button' in e && e.button === 1

    if (isWheelPressed || activeTool.type === 'move') {
      setCanvasOffsetStartData({ start: cursorPosition, originalOffset: settings.canvasOffset })
      return
    }

    if (onlyCheckZoom) return

    if (!isCursorInsideMask(cursorPosition, settings)) {
      setSelectedShape(undefined)
      setSelectionMode({
        mode: 'default'
      })
      return
    }

    if (activeTool.type === 'selection') {
      const { shape, mode } = selectShape(ctx, shapes, cursorPosition, settings, selectedShape, isTouchGesture(e), withFrameSelection)
      setSelectedShape(shape)
      setSelectionMode(mode)
      if (mode.mode === 'selectionFrame') {
        setSelectionFrame([
          [cursorPosition[0], cursorPosition[1]],
          [cursorPosition[0], cursorPosition[1]]
        ])
      }
    } else if (ShapeTypeArray.some(item => item === activeTool.type)) {
      const drawCtx = drawCanvasRef.current?.getContext('2d')
      if (!drawCtx) return
      if (activeTool.type === 'brush') {
        if (selectedShape?.type === 'brush') {
          const newShape = addNewPointGroupToShape(selectedShape, cursorPosition, settings)
          updateSingleShape(newShape)
        } else {
          const newShape = createShape(drawCtx, activeTool, cursorPosition, settings)
          if (!newShape) return
          addShape(newShape)
          setSelectedShape(newShape)
        }

        setSelectionMode({
          mode: 'brush'
        })
      } else if (activeTool.type !== 'picture') {
        const newShape = createShape(drawCtx, activeTool as Exclude<CustomTool, { type: 'picture' }>, cursorPosition, settings)
        addShape(newShape)
        setActiveTool(SELECTION_TOOL)
        setSelectedShape(newShape)
        setSelectionMode({
          mode: 'resize',
          cursorStartPosition: [cursorPosition[0] + settings.selectionPadding, cursorPosition[1] + settings.selectionPadding],
          originalShape: newShape,
          anchor: activeTool.type === 'line' || activeTool.type === 'polygon' || activeTool.type === 'curve' ? 0 : [1, 1]
        })
      }
    }
  }

  useEffect(() => {
    if (disableCheck) return
    const ref = drawCanvasRef.current
    if (!ref) return

    const handleMouseDown = (e: MouseEvent | TouchEvent) => handleDownRef.current?.(e, ref)

    ref.addEventListener('mousedown', handleMouseDown, { passive: false })
    ref.addEventListener('touchstart', handleMouseDown, { passive: false })

    return () => {
      ref.removeEventListener('mousedown', handleMouseDown)
      ref.removeEventListener('touchstart', handleMouseDown)
    }
  }, [disableCheck, drawCanvasRef])

  useEffect(() => {
    const ref = drawCanvasRef.current
    if (!ref) return

    const handleDoubleClick = (e: MouseEvent | TouchEvent) => {
      if (activeTool.type === 'selection') {
        if (selectedShape?.type === 'text') {
          const cursorPosition = getCursorPositionInTransformedCanvas(e, drawCanvasRef.current, settings)

          if (!isCursorInsideMask(cursorPosition, settings)) return

          if (checkSelectionIntersection(selectedShape, cursorPosition, settings)) {
            setSelectionMode({
              mode: 'textedition',
              defaultValue: selectedShape.value
            })
          }
        }
      }
    }
    if (isInsideComponent) {
      registerDoubleClickEvent(ref, handleDoubleClick)
      return () => {
        unRegisterDoubleClickEvent(ref)
      }
    }
  }, [registerDoubleClickEvent, unRegisterDoubleClickEvent, isInsideComponent, drawCanvasRef, activeTool, selectedShape, setSelectionMode, settings])

  return { hoverMode }
}

export default useDrawableCanvas
