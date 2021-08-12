import _ from 'lodash/fp'
import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from '../constants/shapes'
import { Circle, Ellipse, Line, Polygon, Rect, ShapeDrawable } from '../types/Shapes'
import { getShapeInfos } from './shapeData'

export const applyShapeTransformations = (ctx: CanvasRenderingContext2D, marker: ShapeDrawable) => {
  ctx.save()
  ctx.translate(marker.translation[0], marker.translation[1])
  if (marker.rotation !== 0) {
    // const { center } = getShapeInfos(marker)
    // ctx.translate(center[0], center[1])
    ctx.rotate(marker.rotation)
    // ctx.translate(-center[0], -center[1])
  }
}

export const restoreShapeTransformations = (ctx: CanvasRenderingContext2D) => {
  ctx.restore()
}

export const drawLine = (ctx: CanvasRenderingContext2D, line: Line): void => {
  ctx.beginPath()
  ctx.moveTo(...line.points[0])
  ctx.lineTo(...line.points[1])
  line.filled ? ctx.fill() : ctx.stroke()
}

export const drawPolygon = (ctx: CanvasRenderingContext2D, polygon: Polygon): void => {
  if (polygon.points.length < 1) return

  ctx.beginPath()
  ctx.moveTo(...polygon.points[0])
  polygon.points.slice(1).map(point => {
    ctx.lineTo(...point)
  })
  polygon.filled ? ctx.fill() : ctx.stroke()
}

export const drawCircle = (ctx: CanvasRenderingContext2D, circle: Circle): void => {
  ctx.beginPath()
  ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI)
  circle.filled ? ctx.fill() : ctx.stroke()
}

export const drawEllipse = (ctx: CanvasRenderingContext2D, ellipse: Ellipse): void => {
  ctx.beginPath()
  console.log(ellipse.x)
  ctx.ellipse(ellipse.x, ellipse.y, ellipse.radiusX, ellipse.radiusY, 0, 0, 2 * Math.PI)
  ellipse.filled ? ctx.fill() : ctx.stroke()
}

export const drawRect = (ctx: CanvasRenderingContext2D, rect: Rect): void => {
  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.width, rect.height)
  rect.filled ? ctx.fill() : ctx.stroke()
}

export const drawShape = (ctx: CanvasRenderingContext2D, shape: ShapeDrawable): void => {
  applyShapeTransformations(ctx, shape)

  switch (shape.type) {
    case 'line':
      drawLine(ctx, shape)
      break
    case 'polygon':
      drawPolygon(ctx, shape)
      break
    case 'circle':
      drawCircle(ctx, shape)
      break
    case 'ellipse':
      drawEllipse(ctx, shape)
      break
    case 'rect':
      drawRect(ctx, shape)
      break
  }
  restoreShapeTransformations(ctx)
}
export const drawSelection = ({
  ctx,
  shape
}: {
  ctx: CanvasRenderingContext2D
  shape: ShapeDrawable
}) => {
  applyShapeTransformations(ctx, shape)
  const { borders } = getShapeInfos(shape)
  ctx.setLineDash([2, 4])
  drawRect(ctx, borders)
  ctx.setLineDash([])

  for (const anchorPosition of SELECTION_RESIZE_ANCHOR_POSITIONS) {
    drawCircle(ctx, {
      x: borders.x + borders.width * anchorPosition[0],
      y: borders.y + borders.height * anchorPosition[1],
      radius: SELECTION_ANCHOR_SIZE / 2,
      filled: true
    })
  }
  drawCircle(ctx, {
    x: borders.x + borders.width / 2,
    y: borders.y - SELECTION_ANCHOR_SIZE / 2 - SELECTION_ROTATED_ANCHOR_POSITION,
    radius: SELECTION_ANCHOR_SIZE / 2,
    filled: true
  })

  restoreShapeTransformations(ctx)
}
