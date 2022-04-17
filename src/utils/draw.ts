import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from 'constants/shapes'
import { LINE_DASH_DATA, STYLE_FONT_DEFAULT } from 'constants/style'
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
  Text,
  Triangle,
  StyledShape
  
} from 'types/Shapes'
import { applyRotationToVector } from './intersect'
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
    globalAlpha,
    strokeColor,
    lineWidth,
    lineDash
  }: {
    fillColor?: string
    globalAlpha?: number
    strokeColor?: string
    lineWidth?: number
    lineDash?: number
  } = {
    fillColor: 'transparent',
    strokeColor: 'blue',
    globalAlpha: 100,
    lineWidth: 1,
    lineDash: 0
  }
) => {
  globalAlpha!==undefined && (ctx.globalAlpha = globalAlpha/100)
  fillColor && (ctx.fillStyle = fillColor)
  strokeColor && (ctx.strokeStyle = strokeColor)
  lineWidth && (ctx.lineWidth = lineWidth)
  lineDash !== undefined &&
    lineWidth &&
    ctx.setLineDash([
      LINE_DASH_DATA[lineDash][0] * lineWidth,
      LINE_DASH_DATA[lineDash][1] * lineWidth
    ])
}

export const drawBrush = (ctx: CanvasRenderingContext2D, brush: Brush): void => {
  if (brush.points.length < 1) return
  updateDrawStyle(ctx, brush.style)
  ctx.beginPath()

  if(brush.style?.strokeColor === 'transparent' || ctx.globalAlpha===0)
    return;

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

   ctx.stroke()
}

export const drawTriangle = (ctx: CanvasRenderingContext2D, triangle: Triangle): void => {
  updateDrawStyle(ctx, triangle.style)

  if(ctx.globalAlpha===0)
    return

  ctx.beginPath()
  ctx.moveTo(...triangle.points[0])
  ctx.lineTo(...triangle.points[1])
  ctx.lineTo(...triangle.points[2])
  ctx.lineTo(...triangle.points[0])
  triangle.style?.fillColor !== 'transparent' && ctx.fill()
  triangle.style?.strokeColor !== 'transparent' && ctx.stroke()
}

const buildTriangleOnLine = (center: Point, angle: number, lineStyle: StyledShape) => {
  const trianglePoints = [
    applyRotationToVector([0, -(10 + (lineStyle.style?.lineWidth ?? 0) * 1)], angle),
    applyRotationToVector(
      [-(5 + (lineStyle.style?.lineWidth ?? 0) * 1), 5 + (lineStyle.style?.lineWidth ?? 0) * 2],
      angle
    ),
    applyRotationToVector(
      [5 + (lineStyle.style?.lineWidth ?? 0) * 1, 5 + (lineStyle.style?.lineWidth ?? 0) * 2],
      angle
    )
  ]
  return {
    points: [
      [center[0] + trianglePoints[0][0], center[1] + trianglePoints[0][1]],
      [center[0] + trianglePoints[1][0], center[1] + trianglePoints[1][1]],
      [center[0] + trianglePoints[2][0], center[1] + trianglePoints[2][1]]
    ],
    style: {
      ...lineStyle.style,
      fillColor: lineStyle.style?.strokeColor,
      strokeColor: 'transparent'
    }
  } as Triangle
}

export const drawLine = (ctx: CanvasRenderingContext2D, line: Line): void => {
  updateDrawStyle(ctx, line.style)

  if(ctx.globalAlpha===0)
  return

  ctx.beginPath()
  ctx.moveTo(...line.points[0])
  ctx.lineTo(...line.points[1])
  line.style?.fillColor !== 'transparent' && ctx.fill()
  line.style?.strokeColor !== 'transparent' && ctx.stroke()
  if (line.style?.lineArrow === 1 || line.style?.lineArrow === 3) {
    const rotation =
      Math.PI / 2 -
      Math.atan2(line.points[1][1] - line.points[0][1], line.points[1][0] - line.points[0][0])
    drawTriangle(ctx, buildTriangleOnLine(line.points[0], rotation, { style: line.style }))
  }
  if (line.style?.lineArrow === 2 || line.style?.lineArrow === 3) {
    const rotation =
      Math.PI / 2 -
      Math.atan2(line.points[0][1] - line.points[1][1], line.points[0][0] - line.points[1][0])
    drawTriangle(ctx, buildTriangleOnLine(line.points[1], rotation, { style: line.style }))
  }
}

export const drawPolygon = (ctx: CanvasRenderingContext2D, polygon: Polygon): void => {
  if (polygon.points.length < 1) return
  updateDrawStyle(ctx, polygon.style)

  if(ctx.globalAlpha===0)
  return

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

  if(ctx.globalAlpha===0)
  return

  ctx.beginPath()
  ctx.ellipse(ellipse.x, ellipse.y, ellipse.radiusX, ellipse.radiusY, 0, 0, 2 * Math.PI)
  ellipse.style?.fillColor !== 'transparent' && ctx.fill()
  ellipse.style?.strokeColor !== 'transparent' && ctx.stroke()
}

export const drawRect = (ctx: CanvasRenderingContext2D, rect: Rect): void => {
  updateDrawStyle(ctx, rect.style)

  if(ctx.globalAlpha===0)
  return

  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.width, rect.height)
  rect.style?.fillColor !== 'transparent' && ctx.fill()
  rect.style?.strokeColor !== 'transparent' && ctx.stroke()
}


export const drawText = (ctx: CanvasRenderingContext2D, text: Text): void => {
  updateDrawStyle(ctx, text.style)

  if(ctx.globalAlpha===0 || !text.style?.strokeColor || text.style.strokeColor === 'transparent')
  return

  ctx.font = `${text.fontSize}px ${text.style?.fontFamily ?? STYLE_FONT_DEFAULT}`
  ctx.textBaseline = 'hanging'
    ctx.fillStyle = text.style.strokeColor
    for (let i = 0; i < text.value.length; i++) {
      ctx.fillText(text.value[i], text.x, text.y + i * text.fontSize, text.width)
    }
}

export const drawPicture = (
  ctx: CanvasRenderingContext2D,
  picture: Picture<HTMLImageElement>
): void => {
  updateDrawStyle(ctx, picture.style)
  if(ctx.globalAlpha===0)
  return

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
      case 'square':
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
  shape,
  withAnchors
}: {
  ctx: CanvasRenderingContext2D
  shape: DrawableShape
  withAnchors: boolean
}) => {
  const { borders } = getShapeInfos(shape)
  drawRect(ctx, borders)

  if (!withAnchors) return

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
  shape,
  withAnchors
}: {
  ctx: CanvasRenderingContext2D
  shape: DrawableLine | DrawablePolygon
  withAnchors: boolean
}) => {
  const { borders } = getShapeInfos(shape)
  drawRect(ctx, borders)
  if (!withAnchors) return
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
  canvasOffset,
  withAnchors = true
}: {
  ctx: CanvasRenderingContext2D
  shape: DrawableShape
  canvasOffset: Point
  withAnchors?: boolean
}) => {
  applyShapeTransformations(ctx, shape, canvasOffset)
  switch (shape.type) {
    case 'polygon':
    case 'line':
      drawLineSelection({ ctx, shape, withAnchors })
      break
    default:
      drawSelectionDefault({ ctx, shape, withAnchors })
      break
  }
  restoreShapeTransformations(ctx)
}
