import type { UtilsSettings } from '@canvas/constants/app'
import { IOS_TRACKPAD_PINCH_FACTOR, ZOOM_BG_COLOR, ZOOM_STEP_DEFAULT, ZOOM_STEPS } from '@canvas/constants/zoom'
import type { CanvasSize, Size } from '@canvas/types/Canvas'
import type { Point, Rect } from '@canvas/types/Shapes'
import { clamp, isMacOs } from '@canvas/utils/util'

/** Keeps a zoom level between the smallest and the largest zoom steps */
export const clampZoom = (zoom: number): number => clamp(zoom, ZOOM_STEPS[0]!, ZOOM_STEPS[ZOOM_STEPS.length - 1]!)

export const getNewOffset = ({
  size,
  zoom,
  newOffset: [x, y],
  canvasSize
}: {
  zoom: number
  size: Size
  newOffset: Point
  canvasSize: CanvasSize
}): {
  zoom: number
  offset: Point
} => {
  if (size === 'infinite') return { zoom: zoom, offset: [x, y] }

  if (zoom < 1) {
    const fixedOffset: Point = [
      -(canvasSize.realWidth - canvasSize.realWidth / zoom) / 2,
      -(canvasSize.realHeight - canvasSize.realHeight / zoom) / 2
    ]
    return { zoom, offset: fixedOffset }
  }
  const clampedOffest: Point = [
    clamp(x, canvasSize.realWidth / zoom - canvasSize.realWidth, 0),
    clamp(y, canvasSize.realHeight / zoom - canvasSize.realHeight, 0)
  ]
  return { zoom, offset: clampedOffest }
}

export const calculateNewZoomAndOffset = ({
  size,
  canvasSize,
  currentOffset,
  currentZoom,
  zoom,
  centerPoint: iCenterPoint
}: {
  size: Size
  canvasSize: CanvasSize
  currentOffset: Point
  currentZoom: number
  zoom: number
  centerPoint: Point
}): {
  offset: Point
  zoom: number
} => {
  const centerPoint: Point = size === 'fixed' && zoom < 1 ? [canvasSize.realWidth / 2, canvasSize.realHeight / 2] : iCenterPoint

  const offsetX = currentOffset[0] - (centerPoint[0] / currentZoom - centerPoint[0] / zoom)
  const offsetY = currentOffset[1] - (centerPoint[1] / currentZoom - centerPoint[1] / zoom)

  const { offset } = getNewOffset({
    size,
    zoom,
    newOffset: [offsetX, offsetY],
    canvasSize
  })

  return {
    offset,
    zoom
  }
}

export const getNewZoomAndOffset = ({
  size,
  canvasSize,
  currentOffset,
  currentZoom,
  action
}: {
  size: Size
  canvasSize: CanvasSize
  currentOffset: Point
  currentZoom: number
  action: 'unzoom' | 'zoom' | 'default'
}): {
  offset: Point
  zoom: number
} => {
  const newZoom =
    action === 'default'
      ? ZOOM_STEPS[ZOOM_STEP_DEFAULT]!
      : action === 'zoom'
        ? ZOOM_STEPS[
            clamp(
              ZOOM_STEPS.length -
                1 -
                ZOOM_STEPS.slice(0)
                  .reverse()
                  .findIndex(zoom => zoom <= currentZoom) +
                1,
              0,
              ZOOM_STEPS.length - 1
            )
          ]!
        : ZOOM_STEPS[clamp(ZOOM_STEPS.findIndex(zoom => zoom >= currentZoom) - 1, 0, ZOOM_STEPS.length - 1)]!

  const centerPoint: Point = [canvasSize.realWidth / 2, canvasSize.realHeight / 2]

  return calculateNewZoomAndOffset({
    size,
    canvasSize,
    currentOffset,
    currentZoom,
    zoom: newZoom,
    centerPoint
  })
}

export const getNewZoomAndOffsetFromDelta = ({
  size,
  canvasSize,
  currentOffset,
  currentZoom,
  delta,
  centerPoint
}: {
  size: Size
  canvasSize: CanvasSize
  currentOffset: Point
  currentZoom: number
  delta: number
  centerPoint: Point
}): {
  offset: Point
  zoom: number
} => {
  const newZoom = clampZoom(currentZoom * (1 - delta / 1000))

  return calculateNewZoomAndOffset({
    size,
    canvasSize,
    currentOffset,
    currentZoom,
    zoom: newZoom,
    centerPoint
  })
}

