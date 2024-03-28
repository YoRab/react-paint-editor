import { updateCanvasContext } from '@canvas/utils/canvas'
import { UtilsSettings } from '@common/constants/app'
import type { Point } from '@common/types/Shapes'
export const drawFrame = (ctx: CanvasRenderingContext2D, selectionFrame: [Point, Point], settings: UtilsSettings): void => {
	updateCanvasContext(ctx, {
		fillColor: 'rgba(170,170,170, 0.1)',
		strokeColor: 'rgb(170,170,170)',
		lineWidth: 1 / settings.canvasSize.scaleRatio
	})
	ctx.fillRect(selectionFrame[0][0], selectionFrame[0][1], selectionFrame[1][0] - selectionFrame[0][0], selectionFrame[1][1] - selectionFrame[0][1])
	ctx.strokeRect(selectionFrame[0][0], selectionFrame[0][1], selectionFrame[1][0] - selectionFrame[0][0], selectionFrame[1][1] - selectionFrame[0][1])
}
