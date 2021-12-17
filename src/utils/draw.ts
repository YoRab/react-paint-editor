import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from 'constants/shapes'
import {
  Circle,
  Ellipse,
  Line,
  Picture,
  Polygon,
  Rect,
  DrawableShape,
  Point,
  DrawableLine,
  DrawablePolygon,
  Brush,
  Text
} from 'types/Shapes'
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
  ctx.scale(marker.scale[0], marker.scale[1])
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
    strokeColor: 'blue',
    lineWidth: 1
  }
) => {
  fillColor && (ctx.fillStyle = fillColor)
  strokeColor && (ctx.strokeStyle = strokeColor)
  lineWidth && (ctx.lineWidth = lineWidth)
}

export const drawBrush = (ctx: CanvasRenderingContext2D, brush: Brush): void => {
  if (brush.points.length < 1) return
  updateDrawStyle(ctx, brush.style)
  ctx.beginPath()

  brush.points.map(points => {
    if (points.length === 1) {
      ctx.rect(points[0][0], points[0][1], 1, 1)
    } else {
      ctx.moveTo(...points[0])
      points.slice(1).map(point => {
        ctx.lineTo(...point)
      })
    }
  })

  brush.style?.strokeColor !== 'transparent' && ctx.stroke()
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
  ctx.lineTo(...polygon.points[0])
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

const getFontSizeToFit = (
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFace: string,
  maxWidth: number
) => {
  ctx.font = `1px serif`
  return maxWidth / ctx.measureText(text).width
}

export const drawText = (ctx: CanvasRenderingContext2D, text: Text): void => {
  updateDrawStyle(ctx, text.style)
  const fontSize = getFontSizeToFit(ctx, text.value, '', text.width)
  ctx.font = `${fontSize}px serif`
  ctx.textBaseline = 'hanging'

  text.style?.strokeColor !== 'transparent' &&
    ctx.strokeText(text.value, text.x, text.y, text.width)
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
    case 'brush':
      drawBrush(ctx, shape)
      break
    case 'text':
      drawText(ctx, shape)
      break
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

const drawSelectionDefault = ({
  ctx,
  shape
}: {
  ctx: CanvasRenderingContext2D
  shape: DrawableShape
}) => {
  const { borders } = getShapeInfos(shape)
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

  for (const anchorPosition of SELECTION_RESIZE_ANCHOR_POSITIONS) {
    drawCircle(ctx, {
      x: borders.x + borders.width * anchorPosition[0],
      y: borders.y + borders.height * anchorPosition[1],
      radius: SELECTION_ANCHOR_SIZE / 2,
      style: {
        fillColor: 'rgb(255,255,255)',
        strokeColor: 'rgb(150,150,150)',
        lineWidth: 2
      }
    })
  }
  drawCircle(ctx, {
    x: borders.x + borders.width / 2,
    y: borders.y - SELECTION_ANCHOR_SIZE / 2 - SELECTION_ROTATED_ANCHOR_POSITION,
    radius: SELECTION_ANCHOR_SIZE / 2,
    style: {
      fillColor: 'rgb(255,255,255)',
      strokeColor: 'rgb(150,150,150)',
      lineWidth: 2
    }
  })
}
const drawLineSelection = ({
  ctx,
  shape
}: {
  ctx: CanvasRenderingContext2D
  shape: DrawableLine | DrawablePolygon
}) => {
  const { borders } = getShapeInfos(shape)
  drawRect(ctx, borders)

  for (const coordinate of shape.points) {
    drawCircle(ctx, {
      x: coordinate[0],
      y: coordinate[1],
      radius: SELECTION_ANCHOR_SIZE / 2,
      style: {
        fillColor: 'rgb(255,255,255)',
        strokeColor: 'rgb(150,150,150)',
        lineWidth: 2
      }
    })
  }
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
  switch (shape.type) {
    case 'polygon':
    case 'line':
      drawLineSelection({ ctx, shape })
      break
    default:
      drawSelectionDefault({ ctx, shape })
      break
  }
  restoreShapeTransformations(ctx)
}
