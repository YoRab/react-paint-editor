import type { UtilsSettings } from '@canvas/constants/app'
import { SELECTION_DEFAULT_COLOR, SELECTION_DEFAULT_WIDTH } from '@canvas/constants/shapes'
import type { Point } from '@common/types/Shapes'
import { LINE_DASH_DATA } from '@editor/constants/style'

export const initCanvasContext = (ctx: CanvasRenderingContext2D) => {
  ctx.reset()
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
    lineCap?: CanvasLineCap
  } = {}
) => {
  const {
    lineCap = 'round',
    fillColor = 'transparent',
    opacity = 100,
    strokeColor = SELECTION_DEFAULT_COLOR,
    lineWidth = SELECTION_DEFAULT_WIDTH,
    lineDash = 0
  } = style
  ctx.lineCap = lineCap
  ctx.globalAlpha = opacity / 100
  ctx.fillStyle = fillColor
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = lineWidth
  ctx.setLineDash(lineDash === 0 ? [] : [LINE_DASH_DATA[lineDash][0] * lineWidth, LINE_DASH_DATA[lineDash][1] * lineWidth])
}

export const transformCanvas = (ctx: CanvasRenderingContext2D, settings: UtilsSettings, rotation?: number, translation?: Point) => {
  ctx.save()
  ctx.scale(settings.canvasSize.scaleRatio, settings.canvasSize.scaleRatio)
  ctx.translate(settings.canvasOffset[0], settings.canvasOffset[1])
  if (rotation && translation) {
    ctx.translate(translation[0], translation[1])
    ctx.rotate(rotation)
    ctx.translate(-translation[0], -translation[1])
  }
}
