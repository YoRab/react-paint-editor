import type { UtilsSettings } from '@canvas/constants/app'
import { ShapeTypeArray } from '@canvas/constants/shapes'
import useDoubleClick from '@canvas/hooks/useDoubleClick'
import {
  checkCurveLinesSelectionIntersection,
  checkPolygonLinesSelectionIntersection,
  checkSelectionIntersection,
  getCursorPositionInElement,
  getCursorPositionInTransformedCanvas,
  isTouchGesture
} from '@canvas/utils/intersect'
import { buildShapesGroup, getSelectedShapes, selectShape } from '@canvas/utils/selection'
import { createShape } from '@canvas/utils/shapes'
import { addNewPointGroupToShape } from '@canvas/utils/shapes/brush'
import { addCurveLine, addCurvePoint } from '@canvas/utils/shapes/curve'
import { addPolygonLine, addPolygonPoint } from '@canvas/utils/shapes/polygon'
import { transformShape } from '@canvas/utils/transform'
import { isCursorInsideMask } from '@canvas/utils/zoom'
import type { HoverModeData, SelectionModeData } from '@common/types/Mode'
import type { Point, SelectionType, ShapeEntity } from '@common/types/Shapes'
import type { CustomTool, ToolsType } from '@common/types/tools'
import { clamp } from '@common/utils/util'
import { SELECTION_TOOL } from '@editor/constants/tools'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'

