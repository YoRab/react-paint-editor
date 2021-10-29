import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from 'constants/shapes'
import _ from 'lodash/fp'
import { HoverModeData, SelectionModeLib } from 'types/Mode'
import { Point, Rect, DrawableShape } from 'types/Shapes'
import { getShapeInfos } from './shapeData'

export const getCursorPosition = (
  e: MouseEvent | TouchEvent,
  canvas: HTMLCanvasElement | null
): Point => {
  const { clientX, clientY } = _.getOr(e, 'touches[0]', e)
  return [clientX - (canvas?.offsetLeft ?? 0), clientY - (canvas?.offsetTop ?? 0)]
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
  [positionX, positionY]: Point,
  [canvasOffsetX, canvasOffsetY]: Point,
  [translationX, translationY]: Point,
  shapeRotation: number,
  [centerX, centerY]: Point
): Point => {
  const newX = positionX + canvasOffsetX - centerX - translationX
  const newY = positionY + canvasOffsetY - centerY - translationY
  const rotatedY = newY * Math.cos(shapeRotation) - newX * Math.sin(shapeRotation)
  const rotatedX = newY * Math.sin(shapeRotation) + newX * Math.cos(shapeRotation)

  const translatedX = rotatedX + centerX
  const translatedY = rotatedY + centerY
  return [translatedX, translatedY]
}

export const getPointPositionBeforeCanvasTransformation = (
  [positionX, positionY]: Point,
  [translationX, translationY]: Point,
  shapeRotation: number,
  [centerX, centerY]: Point
): Point => {
  const newX = positionX - centerX
  const newY = positionY - centerY
  const rotatedY = newY * Math.cos(-shapeRotation) - newX * Math.sin(-shapeRotation)
  const rotatedX = newY * Math.sin(-shapeRotation) + newX * Math.cos(-shapeRotation)

  const translatedX = rotatedX + centerX
  const translatedY = rotatedY + centerY
  return [translatedX - translationX, translatedY - translationY]
}

export const applyRotationToVector = (vector: Point, shapeRotation: number): Point => {
  const rotatedY = vector[1] * Math.cos(shapeRotation) - vector[0] * Math.sin(shapeRotation)
  const rotatedX = vector[1] * Math.sin(shapeRotation) + vector[0] * Math.cos(shapeRotation)
  return [rotatedX, rotatedY]
}

export const checkPositionIntersection = (
  shape: DrawableShape,
  position: Point,
  canvasOffset: Point,
  checkAnchors = false
): false | HoverModeData => {
  const { borders: bordersBeforeResizing, center } = getShapeInfos(shape)
  const borders = {
    ...bordersBeforeResizing,
    x: bordersBeforeResizing.x,
    y: bordersBeforeResizing.y
  }
  const newPosition = getPointPositionAfterCanvasTransformation(
    position,
    canvasOffset,
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
