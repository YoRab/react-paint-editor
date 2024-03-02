import { SELECTION_ANCHOR_SIZE, SELECTION_RESIZE_ANCHOR_POSITIONS, SELECTION_ROTATED_ANCHOR_POSITION } from '../constants/shapes'
import type { HoverModeData } from '../types/Mode'
import type { DrawableShape, Point, Rect } from '../types/Shapes'
import { getShapeInfos } from './shapes'
import { isCircleIntersectRect, isPointInsideRect, rotatePoint } from './trigo'

export const getCursorPosition = (
	e: MouseEvent | TouchEvent,
	canvas: HTMLCanvasElement | null,
	givenWidth: number,
	givenHeight: number,
	scaleRatio = 1
): Point => {
	const { clientX = 0, clientY = 0 } =
		'touches' in e && e.touches[0] ? e.touches[0] : 'changedTouches' in e && e.changedTouches[0] ? e.changedTouches[0] : 'clientX' in e ? e : {}

	const canvasBoundingRect = canvas?.getBoundingClientRect() ?? {
		left: 0,
		top: 0,
		width: givenWidth,
		height: givenHeight
	}
	return [
		((clientX - canvasBoundingRect.left) * (givenWidth / canvasBoundingRect.width)) / scaleRatio,
		((clientY - canvasBoundingRect.top) * (givenHeight / canvasBoundingRect.height)) / scaleRatio
	]
}

export const isTouchGesture = (e: MouseEvent | TouchEvent): e is TouchEvent => {
	return 'touches' in e
}

export const getPointPositionAfterCanvasTransformation = (
	point: Point,
	shapeRotation: number,
	[originX, originY]: Point,
	[canvasOffsetX, canvasOffsetY]: Point
): Point =>
	rotatePoint({
		origin: [originX - canvasOffsetX, originY - canvasOffsetY],
		point,
		rotation: shapeRotation
	})

export const getPointPositionBeforeCanvasTransformation = (
	point: Point,
	shapeRotation: number,
	[originX, originY]: Point,
	[canvasOffsetX, canvasOffsetY]: Point
): Point =>
	rotatePoint({
		origin: [originX - canvasOffsetX, originY - canvasOffsetY],
		point,
		rotation: -shapeRotation
	})

const isPartOfRect = (rect: Rect, point: Point, radius: number) =>
	radius ? isCircleIntersectRect(rect, { x: point[0], y: point[1], radius }) : isPointInsideRect(rect, point)

export const checkSelectionIntersection = (
	shape: DrawableShape,
	position: Point,
	canvasOffset: Point,
	selectionPadding: number,
	currentScale: number,
	checkAnchors = false,
	radius = 0
): false | HoverModeData => {
	if (shape.locked) return false
	const { borders, center } = getShapeInfos(shape, selectionPadding)

	const newPosition = getPointPositionAfterCanvasTransformation(position, shape.rotation, center, canvasOffset)

	if (checkAnchors) {
		if (shape.type === 'line' || shape.type === 'polygon' || shape.type === 'curve') {
			for (let i = 0; i < shape.points.length; i++) {
				if (
					isPartOfRect(
						{
							x: shape.points[i][0] - SELECTION_ANCHOR_SIZE / 2 / currentScale,
							y: shape.points[i][1] - SELECTION_ANCHOR_SIZE / 2 / currentScale,
							width: SELECTION_ANCHOR_SIZE / currentScale,
							height: SELECTION_ANCHOR_SIZE / currentScale
						},
						newPosition,
						radius
					)
				) {
					return { mode: 'resize', anchor: i }
				}
			}
		} else {
			if (
				isPartOfRect(
					{
						x: borders.x + borders.width / 2 - SELECTION_ANCHOR_SIZE / 2 / currentScale,
						y: borders.y - SELECTION_ANCHOR_SIZE / currentScale - SELECTION_ROTATED_ANCHOR_POSITION / currentScale,
						width: SELECTION_ANCHOR_SIZE / currentScale,
						height: SELECTION_ANCHOR_SIZE / currentScale
					},
					newPosition,
					radius
				)
			) {
				return { mode: 'rotate' }
			}

			for (const anchorPosition of SELECTION_RESIZE_ANCHOR_POSITIONS) {
				if (
					isPartOfRect(
						{
							x: borders.x + borders.width * anchorPosition[0] - SELECTION_ANCHOR_SIZE / 2 / currentScale,
							y: borders.y + borders.height * anchorPosition[1] - SELECTION_ANCHOR_SIZE / 2 / currentScale,
							width: SELECTION_ANCHOR_SIZE / currentScale,
							height: SELECTION_ANCHOR_SIZE / currentScale
						},
						newPosition,
						radius
					)
				) {
					return { mode: 'resize', anchor: anchorPosition }
				}
			}
		}
	}

	return isPartOfRect(borders, newPosition, radius) ? { mode: 'translate' } : false
}

