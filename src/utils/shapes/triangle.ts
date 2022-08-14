import { Triangle } from 'types/Shapes'
import { updateCanvasContext } from 'utils/canvas'

export const drawTriangle = (ctx: CanvasRenderingContext2D, triangle: Triangle): void => {
  updateCanvasContext(ctx, triangle.style)

  if (ctx.globalAlpha === 0) return

  ctx.beginPath()
  ctx.moveTo(...triangle.points[0])
  ctx.lineTo(...triangle.points[1])
  ctx.lineTo(...triangle.points[2])
  ctx.lineTo(...triangle.points[0])
  triangle.style?.fillColor !== 'transparent' && ctx.fill()
  triangle.style?.strokeColor !== 'transparent' && ctx.stroke()
}
