import type { UtilsSettings } from '@canvas/constants/app'
import { ShapeTypeArray } from '@canvas/constants/shapes'
import { SELECTION_TOOL } from '@canvas/constants/tools'
import type { PaintStore } from '@canvas/store/paintStore'
import type { Point } from '@canvas/types/Shapes'
import type { CustomTool } from '@canvas/types/tools'
import {
  checkCurveLinesSelectionIntersection,
  checkPolygonLinesSelectionIntersection,
  checkSelectionIntersection,
  getCursorPosition,
  getCursorPositionInElement,
  getCursorPositionInTransformedCanvas,
  isTouchGesture,
  shouldCancelLongPress
} from '@canvas/utils/intersect'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { buildShapesGroup, selectShape } from '@canvas/utils/selection'
import { createShape } from '@canvas/utils/shapes'
import { addNewPointGroupToShape } from '@canvas/utils/shapes/brush'
import { addCurveLine, addCurvePoint } from '@canvas/utils/shapes/curve'
import { addPolygonLine, addPolygonPoint } from '@canvas/utils/shapes/polygon'
import { transformShape } from '@canvas/utils/transform'
import { clamp } from '@canvas/utils/util'
import { isCursorInsideMask } from '@canvas/utils/zoom'
import { useEffect } from 'react'

const DOUBLE_CLICK_DELAY_MS = 300
const LONG_PRESS_DELAY_MS = 500

/** Speed of the auto scroll on one axis, when the cursor of a selection frame is close to a border */
const getAxisAcceleration = (position: number, size: number, settings: UtilsSettings) => {
  const zoomedPosition = position * settings.canvasZoom
  const distance = zoomedPosition < 50 ? zoomedPosition - 50 : zoomedPosition > size - 50 ? zoomedPosition - (size - 50) : 0
  return Math.ceil(clamp(distance, -100, 100) / 5 / settings.canvasZoom)
}

const getMoveAcceleration = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement, settings: UtilsSettings): Point => {
  const [x, y] = getCursorPositionInElement(e, canvas, settings.canvasSize)
  const { width, height, scaleRatioWithNoZoom } = settings.canvasSize
  return [getAxisAcceleration(x, width / scaleRatioWithNoZoom, settings), getAxisAcceleration(y, height / scaleRatioWithNoZoom, settings)]
}

/**
 * Pointer interactions of the draw canvas. The listeners are set once and read the state of the store
 * when an event happens: the gestures do not need any render of React.
 */
