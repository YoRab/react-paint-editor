import type { UtilsSettings } from '@canvas/constants/app'
import { LINE_DASH_DATA, MITER_LIMIT } from '@canvas/constants/rendering'
import { SELECTION_DEFAULT_COLOR, SELECTION_DEFAULT_WIDTH } from '@canvas/constants/shapes'
import type { CanvasSize, Resize } from '@canvas/types/Canvas'
import type { Point, StyleShape } from '@canvas/types/Shapes'

export const initCanvasContext = (ctx: CanvasRenderingContext2D) => {
  ctx.reset()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.miterLimit = MITER_LIMIT
}

export const updateCanvasContext = (
  ctx: CanvasRenderingContext2D,
  style: Pick<StyleShape, 'fillColor' | 'opacity' | 'strokeColor' | 'lineWidth' | 'lineDash' | 'lineCap' | 'lineJoin'> & {
    shadowColor?: string
    shadowBlur?: number
  } = {}
) => {
  const {
    lineCap = 'round',
    lineJoin = 'round',
    fillColor = 'transparent',
    opacity = 100,
    strokeColor = SELECTION_DEFAULT_COLOR,
    lineWidth = SELECTION_DEFAULT_WIDTH,
    lineDash = 0,
    shadowColor = 'transparent',
    shadowBlur = 0
  } = style
  ctx.lineCap = lineCap
  ctx.lineJoin = lineJoin
  ctx.globalAlpha = opacity / 100
  ctx.fillStyle = fillColor
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = lineWidth
  ctx.setLineDash(LINE_DASH_DATA[lineDash]?.map(length => length * lineWidth) ?? [])
  ctx.shadowColor = shadowColor
  ctx.shadowBlur = shadowBlur
}

export const transformCanvas = (ctx: CanvasRenderingContext2D, settings: UtilsSettings, rotation?: number, translation?: Point): void => {
  ctx.save()
  ctx.scale(settings.canvasSize.scaleRatio, settings.canvasSize.scaleRatio)
  ctx.translate(settings.canvasOffset[0], settings.canvasOffset[1])
  if (rotation && translation) {
    ctx.translate(translation[0], translation[1])
    ctx.rotate(rotation)
    ctx.translate(-translation[0], -translation[1])
  }
}

export const isVisibleColor = (color: string | undefined) => color !== undefined && color !== 'transparent'

/** Size of a canvas showing the whole drawing, scaled to the width it is displayed at */
export const getScaledCanvasSize = (displayWidth: number, width: number, height: number): CanvasSize => ({
  realWidth: width,
  realHeight: height,
  width: displayWidth,
  height: (height * displayWidth) / width,
  scaleRatio: displayWidth / width
})

/** Size of a canvas at the scale 1, showing an area of the drawing as large as itself */
export const getUnscaledCanvasSize = (width: number, height: number): CanvasSize => ({
  realWidth: width,
  realHeight: height,
  width,
  height,
  scaleRatio: 1
})

/** The scaled canvas can be wider than its logical width */
export const canScaleUp = (resize: Resize) => resize === 'scale' || resize === 'scaleUp'

/** The scaled canvas can be narrower than its logical width */
export const canScaleDown = (resize: Resize) => resize === 'scale' || resize === 'scaleDown'

/** A 2D context of a canvas out of the page, to measure texts and test points when no Canvas is mounted. Null outside of a browser */
export const createDetachedContext = (): CanvasRenderingContext2D | null => {
  if (typeof document === 'undefined') return null
  try {
    return document.createElement('canvas').getContext('2d')
  } catch {
    return null
  }
}

/**
 * Measures texts without a canvas, about 0.6 em per character, so that texts can still be created outside of a browser.
 * It only has the members used to measure a text
 */
export const createApproximateTextContext = (): CanvasRenderingContext2D => {
  const context = {
    font: '10px sans-serif',
    measureText: (text: string) => ({ width: text.length * Number.parseFloat(/([\d.]+)px/.exec(context.font)?.[1] ?? '10') * 0.6 })
  }
  return context as unknown as CanvasRenderingContext2D
}
