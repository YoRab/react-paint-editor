import usePinchZoomAndMove from '@canvas/hooks/usePinchZoomAndMove'
import { getCursorPositionInElement } from '@canvas/utils/intersect'
import { getNewOffset, getNewZoomAndOffset, getNewZoomAndOffsetFromDelta, normalizeWheel } from '@canvas/utils/zoom'
import type { CanvasSize, Size } from '@common/types/Canvas'
import type { Point } from '@common/types/Shapes'
import { useCallback, useEffect, useState } from 'react'

type UseZoomProps = {
  canvasSize: CanvasSize
  size: Size
  canvasElt: HTMLCanvasElement | null
  zoomEnabled: boolean
}

const useZoom = ({ canvasSize, size, zoomEnabled, canvasElt }: UseZoomProps) => {
  const [canvasTransformation, setCanvasTransformation] = useState<{ offset: Point; zoom: number }>({ offset: [0, 0], zoom: 1 })

  const setCanvasOffset = useCallback(
    (newOffset: Point) => {
      setCanvasTransformation(({ zoom }) => getNewOffset({ zoom, size, canvasSize, newOffset }))
    },
    [canvasSize, size]
  )

  const setCanvasZoom = useCallback(
    (action: 'unzoom' | 'zoom' | 'default'): void => {
      setCanvasTransformation(({ offset, zoom }) => getNewZoomAndOffset({ size, canvasSize, currentOffset: offset, currentZoom: zoom, action }))
    },
    [canvasSize, size]
  )

  usePinchZoomAndMove({
    canvasElt,
    canvasTransformation,
    canvasSize,
    size,
    setCanvasTransformation
  })

  useEffect(() => {
    if (!zoomEnabled || !canvasElt) return

    const handleWheel = (e: WheelEvent) => {
      const { deltaY } = normalizeWheel(e)
      const isZooming = e.ctrlKey
      if (isZooming) {
        e.preventDefault()
        const centerPoint = getCursorPositionInElement(e, canvasElt, canvasSize)

        setCanvasTransformation(({ offset, zoom }) =>
          getNewZoomAndOffsetFromDelta({ size, canvasSize, currentOffset: offset, currentZoom: zoom, delta: deltaY, centerPoint })
        )
        return
      }

      const horizontalDirection = e.shiftKey
      const pixelX = horizontalDirection ? deltaY : 0
      const pixelY = horizontalDirection ? 0 : deltaY

      setCanvasTransformation(({ offset, zoom }) => {
        const wantedOffset: Point = [offset[0] - pixelX / zoom, offset[1] - pixelY / zoom]
        const newOffset = getNewOffset({ zoom, size, canvasSize, newOffset: wantedOffset })
        if (newOffset.offset[0] !== offset[0] || newOffset.offset[1] !== offset[1]) {
          e.preventDefault()
        }
        return newOffset
      })
    }

    canvasElt.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvasElt.removeEventListener('wheel', handleWheel)
    }
  }, [canvasElt, size, canvasSize, zoomEnabled])

  return {
    setCanvasTransformation,
    setCanvasOffset,
    setCanvasZoom,
    canvasTransformation
  }
}

export default useZoom