export const checkPositionIntersection = (
	ctx: CanvasRenderingContext2D,
	shape: DrawableShape,
	position: Point,
	canvasOffset: Point,
	selectionPadding: number,
	currentScale: number
): false | HoverModeData => {
	if (shape.locked) return false
	const { center } = getShapeInfos(shape, selectionPadding)

	const newPosition = getPointPositionAfterCanvasTransformation(position, shape.rotation, center, canvasOffset)

	if ('path' in shape && shape.path) {
		const checkFill = shape.style?.fillColor && shape.style?.fillColor !== 'transparent'
		if (checkFill) {
			return ctx.isPointInPath(shape.path, newPosition[0], newPosition[1]) ? { mode: 'translate' } : false
		}
		ctx.lineWidth = (shape.style?.lineWidth ?? 0) + 15

		return ctx.isPointInStroke(shape.path, newPosition[0], newPosition[1]) ? { mode: 'translate' } : false
	}

	return checkSelectionIntersection(shape, position, canvasOffset, selectionPadding, currentScale, false)
}

export function getRectIntersection(rect1: Rect, rect2: Rect): Rect | undefined {
	const x1 = Math.max(rect1.x, rect2.x)
	const y1 = Math.max(rect1.y, rect2.y)
	const x2 = Math.min(rect1.x + (rect1.width || 1), rect2.x + (rect2.width || 1))
	const y2 = Math.min(rect1.y + (rect1.height || 1), rect2.y + (rect2.height || 1))

	if (x1 < x2 && y1 < y2) {
		return {
			x: x1,
			y: y1,
			width: x2 - x1,
			height: y2 - y1
		}
	}
	return undefined
}

export const checkSelectionFrameCollision = (
	ctx: CanvasRenderingContext2D,
	shape: DrawableShape,
	selectionFrame: [Point, Point],
	canvasOffset: Point,
	selectionPadding: number
): boolean => {
	const { center, borders } = getShapeInfos(shape, selectionPadding)

	const frame0 = getPointPositionAfterCanvasTransformation(selectionFrame[0], shape.rotation, center, canvasOffset)
	const frame1 = getPointPositionAfterCanvasTransformation(selectionFrame[1], shape.rotation, center, canvasOffset)

	const minX = Math.round(Math.min(frame0[0], frame1[0]) - selectionPadding / 2)
	const maxX = Math.round(Math.max(frame0[0], frame1[0]) + selectionPadding)
	const minY = Math.round(Math.min(frame0[1], frame1[1]) - selectionPadding / 2)
	const maxY = Math.round(Math.max(frame0[1], frame1[1]) + selectionPadding)

	const collision = getRectIntersection(borders, { x: minX, y: minY, width: maxX - minX, height: maxY - minY })
	if (!collision) return false

	if (borders.width <= 1 || borders.height <= 1 || !('path' in shape && shape.path)) {
		return true
	}

	if (shape.type === 'brush') {
		for (const points of shape.points) {
			for (const point of points) {
				if (isCircleIntersectRect(collision, { x: point[0], y: point[1], radius: (shape.style?.lineWidth ?? 1) / 2 })) {
					return true
				}
			}
		}
		return false
	}

	const collisionOffset = Math.max(1, Math.min(10, Math.round(Math.min(collision.width, collision.height) / 20)))

	ctx.lineWidth = (shape.style?.lineWidth ?? 0) + 10
	const checkFill = shape.style?.fillColor && shape.style?.fillColor !== 'transparent'

	for (let shiftX = 0; shiftX < collisionOffset; shiftX++) {
		for (let shiftY = 0; shiftY < collisionOffset; shiftY++) {
			for (let i = shiftX + collision.x; i < collision.x + collision.width; i += collisionOffset) {
				for (let j = shiftY + collision.y; j < collision.y + collision.height; j += collisionOffset) {
					if (checkFill ? ctx.isPointInPath(shape.path, i, j) : ctx.isPointInStroke(shape.path, i, j)) {
						return true
					}
				}
			}
		}
	}
	return false
}
