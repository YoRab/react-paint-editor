import type { UtilsSettings } from '@canvas/constants/app'
import { SELECTION_ANCHOR_SIZE, SELECTION_RESIZE_ANCHOR_POSITIONS, SELECTION_ROTATED_ANCHOR_POSITION } from '@canvas/constants/shapes'
import type { SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Point, Rect, SelectionDefaultType } from '@common/types/Shapes'
import { updateCanvasContext } from '@canvas/utils/canvas'
import { getShapeInfos } from '@canvas/utils/shapes/index'
import { roundForGrid, roundValues } from '@canvas/utils/transform'
import { rotatePoint } from '@canvas/utils/trigo'
import { createCirclePath, createLinePath, createRecPath } from '@canvas/utils/shapes/path'

export const createRecSelectionPath = (path: Path2D | undefined, rect: DrawableShape, settings: UtilsSettings): SelectionDefaultType => {
	const { borders } = getShapeInfos(rect, settings)

	return {
		border: createRecPath(borders),
		shapePath: path,
		line: createLinePath({
			points: [
				[borders.x + borders.width / 2, borders.y],
				[borders.x + borders.width / 2, borders.y - (SELECTION_ANCHOR_SIZE / 2 + SELECTION_ROTATED_ANCHOR_POSITION) / settings.canvasSize.scaleRatio]
			]
		}),
		anchors: [
			createCirclePath({
				x: borders.x + borders.width / 2,
				y: borders.y - (SELECTION_ANCHOR_SIZE / 2 + SELECTION_ROTATED_ANCHOR_POSITION) / settings.canvasSize.scaleRatio,
				radius: SELECTION_ANCHOR_SIZE / 2 / settings.canvasSize.scaleRatio
			}),
			...SELECTION_RESIZE_ANCHOR_POSITIONS.map(anchorPosition =>
				createCirclePath({
					x: borders.x + borders.width * anchorPosition[0],
					y: borders.y + borders.height * anchorPosition[1],
					radius: SELECTION_ANCHOR_SIZE / 2 / settings.canvasSize.scaleRatio
				})
			)
		]
	}
}

export const drawSelectionRect = (
	ctx: CanvasRenderingContext2D,
	shape: DrawableShape & { selection?: SelectionDefaultType },
	selectionColor: string,
	selectionWidth: number,
	settings: UtilsSettings,
	withAnchors: boolean
): void => {
	if (!shape.selection) return

	updateCanvasContext(ctx, {
		fillColor: 'transparent',
		strokeColor: selectionColor,
		lineWidth: selectionWidth / settings.canvasSize.scaleRatio
	})
	if (shape.selection.shapePath) ctx.stroke(shape.selection.shapePath)
	else ctx.stroke(shape.selection.border)

	if (!withAnchors || shape.locked) return

	if (shape.selection.shapePath) ctx.stroke(shape.selection.border)
	ctx.stroke(shape.selection.line)

	updateCanvasContext(ctx, {
		fillColor: 'rgb(255,255,255)',
		strokeColor: 'rgb(150,150,150)',
		lineWidth: 2 / settings.canvasSize.scaleRatio
	})

	for (const anchor of shape.selection.anchors) {
		ctx.fill(anchor)
		ctx.stroke(anchor)
	}
}

const getSelectionData = ({
	borderStart,
	borderSize,
	vector,
	settings,
	invertedAxe,
	anchor
}: {
	borderStart: number
	borderSize: number
	vector: number
	settings: UtilsSettings
	invertedAxe: boolean
	anchor: number
}): [number, number] => {
	switch (anchor) {
		case 0: {
			if (invertedAxe) {
				const shapeSize = borderSize - 2 * settings.selectionPadding
				return [borderStart + shapeSize, vector - shapeSize]
			}
			const newWidth = Math.max(2 * settings.selectionPadding, borderSize - vector)
			return [borderStart + borderSize - newWidth, newWidth]
		}
		case 0.5:
			return [borderStart, borderSize]
		case 1:
			if (invertedAxe) {
				const offset = borderSize + vector
				return [borderStart + offset, 2 * settings.selectionPadding - offset]
			}
			return [borderStart, Math.max(2 * settings.selectionPadding, borderSize + vector)]
		default:
			return [0, 0]
	}
}

