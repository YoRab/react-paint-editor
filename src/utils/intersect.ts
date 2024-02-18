import { SELECTION_ANCHOR_SIZE, SELECTION_RESIZE_ANCHOR_POSITIONS, SELECTION_ROTATED_ANCHOR_POSITION } from '../constants/shapes'
import type { HoverModeData } from '../types/Mode'
import type { Point, DrawableShape, Rect } from '../types/Shapes'
import { getShapeInfos } from './shapes'
import { rotatePoint, isPointInsideRect, isCircleIntersectRect } from './trigo'

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
	currentScale: number,
	radius = 0
): false | HoverModeData => {
	if (shape.locked) return false
	const { center } = getShapeInfos(shape, selectionPadding)

	const newPosition = getPointPositionAfterCanvasTransformation(position, shape.rotation, center, canvasOffset)

	if ('path' in shape && shape.path) {
		const checkFill = shape.style?.fillColor && shape.style?.fillColor !== 'transparent'
		if (checkFill) {
			return ctx.isPointInPath(shape.path, newPosition[0], newPosition[1]) ? { mode: 'translate' } : false
		}
		ctx.lineWidth = (shape.style?.lineWidth ?? 0) + 2 * radius + 15

		return ctx.isPointInStroke(shape.path, newPosition[0], newPosition[1]) ? { mode: 'translate' } : false
	}

	return checkSelectionIntersection(shape, position, canvasOffset, selectionPadding, currentScale, false, radius)
}
