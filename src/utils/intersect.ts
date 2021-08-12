import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from '../constants/shapes'
import { HoverModeData, SelectionModeLib } from '../types/Mode'
import { Point, Rect, ShapeDrawable } from '../types/Shapes'
import { getShapeInfos } from './shapeData'

const isPointInsideRect = (rect: Rect, point: Point) => {
  return (
    point[0] >= rect.x &&
    point[0] <= rect.x + rect.width &&
    point[1] >= rect.y &&
    point[1] <= rect.y + rect.height
  )
}

export const getPointPositionAfterShapeTransformation = (
  position: Point,
  shapeTranslation: Point,
  shapeRotation: number,
  shapeCenter: Point
): Point => {
  const newX = position[0] - shapeCenter[0] - shapeTranslation[0]
  const newY = position[1] - shapeCenter[1] - shapeTranslation[1]
  const rotatedY = newY * Math.cos(shapeRotation) - newX * Math.sin(shapeRotation)
  const rotatedX = newY * Math.sin(shapeRotation) + newX * Math.cos(shapeRotation)

  const translatedX = rotatedX + shapeCenter[0]
  const translatedY = rotatedY + shapeCenter[1]
  return [translatedX, translatedY]
}

export const checkPositionIntersection = (
  shape: ShapeDrawable,
  position: Point,
  checkAnchors = false
): false | HoverModeData => {
  const { borders, center } = getShapeInfos(shape)

  const newPosition = getPointPositionAfterShapeTransformation(
    position,
    shape.translation,
    shape.rotation,
    center
  )

  if (checkAnchors) {
    if (
      isPointInsideRect(
        {
          x: borders.x + borders.width / 2 - SELECTION_ANCHOR_SIZE / 2,
          y: borders.y - SELECTION_ANCHOR_SIZE - SELECTION_ROTATED_ANCHOR_POSITION,
          width: SELECTION_ANCHOR_SIZE,
          height: SELECTION_ANCHOR_SIZE
        },
        newPosition
      )
    ) {
      return { mode: SelectionModeLib.rotate }
    }

    for (const anchorPosition of SELECTION_RESIZE_ANCHOR_POSITIONS) {
      if (
        isPointInsideRect(
          {
            x: borders.x + borders.width * anchorPosition[0] - SELECTION_ANCHOR_SIZE / 2,
            y: borders.y + borders.height * anchorPosition[1] - SELECTION_ANCHOR_SIZE / 2,
            width: SELECTION_ANCHOR_SIZE,
            height: SELECTION_ANCHOR_SIZE
          },
          newPosition
        )
      ) {
        return { mode: SelectionModeLib.resize, anchor: anchorPosition }
      }
    }
  }

  return isPointInsideRect(borders, newPosition) ? { mode: SelectionModeLib.translate } : false
}
