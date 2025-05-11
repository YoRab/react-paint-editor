import { ZOOM_DETECTION_OFFSET, ZOOM_STEPS } from '@canvas/constants/zoom'
import { getCenter, getDistanceBetweenPoints } from '@canvas/utils/trigo'
import { calculateNewZoomAndOffset } from '@canvas/utils/zoom'
import type { CanvasSize, Size } from '@common/types/Canvas'
import type { Point } from '@common/types/Shapes'
import { clamp } from '@common/utils/util'
import { useCallback, useEffect, useRef, useState } from 'react'

type PinchData = { startDiff: number; startZoom: number; startCenter: Point; startOffset: Point; isZooming: boolean; isMoving: boolean }

const hasStartZooming = (currentDiff: number, pinchData: PinchData): boolean => Math.abs(currentDiff - pinchData.startDiff) > ZOOM_DETECTION_OFFSET

const hasStartMoving = (currentCenter: Point, pinchData: PinchData): boolean =>
  Math.abs(getDistanceBetweenPoints(currentCenter, pinchData.startCenter)) > 10

const getDiffAndCenter = (evCache: PointerEvent[]) => {
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
  const newZoom = isZooming ? clamp((currentDiff / startDiff) * startZoom, ZOOM_STEPS[0], ZOOM_STEPS[ZOOM_STEPS.length - 1]) : startZoom

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
  canvasElt: HTMLElement | null
  canvasTransformation: { offset: Point; zoom: number }
  canvasSize: CanvasSize
  size: Size
  setCanvasTransformation: (transformation: {
    offset: Point
    zoom: number
  }) => void
}

const usePinchZoom = ({ canvasElt, canvasTransformation, canvasSize, size, setCanvasTransformation }: UsePinchZoomProps) => {
  const evCache = useRef<PointerEvent[]>([])
  const [hasFingerOnElement, setHasFingerOnElement] = useState(evCache.current.length > 0)

  const pinchData = useRef<PinchData>(null)
  const currentTransformation = useRef(canvasTransformation)
  currentTransformation.current = canvasTransformation

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

      const canvasBoundingRect = canvasElt.getBoundingClientRect()
      const canvasTransformation = getCanvasTransformation({
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
      })

      setCanvasTransformation(canvasTransformation)
    },
    [canvasElt, canvasSize, size, setCanvasTransformation]
  )

  useEffect(() => {
    if (!canvasElt) return

    const handleDown = (ev: PointerEvent) => {
      evCache.current = [...evCache.current, ev]
      setHasFingerOnElement(evCache.current.length > 0)
      if (evCache.current.length === 2) {
        ev.stopPropagation()

        const { diff: startDiff, center: startCenter } = getDiffAndCenter(evCache.current)

        pinchData.current = {
          startDiff,
          startCenter,
          startZoom: currentTransformation.current.zoom,
          startOffset: currentTransformation.current.offset,
          isMoving: false,
          isZooming: false
        }
      }
    }

    canvasElt.addEventListener('pointerdown', handleDown)

    return () => {
      canvasElt.removeEventListener('pointerdown', handleDown)
    }
  }, [canvasElt])

  useEffect(() => {
    if (!hasFingerOnElement) return
    const handleMove = (ev: PointerEvent) => {
      const evIndex = evCache.current.findIndex(cachedEv => cachedEv.pointerId === ev.pointerId)
      if (evIndex > -1) evCache.current[evIndex] = ev

      if (evCache.current.length === 2 && pinchData.current) {
        const { diff: currentDiff, center: currentCenter } = getDiffAndCenter(evCache.current)

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

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
    document.addEventListener('pointerout', handleUp)
    document.addEventListener('pointercancel', handleUp)
    document.addEventListener('pointerleave', handleUp)

    return () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
      document.removeEventListener('pointerout', handleUp)
      document.removeEventListener('pointercancel', handleUp)
      document.removeEventListener('pointerleave', handleUp)
    }
  }, [hasFingerOnElement, scaleOnPosition])
}

export default usePinchZoom
