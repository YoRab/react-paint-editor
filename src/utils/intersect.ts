import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from 'constants/shapes'
import { HoverModeData, SelectionModeLib } from 'types/Mode'
import { Point, Rect, DrawableShape } from 'types/Shapes'
import { getShapeInfos } from './shapeData'

export const getCursorPosition = (e: MouseEvent, canvas: HTMLCanvasElement | null): Point => {
  return [e.clientX - (canvas?.offsetLeft ?? 0), e.clientY - (canvas?.offsetTop ?? 0)]
}

const isPointInsideRect = (rect: Rect, point: Point) => {
  return (
    point[0] >= rect.x &&
    point[0] <= rect.x + rect.width &&
    point[1] >= rect.y &&
    point[1] <= rect.y + rect.height
  )
}

export const getPointPositionAfterCanvasTransformation = (
  position: Point,
  shapeTranslationBeforeRotation: Point,
  shapeRotation: number,
  shapeCenter: Point
): Point => {
  const newX = position[0] - shapeCenter[0] - shapeTranslationBeforeRotation[0]
  const newY = position[1] - shapeCenter[1] - shapeTranslationBeforeRotation[1]
  const rotatedY = newY * Math.cos(shapeRotation) - newX * Math.sin(shapeRotation)
  const rotatedX = newY * Math.sin(shapeRotation) + newX * Math.cos(shapeRotation)

  const translatedX = rotatedX + shapeCenter[0]
  const translatedY = rotatedY + shapeCenter[1]
  return [translatedX, translatedY]
}

export const checkPositionIntersection = (
  shape: DrawableShape,
  position: Point,
  checkAnchors = false
): false | HoverModeData => {
  const { borders: bordersBeforeResizing, center } = getShapeInfos(shape)
  const borders = {
    ...bordersBeforeResizing,
    x: bordersBeforeResizing.x + shape.translationOnceRotated[0],
    y: bordersBeforeResizing.y + shape.translationOnceRotated[1]
  }
  const newPosition = getPointPositionAfterCanvasTransformation(
    position,
    shape.translationBeforeRotation,
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
