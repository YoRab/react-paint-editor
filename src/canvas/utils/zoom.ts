import type { UtilsSettings } from '@canvas/constants/app'
import { IOS_TRACKPAD_PINCH_FACTOR, ZOOM_BG_COLOR, ZOOM_STEP_DEFAULT, ZOOM_STEPS } from '@canvas/constants/zoom'
import type { CanvasSize, Size } from '@canvas/types/Canvas'
import type { Point, Rect } from '@canvas/types/Shapes'
import { clamp, isMacOs } from '@canvas/utils/util'

/** Keeps a zoom level between the smallest and the largest zoom steps */
export const clampZoom = (zoom: number): number => clamp(zoom, ZOOM_STEPS[0]!, ZOOM_STEPS[ZOOM_STEPS.length - 1]!)

/** Bounds of the view: the visible area at zoom 1 and the size of the drawing, which limits the view when its size is fixed */
export type ViewBounds = {
  size: Size
  canvasSize: CanvasSize
  drawingSize: UtilsSettings['drawingSize']
}

/** Offset on one axis keeping a drawing of a fixed size in the view: centered when it fits in it, else covering the whole view */
const constrainOffset = (offset: number, zoom: number, view: number, drawing: number) =>
  drawing * zoom <= view ? view / zoom / 2 - drawing / 2 : clamp(offset, view / zoom - drawing, 0)

export const getNewOffset = ({
  size,
  zoom,
  newOffset: [x, y],
  canvasSize,
  drawingSize
}: ViewBounds & {
  zoom: number
  newOffset: Point
}): {
  zoom: number
  offset: Point
} => {
  if (size === 'infinite') return { zoom: zoom, offset: [x, y] }

  return {
    zoom,
    offset: [constrainOffset(x, zoom, canvasSize.realWidth, drawingSize.width), constrainOffset(y, zoom, canvasSize.realHeight, drawingSize.height)]
  }
}

export const calculateNewZoomAndOffset = ({
  currentOffset,
  currentZoom,
  zoom,
  centerPoint,
  ...bounds
}: ViewBounds & {
  currentOffset: Point
  currentZoom: number
  zoom: number
  centerPoint: Point
}): {
  offset: Point
  zoom: number
} => {
  const offsetX = currentOffset[0] - (centerPoint[0] / currentZoom - centerPoint[0] / zoom)
  const offsetY = currentOffset[1] - (centerPoint[1] / currentZoom - centerPoint[1] / zoom)

  const { offset } = getNewOffset({
    ...bounds,
    zoom,
    newOffset: [offsetX, offsetY]
  })

  return {
    offset,
    zoom
  }
}

export const getNewZoomAndOffset = ({
  currentOffset,
  currentZoom,
  action,
  ...bounds
}: ViewBounds & {
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

  const centerPoint: Point = [bounds.canvasSize.realWidth / 2, bounds.canvasSize.realHeight / 2]

  return calculateNewZoomAndOffset({
    ...bounds,
    currentOffset,
    currentZoom,
    zoom: newZoom,
    centerPoint
  })
}

export const getNewZoomAndOffsetFromDelta = ({
  currentOffset,
  currentZoom,
  delta,
  centerPoint,
  ...bounds
}: ViewBounds & {
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
    ...bounds,
    currentOffset,
    currentZoom,
    zoom: newZoom,
    centerPoint
  })
}

/** Zoom and offset showing the whole box in the middle of the view, with a margin in pixels of the screen */
export const getZoomAndOffsetToFit = ({
  box,
  padding,
  ...bounds
}: ViewBounds & {
  box: Rect
  padding: number
}): {
  offset: Point
  zoom: number
} => {
  const { canvasSize } = bounds
  const margin = (2 * padding) / canvasSize.scaleRatio
  // a flat box, like a horizontal line, is fitted along its other side
  const zoom = clampZoom(
    Math.min((canvasSize.realWidth - margin) / Math.max(box.width, 1), (canvasSize.realHeight - margin) / Math.max(box.height, 1))
  )
  // the center of the box is displayed in the center of the view: (point + offset) * zoom
  const newOffset: Point = [canvasSize.realWidth / 2 / zoom - (box.x + box.width / 2), canvasSize.realHeight / 2 / zoom - (box.y + box.height / 2)]
  return getNewOffset({ ...bounds, zoom, newOffset })
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

/** The drawing, in pixels of the canvas */
export const getMaskRect = (settings: UtilsSettings) => {
  const {
    canvasSize: { scaleRatio },
    drawingSize,
    canvasOffset
  } = settings

  return {
    x: canvasOffset[0] * scaleRatio,
    y: canvasOffset[1] * scaleRatio,
    width: drawingSize.width * scaleRatio,
    height: drawingSize.height * scaleRatio
  }
}

/**
 * Whether a mask is drawn around the drawing: its size is fixed and it is smaller than the view. A drawing larger than
 * the view on an axis covers it, its offset being kept inside the drawing
 */
export const hasMask = ({ size, canvasZoom, canvasSize, drawingSize }: UtilsSettings): boolean =>
  size === 'fixed' && (drawingSize.width * canvasZoom < canvasSize.realWidth || drawingSize.height * canvasZoom < canvasSize.realHeight)

export const clipMask = (ctx: CanvasRenderingContext2D, settings: UtilsSettings) => {
  if (!hasMask(settings)) return
  const maskRect = getMaskRect(settings)
  ctx.beginPath()
  ctx.rect(maskRect.x, maskRect.y, maskRect.width, maskRect.height)
  ctx.closePath()
  ctx.clip()
}

export const drawMask = (ctx: CanvasRenderingContext2D, settings: UtilsSettings): void => {
  const {
    canvasSize: { width, height }
  } = settings

  if (!hasMask(settings)) return

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
      cursorPosition[0] < settings.drawingSize.width &&
      cursorPosition[1] > 0 &&
      cursorPosition[1] < settings.drawingSize.height)
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
