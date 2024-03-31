import { DrawableShape, Triangle } from '../../types/Shapes'
import { createTrianglePath } from '../../utils/shapes/path'

const buildPath = (shape: DrawableShape<'triangle'>) => {
	return {
		...shape,
		path: createTrianglePath(shape)
	}
}

export const createTriangle = (triangle: Triangle): DrawableShape<'triangle'> => {
	const triangleShape = {
		...triangle,
		type: 'triangle'
	} as DrawableShape<'triangle'>

	return buildPath(triangleShape)
}

export const drawTriangle = (ctx: CanvasRenderingContext2D, triangle: DrawableShape<'triangle'>): void => {
	if (ctx.globalAlpha === 0) return
	if (!triangle.path) return
	triangle.style?.fillColor !== 'transparent' && ctx.fill(triangle.path)
	triangle.style?.strokeColor !== 'transparent' && ctx.stroke(triangle.path)
}
