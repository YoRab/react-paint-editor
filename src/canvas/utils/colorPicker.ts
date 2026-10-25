import type { UtilsSettings } from '@canvas/constants/app'
import type { Point, ShapeEntity } from '@canvas/types/Shapes'
import { createDetachedContext, initCanvasContext } from '@canvas/utils/canvas'
import { drawShapes } from '@canvas/utils/shapes'
import { isCursorInsideMask } from '@canvas/utils/zoom'

const toHex = (value: number) => value.toString(16).padStart(2, '0')

/**
 * Color of the drawing at a point, as it is drawn at the scale of the view: '#rrggbb', or 'transparent' where no shape is
 * drawn, like outside of the drawing. The shapes are drawn again on a canvas of one pixel, around the point, so only the
 * ones over it are drawn, without the grid nor the mask. A shape seen through another one gives their mix; the
 * transparency of the pixel is left out
 */
export const getDrawingColorAt = (shapes: ShapeEntity[], point: Point, settings: UtilsSettings): string => {
  const ctx = isCursorInsideMask(point, settings) ? createDetachedContext() : null
  if (!ctx) return 'transparent'
  ctx.canvas.width = 1
  ctx.canvas.height = 1
  initCanvasContext(ctx)
  const { scaleRatio } = settings.canvasSize
  const pixelSettings: UtilsSettings = {
    ...settings,
    // the point is at the center of the pixel
    canvasOffset: [0.5 / scaleRatio - point[0], 0.5 / scaleRatio - point[1]],
    canvasSize: { ...settings.canvasSize, width: 1, height: 1 }
  }
  drawShapes(ctx, shapes, pixelSettings)
  const [red = 0, green = 0, blue = 0, alpha = 0] = ctx.getImageData(0, 0, 1, 1).data
  return alpha ? `#${toHex(red)}${toHex(green)}${toHex(blue)}` : 'transparent'
}