/** Zoom and offset showing the whole box in the middle of the view, with a margin in pixels of the screen */
export const getZoomAndOffsetToFit = ({
  size,
  canvasSize,
  box,
  padding
}: {
  size: Size
  canvasSize: CanvasSize
  box: Rect
  padding: number
}): {
  offset: Point
  zoom: number
} => {
  const margin = (2 * padding) / canvasSize.scaleRatio
  // a flat box, like a horizontal line, is fitted along its other side
  const zoom = clampZoom(
    Math.min((canvasSize.realWidth - margin) / Math.max(box.width, 1), (canvasSize.realHeight - margin) / Math.max(box.height, 1))
  )
  // the center of the box is displayed in the center of the view: (point + offset) * zoom
  const newOffset: Point = [canvasSize.realWidth / 2 / zoom - (box.x + box.width / 2), canvasSize.realHeight / 2 / zoom - (box.y + box.height / 2)]
  return getNewOffset({ size, zoom, canvasSize, newOffset })
}

export const getCurrentView = (settings: UtilsSettings): Rect => {
  const {
    canvasSize: { width, height, scaleRatioWithNoZoom },
    canvasZoom,
    canvasOffset
  } = settings

  return {
    x: -canvasOffset[0],
    y: -canvasOffset[1],
    width: width / canvasZoom / scaleRatioWithNoZoom,
    height: height / canvasZoom / scaleRatioWithNoZoom
  }
}

export const getMaskRect = (settings: UtilsSettings) => {
  const {
    canvasSize: { width, height, scaleRatioWithNoZoom },
    canvasZoom,
    canvasOffset
  } = settings

  return {
    x: canvasOffset[0] * canvasZoom * scaleRatioWithNoZoom,
    y: canvasOffset[1] * canvasZoom * scaleRatioWithNoZoom,
    width: width * canvasZoom,
    height: height * canvasZoom
  }
}

export const clipMask = (ctx: CanvasRenderingContext2D, settings: UtilsSettings) => {
  const { canvasZoom, size } = settings

  if (size !== 'fixed' || canvasZoom >= 1) return
  const maskRect = getMaskRect(settings)
  ctx.beginPath()
  ctx.rect(maskRect.x, maskRect.y, maskRect.width, maskRect.height)
  ctx.closePath()
  ctx.clip()
}

export const drawMask = (ctx: CanvasRenderingContext2D, settings: UtilsSettings): void => {
  const {
    canvasZoom,
    size,
    canvasSize: { width, height }
  } = settings

  if (size !== 'fixed' || canvasZoom >= 1) return

  ctx.fillStyle = ZOOM_BG_COLOR
  ctx.fillRect(0, 0, width, height)
  const maskRect = getMaskRect(settings)
  ctx.clearRect(maskRect.x, maskRect.y, maskRect.width, maskRect.height)
  clipMask(ctx, settings)
}

export const isCursorInsideMask = (cursorPosition: Point, settings: UtilsSettings): boolean => {
  return (
    settings.size !== 'fixed' ||
    (cursorPosition[0] > 0 &&
      cursorPosition[0] < settings.canvasSize.realWidth &&
      cursorPosition[1] > 0 &&
      cursorPosition[1] < settings.canvasSize.realHeight)
  )
}

export const normalizeWheel = (event: WheelEvent, lastTimeEvent: number) => {
  const isLikelyTrackpad = Math.abs(event.deltaY) < 50 && lastTimeEvent < 50
  const isZooming = event.ctrlKey
  const isMacOsTrackpadPinching = isMacOs() && isLikelyTrackpad && isZooming

  switch (event.deltaMode) {
    case WheelEvent.DOM_DELTA_LINE: // lines
      return { deltaX: event.deltaX * 16, deltaY: event.deltaY * 16 }
    case WheelEvent.DOM_DELTA_PAGE: // pages
      return { deltaX: event.deltaX * window.innerHeight, deltaY: event.deltaY * window.innerHeight }
    // case WheelEvent.DOM_DELTA_PIXEL:
    default:
      return isMacOsTrackpadPinching
        ? { deltaX: event.deltaX * IOS_TRACKPAD_PINCH_FACTOR, deltaY: event.deltaY * IOS_TRACKPAD_PINCH_FACTOR }
        : { deltaX: event.deltaX, deltaY: event.deltaY }
  }
}
