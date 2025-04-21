import { ZOOM_BG_COLOR, ZOOM_STEP_DEFAULT, ZOOM_STEPS } from '@canvas/constants/zoom'
import type { CanvasSize, Size } from '@common/types/Canvas'
import type { Point, Rect } from '@common/types/Shapes'
import { clamp } from '@common/utils/util'
import type { UtilsSettings } from '@canvas/constants/app'

export const getNewOffset = ({
  size,
  zoom,
  newOffset: [x, y],
  canvasSize
}: { zoom: number; size: Size; newOffset: Point; canvasSize: CanvasSize }): {
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

const calculateNewZoomAndOffset = ({
  size,
  canvasSize,
  currentOffset,
  currentZoom,
  newZoom
}: { size: Size; canvasSize: CanvasSize; currentOffset: Point; currentZoom: number; newZoom: number }): {
  offset: Point
  zoom: number
} => {
  if (size === 'infinite' || newZoom < 1)
    return {
      offset: [
        currentOffset[0] - (canvasSize.realWidth / currentZoom - canvasSize.realWidth / newZoom) / 2,
        currentOffset[1] - (canvasSize.realHeight / currentZoom - canvasSize.realHeight / newZoom) / 2
      ],
      zoom: newZoom
    }
  return {
    offset: [
      clamp(
        currentOffset[0] - (canvasSize.realWidth / currentZoom - canvasSize.realWidth / newZoom) / 2,
        canvasSize.realWidth / newZoom - canvasSize.realWidth,
        0
      ),
      clamp(
        currentOffset[1] - (canvasSize.realHeight / currentZoom - canvasSize.realHeight / newZoom) / 2,
        canvasSize.realHeight / newZoom - canvasSize.realHeight,
        0
      )
    ],
    zoom: newZoom
  }
}

export const getNewZoomAndOffset = ({
  size,
  canvasSize,
  currentOffset,
  currentZoom,
  action
}: { size: Size; canvasSize: CanvasSize; currentOffset: Point; currentZoom: number; action: 'unzoom' | 'zoom' | 'default' }): {
  offset: Point
  zoom: number
} => {
  const currentZoomStep = ZOOM_STEPS.findIndex(zoom => zoom >= currentZoom)
  const newZoom =
    ZOOM_STEPS[action === 'default' ? ZOOM_STEP_DEFAULT : clamp(currentZoomStep + (action === 'unzoom' ? -1 : 1), 0, ZOOM_STEPS.length - 1)]

  return calculateNewZoomAndOffset({
    size,
    canvasSize,
    currentOffset,
    currentZoom,
    newZoom
  })
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
