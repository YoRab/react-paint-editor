import type { PaintStore } from '@canvas/store/paintStore'
import type { ReactPaintEventName, ShapePointerInfo } from '@canvas/types/editor'
import type { ShapeEntity } from '@canvas/types/Shapes'
import { createClickTracker } from '@canvas/utils/click'
import { getCursorPositionInTransformedCanvas } from '@canvas/utils/intersect'
import { isCursorInsideMask } from '@canvas/utils/zoom'
import { useEffect } from 'react'

const CLICK_EVENTS: ReactPaintEventName[] = ['shapeClicked', 'canvasClicked', 'canvasDoubleClicked']

/**
 * Emits shapeClicked, canvasClicked, canvasDoubleClicked and shapeHovered, in every mode: in viewer mode the shapes can
 * still be clicked. The listeners are independent of the gestures, and the shapes are only searched while these events are listened.
 */
const useShapeEvents = (store: PaintStore, canvas: HTMLCanvasElement | null) => {
  useEffect(() => {
    if (!canvas) return

    const clicks = createClickTracker()
    let hoveredShapeId: string | undefined

    const getInfo = (e: PointerEvent): ShapePointerInfo => ({
      canvasPosition: getCursorPositionInTransformedCanvas(e, canvas, store.getSettings()),
      clientPosition: { x: e.clientX, y: e.clientY },
      originalEvent: e
    })

    /** Outside of a fixed drawing smaller than the view, there is nothing to find nor to click */
    const isInsideDrawing = (info: ShapePointerInfo) => isCursorInsideMask(info.canvasPosition, store.getSettings())

    /** The shape under the pointer, from the foreground */
    const findShape = (info: ShapePointerInfo): ShapeEntity | undefined => (isInsideDrawing(info) ? store.getShapeAt(info.canvasPosition) : undefined)

    /** In viewer mode, the cursor shows that a shape can be clicked */
    const isClickableView = () => store.hasListeners('shapeClicked') && !store.selectors.selectFeatures(store.getState()).edition

    const setHovered = (shape: ShapeEntity | undefined, info: ShapePointerInfo, clickable: boolean) => {
      canvas.style.cursor = shape && clickable ? 'pointer' : ''
      if (shape?.id === hoveredShapeId) return
      hoveredShapeId = shape?.id
      store.emit('shapeHovered', shape, info)
    }

    const clearHovered = (e: PointerEvent) => {
      if (hoveredShapeId !== undefined || canvas.style.cursor) setHovered(undefined, getInfo(e), false)
    }

    const listeners: { [K in 'pointerdown' | 'pointerup' | 'pointermove' | 'pointerleave']: (e: PointerEvent) => void } = {
      pointerdown: clicks.press,
      pointerup: e => {
        const click = clicks.release(e)
        if (!click || !CLICK_EVENTS.some(event => store.hasListeners(event))) return
        const info = getInfo(e)
        // a click outside of the drawing is not emitted: it does not start a double click
        if (!isInsideDrawing(info)) {
          clicks.reset()
          return
        }
        const shape = store.getShapeAt(info.canvasPosition)
        if (shape) store.emit('shapeClicked', shape, info)
        store.emit('canvasClicked', shape, info)
        if (click === 'doubleClick') store.emit('canvasDoubleClicked', shape, info)
      },
      pointermove: e => {
        const clickable = isClickableView()
        if (!clickable && !store.hasListeners('shapeHovered')) {
          clearHovered(e)
          return
        }
        const info = getInfo(e)
        setHovered(findShape(info), info, clickable)
      },
      pointerleave: clearHovered
    }

    for (const [type, listener] of Object.entries(listeners)) canvas.addEventListener(type, listener as EventListener)

    return () => {
      for (const [type, listener] of Object.entries(listeners)) canvas.removeEventListener(type, listener as EventListener)
      canvas.style.cursor = ''
    }
  }, [store, canvas])
}

export default useShapeEvents
