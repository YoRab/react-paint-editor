import { rotatePoint } from '../../utils/trigo'
import type { Point, DrawableShape } from '../../types/Shapes'
import type { SelectionModeResize } from '../../types/Mode'
import type { GridFormatType } from '../../constants/app'
import { getShapeInfos } from '../../utils/shapes/index'

const getBorderData = ({
  borderCoordinate,
  borderSize,
  rotatedCoordinate,
  selectionPadding,
  anchor
}: {
  borderCoordinate: number
  borderSize: number
  rotatedCoordinate: number
  selectionPadding: number
  anchor: number
}): [number, number] => {
  switch (anchor) {
    case 0:
      if (borderSize - rotatedCoordinate < 0) {
        const offset = borderSize - 2 * selectionPadding
        return [borderCoordinate + offset, rotatedCoordinate - offset]
      } else {
        const newWidth = Math.max(2 * selectionPadding, borderSize - rotatedCoordinate)
        return [borderCoordinate + borderSize - newWidth, newWidth]
      }
    case 0.5:
      return [borderCoordinate, borderSize]
    case 1:
      if (borderSize + rotatedCoordinate < 0) {
        const offset = borderSize + rotatedCoordinate
        return [borderCoordinate + offset, 2 * selectionPadding - offset]
      } else {
        return [borderCoordinate, Math.max(2 * selectionPadding, borderSize + rotatedCoordinate)]
      }
    default:
      return [0, 0]
  }
}

/*
todo : 
keepratio
grid
finish text
finish brush (division by 0)
 */
export const resizeShapeBorder = (
  cursorPosition: Point,
  originalShape: DrawableShape,
  selectionMode: SelectionModeResize,
  gridFormat: GridFormatType,
  selectionPadding: number,
  keepRatio = false
) => {
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
    borderCoordinate: borders.x,
    borderSize: borders.width,
    rotatedCoordinate: rotatedVector[0],
    selectionPadding,
    anchor: selectionMode.anchor[0]
  })

  const [borderY, borderHeight] = getBorderData({
    borderCoordinate: borders.y,
    borderSize: borders.height,
    rotatedCoordinate: rotatedVector[1],
    selectionPadding,
    anchor: selectionMode.anchor[1]
  })

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
