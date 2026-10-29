import type { UtilsSettings } from '@canvas/constants/app'
import type { SelectionModeResize } from '@canvas/types/Mode'
import type { Point, Rect, SelectionType, ShapeEntity } from '@canvas/types/Shapes'
import { transformCanvas, updateCanvasContext } from '@canvas/utils/canvas'
import { drawRectAnchors, strokeBorders } from '@canvas/utils/selection/anchors'
import { roundForGrid, roundValues } from '@canvas/utils/transform'
import { rotatePoint } from '@canvas/utils/trigo'

/** Outline of a shape drawn by its selection: its path, but for a picture or a text, which are framed by their borders */
export const getSelectionOutline = (shape: ShapeEntity): Path2D | undefined =>
  shape.type === 'picture' || shape.type === 'text' ? undefined : shape.path

export const drawBoundingBox = (ctx: CanvasRenderingContext2D, shape: SelectionType, selectionWidth: number, settings: UtilsSettings): void => {
  if (settings.debug) {
    ctx.save()
    ctx.scale(settings.canvasSize.scaleRatio, settings.canvasSize.scaleRatio)
    ctx.translate(settings.canvasOffset[0], settings.canvasOffset[1])

    updateCanvasContext(ctx, {
      fillColor: 'transparent',
      strokeColor: 'green',
      lineWidth: selectionWidth / settings.canvasSize.scaleRatio
    })

    ctx.strokeRect(shape.computed.boundingBox.x, shape.computed.boundingBox.y, shape.computed.boundingBox.width, shape.computed.boundingBox.height)
    ctx.restore()
  }
}

export const drawSelectionRect = (
  ctx: CanvasRenderingContext2D,
  shape: ShapeEntity,
  selectionColor: string,
  selectionWidth: number,
  settings: UtilsSettings,
  withAnchors: boolean
): void => {
  transformCanvas(ctx, settings, shape.rotation, shape.computed.center)

  if (settings.debug) {
    updateCanvasContext(ctx, {
      fillColor: 'transparent',
      strokeColor: 'red',
      lineWidth: selectionWidth / settings.canvasSize.scaleRatio
    })

    ctx.strokeRect(
      shape.computed.outerBorders.x,
      shape.computed.outerBorders.y,
      shape.computed.outerBorders.width,
      shape.computed.outerBorders.height
    )
  }

  updateCanvasContext(ctx, {
    fillColor: 'transparent',
    strokeColor: selectionColor,
    lineWidth: selectionWidth / settings.canvasSize.scaleRatio
  })
  const { borders } = shape.computed
  const outline = getSelectionOutline(shape)
  if (outline) ctx.stroke(outline)
  else strokeBorders(ctx, borders)

  if (!withAnchors || shape.locked) return

  if (outline) strokeBorders(ctx, borders)
  drawRectAnchors(ctx, borders, settings)
}

const getSelectionData = ({
  borderStart,
  borderSize,
  vector,
  settings,
  invertedAxe,
  anchor
}: {
  borderStart: number
  borderSize: number
  vector: number
  settings: UtilsSettings
  invertedAxe: boolean
  anchor: number
}): [number, number] => {
  switch (anchor) {
    case 0: {
      if (invertedAxe) {
        const newBorderWidth = Math.max(0, vector - borderSize) + 2 * settings.selectionPadding
        return [borderStart + borderSize - 2 * settings.selectionPadding, newBorderWidth]
      }
      const newWidth = Math.max(2 * settings.selectionPadding, borderSize - vector)
      return [borderStart + borderSize - newWidth, newWidth]
    }
    case 0.5:
      return [borderStart, borderSize]
    case 1:
      if (invertedAxe) {
        const newBorderStart = Math.min(borderStart, borderStart + borderSize + vector)
        return [newBorderStart, borderStart - newBorderStart + 2 * settings.selectionPadding]
      }
      return [borderStart, Math.max(2 * settings.selectionPadding, borderSize + vector)]
    default:
      return [0, 0]
  }
}

