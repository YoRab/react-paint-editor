import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from 'constants/shapes'
import { Circle, Ellipse, Line, Picture, Polygon, Rect, DrawableShape, Point } from 'types/Shapes'
import { getShapeInfos } from './shapeData'

const applyShapeTransformations = (
  ctx: CanvasRenderingContext2D,
  marker: DrawableShape,
  canvasOffset: Point
) => {
  ctx.save()
  ctx.translate(marker.translation[0] + canvasOffset[0], marker.translation[1] + canvasOffset[1])
  if (marker.rotation !== 0) {
    const { center } = getShapeInfos(marker)
    ctx.translate(center[0], center[1])
    ctx.rotate(marker.rotation)
    ctx.translate(-center[0], -center[1])
  }
}

const restoreShapeTransformations = (ctx: CanvasRenderingContext2D) => {
  ctx.restore()
}

const updateDrawStyle = (
  ctx: CanvasRenderingContext2D,
  {
    fillColor,
    strokeColor,
    lineWidth
  }: {
    fillColor?: string
    strokeColor?: string
    lineWidth?: number
  } = {
    fillColor: 'transparent',
    strokeColor: 'black',
    lineWidth: 1
  }
) => {
  fillColor && (ctx.fillStyle = fillColor)
  strokeColor && (ctx.strokeStyle = strokeColor)
  lineWidth && (ctx.lineWidth = lineWidth)
}

export const drawLine = (ctx: CanvasRenderingContext2D, line: Line): void => {
  updateDrawStyle(ctx, line.style)

  ctx.beginPath()
  ctx.moveTo(...line.points[0])
  ctx.lineTo(...line.points[1])
  line.style?.fillColor !== 'transparent' && ctx.fill()
  line.style?.strokeColor !== 'transparent' && ctx.stroke()
}

export const drawPolygon = (ctx: CanvasRenderingContext2D, polygon: Polygon): void => {
  if (polygon.points.length < 1) return
  updateDrawStyle(ctx, polygon.style)

  ctx.beginPath()
  ctx.moveTo(...polygon.points[0])
  polygon.points.slice(1).map(point => {
    ctx.lineTo(...point)
  })
  polygon.style?.fillColor !== 'transparent' && ctx.fill()
  polygon.style?.strokeColor !== 'transparent' && ctx.stroke()
}

export const drawCircle = (ctx: CanvasRenderingContext2D, circle: Circle): void => {
  updateDrawStyle(ctx, circle.style)
  ctx.beginPath()
  ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI)
  circle.style?.fillColor !== 'transparent' && ctx.fill()
  circle.style?.strokeColor !== 'transparent' && ctx.stroke()
}

export const drawEllipse = (ctx: CanvasRenderingContext2D, ellipse: Ellipse): void => {
  updateDrawStyle(ctx, ellipse.style)
  ctx.beginPath()
  ctx.ellipse(ellipse.x, ellipse.y, ellipse.radiusX, ellipse.radiusY, 0, 0, 2 * Math.PI)
  ellipse.style?.fillColor !== 'transparent' && ctx.fill()
  ellipse.style?.strokeColor !== 'transparent' && ctx.stroke()
}

export const drawRect = (ctx: CanvasRenderingContext2D, rect: Rect): void => {
  updateDrawStyle(ctx, rect.style)
  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.width, rect.height)
  rect.style?.fillColor !== 'transparent' && ctx.fill()
  rect.style?.strokeColor !== 'transparent' && ctx.stroke()
}

export const drawPicture = (ctx: CanvasRenderingContext2D, picture: Picture): void => {
  ctx.beginPath()
  ctx.drawImage(picture.img, picture.x, picture.y, picture.width, picture.height)
}

export const drawShape = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape,
  canvasOffset: Point
): void => {
  applyShapeTransformations(ctx, shape, canvasOffset)

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
    case 'picture':
      drawPicture(ctx, shape)
      break
  }
  restoreShapeTransformations(ctx)
}
export const drawSelection = ({
  ctx,
  shape,
  canvasOffset
}: {
  ctx: CanvasRenderingContext2D
  shape: DrawableShape
  canvasOffset: Point
}) => {
  applyShapeTransformations(ctx, shape, canvasOffset)
  const { borders } = getShapeInfos(shape)
  ctx.setLineDash([4, 2])
  drawRect(ctx, borders)
  drawLine(ctx, {
    points: [
      [borders.x + borders.width / 2, borders.y],
      [
        borders.x + borders.width / 2,
        borders.y - SELECTION_ANCHOR_SIZE / 2 - SELECTION_ROTATED_ANCHOR_POSITION
      ]
    ]
  })
  ctx.setLineDash([])

  for (const anchorPosition of SELECTION_RESIZE_ANCHOR_POSITIONS) {
    drawCircle(ctx, {
      x: borders.x + borders.width * anchorPosition[0],
      y: borders.y + borders.height * anchorPosition[1],
      radius: SELECTION_ANCHOR_SIZE / 2,
      style: {
        fillColor: 'rgba(200,200,200,0.85)',
        strokeColor: 'rgba(50,50,50,0.75)',
        lineWidth: 2
      }
    })
  }
  drawCircle(ctx, {
    x: borders.x + borders.width / 2,
    y: borders.y - SELECTION_ANCHOR_SIZE / 2 - SELECTION_ROTATED_ANCHOR_POSITION,
    radius: SELECTION_ANCHOR_SIZE / 2,
    style: {
      fillColor: 'rgba(200,200,200,0.85)',
      strokeColor: 'rgba(50,50,50,0.75)',
      lineWidth: 2
    }
  })

  restoreShapeTransformations(ctx)
}
