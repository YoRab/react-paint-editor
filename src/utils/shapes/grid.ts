import { GridFormatType } from 'constants/app'
import { GRID_STEP } from 'constants/style'
import type { Point } from 'types/Shapes'

export const drawGrid = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  responsiveScale: number,
  canvasOffset: Point,
  gridFormat: GridFormatType
) => {
  ctx.strokeStyle = 'rgb(220,220,220)'
  ctx.lineWidth = 1
  ctx.save()
  ctx.scale(responsiveScale, responsiveScale)
  ctx.beginPath()
  const step = GRID_STEP[gridFormat - 1]

  const horizontalOffset = -canvasOffset[0] % step
  const verticalOffset = -canvasOffset[1] % step
  const nbCols = Math.ceil(width / responsiveScale / step)
  const nbRows = Math.ceil(height / responsiveScale / step)

  for (let i = 0; i < nbCols; i++) {
    ctx.moveTo(horizontalOffset + (i + 1) * step, verticalOffset)
    ctx.lineTo(horizontalOffset + (i + 1) * step, verticalOffset + height / responsiveScale)
  }
  for (let i = 0; i < nbRows; i++) {
    ctx.moveTo(horizontalOffset, verticalOffset + (i + 1) * step)
    ctx.lineTo(horizontalOffset + width / responsiveScale, verticalOffset + (i + 1) * step)
  }
  ctx.stroke()
  ctx.restore()
}
