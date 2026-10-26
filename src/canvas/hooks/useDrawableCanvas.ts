import type { UtilsSettings } from '@canvas/constants/app'
import { ShapeTypeArray } from '@canvas/constants/shapes'
import { SELECTION_TOOL } from '@canvas/constants/tools'
import type { PaintStore } from '@canvas/store/paintStore'
import type { Point, ShapeEntity } from '@canvas/types/Shapes'
import type { CustomTool } from '@canvas/types/tools'
import { createClickTracker } from '@canvas/utils/click'
import {
  checkCurveLinesSelectionIntersection,
  checkPolygonLinesSelectionIntersection,
  checkSelectionIntersection,
  findShapesAtPoints,
  getCursorPositionInElement,
  getCursorPositionInTransformedCanvas,
  isTouchGesture,
  shouldCancelLongPress
} from '@canvas/utils/intersect'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { buildShapesGroup, isIdleSelectionMode, selectShape } from '@canvas/utils/selection'
import { createShape } from '@canvas/utils/shapes'
import { addNewPointGroupToShape } from '@canvas/utils/shapes/brush'
import { addCurveLine, addCurvePoint } from '@canvas/utils/shapes/curve'
import { addPolygonLine, addPolygonPoint } from '@canvas/utils/shapes/polygon'
import { transformSelectedShapes } from '@canvas/utils/transform'
import { isPointInsideRect, sampleSegment } from '@canvas/utils/trigo'
import { clamp } from '@canvas/utils/util'
import { isCursorInsideMask } from '@canvas/utils/zoom'
import { useEffect } from 'react'

const LONG_PRESS_DELAY_MS = 500

/** Distance between the points tested along a stroke of the eraser, in pixels of the screen */
const ERASER_STEP = 4

/**
 * Ids of the shapes erased by a stroke, with the ones it crosses from a point to the next one, inside the view.
 * The locked shapes are kept
 */
const getErasedShapeIds = (
  ctx: CanvasRenderingContext2D,
  shapes: ShapeEntity[],
  erasedShapeIds: string[],
  from: Point,
  to: Point,
  settings: UtilsSettings
): string[] => {
  const points = sampleSegment(from, to, ERASER_STEP / settings.canvasSize.scaleRatio).filter(point => isCursorInsideMask(point, settings))
  const erased = new Set(erasedShapeIds)
  const candidates = shapes.filter(shape => !shape.locked && !erased.has(shape.id))
  const found = findShapesAtPoints(ctx, candidates, points, settings)
  return found.length ? [...erasedShapeIds, ...found.map(shape => shape.id)] : erasedShapeIds
}

/** Speed of the auto scroll on one axis, when the cursor of a selection frame is close to a border */
const getAxisAcceleration = (position: number, size: number, settings: UtilsSettings) => {
  const zoomedPosition = position * settings.canvasZoom
  const distance = zoomedPosition < 50 ? zoomedPosition - 50 : zoomedPosition > size - 50 ? zoomedPosition - (size - 50) : 0
  return Math.ceil(clamp(distance, -100, 100) / 5 / settings.canvasZoom)
}

const getMoveAcceleration = (e: PointerEvent, canvas: HTMLCanvasElement, settings: UtilsSettings): Point => {
  const [x, y] = getCursorPositionInElement(e, canvas, settings.canvasSize)
  const { width, height, scaleRatioWithNoZoom } = settings.canvasSize
  return [getAxisAcceleration(x, width / scaleRatioWithNoZoom, settings), getAxisAcceleration(y, height / scaleRatioWithNoZoom, settings)]
}

const isOverElement = (e: PointerEvent, element: HTMLElement) => isPointInsideRect(element.getBoundingClientRect(), [e.clientX, e.clientY])

/**
 * Pointer interactions of the draw canvas, for the mouse, the touch and the pen. The listeners are set once and read the state
 * of the store when an event happens: the gestures do not need any render of React.
 * They are set on the canvas only, so that a page with many canvases only notifies the one under the pointer:
 * a gesture captures its pointer, to keep receiving its moves outside of the canvas.
 */
