import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from 'constants/shapes'
import _ from 'lodash/fp'
import type { HoverModeData } from 'types/Mode'
import type { Point, Rect, DrawableShape } from 'types/Shapes'
import { getShapeInfos } from './shapes'

export const getCursorPosition = (
  e: MouseEvent | TouchEvent,
  canvas: HTMLCanvasElement | null,
  givenWidth: number,
  givenHeight: number,
  scaleRatio = 1
): Point => {
  const { clientX, clientY } = _.getOr(_.getOr(e, 'changedTouches[0]', e), 'touches[0]', e)
  const canvasBoundingRect = canvas?.getBoundingClientRect() ?? {
    left: 0,
    top: 0,
    width: givenWidth,
    height: givenHeight
  }
  return [
    ((clientX - canvasBoundingRect.left) * (givenWidth / canvasBoundingRect.width)) / scaleRatio,
    ((clientY - canvasBoundingRect.top) * (givenHeight / canvasBoundingRect.height)) / scaleRatio
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
  shapeRotation: number,
  [centerX, centerY]: Point
): Point => {
  const newX = positionX + canvasOffsetX - centerX
  const newY = positionY + canvasOffsetY - centerY
  const rotatedY = newY * Math.cos(shapeRotation) - newX * Math.sin(shapeRotation)
  const rotatedX = newY * Math.sin(shapeRotation) + newX * Math.cos(shapeRotation)

  const translatedX = rotatedX + centerX
  const translatedY = rotatedY + centerY
  return [translatedX, translatedY]
}

export const getPointPositionBeforeCanvasTransformation = (
  [positionX, positionY]: Point,
  shapeRotation: number,
  [centerX, centerY]: Point
): Point => {
  const newX = positionX - centerX
  const newY = positionY - centerY
  const rotatedY = newY * Math.cos(-shapeRotation) - newX * Math.sin(-shapeRotation)
  const rotatedX = newY * Math.sin(-shapeRotation) + newX * Math.cos(-shapeRotation)

  const translatedX = rotatedX + centerX
  const translatedY = rotatedY + centerY
  return [translatedX, translatedY]
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
  selectionPadding: number,
  currentScale = 1,
  checkAnchors = false
): false | HoverModeData => {
  if (shape.locked) return false

  const scaleWithMinCap = Math.min(1, currentScale)

  const { borders, center } = getShapeInfos(shape, selectionPadding)

  const newPosition = getPointPositionAfterCanvasTransformation(
    position,
    canvasOffset,
    shape.rotation,
    center
  )

  if (checkAnchors) {
    if (shape.type === 'line' || shape.type === 'polygon' || shape.type === 'curve') {
      for (let i = 0; i < shape.points.length; i++) {
        if (
          isPointInsideRect(
            {
              x: shape.points[i][0] - SELECTION_ANCHOR_SIZE / 2 / scaleWithMinCap,
              y: shape.points[i][1] - SELECTION_ANCHOR_SIZE / 2 / scaleWithMinCap,
              width: SELECTION_ANCHOR_SIZE / scaleWithMinCap,
              height: SELECTION_ANCHOR_SIZE / scaleWithMinCap
            },
            newPosition
          )
        ) {
          return { mode: 'resize', anchor: i }
        }
      }
    } else {
      if (
        isPointInsideRect(
          {
            x: borders.x + borders.width / 2 - SELECTION_ANCHOR_SIZE / 2 / scaleWithMinCap,
            y:
              borders.y -
              SELECTION_ANCHOR_SIZE / scaleWithMinCap -
              SELECTION_ROTATED_ANCHOR_POSITION / scaleWithMinCap,
            width: SELECTION_ANCHOR_SIZE / scaleWithMinCap,
            height: SELECTION_ANCHOR_SIZE / scaleWithMinCap
          },
          newPosition
        )
      ) {
        return { mode: 'rotate' }
      }

      for (const anchorPosition of SELECTION_RESIZE_ANCHOR_POSITIONS) {
        if (
          isPointInsideRect(
            {
              x:
                borders.x +
                borders.width * anchorPosition[0] -
                SELECTION_ANCHOR_SIZE / 2 / scaleWithMinCap,
              y:
                borders.y +
                borders.height * anchorPosition[1] -
                SELECTION_ANCHOR_SIZE / 2 / scaleWithMinCap,
              width: SELECTION_ANCHOR_SIZE / scaleWithMinCap,
              height: SELECTION_ANCHOR_SIZE / scaleWithMinCap
            },
            newPosition
          )
        ) {
          return { mode: 'resize', anchor: anchorPosition }
        }
      }
    }
  }

  return isPointInsideRect(borders, newPosition) ? { mode: 'translate' } : false
}
