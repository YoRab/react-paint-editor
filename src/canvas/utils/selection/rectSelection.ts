import type { UtilsSettings } from '@canvas/constants/app'
import { SELECTION_ANCHOR_SIZE, SELECTION_RESIZE_ANCHOR_POSITIONS, SELECTION_ROTATED_ANCHOR_POSITION } from '@canvas/constants/shapes'
import { transformCanvas, updateCanvasContext } from '@canvas/utils/canvas'
import { createCirclePath, createLinePath, createRecPath } from '@canvas/utils/shapes/path'
import { roundForGrid, roundValues } from '@canvas/utils/transform'
import { rotatePoint } from '@canvas/utils/trigo'
import type { SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Point, Rect, SelectionDefaultType, SelectionType, ShapeEntity } from '@common/types/Shapes'

export const createRecSelectionPath = (
  path: Path2D | undefined,
  computed: { borders: Rect; outerBorders: Rect; center: Point },
  settings: UtilsSettings
): SelectionDefaultType => {
  const { borders } = computed

  return {
    type: 'rect',
    border: createRecPath(borders),
    shapePath: path,
    line: createLinePath({
      points: [
        [borders.x + borders.width / 2, borders.y],
        [borders.x + borders.width / 2, borders.y - (SELECTION_ANCHOR_SIZE / 2 + SELECTION_ROTATED_ANCHOR_POSITION) / settings.canvasSize.scaleRatio]
      ]
    }),
    anchors: [
      createCirclePath({
        x: borders.x + borders.width / 2,
        y: borders.y - (SELECTION_ANCHOR_SIZE / 2 + SELECTION_ROTATED_ANCHOR_POSITION) / settings.canvasSize.scaleRatio,
        radius: SELECTION_ANCHOR_SIZE / 2 / settings.canvasSize.scaleRatio
      }),
      ...SELECTION_RESIZE_ANCHOR_POSITIONS.map(anchorPosition =>
        createCirclePath({
          x: borders.x + borders.width * anchorPosition[0],
          y: borders.y + borders.height * anchorPosition[1],
          radius: SELECTION_ANCHOR_SIZE / 2 / settings.canvasSize.scaleRatio
        })
      )
    ]
  }
}

export const drawBoundingBox = (ctx: CanvasRenderingContext2D, shape: SelectionType, selectionWidth: number, settings: UtilsSettings): void => {
  if (!shape.selection) return
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
  shape: ShapeEntity & { selection?: SelectionDefaultType | undefined },
  selectionColor: string,
  selectionWidth: number,
  settings: UtilsSettings,
  withAnchors: boolean
): void => {
  if (!shape.selection) return
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
  if (shape.selection.shapePath) ctx.stroke(shape.selection.shapePath)
  else ctx.stroke(shape.selection.border)

  if (!withAnchors || shape.locked) return

  if (shape.selection.shapePath) ctx.stroke(shape.selection.border)
  if (shape.selection.line) ctx.stroke(shape.selection.line)

  updateCanvasContext(ctx, {
    fillColor: 'rgb(255,255,255)',
    strokeColor: 'rgb(150,150,150)',
    lineWidth: 2 / settings.canvasSize.scaleRatio,
    shadowColor: selectionColor,
    shadowBlur: 0
  })

  for (const anchor of shape.selection.anchors) {
    ctx.fill(anchor)
    ctx.stroke(anchor)
  }
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
  originalShape: ShapeEntity,
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
  originalShape: ShapeEntity
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

const adjustRectSelectionFromCenter = (
  data: { borderX: number; borderWidth: number; borderY: number; borderHeight: number; center: Point; originalShape: ShapeEntity },
  originalBorders: Rect,
  isXinverted: boolean,
  isYinverted: boolean
) => {
  const originalCenterX = originalBorders.x + originalBorders.width / 2
  const originalCenterY = originalBorders.y + originalBorders.height / 2
  const newWidth = isXinverted
    ? data.borderWidth * 2 + originalBorders.width
    : Math.abs(originalBorders.width + (data.borderWidth - originalBorders.width) * 2)
  const newHeight = isYinverted
    ? data.borderHeight * 2 + originalBorders.height
    : Math.abs(originalBorders.height + (data.borderHeight - originalBorders.height) * 2)

  return {
    ...data,
    borderHeight: newHeight,
    borderWidth: newWidth,
    borderX: originalCenterX - newWidth / 2,
    borderY: originalCenterY - newHeight / 2
  }
}

const resizeRectSelectionFromCenterWithRatio = ({
  roundCursorPosition,
  borders,
  center,
  selectionMode,
  originalShape,
  settings
}: {
  roundCursorPosition: Point
  borders: Rect
  center: Point
  selectionMode: SelectionModeResize
  originalShape: ShapeEntity
  settings: UtilsSettings
}) => {
  const { selectionPadding } = settings

  const originalWidthWithoutPadding = Math.max(1, borders.width - selectionPadding * 2)
  const originalHeightWithoutPadding = Math.max(1, borders.height - selectionPadding * 2)

  const originalRatio =
    'ratio' in originalShape && originalShape.ratio ? originalShape.ratio : originalWidthWithoutPadding / originalHeightWithoutPadding

  const centerX = borders.x + borders.width / 2
  const centerY = borders.y + borders.height / 2

  let scale = 1

  if (selectionMode.anchor[0] !== 0.5 && selectionMode.anchor[1] !== 0.5) {
    const originalAnchorVector: Point = [
      (selectionMode.anchor[0] - 0.5) * originalWidthWithoutPadding,
      (selectionMode.anchor[1] - 0.5) * originalHeightWithoutPadding
    ]
    const currentAnchorVector: Point = [roundCursorPosition[0] - centerX, roundCursorPosition[1] - centerY]
    const originalRadius = Math.hypot(originalAnchorVector[0], originalAnchorVector[1]) || 1
    const currentRadius = Math.hypot(currentAnchorVector[0], currentAnchorVector[1])
    scale = currentRadius / originalRadius
  } else if (selectionMode.anchor[0] === 0.5) {
    const originalHalfHeight = (selectionMode.anchor[1] - 0.5) * originalHeightWithoutPadding
    const currentHalfHeight = roundCursorPosition[1] - centerY
    const originalDistance = Math.abs(originalHalfHeight) || 1
    const currentDistance = Math.abs(currentHalfHeight)
    scale = currentDistance / originalDistance
  } else {
    const originalHalfWidth = (selectionMode.anchor[0] - 0.5) * originalWidthWithoutPadding
    const currentHalfWidth = roundCursorPosition[0] - centerX
    const originalDistance = Math.abs(originalHalfWidth) || 1
    const currentDistance = Math.abs(currentHalfWidth)
    scale = currentDistance / originalDistance
  }

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
  originalShape: ShapeEntity,
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

  const xBounds =
    resizeFromCenter && keepRatio
      ? [borders.x + borders.width / 2, borders.x + borders.width / 2]
      : ([borders.x + borders.width - settings.selectionPadding, borders.x + settings.selectionPadding] as const)
  const yBounds =
    resizeFromCenter && keepRatio
      ? [borders.y + borders.height / 2, borders.y + borders.height / 2]
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

  if (keepRatio && resizeFromCenter) {
    const data = resizeRectSelectionFromCenterWithRatio({
      roundCursorPosition,
      borders,
      center,
      selectionMode,
      originalShape,
      settings
    })

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
    ...calculateRectSelectionData(resizeFromCenter ? adjustRectSelectionFromCenter(data, borders, isXinverted, isYinverted) : data),
    isXinverted,
    isYinverted
  }
}