const useDrawableCanvas = (store: PaintStore, canvas: HTMLCanvasElement | null) => {
  useEffect(() => {
    if (!canvas) return

    let longPressTimeout: { timeout: ReturnType<typeof setTimeout>; startPosition: { clientX: number; clientY: number } } | null = null
    let lastClickTimestamp: number | undefined

    const read = () => {
      const state = store.getState()
      return {
        state,
        settings: store.getSettings(state),
        activeTool: store.selectors.selectActiveTool(state),
        ctx: canvas.getContext('2d')
      }
    }

    const handleContextMenu = (e: MouseEvent | TouchEvent) => {
      const { state, settings, activeTool, ctx } = read()
      if (!ctx) return
      store.batch(() => {
        if (activeTool.id !== SELECTION_TOOL.id || !store.selectors.selectWithContextMenu(state)) {
          store.setSelectedShape(undefined)
          store.setSelectionMode({ mode: 'default' })
        } else {
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
          const { clientX, clientY } = getCursorPosition(e)
          store.setSelectedShape(shape)
          store.setSelectionMode({
            mode: 'contextMenu',
            cursorStartPosition: cursorPosition,
            clientPosition: { x: clientX, y: clientY },
            originalShape: shape,
            anchor: 'anchor' in mode ? mode.anchor : undefined
          })
        }
        store.setActiveTool(SELECTION_TOOL)
        store.setSelectionFrame(undefined)
      })
    }

    const handleMove = (e: MouseEvent | TouchEvent) => {
      // the listener is set on the document: the moves outside of the editor are ignored first
      if (!store.getState().interaction.focus.component) return
      if (longPressTimeout && shouldCancelLongPress(e, longPressTimeout.startPosition)) {
        clearTimeout(longPressTimeout.timeout)
      }
      if (isTouchGesture(e) && e.touches.length > 1) return
      const { state, settings, ctx } = read()
      if (!ctx) return

      const { selectionMode, panStart, modifiers } = state.interaction
      const { selectedShape } = state.document
      const cursorPosition = getCursorPositionInTransformedCanvas(e, canvas, settings)

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

      store.batch(() => {
        if (!isTouchGesture(e)) {
          store.refreshHoveredShape(e, ctx, cursorPosition, isInsideMask)
        }

        if (selectedShape === undefined || selectedShape.locked) {
          store.setHoverMode({ mode: 'default', outOfView: !isInsideMask })
          return
        }

        if (selectionMode.mode === 'default' || selectionMode.mode === 'textedition' || selectionMode.mode === 'contextMenu') {
          if (!isInsideMask) {
            store.setHoverMode({ mode: 'default' })
            return
          }
          store.setHoverMode(checkSelectionIntersection(ctx, selectedShape, cursorPosition, settings, true) || { mode: 'default' })
        } else {
          const newShape = transformShape(ctx, selectedShape, cursorPosition, selectionMode, settings, modifiers.shift, modifiers.alt)
          store.updateShapes(getSelectedShapes(newShape))
        }

        if (selectionMode.mode === 'translate' && modifiers.alt && !selectionMode.hasBeenDuplicated) {
          store.setSelectionMode({ ...selectionMode, hasBeenDuplicated: true })
          store.duplicateShapes(getSelectedShapes(selectionMode.originalShape))
        }
      })
    }

    const handleUp = (e: MouseEvent | TouchEvent) => {
      if (!store.getState().interaction.focus.canvas) return
      if (longPressTimeout) clearTimeout(longPressTimeout.timeout)
      if (isTouchGesture(e) && e.touches.length > 1) return
      const { state, settings, ctx } = read()
      if (!ctx) return

      const isRightClick = 'button' in e && e.button === 2
      if (isRightClick) {
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

      const cursorPosition = getCursorPositionInTransformedCanvas(e, canvas, settings)

      if (
        selectionMode.mode === 'translate' &&
        Date.now() - selectionMode.dateStart <= 500 &&
        cursorPosition[0] === selectionMode.cursorStartPosition[0] &&
        cursorPosition[1] === selectionMode.cursorStartPosition[1]
      ) {
        const isGroupMode = e.ctrlKey || e.shiftKey || e.metaKey
        store.batch(() => {
          if (isGroupMode) {
            const { shape } = selectShape(
              ctx,
              state.document.shapes,
              cursorPosition,
              settings,
              state.document.selectedShape,
              isTouchGesture(e),
              state.config.options.withFrameSelection,
              'remove'
            )
            if (getSelectedShapes(shape).length !== selectionMode.selectedShapesLengthAtMouseDown) {
              store.setSelectedShape(shape)
            }
          }

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

    const handleDown = (e: MouseEvent | TouchEvent) => {
      const { state, settings, activeTool, ctx } = read()
      const { features } = settings
      if (!store.selectors.selectIsInteractive(state)) return
      e.preventDefault()
      if (isTouchGesture(e) && e.touches.length > 1) return

      canvas.focus()

      if (!ctx) return
      const { selectedShape, shapes } = state.document
      const { selectionMode } = state.interaction
      const cursorPosition = getCursorPositionInTransformedCanvas(e, canvas, settings)

      const isWheelPressed = 'button' in e && e.button === 1
      const isRightClick = 'button' in e && e.button === 2

      if (isWheelPressed || state.interaction.modifiers.space || (activeTool.type === 'move' && !isRightClick)) {
        store.setPanStart({ start: cursorPosition, originalOffset: settings.canvasOffset })
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

      if (isTouchGesture(e)) {
        if (longPressTimeout) clearTimeout(longPressTimeout.timeout)
        longPressTimeout = {
          timeout: setTimeout(() => handleContextMenu(e), LONG_PRESS_DELAY_MS),
          startPosition: getCursorPosition(e)
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
                anchor: newShape.type === 'line' ? 0 : [1, 1],
                selectedShapesLengthAtMouseDown: getSelectedShapes(newSelectedShapes).length
              })
            }
          })
        }
      }
    }

    const handleDoubleClick = (e: MouseEvent | TouchEvent) => {
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

    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (!store.getState().interaction.focus.canvas) return
      const timestamp = Date.now()
      if (lastClickTimestamp && timestamp < lastClickTimestamp + DOUBLE_CLICK_DELAY_MS) handleDoubleClick(e)
      lastClickTimestamp = Date.now()
    }

    canvas.addEventListener('mousedown', handleDown, { passive: false })
    canvas.addEventListener('touchstart', handleDown, { passive: false })
    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('touchend', handleClick)
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('touchmove', handleMove)
    document.addEventListener('mouseup', handleUp)
    document.addEventListener('touchend', handleUp)

    return () => {
      if (longPressTimeout) clearTimeout(longPressTimeout.timeout)
      canvas.removeEventListener('mousedown', handleDown)
      canvas.removeEventListener('touchstart', handleDown)
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('touchend', handleClick)
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      document.removeEventListener('touchend', handleUp)
    }
  }, [store, canvas])
}

export default useDrawableCanvas
