import type { UtilsSettings } from '@canvas/constants/app'
import { ShapeTypeArray } from '@canvas/constants/shapes'
import useDoubleClick from '@canvas/hooks/useDoubleClick'
import {
  checkCurveLinesSelectionIntersection,
  checkPolygonLinesSelectionIntersection,
  checkSelectionIntersection,
  getCursorPositionInTransformedCanvas,
  isTouchGesture
} from '@canvas/utils/intersect'
import { selectShape } from '@canvas/utils/selection'
import { createShape } from '@canvas/utils/shapes'
import { addNewPointGroupToShape } from '@canvas/utils/shapes/brush'
import { addCurveLine, addCurvePoint } from '@canvas/utils/shapes/curve'
import { addPolygonLine, addPolygonPoint } from '@canvas/utils/shapes/polygon'
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
  isShiftPressed: boolean,
  isAltPressed: boolean,
  setSelectedShape: React.Dispatch<React.SetStateAction<ShapeEntity | undefined>>
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
  if (selectionMode.mode === 'preview') {
    if (selectedShape?.type === 'curve') {
      const newShape = addCurvePoint(selectedShape, cursorPosition, settings, true)
      setSelectedShape(newShape)
      return
    }
    if (selectedShape?.type === 'polygon') {
      const newShape = addPolygonPoint(selectedShape, cursorPosition, settings, true)
      setSelectedShape(newShape)
      return
    }
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
    const newShape = transformShape(ctx, selectedShape, cursorPosition, selectionMode, settings, isShiftPressed, isAltPressed)
    updateSingleShape(newShape)
  }
}

type UseCanvasType = {
  shapes: ShapeEntity[]
  saveShapes: () => void
  addShape: (newShape: ShapeEntity) => void
  updateSingleShape: (updatedShape: ShapeEntity, withSave?: boolean) => void
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
  isAltPressed: boolean
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
  isAltPressed,
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
      isShiftPressed,
      isAltPressed,
      setSelectedShape
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

    const isRightClick = 'button' in e && e.button === 2
    if (isRightClick) {
      // TODO context menu
      setSelectedShape(undefined)
      setActiveTool(SELECTION_TOOL)
      setSelectionMode({ mode: 'default' })
      setSelectionFrame(undefined)
      return
    }

    if (canvasOffsetStartData) {
      setCanvasOffsetStartData(undefined)
      return
    }

    if (selectionMode.mode === 'textedition') return
    if (selectionMode.mode === 'preview') return
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
    const isRightClick = 'button' in e && e.button === 2

    if (isRightClick) return

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
      } else if (selectionMode.mode === 'preview' && (selectedShape?.type === 'polygon' || selectedShape?.type === 'curve')) {
        const newShape =
          selectedShape?.type === 'polygon'
            ? addPolygonPoint(selectedShape, cursorPosition, settings)
            : addCurvePoint(selectedShape, cursorPosition, settings)
        setSelectedShape(newShape)
        updateSingleShape(newShape, true)
      } else if (activeTool.type !== 'picture') {
        const newShape = createShape(drawCtx, activeTool as Exclude<CustomTool, { type: 'picture' }>, cursorPosition, settings)
        addShape(newShape)
        setSelectedShape(newShape)
        if (newShape.type === 'polygon' || newShape.type === 'curve') {
          setSelectionMode({ mode: 'preview' })
        } else {
          setActiveTool(SELECTION_TOOL)
          setSelectionMode({
            mode: 'resize',
            cursorStartPosition: [cursorPosition[0] + settings.selectionPadding, cursorPosition[1] + settings.selectionPadding],
            originalShape: newShape,
            anchor: newShape.type === 'line' ? 0 : [1, 1]
          })
        }
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
    const drawCtx = drawCanvasRef.current?.getContext('2d')
    if (!ref || !drawCtx) return

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
          return
        }
        if (selectedShape?.type === 'polygon') {
          const cursorPosition = getCursorPositionInTransformedCanvas(e, drawCanvasRef.current, settings)
          if (!isCursorInsideMask(cursorPosition, settings)) return
          const polygonIntersection = checkPolygonLinesSelectionIntersection(drawCtx, selectedShape, cursorPosition, settings)
          if (polygonIntersection) updateSingleShape(addPolygonLine(selectedShape, polygonIntersection.lineIndex, cursorPosition, settings))
          return
        }
        if (selectedShape?.type === 'curve') {
          const cursorPosition = getCursorPositionInTransformedCanvas(e, drawCanvasRef.current, settings)
          if (!isCursorInsideMask(cursorPosition, settings)) return
          const polygonIntersection = checkCurveLinesSelectionIntersection(drawCtx, selectedShape, cursorPosition, settings)
          if (polygonIntersection) updateSingleShape(addCurveLine(selectedShape, polygonIntersection.lineIndex, cursorPosition, settings))
          return
        }
      }
    }
    if (isInsideComponent) {
      registerDoubleClickEvent(ref, handleDoubleClick)
      return () => {
        unRegisterDoubleClickEvent(ref)
      }
    }
  }, [
    updateSingleShape,
    registerDoubleClickEvent,
    unRegisterDoubleClickEvent,
    isInsideComponent,
    drawCanvasRef,
    activeTool,
    selectedShape,
    setSelectionMode,
    settings
  ])

  return { hoverMode }
}

export default useDrawableCanvas
