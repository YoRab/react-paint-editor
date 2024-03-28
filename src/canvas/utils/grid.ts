import { UtilsSettings } from '@common/constants/app'
import { GRID_STEP } from '@editor/constants/style'

export const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, settings: UtilsSettings) => {
	const {
		gridFormat,
		canvasOffset,
		canvasSize: { scaleRatio }
	} = settings

	ctx.strokeStyle = 'rgb(220,220,220)'
	ctx.lineWidth = 1
	ctx.save()
	ctx.scale(scaleRatio, scaleRatio)
	ctx.beginPath()
	const step = GRID_STEP[gridFormat - 1]

	const horizontalOffset = -canvasOffset[0] % step
	const verticalOffset = -canvasOffset[1] % step
	const nbCols = Math.ceil(width / scaleRatio / step)
	const nbRows = Math.ceil(height / scaleRatio / step)

	for (let i = 0; i < nbCols; i++) {
		ctx.moveTo(horizontalOffset + (i + 1) * step, verticalOffset)
		ctx.lineTo(horizontalOffset + (i + 1) * step, verticalOffset + height / scaleRatio)
	}
	for (let i = 0; i < nbRows; i++) {
		ctx.moveTo(horizontalOffset, verticalOffset + (i + 1) * step)
		ctx.lineTo(horizontalOffset + width / scaleRatio, verticalOffset + (i + 1) * step)
	}
	ctx.stroke()
	ctx.restore()
}
