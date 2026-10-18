import type { UtilsSettings } from '@canvas/constants/app'
import { SELECTION_RESIZE_ANCHOR_POSITIONS } from '@canvas/constants/shapes'
import type { CanvasSize } from '@canvas/types/Canvas'
import type { HoverModeData } from '@canvas/types/Mode'
import type { Point, Rect, SelectionType, ShapeEntity } from '@canvas/types/Shapes'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { getAnchorRadius, getResizeAnchorCenter, getRotationAnchorCenter, hasPointAnchors } from '@canvas/utils/selection/anchors'
import { catmullRomToBezier, createLinePath, getBrushPointScaler, getCatmullRomPoints } from '@canvas/utils/shapes/path'
import { isCircleIntersectRect, isPointInsideRect, rotatePoint } from './trigo'

export const getCursorPositionInElement = (e: MouseEvent, element: HTMLElement, canvasSize: CanvasSize): Point => {
  const { clientX, clientY } = e

  const canvasBoundingRect = element.getBoundingClientRect()
  return [(clientX - canvasBoundingRect.left) / canvasSize.scaleRatio, (clientY - canvasBoundingRect.top) / canvasSize.scaleRatio]
}

export const getCursorPositionInTransformedCanvas = (
  e: Pick<MouseEvent, 'clientX' | 'clientY'>,
  canvas: HTMLElement | null,
  settings: UtilsSettings
): Point => {
  const { clientX, clientY } = e

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

export const isTouchGesture = (e: PointerEvent): boolean => {
  return e.pointerType === 'touch'
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

const checkAnchorsSelection = (shape: ShapeEntity, newPosition: Point, settings: UtilsSettings, radius = 0): false | HoverModeData => {
  const anchorRadius = getAnchorRadius(settings)
  // an anchor is hovered in the square around it
  const isOverAnchor = ([x, y]: Point) =>
    isPartOfRect({ x: x - anchorRadius, y: y - anchorRadius, width: anchorRadius * 2, height: anchorRadius * 2 }, newPosition, radius)

  if (hasPointAnchors(shape)) {
    const index = shape.points.findIndex(point => isOverAnchor(point))
    return index > -1 ? { mode: 'resize', anchor: index } : false
  }

  const { borders } = shape.computed
  if (isOverAnchor(getRotationAnchorCenter(borders, settings))) return { mode: 'rotate' }
  const anchor = SELECTION_RESIZE_ANCHOR_POSITIONS.find(position => isOverAnchor(getResizeAnchorCenter(borders, position)))
  return anchor ? { mode: 'resize', anchor } : false
}

export const checkSelectionIntersection = (
  ctx: CanvasRenderingContext2D,
  selection: SelectionType,
  position: Point,
  settings: UtilsSettings,
  checkAnchors = false,
  radius = 0
): false | HoverModeData => {
  const shape = getSelectedShapes(selection).length > 1 ? selection : getSelectedShapes(selection)[0]
  if (!shape) return false
  const { borders, center } = shape.computed

  const newPosition = getPointPositionAfterCanvasTransformation(position, shape.rotation ?? 0, center)
  if (checkAnchors) {
    const anchorSelection = checkAnchorsSelection(shape, newPosition, settings, radius)
    if (anchorSelection) return anchorSelection
  }

  if (hasPointAnchors(shape)) {
    ctx.lineWidth = (shape.style?.lineWidth ?? 0) + 15 / settings.canvasZoom
    const isPointOverShape = shouldCheckFillShape(shape, true)
      ? ctx.isPointInPath(shape.path, newPosition[0], newPosition[1])
      : ctx.isPointInStroke(shape.path, newPosition[0], newPosition[1])
    return isPointOverShape ? { mode: 'translate' } : false
  }
  return isPartOfRect(borders, newPosition, (15 + radius) / settings.canvasZoom) ? { mode: 'translate' } : false
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

const shouldCheckFillShape = (shape: ShapeEntity, isSelected = false) => {
  if (isSelected && ['curve', 'polygon'].includes(shape.type)) return true
  return (shape.style?.fillColor && shape.style?.fillColor !== 'transparent') || ['picture', 'text'].includes(shape.type)
}

export const checkPositionIntersection = (
  ctx: CanvasRenderingContext2D,
  shape: SelectionType,
  position: Point,
  settings: UtilsSettings
): false | HoverModeData => {
  const { center } = shape.computed

  const newPosition = getPointPositionAfterCanvasTransformation(position, shape.rotation ?? 0, center)
  ctx.lineWidth = (shape.style?.lineWidth ?? 0) + 15 / settings.canvasZoom
  const isPointOverShape = shouldCheckFillShape(shape)
    ? ctx.isPointInPath(shape.path, newPosition[0], newPosition[1])
    : ctx.isPointInStroke(shape.path, newPosition[0], newPosition[1])
  if (isPointOverShape) return { mode: 'translate' }
  return false
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

  if (borders.width <= 1 || borders.height <= 1) {
    return true
  }

  // a shape inside the frame is crossed by it, without searching its points
  if (boundingBox.x >= minX && boundingBox.y >= minY && boundingBox.x + boundingBox.width <= maxX && boundingBox.y + boundingBox.height <= maxY) {
    return true
  }

  ctx.lineWidth = (shape.style?.lineWidth ?? 0) + COLLISION_OFFSET

  if (shape.type === 'brush') {
    const scale = getBrushPointScaler(shape)
    for (const points of shape.points) {
      if (points.length < 1) {
        break
      }
      if (points.length < 2) {
        const point = scale(points[0]!)
        if (isCircleIntersectRect(frameCollision, { x: point[0], y: point[1], radius: (shape.style?.lineWidth ?? 1) / 2 })) {
          return true
        }
      }
      for (let i = 0; i < points.length - 1; i++) {
        const point1 = getPointPositionBeforeCanvasTransformation(scale(points[i]!), shape.rotation ?? 0, center)
        const point2 = getPointPositionBeforeCanvasTransformation(scale(points[i + 1]!), shape.rotation ?? 0, center)
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

  const checkFill = shouldCheckFillShape(shape)

  return rectSearch({ ctx, path: shape.path, rect: frameCollision, offset: COLLISION_OFFSET, center, rotation: shape.rotation ?? 0, checkFill })
}

const POINTER_MOVE_THRESHOLD = 5

type ClientPosition = Pick<MouseEvent, 'clientX' | 'clientY'>

/** Whether the pointer has moved by more than a few pixels since the start of a press */
export const hasPointerMoved = (e: ClientPosition, startPosition: ClientPosition): boolean => {
  const dx = e.clientX - startPosition.clientX
  const dy = e.clientY - startPosition.clientY
  return dx * dx + dy * dy > POINTER_MOVE_THRESHOLD * POINTER_MOVE_THRESHOLD
}

export const shouldCancelLongPress = (e: PointerEvent, startPosition: ClientPosition): boolean =>
  !isTouchGesture(e) || hasPointerMoved(e, startPosition)

const isShapeAt = (ctx: CanvasRenderingContext2D, shape: ShapeEntity, point: Point, settings: UtilsSettings) =>
  shape.visible !== false && isPointInsideRect(shape.computed.boundingBox, point) && !!checkPositionIntersection(ctx, shape, point, settings)

/** Visible shapes under a point, from the foreground. Locked shapes are found too */
export const findShapesAt = (ctx: CanvasRenderingContext2D, shapes: ShapeEntity[], point: Point, settings: UtilsSettings): ShapeEntity[] =>
  shapes.filter(shape => isShapeAt(ctx, shape, point, settings))

/** The shape of the foreground under a point, as found by findShapesAt */
export const findShapeAt = (ctx: CanvasRenderingContext2D, shapes: ShapeEntity[], point: Point, settings: UtilsSettings): ShapeEntity | undefined =>
  shapes.find(shape => isShapeAt(ctx, shape, point, settings))
