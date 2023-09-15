import { rotatePoint } from '../../utils/trigo'
import type { Point, DrawableShape, Rect } from '../../types/Shapes'
import type { SelectionModeResize } from '../../types/Mode'
import type { GridFormatType } from '../../constants/app'
import { getShapeInfos } from '../../utils/shapes/index'
import { roundForGrid } from 'src/utils/transform'

const getBorderData = ({
  borderStart,
  borderSize,
  vector,
  selectionPadding,
  invertedAxe,
  anchor
}: {
  borderStart: number
  borderSize: number
  vector: number
  selectionPadding: number
  invertedAxe: boolean
  anchor: number
}): [number, number] => {
  switch (anchor) {
    case 0:
      if (borderSize - vector < 0) {
        const shapeSize = borderSize - 2 * selectionPadding
        return [borderStart + shapeSize, vector - shapeSize]
      } else {
        const newWidth = Math.max(2 * selectionPadding, borderSize - vector)
        return [borderStart + borderSize - newWidth, newWidth]
      }
    case 0.5:
      return [borderStart, borderSize]
    case 1:
      if (borderSize + vector < 0) {
        const offset = borderSize + vector
        return [borderStart + offset, 2 * selectionPadding - offset]
      } else {
        return [borderStart, Math.max(2 * selectionPadding, borderSize + vector)]
      }
    default:
      return [0, 0]
  }
}

