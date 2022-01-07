import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from 'constants/shapes'
import _ from 'lodash/fp'
import { HoverModeData, SelectionModeLib } from 'types/Mode'
import { Point, Rect, DrawableShape, ShapeEnum } from 'types/Shapes'
import { getShapeInfos } from './shapeData'

export const getCursorPosition = (
  e: MouseEvent | TouchEvent,
  canvas: HTMLCanvasElement | null,
  givenWidth: number,
  givenHeight: number
): Point => {
  const { clientX, clientY } = _.getOr(_.getOr(e, 'changedTouches[0]', e), 'touches[0]', e)
  const canvasBoundingRect = canvas?.getBoundingClientRect() ?? {
    left: 0,
    top: 0,
    width: givenWidth,
    height: givenHeight
  }
  return [
    (clientX - canvasBoundingRect.left) * (givenWidth / canvasBoundingRect.width),
    (clientY - canvasBoundingRect.top) * (givenHeight / canvasBoundingRect.height)
  ]
}

export const getSettingsPosition = (
  shape: DrawableShape,
  canvas: HTMLCanvasElement | null,
  givenWidth: number,
  givenHeight: number
) => {
  const shapeInfos = getShapeInfos(shape)

  const positionInCanvas = getPointPositionBeforeCanvasTransformation(
    shapeInfos.center,
    [-shape.translation[0], -shape.translation[1]],
    shape.rotation,
    shapeInfos.center
  )

  const canvasBoundingRect = canvas?.getBoundingClientRect() ?? {
    left: 0,
    top: 0,
    width: givenWidth,
    height: givenHeight
  }

  return [
    canvasBoundingRect.left + positionInCanvas[0] * (canvasBoundingRect.width / givenWidth),
    canvasBoundingRect.top + positionInCanvas[1] * (canvasBoundingRect.height / givenHeight)
  ]
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
  const { borders, center } = getShapeInfos(shape)

  const newPosition = getPointPositionAfterCanvasTransformation(
    position,
    canvasOffset,
    shape.translation,
    shape.rotation,
    center
  )

  if (checkAnchors) {
    if (shape.type === ShapeEnum.line || shape.type === ShapeEnum.polygon) {
      for (let i = 0; i < shape.points.length; i++) {
        if (
          isPointInsideRect(
            {
              x: shape.points[i][0] - SELECTION_ANCHOR_SIZE / 2,
              y: shape.points[i][1] - SELECTION_ANCHOR_SIZE / 2,
              width: SELECTION_ANCHOR_SIZE,
              height: SELECTION_ANCHOR_SIZE
            },
            newPosition
          )
        ) {
          return { mode: SelectionModeLib.resize, anchor: i }
        }
      }
    } else {
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
  }

  return isPointInsideRect(borders, newPosition) ? { mode: SelectionModeLib.translate } : false
}