const resizeRectSelectionKeepingRatio = (
  borders: Rect,
  center: Point,
  borderX: number,
  borderWidth: number,
  borderY: number,
  borderHeight: number,
  isXinverted: boolean,
  isYinverted: boolean,
  originalShape: SelectionType,
  selectionMode: SelectionModeResize,
  settings: UtilsSettings
) => {
  const { selectionPadding } = settings
  const originalRatio =
    'ratio' in originalShape && originalShape.ratio
      ? originalShape.ratio
      : (borders.width - selectionPadding * 2 || 1) / (borders.height - selectionPadding * 2 || 1)
  const calculatedRatio = (borderWidth - selectionPadding * 2) / (borderHeight - selectionPadding * 2)

  let trueBorderX: number
  let trueBorderY: number
  let trueBorderWidth: number
  let trueBorderHeight: number

  if (selectionMode.anchor[0] !== 0.5 && selectionMode.anchor[1] !== 0.5) {
    if (calculatedRatio < originalRatio) {
      trueBorderY = borderY
      trueBorderHeight = borderHeight
      trueBorderWidth = (borderHeight - selectionPadding * 2) * originalRatio + 2 * selectionPadding
      if (selectionMode.anchor[0] === 0) {
        trueBorderX = !isXinverted ? borders.x + (borders.width - trueBorderWidth) : borders.x + borders.width - 2 * selectionPadding
      } else {
        trueBorderX = !isXinverted ? borders.x : borders.x - trueBorderWidth + 2 * selectionPadding
      }
    } else {
      trueBorderX = borderX
      trueBorderWidth = borderWidth
      trueBorderHeight = (borderWidth - selectionPadding * 2) / originalRatio + 2 * selectionPadding
      if (selectionMode.anchor[1] === 0) {
        trueBorderY = !isYinverted ? borders.y + (borders.height - trueBorderHeight) : borders.y + borders.height - 2 * selectionPadding
      } else {
        trueBorderY = !isYinverted ? borders.y : borders.y - trueBorderHeight + 2 * selectionPadding
      }
    }
  } else if (selectionMode.anchor[0] !== 0.5) {
    trueBorderX = borderX
    trueBorderWidth = borderWidth
    trueBorderHeight = (borderWidth - selectionPadding * 2) / originalRatio + 2 * selectionPadding
    trueBorderY = borders.y + (borders.height - trueBorderHeight) / 2
  } else {
    trueBorderY = borderY
    trueBorderHeight = borderHeight
    trueBorderWidth = (borderHeight - selectionPadding * 2) * originalRatio + 2 * selectionPadding
    trueBorderX = borders.x + (borders.width - trueBorderWidth) / 2
  }

  return {
    borderX: trueBorderX,
    borderWidth: trueBorderWidth,
    borderY: trueBorderY,
    borderHeight: trueBorderHeight,
    center,
    originalShape
  }
}

const calculateRectSelectionData = ({
  borderX,
  borderWidth,
  borderY,
  borderHeight,
  center,
  originalShape
}: {
  borderX: number
  borderWidth: number
  borderY: number
  borderHeight: number
  center: Point
  originalShape: SelectionType
}) => {
  const centerVector = [borderX + borderWidth / 2 - center[0], borderY + borderHeight / 2 - center[1]] as Point

  const [newCenterX, newCenterY] = rotatePoint({
    point: centerVector,
    rotation: -(originalShape.rotation ?? 0)
  })

  return {
    borderX: roundValues(borderX + newCenterX - centerVector[0]),
    borderWidth: roundValues(borderWidth),
    borderY: roundValues(borderY + newCenterY - centerVector[1]),
    borderHeight: roundValues(borderHeight)
  }
}

type ResizeFromCenterParams = {
  roundCursorPosition: Point
  borders: Rect
  center: Point
  selectionMode: SelectionModeResize
  originalShape: SelectionType
  settings: UtilsSettings
}

/** The anchors are on the borders, the padding away from the shape: the distance of the cursor to the center of the shape, without it */
const getDistanceWithoutPadding = (distance: number, selectionPadding: number) => Math.max(0, Math.abs(distance) - selectionPadding)

/** The shape spreads around its center on the axes of the anchor, its borders following the cursor */
const resizeRectSelectionFromCenter = ({ roundCursorPosition, borders, center, selectionMode, originalShape, settings }: ResizeFromCenterParams) => {
  const resizeAxis = (axis: 0 | 1, borderStart: number, borderSize: number): [number, number] => {
    if (selectionMode.anchor[axis] === 0.5) return [borderStart, borderSize]
    // the borders of a shape of size 0 are the padding away from its center
    const newBorderSize = 2 * Math.max(settings.selectionPadding, Math.abs(roundCursorPosition[axis] - center[axis]))
    return [center[axis] - newBorderSize / 2, newBorderSize]
  }
  const [borderX, borderWidth] = resizeAxis(0, borders.x, borders.width)
  const [borderY, borderHeight] = resizeAxis(1, borders.y, borders.height)

  return { borderX, borderWidth, borderY, borderHeight, center, originalShape }
}

const resizeRectSelectionFromCenterWithRatio = ({
  roundCursorPosition,
  borders,
  center,
  selectionMode,
  originalShape,
  settings
}: ResizeFromCenterParams) => {
  const { selectionPadding } = settings

  const originalWidthWithoutPadding = Math.max(1, borders.width - selectionPadding * 2)
  const originalHeightWithoutPadding = Math.max(1, borders.height - selectionPadding * 2)

  const originalRatio =
    'ratio' in originalShape && originalShape.ratio ? originalShape.ratio : originalWidthWithoutPadding / originalHeightWithoutPadding

  const [centerX, centerY] = center
  const [anchorX, anchorY] = selectionMode.anchor

  // a side anchor is 0 away from the center on its other axis: the distance is then the one on its own axis
  const originalRadius = Math.hypot((anchorX - 0.5) * originalWidthWithoutPadding, (anchorY - 0.5) * originalHeightWithoutPadding) || 1
  const currentRadius = Math.hypot(
    anchorX === 0.5 ? 0 : getDistanceWithoutPadding(roundCursorPosition[0] - centerX, selectionPadding),
    anchorY === 0.5 ? 0 : getDistanceWithoutPadding(roundCursorPosition[1] - centerY, selectionPadding)
  )
  const scale = currentRadius / originalRadius

  const minScale = (2 * selectionPadding) / (originalWidthWithoutPadding + 2 * selectionPadding)

  const newWidthWithoutPadding = originalWidthWithoutPadding * Math.max(scale, minScale)
  const newHeightWithoutPadding = newWidthWithoutPadding / originalRatio

  const borderWidth = newWidthWithoutPadding + selectionPadding * 2
  const borderHeight = newHeightWithoutPadding + selectionPadding * 2

  return {
    borderX: centerX - borderWidth / 2,
    borderY: centerY - borderHeight / 2,
    borderWidth,
    borderHeight,
    center,
    originalShape
  }
}

