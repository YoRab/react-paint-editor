import { SELECTION_DEFAULT_COLOR, SELECTION_DEFAULT_WIDTH } from '../constants/shapes'
import { LINE_DASH_DATA } from '../constants/style'
import type { Point } from '../types/Shapes'

export const initCanvasContext = (ctx: CanvasRenderingContext2D) => {
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

export const transformCanvas = (
	ctx: CanvasRenderingContext2D,
	responsiveScale: number,
	canvasOffset: Point,
	rotation?: number,
	translation?: Point
) => {
	ctx.save()
	ctx.scale(responsiveScale, responsiveScale)
	ctx.translate(canvasOffset[0], canvasOffset[1])
	if (rotation && translation) {
		ctx.translate(translation[0], translation[1])
		ctx.rotate(rotation)
		ctx.translate(-translation[0], -translation[1])
	}
}
