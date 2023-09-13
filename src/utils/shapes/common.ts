import { rotatePoint } from '../../utils/trigo'
import type { Point, DrawableShape, Rect } from '../../types/Shapes'
import type { SelectionModeResize } from '../../types/Mode'
import type { GridFormatType } from '../../constants/app'
import { getShapeInfos } from '../../utils/shapes/index'

const getBorderData = ({
  borderStart,
  borderSize,
  vector,
  selectionPadding,
  anchor
}: {
  borderStart: number
  borderSize: number
  vector: number
  selectionPadding: number
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
  gridFormat: GridFormatType,
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
finish text
  revoir resizeTextShapeWithNewContent ?
grid
finish brush (division by 0)
  revoir taille min ?
 */
export const resizeShapeBorder = (
  cursorPosition: Point,
  originalShape: DrawableShape,
  selectionMode: SelectionModeResize,
  gridFormat: GridFormatType,
  selectionPadding: number,
  keepRatio = false
): { borderX: number, borderHeight: number, borderY: number, borderWidth: number } => {

  const vector = [
    cursorPosition[0] - selectionMode.cursorStartPosition[0],
    cursorPosition[1] - selectionMode.cursorStartPosition[1]
  ] as Point

  const rotatedVector = rotatePoint({
    point: vector,
    rotation: originalShape.rotation
  })

  const { center, borders } = getShapeInfos(originalShape, selectionPadding)

  const [borderX, borderWidth] = getBorderData({
    borderStart: borders.x,
    borderSize: borders.width,
    vector: rotatedVector[0],
    selectionPadding,
    anchor: selectionMode.anchor[0]
  })

  const [borderY, borderHeight] = getBorderData({
    borderStart: borders.y,
    borderSize: borders.height,
    vector: rotatedVector[1],
    selectionPadding,
    anchor: selectionMode.anchor[1]
  })

  if (keepRatio) {
    const data = resizeShapeBorderKeepingRatio(
      rotatedVector,
      borders,
      center,
      borderX,
      borderWidth,
      borderY,
      borderHeight,
      originalShape,
      selectionMode,
      gridFormat,
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