const resizeShapeBorderKeepingRatio = (
  rotatedVector: Point,
  borders: Rect,
  center: Point,
  borderX: number,
  borderWidth: number,
  borderY: number,
  borderHeight: number,
  originalShape: DrawableShape,
  selectionMode: SelectionModeResize,
  selectionPadding: number,
) => {

  const originalRatio = ((borders.width - selectionPadding * 2) || 1) / ((borders.height - selectionPadding * 2) || 1)
  const calculatedRatio = ((borderWidth - selectionPadding * 2) / (borderHeight - selectionPadding * 2))

  let trueBorderX, trueBorderY, trueBorderWidth, trueBorderHeight

  if (selectionMode.anchor[0] !== 0.5 && selectionMode.anchor[1] !== 0.5) {
    if (calculatedRatio < originalRatio) {
      trueBorderY = borderY
      trueBorderHeight = borderHeight
      trueBorderWidth = ((borderHeight - selectionPadding * 2) * originalRatio) + 2 * selectionPadding
      if (selectionMode.anchor[0] === 0) {
        trueBorderX = (borders.width - rotatedVector[0] > selectionPadding) ? borders.x + (borders.width - trueBorderWidth) : borders.x + borders.width - 2 * selectionPadding
      } else {
        trueBorderX = (borders.width + rotatedVector[0] > selectionPadding) ? borders.x : borders.x - trueBorderWidth + 2 * selectionPadding
      }
    } else {
      trueBorderX = borderX
      trueBorderWidth = borderWidth
      trueBorderHeight = ((borderWidth - selectionPadding * 2) / originalRatio) + 2 * selectionPadding
      if (selectionMode.anchor[1] === 0) {
        trueBorderY = (borders.height - rotatedVector[1] > selectionPadding) ? borders.y + (borders.height - trueBorderHeight) : borders.y + borders.height - 2 * selectionPadding
      } else {
        trueBorderY = (borders.height + rotatedVector[1] > selectionPadding) ? borders.y : borders.y - trueBorderHeight + 2 * selectionPadding
      }
    }
  } else if (selectionMode.anchor[0] !== 0.5) {
    trueBorderX = borderX
    trueBorderWidth = borderWidth
    trueBorderHeight = ((borderWidth - selectionPadding * 2) / originalRatio) + 2 * selectionPadding
    trueBorderY = borders.y + (borders.height - trueBorderHeight) / 2
  } else {
    trueBorderY = borderY
    trueBorderHeight = borderHeight
    trueBorderWidth = ((borderHeight - selectionPadding * 2) * originalRatio) + 2 * selectionPadding
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

const calculateShapeBorderData = ({
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
  originalShape: DrawableShape
}) => {
  const centerVector = [
    borderX + borderWidth / 2 - center[0],
    borderY + borderHeight / 2 - center[1]
  ] as Point

  const [newCenterX, newCenterY] = rotatePoint({
    point: centerVector,
    rotation: -originalShape.rotation
  })

  return {
    borderX: borderX + newCenterX - centerVector[0],
    borderHeight,
    borderY: borderY + newCenterY - centerVector[1],
    borderWidth
  }
}

/*
todo : 
finish brush (division by 0):   revoir taille min ?
grosse factorisation / clean
 */
export const resizeShapeBorder = (
  cursorPosition: Point,
  originalShape: DrawableShape,
  selectionMode: SelectionModeResize,
  gridFormat: GridFormatType,
  selectionPadding: number,
  keepRatio = false
): { borderX: number, borderHeight: number, borderY: number, borderWidth: number } => {
  const { center, borders } = getShapeInfos(originalShape, selectionPadding)

  const rotatedCursorPosition = rotatePoint({
    origin: center,
    point: cursorPosition,
    rotation: originalShape.rotation
  })

  const isXinverted = (selectionMode.anchor[0] === 0 && rotatedCursorPosition[0] >= borders.x + borders.width) || (selectionMode.anchor[0] === 1 && rotatedCursorPosition[0] <= borders.x)
  const isYinverted = (selectionMode.anchor[1] === 0 && rotatedCursorPosition[1] >= borders.y + borders.height) || (selectionMode.anchor[1] === 1 && rotatedCursorPosition[1] <= borders.y)

  const roundCursorPosition: Point = [
    roundForGrid(rotatedCursorPosition[0], gridFormat, (selectionMode.anchor[0] === 0 && !isXinverted) || (selectionMode.anchor[0] === 1 && isXinverted) ? selectionPadding : -selectionPadding),
    roundForGrid(rotatedCursorPosition[1], gridFormat, (selectionMode.anchor[1] === 0 && !isYinverted) || (selectionMode.anchor[1] === 1 && isYinverted) ? selectionPadding : -selectionPadding)
  ]

  const roundCursorStartPosition = gridFormat ? [
    selectionMode.anchor[0] === 0 ? borders.x : selectionMode.anchor[0] === 0.5 ? borders.x + borders.width / 2 : borders.x + borders.width,
    selectionMode.anchor[1] === 0 ? borders.y : selectionMode.anchor[1] === 0.5 ? borders.y + borders.height / 2 : borders.y + borders.height,
  ] : rotatePoint({
    origin: center,
    point: selectionMode.cursorStartPosition,
    rotation: originalShape.rotation
  })

  const vector = [
    roundCursorPosition[0] - roundCursorStartPosition[0],
    roundCursorPosition[1] - roundCursorStartPosition[1]
  ] as Point

  const [borderX, borderWidth] = getBorderData({
    borderStart: borders.x,
    borderSize: borders.width,
    vector: vector[0],
    selectionPadding,
    invertedAxe: isXinverted,
    anchor: selectionMode.anchor[0]
  })

  const [borderY, borderHeight] = getBorderData({
    borderStart: borders.y,
    borderSize: borders.height,
    vector: vector[1],
    selectionPadding,
    invertedAxe: isYinverted,
    anchor: selectionMode.anchor[1]
  })

  if (keepRatio) {
    const data = resizeShapeBorderKeepingRatio(
      vector,
      borders,
      center,
      borderX,
      borderWidth,
      borderY,
      borderHeight,
      originalShape,
      selectionMode,
      selectionPadding)
    return calculateShapeBorderData(data)
  }

  return calculateShapeBorderData({
    borderX,
    borderWidth,
    borderY,
    borderHeight,
    center,
    originalShape
  })
}