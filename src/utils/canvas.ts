import { SELECTION_DEFAULT_COLOR, SELECTION_DEFAULT_WIDTH } from 'constants/shapes'
import { LINE_DASH_DATA } from 'constants/style'

export const initCanvasContext = (ctx: CanvasRenderingContext2D) => {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

export const updateCanvasContext = (
  ctx: CanvasRenderingContext2D,
  style: {
    fillColor?: string
    globalAlpha?: number
    strokeColor?: string
    lineWidth?: number
    lineDash?: number
  } = {}
) => {
  const {
    fillColor = 'transparent',
    globalAlpha = 100,
    strokeColor = SELECTION_DEFAULT_COLOR,
    lineWidth = SELECTION_DEFAULT_WIDTH,
    lineDash = 0
  } = style
  globalAlpha !== undefined && (ctx.globalAlpha = globalAlpha / 100)
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
