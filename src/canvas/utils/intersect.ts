import type { UtilsSettings } from '@canvas/constants/app'
import { SELECTION_ANCHOR_SIZE, SELECTION_RESIZE_ANCHOR_POSITIONS, SELECTION_ROTATED_ANCHOR_POSITION } from '@canvas/constants/shapes'
import { scalePoint } from '@canvas/utils/transform'
import type { CanvasSize } from '@common/types/Canvas'
import type { HoverModeData } from '@common/types/Mode'
import type { DrawableShape, Point, Rect } from '@common/types/Shapes'
import { getShapeInfos } from './shapes'
import { isCircleIntersectRect, isPointInsideRect, rotatePoint } from './trigo'

export const getCursorPosition = (e: MouseEvent | TouchEvent): { clientX: number; clientY: number } => {
  const { clientX = 0, clientY = 0 } =
    'touches' in e && e.touches[0] ? e.touches[0] : 'changedTouches' in e && e.changedTouches[0] ? e.changedTouches[0] : 'clientX' in e ? e : {}
  return { clientX, clientY }
}

export const getCursorPositionInElement = (e: MouseEvent | TouchEvent, element: HTMLElement, canvasSize: CanvasSize): Point => {
  const { clientX, clientY } = getCursorPosition(e)

  const canvasBoundingRect = element.getBoundingClientRect()
  return [(clientX - canvasBoundingRect.left) / canvasSize.scaleRatio, (clientY - canvasBoundingRect.top) / canvasSize.scaleRatio]
}

export const getCursorPositionInTransformedCanvas = (e: MouseEvent | TouchEvent, canvas: HTMLElement | null, settings: UtilsSettings): Point => {
  const { clientX, clientY } = getCursorPosition(e)

  const canvasBoundingRect = canvas?.getBoundingClientRect() ?? {
    left: 0,
    top: 0,
    width: settings.canvasSize.width,
    height: settings.canvasSize.height
  }
  return [
    ((clientX - canvasBoundingRect.left) * (settings.canvasSize.width / canvasBoundingRect.width)) / settings.canvasSize.scaleRatio -
      settings.canvasOffset[0],
    ((clientY - canvasBoundingRect.top) * (settings.canvasSize.height / canvasBoundingRect.height)) / settings.canvasSize.scaleRatio -
      settings.canvasOffset[1]
  ]
}

export const isTouchGesture = (e: MouseEvent | TouchEvent): e is TouchEvent => {
  return 'touches' in e
}

export const getPointPositionAfterCanvasTransformation = (point: Point, shapeRotation: number, [originX, originY]: Point): Point =>
  rotatePoint({
    origin: [originX, originY],
    point,
    rotation: shapeRotation
  })

export const getPointPositionBeforeCanvasTransformation = (point: Point, shapeRotation: number, [originX, originY]: Point): Point =>
  rotatePoint({
    origin: [originX, originY],
    point,
    rotation: -shapeRotation
  })

const isPartOfRect = (rect: Rect, point: Point, radius: number) =>
  radius ? isCircleIntersectRect(rect, { x: point[0], y: point[1], radius }) : isPointInsideRect(rect, point)

export const checkSelectionIntersection = (
  shape: DrawableShape,
  position: Point,
  settings: UtilsSettings,
  checkAnchors = false,
  radius = 0
): false | HoverModeData => {
  if (shape.locked) return false
  const {
    canvasSize: { scaleRatio }
  } = settings
  const { borders, center } = getShapeInfos(shape, settings)

  const newPosition = getPointPositionAfterCanvasTransformation(position, shape.rotation, center)

  if (checkAnchors) {
    if (shape.type === 'line' || shape.type === 'polygon' || shape.type === 'curve') {
      for (let i = 0; i < shape.points.length; i++) {
        if (
          isPartOfRect(
            {
              x: shape.points[i][0] - SELECTION_ANCHOR_SIZE / 2 / scaleRatio,
              y: shape.points[i][1] - SELECTION_ANCHOR_SIZE / 2 / scaleRatio,
              width: SELECTION_ANCHOR_SIZE / scaleRatio,
              height: SELECTION_ANCHOR_SIZE / scaleRatio
            },
            newPosition,
            radius
          )
        ) {
          return { mode: 'resize', anchor: i }
        }
      }
    } else {
      if (
        isPartOfRect(
          {
            x: borders.x + borders.width / 2 - SELECTION_ANCHOR_SIZE / 2 / scaleRatio,
            y: borders.y - SELECTION_ANCHOR_SIZE / scaleRatio - SELECTION_ROTATED_ANCHOR_POSITION / scaleRatio,
            width: SELECTION_ANCHOR_SIZE / scaleRatio,
            height: SELECTION_ANCHOR_SIZE / scaleRatio
          },
          newPosition,
          radius
        )
      ) {
        return { mode: 'rotate' }
      }

      for (const anchorPosition of SELECTION_RESIZE_ANCHOR_POSITIONS) {
        if (
          isPartOfRect(
            {
              x: borders.x + borders.width * anchorPosition[0] - SELECTION_ANCHOR_SIZE / 2 / scaleRatio,
              y: borders.y + borders.height * anchorPosition[1] - SELECTION_ANCHOR_SIZE / 2 / scaleRatio,
              width: SELECTION_ANCHOR_SIZE / scaleRatio,
              height: SELECTION_ANCHOR_SIZE / scaleRatio
            },
            newPosition,
            radius
          )
        ) {
          return { mode: 'resize', anchor: anchorPosition }
        }
      }
    }
  }

  return isPartOfRect(borders, newPosition, radius) ? { mode: 'translate' } : false
}

