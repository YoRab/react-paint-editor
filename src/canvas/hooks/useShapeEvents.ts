import type { PaintStore } from '@canvas/store/paintStore'
import type { ShapePointerInfo } from '@canvas/types/editor'
import type { ShapeEntity } from '@canvas/types/Shapes'
import { getCursorPositionInTransformedCanvas, hasPointerMoved } from '@canvas/utils/intersect'
import { isCursorInsideMask } from '@canvas/utils/zoom'
import { useEffect } from 'react'

/** A press is a click when the pointer barely moves, during less than this duration */
const CLICK_MAX_DURATION_MS = 500

/**
 * Emits shapeClicked and shapeHovered, in every mode: in viewer mode the shapes can still be clicked.
 * The listeners are independent of the gestures, and the shapes are only searched while these events are listened.
 */
const useShapeEvents = (store: PaintStore, canvas: HTMLCanvasElement | null) => {
  useEffect(() => {
    if (!canvas) return

    let press: { pointerId: number; clientX: number; clientY: number; timeStamp: number } | undefined
    let hoveredShapeId: string | undefined

    const getInfo = (e: PointerEvent): ShapePointerInfo => ({
      canvasPosition: getCursorPositionInTransformedCanvas(e, canvas, store.getSettings()),
      clientPosition: { x: e.clientX, y: e.clientY },
      originalEvent: e
    })

    /** The shape under the pointer, from the foreground */
    const findShape = (info: ShapePointerInfo): ShapeEntity | undefined =>
      isCursorInsideMask(info.canvasPosition, store.getSettings()) ? store.getShapeAt(info.canvasPosition) : undefined

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
      pointerdown: e => {
        press = e.button === 0 ? { pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY, timeStamp: e.timeStamp } : undefined
      },
      pointerup: e => {
        const start = press
        press = undefined
        if (!start || start.pointerId !== e.pointerId || !store.hasListeners('shapeClicked')) return
        if (hasPointerMoved(e, start) || e.timeStamp - start.timeStamp >= CLICK_MAX_DURATION_MS) return
        const info = getInfo(e)
        const shape = findShape(info)
        if (shape) store.emit('shapeClicked', shape, info)
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
