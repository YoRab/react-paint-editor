import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from '../constants/shapes'
import type { HoverModeData } from '../types/Mode'
import type { Point, DrawableShape } from '../types/Shapes'
import { getShapeInfos } from './shapes'
import { rotatePoint, isPointInsideRect } from './trigo'

export const getCursorPosition = (
  e: MouseEvent | TouchEvent,
  canvas: HTMLCanvasElement | null,
  givenWidth: number,
  givenHeight: number,
  scaleRatio = 1
): Point => {

  const { clientX = 0, clientY = 0 } = 'touches' in e && e.touches[0] ? e.touches[0] : 'changedTouches' in e && e.changedTouches[0] ? e.changedTouches[0] : 'clientX' in e ? e : {}

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

export const getPointPositionAfterCanvasTransformation = (
  point: Point,
  shapeRotation: number,
  [originX, originY]: Point,
  [canvasOffsetX, canvasOffsetY]: Point
): Point =>
  rotatePoint({
    origin: [originX - canvasOffsetX, originY - canvasOffsetY],
    point,
    rotation: shapeRotation
  })

export const getPointPositionBeforeCanvasTransformation = (
  point: Point,
  shapeRotation: number,
  [originX, originY]: Point,
  [canvasOffsetX, canvasOffsetY]: Point
): Point =>
  rotatePoint({
    origin: [originX - canvasOffsetX, originY - canvasOffsetY],
    point,
    rotation: -shapeRotation
  })

export const checkPositionIntersection = (
  shape: DrawableShape,
  position: Point,
  canvasOffset: Point,
  selectionPadding: number,
  currentScale = 1,
  checkAnchors = false
): false | HoverModeData => {
  if (shape.locked) return false

  const { borders, center } = getShapeInfos(shape, selectionPadding)

  const newPosition = getPointPositionAfterCanvasTransformation(
    position,
    shape.rotation,
    center,
    canvasOffset
  )

  if (checkAnchors) {
    if (shape.type === 'line' || shape.type === 'polygon' || shape.type === 'curve') {
      for (let i = 0; i < shape.points.length; i++) {
        if (
          isPointInsideRect(
            {
              x: shape.points[i][0] - SELECTION_ANCHOR_SIZE / 2 / currentScale,
              y: shape.points[i][1] - SELECTION_ANCHOR_SIZE / 2 / currentScale,
              width: SELECTION_ANCHOR_SIZE / currentScale,
              height: SELECTION_ANCHOR_SIZE / currentScale
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
            x: borders.x + borders.width / 2 - SELECTION_ANCHOR_SIZE / 2 / currentScale,
            y:
              borders.y -
              SELECTION_ANCHOR_SIZE / currentScale -
              SELECTION_ROTATED_ANCHOR_POSITION / currentScale,
            width: SELECTION_ANCHOR_SIZE / currentScale,
            height: SELECTION_ANCHOR_SIZE / currentScale
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
                SELECTION_ANCHOR_SIZE / 2 / currentScale,
              y:
                borders.y +
                borders.height * anchorPosition[1] -
                SELECTION_ANCHOR_SIZE / 2 / currentScale,
              width: SELECTION_ANCHOR_SIZE / currentScale,
              height: SELECTION_ANCHOR_SIZE / currentScale
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
