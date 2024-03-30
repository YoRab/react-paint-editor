import { UtilsSettings } from '@canvas/constants/app'
import { Circle, DrawableShape, Line, Rect } from '@common/types/Shapes'

export const createRecPath = (rect: Rect) => {
	const path = new Path2D()
	path.rect(rect.x, rect.y, rect.width, rect.height)
	return path
}

export const createCirclePath = (shape: Circle) => {
	const path = new Path2D()
	path.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI)
	return path
}

export const createEllipsePath = (ellipse: DrawableShape<'ellipse'>) => {
	const path = new Path2D()
	path.ellipse(ellipse.x, ellipse.y, ellipse.radiusX, ellipse.radiusY, 0, 0, 2 * Math.PI)
	return path
}

export const createLinePath = (line: Line) => {
	const path = new Path2D()
	path.moveTo(...line.points[0])
	path.lineTo(...line.points[1])
	return path
}

export const createBrushPath = (brush: DrawableShape<'brush'>, settings: UtilsSettings) => {
	if (brush.points.length < 1 || brush.style?.strokeColor === 'transparent') return undefined

	const path = new Path2D()

	for (const points of brush.points) {
		if (points.length === 1) {
			path.rect(...points[0], 1, 1)
		} else {
			path.moveTo(...points[0])
			for (const point of points.slice(1)) {
				path.lineTo(...point)
			}
		}
	}

	return path
}

export const createCurvePath = (curve: DrawableShape<'curve'>) => {
	if (curve.points.length < 3) return undefined

	const path = new Path2D()

	path.moveTo(...curve.points[0])
	for (let i = 1; i < curve.points.length - 1; i++) {
		path.quadraticCurveTo(
			...curve.points[i],
			curve.points.length - 2 === i ? curve.points[i + 1][0] : (curve.points[i + 1][0] - curve.points[i][0]) / 2 + curve.points[i][0],
			curve.points.length - 2 === i ? curve.points[i + 1][1] : (curve.points[i + 1][1] - curve.points[i][1]) / 2 + curve.points[i][1]
		)
	}

	return path
}

export const createPolygonPath = (polygon: DrawableShape<'polygon'>) => {
	if (polygon.points.length < 1) return undefined

	const path = new Path2D()

	path.moveTo(...polygon.points[0])
	for (const point of polygon.points.slice(1)) {
		path.lineTo(...point)
	}
	path.lineTo(...polygon.points[0])

	return path
}

export const createTrianglePath = (triangle: DrawableShape<'triangle'>) => {
	const path = new Path2D()
	path.moveTo(...triangle.points[0])
	path.lineTo(...triangle.points[1])
	path.lineTo(...triangle.points[2])
	path.lineTo(...triangle.points[0])
	return path
}
