import type { HoverModeData, SelectionModeData } from '../types/Mode'
import type { Point, ShapeEntity } from '../types/Shapes'
import { checkPositionIntersection, checkSelectionIntersection } from './intersect'
import { getShapeInfos } from './shapes'

export const getNewSelectionData = (
	hoverMode: HoverModeData,
	selectedShape: ShapeEntity,
	cursorPosition: Point,
	selectionPadding: number
): SelectionModeData<Point | number> | undefined => {
	if (hoverMode.mode === 'translate') {
		return {
			mode: 'translate',
			cursorStartPosition: cursorPosition,
			originalShape: selectedShape
		}
	}
	if (hoverMode.mode === 'rotate') {
		const { center: centerBeforeResize } = getShapeInfos(selectedShape, selectionPadding)
		const center: Point = [centerBeforeResize[0], centerBeforeResize[1]]
		return {
			mode: 'rotate',
			cursorStartPosition: cursorPosition,
			originalShape: selectedShape,
			center
		}
	}
	if (hoverMode.mode === 'resize') {
		return {
			mode: 'resize',
			cursorStartPosition: cursorPosition,
			originalShape: selectedShape,
			anchor: hoverMode.anchor
		}
	}
	return undefined
}

export const selectShape = (
	ctx: CanvasRenderingContext2D,
	shapes: ShapeEntity[],
	cursorPosition: Point,
	currentScale: number,
	canvasOffset: Point,
	selectedShape: ShapeEntity | undefined,
	selectionPadding: number,
	isTouchGesture: boolean
): {
	mode: SelectionModeData<Point | number>
	shape: ShapeEntity | undefined
} => {
	let selectedShapePositionIntersection: false | HoverModeData = false
	if (selectedShape) {
		selectedShapePositionIntersection = checkSelectionIntersection(
			selectedShape,
			cursorPosition,
			canvasOffset,
			selectionPadding,
			currentScale,
			true,
			isTouchGesture ? 20 : undefined
		)

		const newSelectionMode = getNewSelectionData(
			selectedShapePositionIntersection || { mode: 'default' },
			selectedShape,
			cursorPosition,
			selectionPadding
		)
		if (newSelectionMode?.mode === 'resize' || newSelectionMode?.mode === 'rotate') {
			return { shape: selectedShape, mode: newSelectionMode }
		}
	}
	const foundShape = shapes.find(shape => {
		return shape.id === selectedShape?.id
			? !!selectedShapePositionIntersection
			: !!checkPositionIntersection(ctx, shape, cursorPosition, canvasOffset, selectionPadding, currentScale)
	})

	if (foundShape) {
		return {
			shape: foundShape,
			mode: {
				mode: 'translate',
				cursorStartPosition: cursorPosition,
				originalShape: foundShape
			}
		}
	}
	return {
		shape: undefined,
		mode: {
			mode: 'selectionFrame'
		}
	}
}
