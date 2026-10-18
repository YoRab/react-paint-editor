import { ZOOM_DETECTION_OFFSET } from '@canvas/constants/zoom'
import type { PaintStore } from '@canvas/store/paintStore'
import type { CanvasSize, Size } from '@canvas/types/Canvas'
import type { Point } from '@canvas/types/Shapes'
import { getCenter, getDistanceBetweenPoints } from '@canvas/utils/trigo'
import { calculateNewZoomAndOffset, clampZoom } from '@canvas/utils/zoom'
import { useEffect } from 'react'

type PinchData = { startDiff: number; startZoom: number; startCenter: Point; startOffset: Point; isZooming: boolean; isMoving: boolean }

const hasStartZooming = (currentDiff: number, pinchData: PinchData): boolean => Math.abs(currentDiff - pinchData.startDiff) > ZOOM_DETECTION_OFFSET

const hasStartMoving = (currentCenter: Point, pinchData: PinchData): boolean =>
  Math.abs(getDistanceBetweenPoints(currentCenter, pinchData.startCenter)) > 10

const getDiffAndCenter = (evCache: [PointerEvent, PointerEvent]) => {
  const point1: Point = [evCache[0].clientX, evCache[0].clientY]
  const point2: Point = [evCache[1].clientX, evCache[1].clientY]
  const diff = getDistanceBetweenPoints(point1, point2)
  const center = getCenter(point1, point2)
  return { diff, center }
}

const getCanvasTransformation = ({
  canvasBoundingRect,
  canvasSize,
  size,
  startDiff,
  startZoom,
  startCenter,
  startOffset,
  currentDiff,
  currentCenter,
  isMoving,
  isZooming
}: {
  canvasBoundingRect: DOMRect
  canvasSize: CanvasSize
  size: Size
  startDiff: number
  startZoom: number
  startOffset: Point
  startCenter: Point
  currentDiff: number
  currentCenter: Point
  isMoving: boolean
  isZooming: boolean
}): {
  offset: Point
  zoom: number
} => {
  const newZoom = isZooming ? clampZoom((currentDiff / startDiff) * startZoom) : startZoom

  const newOffset: Point = isMoving
    ? [
        startOffset[0] + ((currentCenter[0] - startCenter[0]) * (canvasSize.width / canvasBoundingRect.width)) / canvasSize.scaleRatio / startZoom,
        startOffset[1] + ((currentCenter[1] - startCenter[1]) * (canvasSize.height / canvasBoundingRect.height)) / canvasSize.scaleRatio / startZoom
      ]
    : [startOffset[0], startOffset[1]]

  const centerPoint: Point = [
    (currentCenter[0] - canvasBoundingRect.left) / canvasSize.scaleRatio,
    (currentCenter[1] - canvasBoundingRect.top) / canvasSize.scaleRatio
  ]

  return calculateNewZoomAndOffset({
    size,
    canvasSize,
    currentOffset: newOffset,
    currentZoom: startZoom,
    zoom: newZoom,
    centerPoint
  })
}

type UsePinchZoomProps = {
  store: PaintStore
  canvasElt: HTMLElement | null
}

/** Events of the document which end the press of a pointer */
const POINTER_END_EVENTS = ['pointerup', 'pointerout', 'pointercancel', 'pointerleave'] as const

const usePinchZoomAndMove = ({ store, canvasElt }: UsePinchZoomProps) => {
  useEffect(() => {
    if (!canvasElt) return

    // the pointers pressed on the canvas, and the start of the pinch when there are two
    let evCache: PointerEvent[] = []
    let pinchData: PinchData | undefined

    const handleMove = (ev: PointerEvent) => {
      const evIndex = evCache.findIndex(cachedEv => cachedEv.pointerId === ev.pointerId)
      if (evIndex > -1) evCache[evIndex] = ev
      if (evCache.length !== 2 || !pinchData) return

      const { diff: currentDiff, center: currentCenter } = getDiffAndCenter(evCache as [PointerEvent, PointerEvent])
      const isZooming = pinchData.isZooming || hasStartZooming(currentDiff, pinchData)
      const isMoving = pinchData.isMoving || isZooming || hasStartMoving(currentCenter, pinchData)
      pinchData = { ...pinchData, isMoving, isZooming }
      if (!currentDiff || !pinchData.startDiff) return

      const { config, view } = store.getState()
      store.setTransformation(
        getCanvasTransformation({
          ...pinchData,
          canvasBoundingRect: canvasElt.getBoundingClientRect(),
          canvasSize: view.canvasSize,
          size: config.options.size,
          currentDiff,
          currentCenter
        })
      )
    }

    // the document is listened while a pointer is down on the canvas: the listeners are set without any render
    const listenDocument = (listen: boolean) => {
      if (listen) {
        document.addEventListener('pointermove', handleMove)
        for (const event of POINTER_END_EVENTS) document.addEventListener(event, handleUp)
      } else {
        document.removeEventListener('pointermove', handleMove)
        for (const event of POINTER_END_EVENTS) document.removeEventListener(event, handleUp)
      }
    }

    const handleDown = (ev: PointerEvent) => {
      evCache = [...evCache, ev]
      if (evCache.length === 1) listenDocument(true)
      if (evCache.length === 2) {
        ev.stopPropagation()

        const { diff: startDiff, center: startCenter } = getDiffAndCenter(evCache as [PointerEvent, PointerEvent])
        const { transformation } = store.getState().view

        pinchData = {
          startDiff,
          startCenter,
          startZoom: transformation.zoom,
          startOffset: transformation.offset,
          isMoving: false,
          isZooming: false
        }
      }
    }

    const handleUp = (ev: PointerEvent) => {
      evCache = evCache.filter(event => event.pointerId !== ev.pointerId)
      if (!evCache.length) listenDocument(false)
    }

    canvasElt.addEventListener('pointerdown', handleDown)
    return () => {
      canvasElt.removeEventListener('pointerdown', handleDown)
      listenDocument(false)
    }
  }, [canvasElt, store])
}

export default usePinchZoomAndMove
