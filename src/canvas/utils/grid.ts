import type { UtilsSettings } from '@canvas/constants/app'

export const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, settings: UtilsSettings) => {
  const {
    gridGap,
    canvasOffset,
    canvasSize: { scaleRatio }
  } = settings
  ctx.strokeStyle = 'rgb(220,220,220)'
  ctx.lineWidth = 1
  ctx.save()
  ctx.scale(scaleRatio, scaleRatio)
  ctx.beginPath()

  const horizontalOffset = canvasOffset[0] % gridGap
  const verticalOffset = canvasOffset[1] % gridGap
  const nbCols = Math.ceil(width / scaleRatio / gridGap) + 2
  const nbRows = Math.ceil(height / scaleRatio / gridGap) + 2

  for (let i = -5; i < nbCols; i++) {
    ctx.moveTo(horizontalOffset + (i + 1) * gridGap, verticalOffset - gridGap)
    ctx.lineTo(horizontalOffset + (i + 1) * gridGap, verticalOffset + height / scaleRatio + gridGap)
  }
  for (let i = -5; i < nbRows; i++) {
    ctx.moveTo(horizontalOffset - gridGap, verticalOffset + (i + 1) * gridGap)
    ctx.lineTo(horizontalOffset + width / scaleRatio + gridGap, verticalOffset + (i + 1) * gridGap)
  }
  ctx.stroke()
  ctx.restore()
}