const resizeRectSelectionKeepingRatio = (
	rotatedVector: Point,
	borders: Rect,
	center: Point,
	borderX: number,
	borderWidth: number,
	borderY: number,
	borderHeight: number,
	originalShape: DrawableShape,
	selectionMode: SelectionModeResize,
	settings: UtilsSettings
) => {
	const { selectionPadding } = settings
	const originalRatio = (borders.width - selectionPadding * 2 || 1) / (borders.height - selectionPadding * 2 || 1)
	const calculatedRatio = (borderWidth - selectionPadding * 2) / (borderHeight - selectionPadding * 2)

	let trueBorderX: number
	let trueBorderY: number
	let trueBorderWidth: number
	let trueBorderHeight: number

	if (selectionMode.anchor[0] !== 0.5 && selectionMode.anchor[1] !== 0.5) {
		if (calculatedRatio < originalRatio) {
			trueBorderY = borderY
			trueBorderHeight = borderHeight
			trueBorderWidth = (borderHeight - selectionPadding * 2) * originalRatio + 2 * selectionPadding
			if (selectionMode.anchor[0] === 0) {
				trueBorderX =
					borders.width - rotatedVector[0] > selectionPadding
						? borders.x + (borders.width - trueBorderWidth)
						: borders.x + borders.width - 2 * selectionPadding
			} else {
				trueBorderX = borders.width + rotatedVector[0] > selectionPadding ? borders.x : borders.x - trueBorderWidth + 2 * selectionPadding
			}
		} else {
			trueBorderX = borderX
			trueBorderWidth = borderWidth
			trueBorderHeight = (borderWidth - selectionPadding * 2) / originalRatio + 2 * selectionPadding
			if (selectionMode.anchor[1] === 0) {
				trueBorderY =
					borders.height - rotatedVector[1] > selectionPadding
						? borders.y + (borders.height - trueBorderHeight)
						: borders.y + borders.height - 2 * selectionPadding
			} else {
				trueBorderY = borders.height + rotatedVector[1] > selectionPadding ? borders.y : borders.y - trueBorderHeight + 2 * selectionPadding
			}
		}
	} else if (selectionMode.anchor[0] !== 0.5) {
		trueBorderX = borderX
		trueBorderWidth = borderWidth
		trueBorderHeight = (borderWidth - selectionPadding * 2) / originalRatio + 2 * selectionPadding
		trueBorderY = borders.y + (borders.height - trueBorderHeight) / 2
	} else {
		trueBorderY = borderY
		trueBorderHeight = borderHeight
		trueBorderWidth = (borderHeight - selectionPadding * 2) * originalRatio + 2 * selectionPadding
		trueBorderX = borders.x + (borders.width - trueBorderWidth) / 2
	}

	return {
		borderX: trueBorderX,
		borderWidth: trueBorderWidth,
		borderY: trueBorderY,
		borderHeight: trueBorderHeight,
		center,
		originalShape
	}
}

const calculateRectSelectionData = ({
	borderX,
	borderWidth,
	borderY,
	borderHeight,
	center,
	originalShape
}: {
	borderX: number
	borderWidth: number
	borderY: number
	borderHeight: number
	center: Point
	originalShape: DrawableShape
}) => {
	const centerVector = [borderX + borderWidth / 2 - center[0], borderY + borderHeight / 2 - center[1]] as Point

	const [newCenterX, newCenterY] = rotatePoint({
		point: centerVector,
		rotation: -originalShape.rotation
	})

	return {
		borderX: roundValues(borderX + newCenterX - centerVector[0]),
		borderWidth: roundValues(borderWidth),
		borderY: roundValues(borderY + newCenterY - centerVector[1]),
		borderHeight: roundValues(borderHeight)
	}
}

export const resizeRectSelection = (
	cursorPosition: Point,
	originalShape: DrawableShape,
	selectionMode: SelectionModeResize,
	settings: UtilsSettings,
	keepRatio = false
): {
	borderX: number
	borderHeight: number
	borderY: number
	borderWidth: number
} => {
	const { center, borders } = getShapeInfos(originalShape, settings)

	const rotatedCursorPosition = rotatePoint({
		origin: center,
		point: cursorPosition,
		rotation: originalShape.rotation
	})

	const isXinverted =
		(selectionMode.anchor[0] === 0 && rotatedCursorPosition[0] >= borders.x + borders.width) ||
		(selectionMode.anchor[0] === 1 && rotatedCursorPosition[0] <= borders.x)
	const isYinverted =
		(selectionMode.anchor[1] === 0 && rotatedCursorPosition[1] >= borders.y + borders.height) ||
		(selectionMode.anchor[1] === 1 && rotatedCursorPosition[1] <= borders.y)

	const roundCursorPosition: Point = [
		roundForGrid(
			rotatedCursorPosition[0],
			settings,
			(selectionMode.anchor[0] === 0 && !isXinverted) || (selectionMode.anchor[0] === 1 && isXinverted)
				? settings.selectionPadding
				: -settings.selectionPadding
		),
		roundForGrid(
			rotatedCursorPosition[1],
			settings,
			(selectionMode.anchor[1] === 0 && !isYinverted) || (selectionMode.anchor[1] === 1 && isYinverted)
				? settings.selectionPadding
				: -settings.selectionPadding
		)
	]

	const roundCursorStartPosition = settings.gridGap
		? [
				selectionMode.anchor[0] === 0 ? borders.x : selectionMode.anchor[0] === 0.5 ? borders.x + borders.width / 2 : borders.x + borders.width,
				selectionMode.anchor[1] === 0 ? borders.y : selectionMode.anchor[1] === 0.5 ? borders.y + borders.height / 2 : borders.y + borders.height
		  ]
		: rotatePoint({
				origin: center,
				point: selectionMode.cursorStartPosition,
				rotation: originalShape.rotation
		  })

	const vector = [roundCursorPosition[0] - roundCursorStartPosition[0], roundCursorPosition[1] - roundCursorStartPosition[1]] as Point

	const [borderX, borderWidth] = getSelectionData({
		borderStart: borders.x,
		borderSize: borders.width,
		vector: vector[0],
		settings,
		invertedAxe: isXinverted,
		anchor: selectionMode.anchor[0]
	})

	const [borderY, borderHeight] = getSelectionData({
		borderStart: borders.y,
		borderSize: borders.height,
		vector: vector[1],
		settings,
		invertedAxe: isYinverted,
		anchor: selectionMode.anchor[1]
	})

	if (keepRatio) {
		const data = resizeRectSelectionKeepingRatio(
			vector,
			borders,
			center,
			borderX,
			borderWidth,
			borderY,
			borderHeight,
			originalShape,
			selectionMode,
			settings
		)
		return calculateRectSelectionData(data)
	}

	return calculateRectSelectionData({
		borderX,
		borderWidth,
		borderY,
		borderHeight,
		center,
		originalShape
	})
}
