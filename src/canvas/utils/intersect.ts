import type { UtilsSettings } from '@canvas/constants/app'
import { SELECTION_ANCHOR_SIZE, SELECTION_RESIZE_ANCHOR_POSITIONS, SELECTION_ROTATED_ANCHOR_POSITION } from '@canvas/constants/shapes'
import { getSelectedShapes } from '@canvas/utils/selection'
import { catmullRomToBezier, createLinePath, getCatmullRomPoints } from '@canvas/utils/shapes/path'
import { scalePoint } from '@canvas/utils/transform'
import type { CanvasSize } from '@common/types/Canvas'
import type { HoverModeData } from '@common/types/Mode'
import type { Point, Rect, SelectionType, ShapeEntity } from '@common/types/Shapes'
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
  ctx: CanvasRenderingContext2D,
  shape: SelectionType,
  position: Point,
  settings: UtilsSettings,
  checkAnchors = false,
  radius = 0
): false | HoverModeData => {
  if (shape.locked) return false
  const {
    canvasSize: { scaleRatio }
  } = settings
  const { borders, center } = shape.computed

  const newPosition = getPointPositionAfterCanvasTransformation(position, shape.rotation ?? 0, center)
  const shapeToCheck = getSelectedShapes(shape).length > 1 ? shape : getSelectedShapes(shape)[0]
  if (shapeToCheck && checkAnchors) {
    if (shapeToCheck.type === 'line' || shapeToCheck.type === 'polygon' || shapeToCheck.type === 'curve') {
      for (let i = 0; i < shapeToCheck.points.length; i++) {
        if (
          isPartOfRect(
            {
              x: shapeToCheck.points[i]![0] - SELECTION_ANCHOR_SIZE / 2 / scaleRatio,
              y: shapeToCheck.points[i]![1] - SELECTION_ANCHOR_SIZE / 2 / scaleRatio,
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

  if (isPartOfRect(borders, newPosition, radius)) return { mode: 'translate' }
  if (shape.type === 'curve' && 'path' in shape && shape.path && ctx.isPointInPath(shape.path, newPosition[0], newPosition[1]))
    return { mode: 'translate' }
  return false
}

export const checkPolygonLinesSelectionIntersection = (
  ctx: CanvasRenderingContext2D,
  shape: ShapeEntity<'polygon' | 'curve'>,
  position: Point,
  settings: UtilsSettings,
  radius = 50
): false | { lineIndex: number } => {
  if (shape.locked || shape.points.length < 2) return false

  const { center } = shape.computed

  const newPosition = getPointPositionAfterCanvasTransformation(position, shape.rotation ?? 0, center)

  ctx.lineWidth = (shape.style?.lineWidth ?? 0) + radius / settings.canvasZoom
  const points = shape.style?.closedPoints ? [...shape.points, shape.points[0]] : shape.points
  for (let i = 0; i < points.length - 1; i++) {
    const path = createLinePath({ points: [points[i]!, points[i + 1]!] })
    if (ctx.isPointInStroke(path, newPosition[0], newPosition[1])) {
      return { lineIndex: i }
    }
  }
  return false
}

export const checkCurveLinesSelectionIntersection = (
  ctx: CanvasRenderingContext2D,
  shape: ShapeEntity<'curve'>,
  position: Point,
  settings: UtilsSettings,
  radius = 50
): false | { lineIndex: number } => {
  if (shape.locked || shape.points.length < 2) return false
  if (shape.points.length < 3) return checkPolygonLinesSelectionIntersection(ctx, shape, position, settings, radius)

  const { center } = shape.computed

  const newPosition = getPointPositionAfterCanvasTransformation(position, shape.rotation ?? 0, center)

  ctx.lineWidth = (shape.style?.lineWidth ?? 0) + radius / settings.canvasZoom
  const points = getCatmullRomPoints(shape, shape.points)
  const path = new Path2D()
  path.moveTo(...points[0]!)
  for (let i = 1; i < points.length - 2; i++) {
    const p0 = points[i - 1]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2]!
    const { cp1, cp2 } = catmullRomToBezier(p0, p1, p2, p3)
    path.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], p2[0], p2[1])

    if (ctx.isPointInStroke(path, newPosition[0], newPosition[1])) {
      return { lineIndex: i - 1 }
    }
  }
  return false
}

export const checkPositionIntersection = (
  ctx: CanvasRenderingContext2D,
  shape: SelectionType,
  position: Point,
  settings: UtilsSettings
): false | HoverModeData => {
  if (shape.locked) return false
  const { center } = shape.computed

  const newPosition = getPointPositionAfterCanvasTransformation(position, shape.rotation ?? 0, center)

  if ('path' in shape && shape.path) {
    const checkFill = shape.style?.fillColor && shape.style?.fillColor !== 'transparent'
    if (checkFill) {
      return ctx.isPointInPath(shape.path, newPosition[0], newPosition[1]) ? { mode: 'translate' } : false
    }
    ctx.lineWidth = (shape.style?.lineWidth ?? 0) + 15 / settings.canvasZoom

    return ctx.isPointInStroke(shape.path, newPosition[0], newPosition[1]) ? { mode: 'translate' } : false
  }

  return checkSelectionIntersection(ctx, shape, position, settings, false)
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
  center,
  rotation = 0,
  checkFill
}: {
  ctx: CanvasRenderingContext2D
  path: Path2D
  rect: Rect
  offset: number
  checkFill: boolean
  center: Point
  rotation?: number | undefined
}): boolean => {
  for (let shiftX = 0; shiftX < offset; shiftX += offset / 2) {
    for (let shiftY = 0; shiftY < offset; shiftY += offset / 2) {
      for (let x = shiftX + rect.x; x < rect.x + rect.width; x += offset) {
        for (let y = shiftY + rect.y; y < rect.y + rect.height; y += offset) {
          const point = getPointPositionAfterCanvasTransformation([x, y], rotation, center)
          if (checkFill ? ctx.isPointInPath(path, point[0], point[1]) : ctx.isPointInStroke(path, point[0], point[1])) {
            return true
          }
        }
      }
    }
  }
  return false
}

const COLLISION_OFFSET = 10

export const checkSelectionFrameCollision = (ctx: CanvasRenderingContext2D, shape: ShapeEntity, selectionFrame: [Point, Point]): boolean => {
  const { borders, center, boundingBox } = shape.computed

  const minX = Math.min(selectionFrame[0][0], selectionFrame[1][0])
  const maxX = Math.max(selectionFrame[0][0], selectionFrame[1][0])
  const minY = Math.min(selectionFrame[0][1], selectionFrame[1][1])
  const maxY = Math.max(selectionFrame[0][1], selectionFrame[1][1])

  const frameRect = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }

  const frameCollision = getRectIntersection(boundingBox, frameRect)
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
        const point = scalePoint(points[0]!, brushMinX, brushMinY, shape.scaleX, shape.scaleY)
        if (isCircleIntersectRect(frameCollision, { x: point[0], y: point[1], radius: (shape.style?.lineWidth ?? 1) / 2 })) {
          return true
        }
      }
      for (let i = 0; i < points.length - 1; i++) {
        const point1 = getPointPositionBeforeCanvasTransformation(
          scalePoint(points[i]!, brushMinX, brushMinY, shape.scaleX, shape.scaleY),
          shape.rotation ?? 0,
          center
        )
        const point2 = getPointPositionBeforeCanvasTransformation(
          scalePoint(points[i + 1]!, brushMinX, brushMinY, shape.scaleX, shape.scaleY),
          shape.rotation ?? 0,
          center
        )
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

          const isPathInFrame = rectSearch({
            ctx,
            path,
            rect: pointsCollision,
            offset: COLLISION_OFFSET,
            center,
            checkFill: false
          })
          if (isPathInFrame) return true
        }
      }
    }
    return false
  }

  const checkFill = !!(shape.style?.fillColor && shape.style?.fillColor !== 'transparent')

  return rectSearch({ ctx, path: shape.path, rect: frameCollision, offset: COLLISION_OFFSET, center, rotation: shape.rotation ?? 0, checkFill })
}
