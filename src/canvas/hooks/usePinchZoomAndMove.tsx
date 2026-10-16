import { ZOOM_DETECTION_OFFSET, ZOOM_STEPS } from '@canvas/constants/zoom'
import useEventListener from '@canvas/hooks/useEventListener'
import type { PaintStore } from '@canvas/store/paintStore'
import type { CanvasSize, Size } from '@canvas/types/Canvas'
import type { Point } from '@canvas/types/Shapes'
import { getCenter, getDistanceBetweenPoints } from '@canvas/utils/trigo'
import { clamp } from '@canvas/utils/util'
import { calculateNewZoomAndOffset } from '@canvas/utils/zoom'
import { useCallback, useRef, useState } from 'react'

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
  const newZoom = isZooming ? clamp((currentDiff / startDiff) * startZoom, ZOOM_STEPS[0]!, ZOOM_STEPS[ZOOM_STEPS.length - 1]!) : startZoom

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

const usePinchZoomAndMove = ({ store, canvasElt }: UsePinchZoomProps) => {
  const evCache = useRef<PointerEvent[]>([])
  const [hasFingerOnElement, setHasFingerOnElement] = useState(evCache.current.length > 0)

  const pinchData = useRef<PinchData>(null)

  const scaleOnPosition = useCallback(
    ({
      startDiff,
      startZoom,
      startCenter,
      startOffset,
      currentDiff,
      currentCenter,
      isMoving,
      isZooming
    }: {
      startDiff: number
      startZoom: number
      startOffset: Point
      startCenter: Point
      currentDiff: number
      currentCenter: Point
      isMoving: boolean
      isZooming: boolean
    }) => {
      if (!canvasElt || !currentDiff || !startDiff) return

      const { config, view } = store.getState()
      const canvasBoundingRect = canvasElt.getBoundingClientRect()
      const canvasTransformation = getCanvasTransformation({
        canvasBoundingRect,
        canvasSize: view.canvasSize,
        size: config.options.size,
        startDiff,
        startZoom,
        startCenter,
        startOffset,
        currentDiff,
        currentCenter,
        isMoving,
        isZooming
      })

      store.setTransformation(canvasTransformation)
    },
    [canvasElt, store]
  )

  const handleDown = (ev: PointerEvent) => {
    evCache.current = [...evCache.current, ev]
    setHasFingerOnElement(evCache.current.length > 0)
    if (evCache.current.length === 2) {
      ev.stopPropagation()

      const { diff: startDiff, center: startCenter } = getDiffAndCenter(evCache.current as [PointerEvent, PointerEvent])
      const { transformation } = store.getState().view

      pinchData.current = {
        startDiff,
        startCenter,
        startZoom: transformation.zoom,
        startOffset: transformation.offset,
        isMoving: false,
        isZooming: false
      }
    }
  }

  const handleMove = (ev: PointerEvent) => {
    const evIndex = evCache.current.findIndex(cachedEv => cachedEv.pointerId === ev.pointerId)
    if (evIndex > -1) evCache.current[evIndex] = ev

    if (evCache.current.length === 2 && pinchData.current) {
      const { diff: currentDiff, center: currentCenter } = getDiffAndCenter(evCache.current as [PointerEvent, PointerEvent])

      const isZooming = pinchData.current.isZooming || hasStartZooming(currentDiff, pinchData.current)
      const isMoving = pinchData.current.isMoving || isZooming || hasStartMoving(currentCenter, pinchData.current)
      pinchData.current = { ...pinchData.current, isMoving, isZooming }

      scaleOnPosition({
        ...pinchData.current,
        currentDiff,
        currentCenter
      })
    }
  }

  const handleUp = (ev: PointerEvent) => {
    evCache.current = evCache.current.filter(event => event.pointerId !== ev.pointerId)
    setHasFingerOnElement(evCache.current.length > 0)
  }

  useEventListener(canvasElt, 'pointerdown', handleDown)

  const conditionalDocument = hasFingerOnElement ? document : null
  useEventListener(conditionalDocument, 'pointermove', handleMove)
  useEventListener(conditionalDocument, 'pointerup', handleUp)
  useEventListener(conditionalDocument, 'pointerout', handleUp)
  useEventListener(conditionalDocument, 'pointercancel', handleUp)
  useEventListener(conditionalDocument, 'pointerleave', handleUp)
}

export default usePinchZoomAndMove
