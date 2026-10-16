import usePinchZoomAndMove from '@canvas/hooks/usePinchZoomAndMove'
import type { PaintStore } from '@canvas/store/paintStore'
import { getCursorPositionInElement } from '@canvas/utils/intersect'
import { normalizeWheel } from '@canvas/utils/zoom'
import { useEffect, useRef } from 'react'

type UseZoomProps = {
  store: PaintStore
  canvasElt: HTMLCanvasElement | null
  zoomEnabled: boolean
}

/** Zooms and scrolls the canvas with the wheel, and with a pinch on touch screens */
const useZoom = ({ store, zoomEnabled, canvasElt }: UseZoomProps) => {
  const lastTimeWheelEvent = useRef(0)

  usePinchZoomAndMove({ store, canvasElt })

  useEffect(() => {
    if (!zoomEnabled || !canvasElt) return

    const handleWheel = (e: WheelEvent) => {
      const isZooming = e.ctrlKey
      const { deltaX, deltaY } = normalizeWheel(e, e.timeStamp - lastTimeWheelEvent.current)
      lastTimeWheelEvent.current = e.timeStamp
      if (isZooming) {
        e.preventDefault()
        const centerPoint = getCursorPositionInElement(e, canvasElt, store.getState().view.canvasSize)
        store.zoomBy(deltaY, centerPoint)
        return
      }

      const naturalDirection = e.shiftKey
      const hasMoved = store.scrollBy(naturalDirection ? [deltaY, deltaX] : [deltaX, deltaY])
      if (hasMoved) e.preventDefault()
    }

    canvasElt.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvasElt.removeEventListener('wheel', handleWheel)
    }
  }, [canvasElt, zoomEnabled, store])
}

export default useZoom