const useDrawableCanvas = (store: PaintStore, canvas: HTMLCanvasElement | null) => {
  useEffect(() => {
    if (!canvas) return

    let longPressTimeout: { timeout: ReturnType<typeof setTimeout>; startPosition: { clientX: number; clientY: number } } | null = null
    // the double clicks edit a text and add a point to a polygon or a curve
    const clicks = createClickTracker()
    // the pointers down on the canvas: more than one is a pinch, handled by useZoom
    const activePointers = new Set<number>()
    // the pointer which started the current gesture
    let gesturePointerId: number | undefined
    // the last position of a stroke of the eraser, from which it goes on
    let eraserPosition: Point = [0, 0]

    const read = () => {
      const state = store.getState()
      return {
        state,
        settings: store.getSettings(state),
        activeTool: store.selectors.selectActiveTool(state),
        ctx: canvas.getContext('2d')
      }
    }

    const handleContextMenu = (e: PointerEvent) => {
      const { state, settings, activeTool, ctx } = read()
      if (!ctx) return
      store.batch(() => {
        if (activeTool.id !== SELECTION_TOOL.id || !store.selectors.selectWithContextMenu(state)) {
          store.setSelectedShape(undefined)
          store.setSelectionMode({ mode: 'default' })
          store.setActiveTool(SELECTION_TOOL)
          store.setSelectionFrame(undefined)
          return
        }
        const cursorPosition = getCursorPositionInTransformedCanvas(e, canvas, settings)
        const { shape, mode } = selectShape(
          ctx,
          state.document.shapes,
          cursorPosition,
          settings,
          state.document.selectedShape,
          isTouchGesture(e),
          false
        )
        store.showContextMenu({
          cursorStartPosition: cursorPosition,
          clientPosition: { x: e.clientX, y: e.clientY },
          originalShape: shape,
          anchor: 'anchor' in mode ? mode.anchor : undefined
        })
      })
    }

    const handleMove = (e: PointerEvent) => {
      // during a gesture, only its pointer acts
      if (gesturePointerId !== undefined && e.pointerId !== gesturePointerId) return
      if (longPressTimeout && shouldCancelLongPress(e, longPressTimeout.startPosition)) {
        clearTimeout(longPressTimeout.timeout)
      }
      if (activePointers.size > 1 || !store.selectors.selectIsInteractive(store.getState())) return
      const { state, settings, ctx } = read()
      if (!ctx) return

      const { selectionMode, panStart, modifiers } = state.interaction
      const { selectedShape } = state.document
      const cursorPosition = getCursorPositionInTransformedCanvas(e, canvas, settings)

      if (selectionMode.mode === 'eraser') {
        const erasedShapeIds = getErasedShapeIds(ctx, state.document.shapes, selectionMode.erasedShapeIds, eraserPosition, cursorPosition, settings)
        eraserPosition = cursorPosition
        // the mode changes only when a shape is crossed
        if (erasedShapeIds !== selectionMode.erasedShapeIds) store.setSelectionMode({ mode: 'eraser', erasedShapeIds })
        return
      }
      if (selectionMode.mode === 'laser') {
        store.addLaserPoint(cursorPosition, false)
        return
      }
      if (selectionMode.mode === 'eyedropper') return
      if (selectionMode.mode === 'selectionFrame') {
        store.batch(() => {
          store.refreshSelectedShapes(ctx, cursorPosition)
          store.setMoveAcceleration(getMoveAcceleration(e, canvas, settings))
        })
        return
      }
      if (panStart !== undefined) {
        store.actions.setOffset([
          cursorPosition[0] + settings.canvasOffset[0] - panStart.start[0],
          cursorPosition[1] + settings.canvasOffset[1] - panStart.start[1]
        ])
        return
      }

      if (selectionMode.mode === 'preview') {
        const firstShape = getSelectedShapes(selectedShape)[0]
        if (firstShape?.type === 'curve') {
          store.setSelectedShape(buildShapesGroup([addCurvePoint(firstShape, cursorPosition, settings, true)], settings))
          return
        }
        if (firstShape?.type === 'polygon') {
          store.setSelectedShape(buildShapesGroup([addPolygonPoint(firstShape, cursorPosition, settings, true)], settings))
          return
        }
      }

      const isInsideMask = isCursorInsideMask(cursorPosition, settings)
      // the selected shapes are transformed, or a brush stroke is drawn
      const isTransforming = !isIdleSelectionMode(selectionMode)

      store.batch(() => {
        if (!isTouchGesture(e)) {
          // a captured pointer keeps sending its moves outside of the canvas, any other one is over it.
          // The hovered shape is not shown during a transformation: it is not searched
          const isOverCanvas = !isTransforming && (gesturePointerId === undefined || isOverElement(e, canvas))
          store.refreshHoveredShape(isOverCanvas, ctx, cursorPosition, isInsideMask)
        }

        if (selectedShape === undefined || selectedShape.locked) {
          store.setHoverMode({ mode: 'default', outOfView: !isInsideMask })
          return
        }

        if (!isTransforming) {
          if (!isInsideMask) {
            store.setHoverMode({ mode: 'default' })
            return
          }
          store.setHoverMode(checkSelectionIntersection(ctx, selectedShape, cursorPosition, settings, true) || { mode: 'default' })
        } else {
          store.updateShapes(transformSelectedShapes(ctx, selectedShape, cursorPosition, selectionMode, settings, modifiers.shift, modifiers.alt))
        }

        if (selectionMode.mode === 'translate' && modifiers.alt && !selectionMode.hasBeenDuplicated) {
          store.setSelectionMode({ ...selectionMode, hasBeenDuplicated: true })
          store.duplicateShapes(getSelectedShapes(selectionMode.originalShape))
        }
      })
    }

    const handleUp = (e: PointerEvent) => {
      if (longPressTimeout) clearTimeout(longPressTimeout.timeout)
      const { state, settings, ctx } = read()
      if (!ctx) return

      if (e.button === 2) {
        handleContextMenu(e)
        return
      }

      if (state.interaction.panStart) {
        store.setPanStart(undefined)
        return
      }

      const { selectionMode } = state.interaction
      if (selectionMode.mode === 'contextMenu') return
      if (selectionMode.mode === 'textedition') return
      if (selectionMode.mode === 'preview') return
      if (selectionMode.mode === 'laser') {
        store.setSelectionMode({ mode: 'default' })
        return
      }
      if (selectionMode.mode === 'eraser') {
        const { erasedShapeIds } = selectionMode
        store.batch(() => {
          // a stroke cancelled by the browser removes nothing
          if (e.type !== 'pointercancel' && erasedShapeIds.length) store.actions.removeShapes(erasedShapeIds)
          store.setSelectionMode({ mode: 'default' })
        })
        return
      }

      const cursorPosition = getCursorPositionInTransformedCanvas(e, canvas, settings)

      if (
        selectionMode.mode === 'translate' &&
        Date.now() - selectionMode.dateStart <= 500 &&
        cursorPosition[0] === selectionMode.cursorStartPosition[0] &&
        cursorPosition[1] === selectionMode.cursorStartPosition[1]
      ) {
        const isGroupMode = e.ctrlKey || e.shiftKey || e.metaKey
        // the press kept the selection for a drag: a click selects the shape in front, even over a selected shape it covers,
        // or toggles it in group mode
        const { shape } = selectShape(
          ctx,
          state.document.shapes,
          cursorPosition,
          settings,
          state.document.selectedShape,
          isTouchGesture(e),
          state.config.options.withFrameSelection,
          isGroupMode ? 'toggle' : 'replace',
          false
        )
        // in group mode, a shape added by the press stays selected
        const isAddedByPress = isGroupMode && getSelectedShapes(shape).length === selectionMode.selectedShapesLengthAtMouseDown
        store.batch(() => {
          if (!isAddedByPress) store.setSelectedShape(shape)
          store.setSelectionMode({ mode: 'default' })
          store.setSelectionFrame(undefined)
          store.actions.saveShapes()
        })
        return
      }
      if (selectionMode.mode !== 'default') {
        store.batch(() => {
          if (selectionMode.mode === 'brush' && settings.isBrushShapeDoneOnMouseUp) store.setSelectedShape(undefined)
          store.setSelectionMode({ mode: 'default' })
          store.setSelectionFrame(undefined)
          store.actions.saveShapes()
        })
      }
    }

    const handleDown = (e: PointerEvent) => {
      const { state, settings, activeTool, ctx } = read()
      const { features } = settings
      if (!store.selectors.selectIsInteractive(state)) return
      e.preventDefault()
      activePointers.add(e.pointerId)
      if (activePointers.size > 1) {
        if (longPressTimeout) clearTimeout(longPressTimeout.timeout)
        // a pinch is not a click, as for the click events
        clicks.reset()
        // and it cancels a stroke of the eraser or of the laser
        const { mode } = state.interaction.selectionMode
        if (mode === 'eraser' || mode === 'laser') store.setSelectionMode({ mode: 'default' })
        return
      }

      gesturePointerId = e.pointerId
      clicks.press(e)
      try {
        canvas.setPointerCapture(e.pointerId)
      } catch {
        // the synthetic events have no active pointer to capture
      }
      canvas.focus()

      if (!ctx) return
      const { selectedShape, shapes } = state.document
      const { selectionMode } = state.interaction
      const cursorPosition = getCursorPositionInTransformedCanvas(e, canvas, settings)

      const isWheelPressed = e.button === 1
      const isRightClick = e.button === 2

      if (isWheelPressed || state.interaction.modifiers.space || (activeTool.type === 'move' && !isRightClick)) {
        store.setPanStart({ start: cursorPosition, originalOffset: settings.canvasOffset })
        return
      }

      // the press only picks a color. A right click cancels the pick, with the context menu
      if (selectionMode.mode === 'eyedropper') {
        if (!isRightClick) store.pickColorAt(cursorPosition)
        return
      }

      // the canvas can only be zoomed
      if (!features.edition) return

      if (!isCursorInsideMask(cursorPosition, settings)) {
        store.batch(() => {
          store.setSelectedShape(undefined)
          store.setSelectionMode({ mode: 'default' })
        })
        return
      }

      if (isRightClick) {
        if (activeTool.type === 'selection') {
          const { shape } = selectShape(ctx, shapes, cursorPosition, settings, selectedShape, isTouchGesture(e), false)
          store.batch(() => {
            store.setSelectedShape(shape)
            store.setSelectionMode({ mode: 'default' })
          })
        }
        return
      }

      // the eraser and the laser have no context menu on a long press
      if (activeTool.type === 'eraser') {
        eraserPosition = cursorPosition
        store.setSelectionMode({ mode: 'eraser', erasedShapeIds: getErasedShapeIds(ctx, shapes, [], cursorPosition, cursorPosition, settings) })
        return
      }
      if (activeTool.type === 'laser') {
        store.batch(() => {
          store.setSelectionMode({ mode: 'laser' })
          store.addLaserPoint(cursorPosition, true)
        })
        return
      }

      if (isTouchGesture(e)) {
        if (longPressTimeout) clearTimeout(longPressTimeout.timeout)
        longPressTimeout = {
          timeout: setTimeout(() => handleContextMenu(e), LONG_PRESS_DELAY_MS),
          startPosition: { clientX: e.clientX, clientY: e.clientY }
        }
      }

      if (activeTool.type === 'selection') {
        const isGroupMode = e.ctrlKey || e.shiftKey || e.metaKey
        const behavior = isGroupMode ? 'add' : 'replace'
        const { withFrameSelection } = state.config.options
        const { shape, mode } = selectShape(ctx, shapes, cursorPosition, settings, selectedShape, isTouchGesture(e), withFrameSelection, behavior)
        store.batch(() => {
          store.setSelectedShape(shape)
          store.setSelectionMode(mode)
          if (mode.mode === 'selectionFrame') {
            store.setSelectionFrame({
              oldSelection: shape,
              frame: [
                [cursorPosition[0], cursorPosition[1]],
                [cursorPosition[0], cursorPosition[1]]
              ]
            })
          }
        })
      } else if (ShapeTypeArray.some(item => item === activeTool.type)) {
        const firstShape = getSelectedShapes(selectedShape)[0]
        if (activeTool.type === 'brush') {
          store.batch(() => {
            if (firstShape?.type === 'brush') {
              store.updateShapes([addNewPointGroupToShape(firstShape, cursorPosition, settings)])
            } else {
              const newShape = createShape(ctx, activeTool, cursorPosition, settings)
              if (!newShape) return
              store.addShapes([newShape])
              store.setSelectedShape(buildShapesGroup([newShape], settings))
            }
            store.setSelectionMode({ mode: 'brush' })
          })
        } else if (selectionMode.mode === 'preview' && (firstShape?.type === 'polygon' || firstShape?.type === 'curve')) {
          const newShape =
            firstShape.type === 'polygon'
              ? addPolygonPoint(firstShape, cursorPosition, settings)
              : addCurvePoint(firstShape, cursorPosition, settings)
          store.batch(() => {
            store.setSelectedShape(buildShapesGroup([newShape], settings))
            store.updateShapes([newShape], true)
          })
        } else if (activeTool.type !== 'picture') {
          const newShape = createShape(ctx, activeTool as Exclude<CustomTool, { type: 'picture' }>, cursorPosition, settings)
          if (!newShape) return
          const newSelectedShapes = buildShapesGroup([newShape], settings)!
          store.batch(() => {
            store.addShapes([newShape])
            store.setSelectedShape(newSelectedShapes)
            if (newShape.type === 'polygon' || newShape.type === 'curve') {
              store.setSelectionMode({ mode: 'preview' })
            } else {
              store.setActiveTool(SELECTION_TOOL)
              store.setSelectionMode({
                mode: 'resize',
                cursorStartPosition: [cursorPosition[0] + settings.selectionPadding, cursorPosition[1] + settings.selectionPadding],
                originalShape: newSelectedShapes,
                // a new line is drawn from its first point to its last one, which has the end head
                anchor: newShape.type === 'line' ? 1 : [1, 1],
                selectedShapesLengthAtMouseDown: getSelectedShapes(newSelectedShapes).length
              })
            }
          })
        }
      }
    }

    const handleDoubleClick = (e: PointerEvent) => {
      const { state, settings, activeTool, ctx } = read()
      if (activeTool.type !== 'selection' || !ctx) return
      const { selectedShape } = state.document
      const selectedShapes = getSelectedShapes(selectedShape)
      if (selectedShapes.length !== 1) return
      const firstShape = selectedShapes[0]
      if (firstShape?.locked) return
      const cursorPosition = getCursorPositionInTransformedCanvas(e, canvas, settings)
      if (!isCursorInsideMask(cursorPosition, settings)) return

      if (firstShape?.type === 'text') {
        if (checkSelectionIntersection(ctx, selectedShape!, cursorPosition, settings)) {
          store.setSelectionMode({
            mode: 'textedition',
            defaultValue: firstShape.value
          })
        }
        return
      }
      if (firstShape?.type === 'polygon') {
        const polygonIntersection = checkPolygonLinesSelectionIntersection(ctx, firstShape, cursorPosition, settings)
        if (polygonIntersection) store.updateShapes([addPolygonLine(firstShape, polygonIntersection.lineIndex, cursorPosition, settings)])
        return
      }
      if (firstShape?.type === 'curve') {
        const curveIntersection = checkCurveLinesSelectionIntersection(ctx, firstShape, cursorPosition, settings)
        if (curveIntersection) store.updateShapes([addCurveLine(firstShape, curveIntersection.lineIndex, cursorPosition, settings)])
      }
    }

    /**
     * Ends the gesture when its pointer is released, cancelled by the browser or loses its capture.
     * A release over the canvas may end a click or a double click
     */
    const handlePointerEnd = (e: PointerEvent) => {
      activePointers.delete(e.pointerId)
      if (e.pointerId !== gesturePointerId) return
      gesturePointerId = undefined
      // read before handleUp, whose renders would force a layout
      const isReleasedOverCanvas = e.type === 'pointerup' && e.button === 0 && isOverElement(e, canvas)
      handleUp(e)
      if (!isReleasedOverCanvas) clicks.reset()
      else if (clicks.release(e) === 'doubleClick') handleDoubleClick(e)
    }

    const handleLeave = () => {
      if (gesturePointerId !== undefined) return
      store.clearHover()
    }

    canvas.addEventListener('pointerdown', handleDown, { passive: false })
    canvas.addEventListener('pointermove', handleMove)
    canvas.addEventListener('pointerup', handlePointerEnd)
    canvas.addEventListener('pointercancel', handlePointerEnd)
    canvas.addEventListener('lostpointercapture', handlePointerEnd)
    canvas.addEventListener('pointerleave', handleLeave)

    return () => {
      if (longPressTimeout) clearTimeout(longPressTimeout.timeout)
      canvas.removeEventListener('pointerdown', handleDown)
      canvas.removeEventListener('pointermove', handleMove)
      canvas.removeEventListener('pointerup', handlePointerEnd)
      canvas.removeEventListener('pointercancel', handlePointerEnd)
      canvas.removeEventListener('lostpointercapture', handlePointerEnd)
      canvas.removeEventListener('pointerleave', handleLeave)
    }
  }, [store, canvas])
}

export default useDrawableCanvas