export const resizeRectSelection = (
  cursorPosition: Point,
  originalShape: SelectionType,
  selectionMode: SelectionModeResize,
  settings: UtilsSettings,
  keepRatio = false,
  resizeFromCenter = false
): {
  borderX: number
  borderHeight: number
  borderY: number
  borderWidth: number
  isXinverted: boolean
  isYinverted: boolean
} => {
  const { center, borders } = originalShape.computed

  const rotatedCursorPosition = rotatePoint({
    origin: center,
    point: cursorPosition,
    rotation: originalShape.rotation
  })

  // resized from its center, the shape is inverted as soon as the cursor goes past its center
  const xBounds = resizeFromCenter
    ? [center[0], center[0]]
    : ([borders.x + borders.width - settings.selectionPadding, borders.x + settings.selectionPadding] as const)
  const yBounds = resizeFromCenter
    ? [center[1], center[1]]
    : ([borders.y + borders.height - settings.selectionPadding, borders.y + settings.selectionPadding] as const)

  const isXinverted =
    (selectionMode.anchor[0] === 0 && rotatedCursorPosition[0] >= xBounds[0]) ||
    (selectionMode.anchor[0] === 1 && rotatedCursorPosition[0] <= xBounds[1])
  const isYinverted =
    (selectionMode.anchor[1] === 0 && rotatedCursorPosition[1] >= yBounds[0]) ||
    (selectionMode.anchor[1] === 1 && rotatedCursorPosition[1] <= yBounds[1])

  const roundCursorPosition: Point = [
    roundForGrid(
      rotatedCursorPosition[0],
      settings,
      (selectionMode.anchor[0] === 0 && !isXinverted) || (selectionMode.anchor[0] === 1 && isXinverted)
        ? settings.selectionPadding
        : -settings.selectionPadding
    ),
    roundForGrid(
      rotatedCursorPosition[1],
      settings,
      (selectionMode.anchor[1] === 0 && !isYinverted) || (selectionMode.anchor[1] === 1 && isYinverted)
        ? settings.selectionPadding
        : -settings.selectionPadding
    )
  ]

  if (resizeFromCenter) {
    const params = { roundCursorPosition, borders, center, selectionMode, originalShape, settings }
    const data = keepRatio ? resizeRectSelectionFromCenterWithRatio(params) : resizeRectSelectionFromCenter(params)

    return {
      ...calculateRectSelectionData(data),
      isXinverted,
      isYinverted
    }
  }

  const roundCursorStartPosition: Point = settings.gridGap
    ? [
        selectionMode.anchor[0] === 0 ? borders.x : selectionMode.anchor[0] === 0.5 ? borders.x + borders.width / 2 : borders.x + borders.width,
        selectionMode.anchor[1] === 0 ? borders.y : selectionMode.anchor[1] === 0.5 ? borders.y + borders.height / 2 : borders.y + borders.height
      ]
    : rotatePoint({
        origin: center,
        point: selectionMode.cursorStartPosition,
        rotation: originalShape.rotation
      })

  const vector = [roundCursorPosition[0] - roundCursorStartPosition[0], roundCursorPosition[1] - roundCursorStartPosition[1]] as Point
  const [borderX, borderWidth] = getSelectionData({
    borderStart: borders.x,
    borderSize: borders.width,
    vector: vector[0],
    settings,
    invertedAxe: isXinverted,
    anchor: selectionMode.anchor[0]
  })
  const [borderY, borderHeight] = getSelectionData({
    borderStart: borders.y,
    borderSize: borders.height,
    vector: vector[1],
    settings,
    invertedAxe: isYinverted,
    anchor: selectionMode.anchor[1]
  })
  const data = keepRatio
    ? resizeRectSelectionKeepingRatio(
        borders,
        center,
        borderX,
        borderWidth,
        borderY,
        borderHeight,
        isXinverted,
        isYinverted,
        originalShape,
        selectionMode,
        settings
      )
    : {
        borderX,
        borderWidth,
        borderY,
        borderHeight,
        center,
        originalShape
      }

  return {
    ...calculateRectSelectionData(data),
    isXinverted,
    isYinverted
  }
}
