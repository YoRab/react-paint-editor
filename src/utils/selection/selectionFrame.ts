import type { Point } from '../../types/Shapes'
import { updateCanvasContext } from '../canvas'
export const drawFrame = (ctx: CanvasRenderingContext2D, selectionFrame: [Point, Point], currentScale: number): void => {
	updateCanvasContext(ctx, {
		fillColor: 'rgba(170,170,170, 0.1)',
		strokeColor: 'rgb(170,170,170)',
		lineWidth: 1 / currentScale
	})
	ctx.fillRect(selectionFrame[0][0], selectionFrame[0][1], selectionFrame[1][0] - selectionFrame[0][0], selectionFrame[1][1] - selectionFrame[0][1])
	ctx.strokeRect(selectionFrame[0][0], selectionFrame[0][1], selectionFrame[1][0] - selectionFrame[0][0], selectionFrame[1][1] - selectionFrame[0][1])
}
