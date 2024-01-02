import { SELECTION_DEFAULT_COLOR, SELECTION_DEFAULT_WIDTH } from '../constants/shapes'
import { LINE_DASH_DATA } from '../constants/style'
import type { Point } from '../types/Shapes'

export const initCanvasContext = (ctx: CanvasRenderingContext2D) => {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

export const updateCanvasContext = (
  ctx: CanvasRenderingContext2D,
  style: {
    fillColor?: string
    opacity?: number
    strokeColor?: string
    lineWidth?: number
    lineDash?: number
  } = {}
) => {
  const {
    fillColor = 'transparent',
    opacity = 100,
    strokeColor = SELECTION_DEFAULT_COLOR,
    lineWidth = SELECTION_DEFAULT_WIDTH,
    lineDash = 0
  } = style
  opacity !== undefined && (ctx.globalAlpha = opacity / 100)
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

export const transformCanvas = (
  ctx: CanvasRenderingContext2D,
  responsiveScale: number,
  canvasOffset: Point,
  rotation: number,
  translation: Point
) => {
  ctx.save()
  ctx.scale(responsiveScale, responsiveScale)
  ctx.translate(canvasOffset[0], canvasOffset[1])
  if (rotation !== 0) {
    ctx.translate(translation[0], translation[1])
    ctx.rotate(rotation)
    ctx.translate(-translation[0], -translation[1])
  }
}