export const checkPositionIntersection = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape,
  position: Point,
  settings: UtilsSettings
): false | HoverModeData => {
  if (shape.locked) return false
  const { center } = getShapeInfos(shape, settings)

  const newPosition = getPointPositionAfterCanvasTransformation(position, shape.rotation, center)

  if ('path' in shape && shape.path) {
    const checkFill = shape.style?.fillColor && shape.style?.fillColor !== 'transparent'
    if (checkFill) {
      return ctx.isPointInPath(shape.path, newPosition[0], newPosition[1]) ? { mode: 'translate' } : false
    }
    ctx.lineWidth = (shape.style?.lineWidth ?? 0) + 15 / settings.canvasZoom

    return ctx.isPointInStroke(shape.path, newPosition[0], newPosition[1]) ? { mode: 'translate' } : false
  }

  return checkSelectionIntersection(shape, position, settings, false)
}

export function getRectIntersection(rect1: Rect, rect2: Rect): Rect | undefined {
  const x1 = Math.max(rect1.x, rect2.x)
  const y1 = Math.max(rect1.y, rect2.y)
  const x2 = Math.min(rect1.x + (rect1.width || 1), rect2.x + (rect2.width || 1))
  const y2 = Math.min(rect1.y + (rect1.height || 1), rect2.y + (rect2.height || 1))

  if (x1 < x2 && y1 < y2) {
    return {
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1
    }
  }
  return undefined
}

const rectSearch = ({
  ctx,
  path,
  rect,
  offset,
  checkFill
}: {
  ctx: CanvasRenderingContext2D
  path: Path2D
  rect: Rect
  offset: number
  checkFill: boolean
}): boolean => {
  for (let shiftX = 0; shiftX < offset; shiftX += offset / 2) {
    for (let shiftY = 0; shiftY < offset; shiftY += offset / 2) {
      for (let i = shiftX + rect.x; i < rect.x + rect.width; i += offset) {
        for (let j = shiftY + rect.y; j < rect.y + rect.height; j += offset) {
          if (checkFill ? ctx.isPointInPath(path, i, j) : ctx.isPointInStroke(path, i, j)) {
            return true
          }
        }
      }
    }
  }
  return false
}

const COLLISION_OFFSET = 10

export const checkSelectionFrameCollision = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape,
  selectionFrame: [Point, Point],
  settings: UtilsSettings
): boolean => {
  const { selectionPadding } = settings
  const { center, borders } = getShapeInfos(shape, settings)

  const frame0 = getPointPositionAfterCanvasTransformation(selectionFrame[0], shape.rotation, center)
  const frame1 = getPointPositionAfterCanvasTransformation(selectionFrame[1], shape.rotation, center)

  const minX = Math.round(Math.min(frame0[0], frame1[0]) - selectionPadding / 2)
  const maxX = Math.round(Math.max(frame0[0], frame1[0]) + selectionPadding)
  const minY = Math.round(Math.min(frame0[1], frame1[1]) - selectionPadding / 2)
  const maxY = Math.round(Math.max(frame0[1], frame1[1]) + selectionPadding)

  const frameRect = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }

  const frameCollision = getRectIntersection(borders, frameRect)
  if (!frameCollision) return false

  if (borders.width <= 1 || borders.height <= 1 || !('path' in shape && shape.path)) {
    return true
  }

  ctx.lineWidth = (shape.style?.lineWidth ?? 0) + COLLISION_OFFSET

  if (shape.type === 'brush') {
    const brushPoints = shape.points.flat()
    const brushMinX = Math.min(...brushPoints.map(point => point[0]))
    const brushMinY = Math.min(...brushPoints.map(point => point[1]))
    for (const points of shape.points) {
      if (points.length < 1) {
        break
      }
      if (points.length < 2) {
        const point = scalePoint(points[0], brushMinX, brushMinY, shape.scaleX, shape.scaleY)
        if (isCircleIntersectRect(frameCollision, { x: point[0], y: point[1], radius: (shape.style?.lineWidth ?? 1) / 2 })) {
          return true
        }
      }
      for (let i = 0; i < points.length - 1; i++) {
        const point1 = scalePoint(points[i], brushMinX, brushMinY, shape.scaleX, shape.scaleY)
        const point2 = scalePoint(points[i + 1], brushMinX, brushMinY, shape.scaleX, shape.scaleY)
        const pointMinX = Math.min(point1[0], point2[0])
        const pointMinY = Math.min(point1[1], point2[1])

        const pointsCollision = getRectIntersection(
          {
            x: pointMinX,
            y: pointMinY,
            width: Math.abs(point1[0] - point2[0]),
            height: Math.abs(point1[1] - point2[1])
          },
          frameRect
        )

        if (pointsCollision) {
          const path = new Path2D()
          path.moveTo(...point1)
          path.lineTo(...point2)

          const isPathInFrame = rectSearch({ ctx, path, rect: pointsCollision, offset: COLLISION_OFFSET, checkFill: false })
          if (isPathInFrame) return true
        }
      }
    }
    return false
  }

  const checkFill = !!(shape.style?.fillColor && shape.style?.fillColor !== 'transparent')

  return rectSearch({ ctx, path: shape.path, rect: frameCollision, offset: COLLISION_OFFSET, checkFill })
}