const handleMove = (
  e: MouseEvent | TouchEvent,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  selectedShape: SelectionType | undefined,
  selectionMode: SelectionModeData<Point | number>,
  setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeData<Point | number>>>,
  canvasOffsetStartData: { start: Point; originalOffset: Point } | undefined,
  setHoverMode: React.Dispatch<React.SetStateAction<HoverModeData>>,
  refreshHoveredShape: (e: MouseEvent | TouchEvent, ctx: CanvasRenderingContext2D, cursorPosition: Point, isInsideMask: boolean) => void,
  updateSingleShape: (updatedShape: ShapeEntity[]) => void,
  duplicateShapes: (shapesToDuplicate: ShapeEntity[]) => void,
  setCanvasOffset: (offset: Point) => void,
  refreshSelectedShapes: (ctx: CanvasRenderingContext2D, cursorPosition: Point, settings: UtilsSettings) => void,
  settings: UtilsSettings,
  isShiftPressed: boolean,
  isAltPressed: boolean,
  setSelectedShape: React.Dispatch<React.SetStateAction<SelectionType | undefined>>,
  setCanvasMoveAcceleration: React.Dispatch<React.SetStateAction<Point>>
) => {
  if (isTouchGesture(e) && e.touches.length > 1) return

  const drawCtx = canvasRef.current?.getContext('2d')
  if (!drawCtx) return
  const cursorPosition = getCursorPositionInTransformedCanvas(e, canvasRef.current, settings)

  if (selectionMode.mode === 'selectionFrame') {
    refreshSelectedShapes(drawCtx, cursorPosition, settings)
    const cursorPositionInCanvasDiv = getCursorPositionInElement(e, canvasRef.current!, settings.canvasSize)
    setCanvasMoveAcceleration([
      Math.ceil(
        clamp(
          cursorPositionInCanvasDiv[0] * settings.canvasZoom < 50
            ? cursorPositionInCanvasDiv[0] * settings.canvasZoom - 50
            : cursorPositionInCanvasDiv[0] * settings.canvasZoom > settings.canvasSize.width / settings.canvasSize.scaleRatioWithNoZoom - 50
              ? cursorPositionInCanvasDiv[0] * settings.canvasZoom - (settings.canvasSize.width / settings.canvasSize.scaleRatioWithNoZoom - 50)
              : 0,
          -100,
          100
        ) /
          5 /
          settings.canvasZoom
      ),
      Math.ceil(
        clamp(
          cursorPositionInCanvasDiv[1] * settings.canvasZoom < 50
            ? cursorPositionInCanvasDiv[1] * settings.canvasZoom - 50
            : cursorPositionInCanvasDiv[1] * settings.canvasZoom > settings.canvasSize.height / settings.canvasSize.scaleRatioWithNoZoom - 50
              ? cursorPositionInCanvasDiv[1] * settings.canvasZoom - (settings.canvasSize.height / settings.canvasSize.scaleRatioWithNoZoom - 50)
              : 0,
          -100,
          100
        ) /
          5 /
          settings.canvasZoom
      )
    ])
    return
  }
  if (canvasOffsetStartData !== undefined) {
    setCanvasOffset([
      cursorPosition[0] + settings.canvasOffset[0] - canvasOffsetStartData.start[0],
      cursorPosition[1] + settings.canvasOffset[1] - canvasOffsetStartData.start[1]
    ])
    return
  }

  if (selectionMode.mode === 'preview') {
    const firstShape = getSelectedShapes(selectedShape)[0]
    if (firstShape?.type === 'curve') {
      const newShape = addCurvePoint(firstShape, cursorPosition, settings, true)
      setSelectedShape(buildShapesGroup([newShape], settings))
      return
    }
    if (firstShape?.type === 'polygon') {
      const newShape = addPolygonPoint(firstShape, cursorPosition, settings, true)
      setSelectedShape(buildShapesGroup([newShape], settings))
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

  if (selectionMode.mode === 'default' || selectionMode.mode === 'textedition' || selectionMode.mode === 'contextMenu') {
    if (!isInsideMask) {
      setHoverMode({
        mode: 'default'
      })
      return
    }
    const positionIntersection = checkSelectionIntersection(drawCtx, selectedShape, cursorPosition, settings, true) || {
      mode: 'default'
    }
    setHoverMode(positionIntersection)
  } else {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const newShape = transformShape(ctx, selectedShape, cursorPosition, selectionMode, settings, isShiftPressed, isAltPressed)
    updateSingleShape(getSelectedShapes(newShape))
  }

  if (selectionMode.mode === 'translate' && isAltPressed && !selectionMode.hasBeenDuplicated) {
    setSelectionMode({
      ...selectionMode,
      hasBeenDuplicated: true
    })
    duplicateShapes(getSelectedShapes(selectionMode.originalShape))
  }
}

type UseCanvasType = {
  shapes: ShapeEntity[]
  saveShapes: () => void
  addShapes: (newShape: ShapeEntity[]) => void
  updateSingleShape: (updatedShape: ShapeEntity[], withSave?: boolean) => void
  selectedShape: SelectionType | undefined
  setSelectedShape: React.Dispatch<React.SetStateAction<SelectionType | undefined>>
  activeTool: ToolsType
  setActiveTool: React.Dispatch<React.SetStateAction<ToolsType>>
  refreshHoveredShape: (e: MouseEvent | TouchEvent, ctx: CanvasRenderingContext2D, cursorPosition: Point, isInsideMask: boolean) => void
  refreshSelectedShapes: (ctx: CanvasRenderingContext2D, cursorPosition: Point, settings: UtilsSettings) => void
  duplicateShapes: (shapesToDuplicate: ShapeEntity[]) => void
  canvasOffsetStartData: { start: Point; originalOffset: Point } | undefined
  setCanvasOffsetStartData: React.Dispatch<React.SetStateAction<{ start: Point; originalOffset: Point } | undefined>>
  setCanvasOffset: (offset: Point) => void
  isInsideComponent: boolean
  isInsideCanvas: boolean
  selectionMode: SelectionModeData<number | Point>
  setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeData<number | Point>>>
  setSelectionFrame: React.Dispatch<React.SetStateAction<{ oldSelection: SelectionType | undefined; frame: [Point, Point] } | undefined>>
  setCanvasMoveAcceleration: React.Dispatch<React.SetStateAction<Point>>
  drawCanvasRef: React.RefObject<HTMLCanvasElement | null>
  isShiftPressed: boolean
  isAltPressed: boolean
  withFrameSelection: boolean
  withContextMenu: boolean
  settings: UtilsSettings
  isSpacePressed: boolean
}

const useDrawableCanvas = ({
  addShapes,
  drawCanvasRef,
  setActiveTool,
  refreshHoveredShape,
  shapes,
  selectionMode,
  activeTool,
  isInsideComponent,
  isInsideCanvas,
  setCanvasOffset,
  selectedShape,
  canvasOffsetStartData,
  refreshSelectedShapes,
  setSelectedShape,
  setSelectionFrame,
  setCanvasOffsetStartData,
  updateSingleShape,
  duplicateShapes,
  saveShapes,
  setSelectionMode,
  setCanvasMoveAcceleration,
  settings,
  isShiftPressed,
  isAltPressed,
  withFrameSelection,
  withContextMenu,
  isSpacePressed
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
      setSelectionMode,
      canvasOffsetStartData,
      setHoverMode,
      refreshHoveredShape,
      updateSingleShape,
      duplicateShapes,
      setCanvasOffset,
      refreshSelectedShapes,
      settings,
      isShiftPressed,
      isAltPressed,
      setSelectedShape,
      setCanvasMoveAcceleration
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
    const ctx = drawCanvasRef.current?.getContext('2d')
    if (!ctx) return

    const isRightClick = 'button' in e && e.button === 2
    if (isRightClick) {
      if (activeTool !== SELECTION_TOOL || !withContextMenu) {
        setSelectedShape(undefined)
        setSelectionMode({ mode: 'default' })
      } else {
        const cursorPosition = getCursorPositionInTransformedCanvas(e, drawCanvasRef.current, settings)
        const { shape, mode } = selectShape(ctx, shapes, cursorPosition, settings, selectedShape, isTouchGesture(e), false)
        setSelectedShape(shape)
        setSelectionMode({
          mode: 'contextMenu',
          cursorStartPosition: cursorPosition,
          originalShape: shape,
          anchor: 'anchor' in mode ? mode.anchor : undefined
        })
      }
      setActiveTool(SELECTION_TOOL)
      setSelectionFrame(undefined)
      return
    }

    if (canvasOffsetStartData) {
      setCanvasOffsetStartData(undefined)
      return
    }

    if (selectionMode.mode === 'textedition') return
    if (selectionMode.mode === 'preview') return

    const cursorPosition = getCursorPositionInTransformedCanvas(e, drawCanvasRef.current, settings)

    if (
      selectionMode.mode === 'translate' &&
      Date.now() - selectionMode.dateStart <= 500 &&
      cursorPosition[0] === selectionMode.cursorStartPosition[0] &&
      cursorPosition[1] === selectionMode.cursorStartPosition[1]
    ) {
      const isGroupMode = e.ctrlKey || e.shiftKey || e.metaKey

      if (isGroupMode) {
        const { shape } = selectShape(ctx, shapes, cursorPosition, settings, selectedShape, isTouchGesture(e), withFrameSelection, 'remove')
        if (getSelectedShapes(shape).length !== selectionMode.selectedShapesLengthAtMouseDown) {
          setSelectedShape(shape)
        }
      }

      setSelectionMode({ mode: 'default' })
      setSelectionFrame(undefined)
      saveShapes()
      return
    }
    if (selectionMode.mode !== 'default') {
      if (selectionMode.mode === 'brush' && isBrushShapeDoneOnMouseUp) setSelectedShape(undefined)
      setSelectionMode({ mode: 'default' })
      setSelectionFrame(undefined)
      saveShapes()
    }
  }

  useEffect(() => {
    if (isInsideCanvas) {
      const handleMouseUp = (e: MouseEvent | TouchEvent) => handleUpRef.current?.(e)

      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchend', handleMouseUp)

      return () => {
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchend', handleMouseUp)
      }
    }
  }, [isInsideCanvas])

  const onlyCheckZoom = !settings.features.edition && settings.features.zoom
  const disableCheck = !settings.features.edition && !settings.features.zoom

  const handleDownRef = useRef<(e: MouseEvent | TouchEvent, canvasElt: HTMLCanvasElement, isSpacePressed: boolean) => void>(null)
  handleDownRef.current = (e: MouseEvent | TouchEvent, canvasElt: HTMLCanvasElement, isSpacePressed: boolean) => {
    e.preventDefault()
    if (isTouchGesture(e) && e.touches.length > 1) return
    const ctx = canvasElt?.getContext('2d')
    if (!ctx) return

    canvasElt.focus()

    const cursorPosition = getCursorPositionInTransformedCanvas(e, drawCanvasRef.current, settings)

    const isWheelPressed = 'button' in e && e.button === 1
    const isRightClick = 'button' in e && e.button === 2

    if (isWheelPressed || isSpacePressed || (activeTool.type === 'move' && !isRightClick)) {
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

    if (isRightClick) {
      if (activeTool.type === 'selection') {
        const { shape } = selectShape(ctx, shapes, cursorPosition, settings, selectedShape, isTouchGesture(e), false)
        setSelectedShape(shape)
        setSelectionMode({ mode: 'default' })
      }
      return
    }

    if (activeTool.type === 'selection') {
      const isGroupMode = e.ctrlKey || e.shiftKey || e.metaKey
      const behavior = isGroupMode ? 'add' : 'replace'
      const { shape, mode } = selectShape(ctx, shapes, cursorPosition, settings, selectedShape, isTouchGesture(e), withFrameSelection, behavior)
      setSelectedShape(shape)
      setSelectionMode(mode)
      if (mode.mode === 'selectionFrame') {
        setSelectionFrame({
          oldSelection: shape,
          frame: [
            [cursorPosition[0], cursorPosition[1]],
            [cursorPosition[0], cursorPosition[1]]
          ]
        })
      }
    } else if (ShapeTypeArray.some(item => item === activeTool.type)) {
      const firstShape = getSelectedShapes(selectedShape)[0]
      const drawCtx = drawCanvasRef.current?.getContext('2d')
      if (!drawCtx) return
      if (activeTool.type === 'brush') {
        if (firstShape?.type === 'brush') {
          const newShape = addNewPointGroupToShape(firstShape, cursorPosition, settings)
          updateSingleShape([newShape])
        } else {
          const newShape = createShape(drawCtx, activeTool, cursorPosition, settings)
          if (!newShape) return
          addShapes([newShape])
          setSelectedShape(buildShapesGroup([newShape], settings))
        }

        setSelectionMode({
          mode: 'brush'
        })
      } else if (selectionMode.mode === 'preview' && (firstShape?.type === 'polygon' || firstShape?.type === 'curve')) {
        const newShape =
          firstShape.type === 'polygon' ? addPolygonPoint(firstShape, cursorPosition, settings) : addCurvePoint(firstShape, cursorPosition, settings)
        setSelectedShape(buildShapesGroup([newShape], settings))
        updateSingleShape([newShape], true)
      } else if (activeTool.type !== 'picture') {
        const newShape = createShape(drawCtx, activeTool as Exclude<CustomTool, { type: 'picture' }>, cursorPosition, settings)
        if (!newShape) return
        addShapes([newShape])
        const newSelectedShapes = buildShapesGroup([newShape], settings)!
        setSelectedShape(newSelectedShapes)
        if (newShape.type === 'polygon' || newShape.type === 'curve') {
          setSelectionMode({ mode: 'preview' })
        } else {
          setActiveTool(SELECTION_TOOL)
          setSelectionMode({
            mode: 'resize',
            cursorStartPosition: [cursorPosition[0] + settings.selectionPadding, cursorPosition[1] + settings.selectionPadding],
            originalShape: newSelectedShapes,
            anchor: newShape.type === 'line' ? 0 : [1, 1],
            selectedShapesLengthAtMouseDown: getSelectedShapes(newSelectedShapes).length
          })
        }
      }
    }
  }

  useEffect(() => {
    if (disableCheck) return
    const canvasElt = drawCanvasRef.current
    if (!canvasElt) return

    const handleMouseDown = (e: MouseEvent | TouchEvent) => handleDownRef.current?.(e, canvasElt, isSpacePressed)

    canvasElt.addEventListener('mousedown', handleMouseDown, { passive: false })
    canvasElt.addEventListener('touchstart', handleMouseDown, { passive: false })

    return () => {
      canvasElt.removeEventListener('mousedown', handleMouseDown)
      canvasElt.removeEventListener('touchstart', handleMouseDown)
    }
  }, [disableCheck, drawCanvasRef, isSpacePressed])

  useEffect(() => {
    const ref = drawCanvasRef.current
    const drawCtx = drawCanvasRef.current?.getContext('2d')
    if (!ref || !drawCtx) return

    const handleDoubleClick = (e: MouseEvent | TouchEvent) => {
      if (activeTool.type === 'selection') {
        if (getSelectedShapes(selectedShape).length !== 1) return
        const firstShape = getSelectedShapes(selectedShape)[0]
        if (firstShape?.type === 'text') {
          const cursorPosition = getCursorPositionInTransformedCanvas(e, drawCanvasRef.current, settings)

          if (!isCursorInsideMask(cursorPosition, settings)) return

          if (checkSelectionIntersection(drawCtx, selectedShape!, cursorPosition, settings)) {
            setSelectionMode({
              mode: 'textedition',
              defaultValue: firstShape.value
            })
          }
          return
        }
        if (firstShape?.type === 'polygon') {
          const cursorPosition = getCursorPositionInTransformedCanvas(e, drawCanvasRef.current, settings)
          if (!isCursorInsideMask(cursorPosition, settings)) return
          const polygonIntersection = checkPolygonLinesSelectionIntersection(drawCtx, firstShape, cursorPosition, settings)
          if (polygonIntersection) updateSingleShape([addPolygonLine(firstShape, polygonIntersection.lineIndex, cursorPosition, settings)])
          return
        }
        if (firstShape?.type === 'curve') {
          const cursorPosition = getCursorPositionInTransformedCanvas(e, drawCanvasRef.current, settings)
          if (!isCursorInsideMask(cursorPosition, settings)) return
          const polygonIntersection = checkCurveLinesSelectionIntersection(drawCtx, firstShape, cursorPosition, settings)
          if (polygonIntersection) updateSingleShape([addCurveLine(firstShape, polygonIntersection.lineIndex, cursorPosition, settings)])
          return
        }
      }
    }
    if (isInsideCanvas) {
      registerDoubleClickEvent(ref, handleDoubleClick)
      return () => {
        unRegisterDoubleClickEvent(ref)
      }
    }
  }, [
    updateSingleShape,
    registerDoubleClickEvent,
    unRegisterDoubleClickEvent,
    isInsideCanvas,
    drawCanvasRef,
    activeTool,
    selectedShape,
    setSelectionMode,
    settings
  ])

  return { hoverMode }
}

export default useDrawableCanvas
