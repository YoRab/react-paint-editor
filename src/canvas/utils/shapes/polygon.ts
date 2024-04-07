import { getShapeInfos } from '@canvas/utils/shapes/index'
import { SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Point, Polygon, Rect, ShapeEntity } from '@common/types/Shapes'
import type { ToolsSettingsType } from '@common/types/tools'
import { getPointPositionAfterCanvasTransformation } from '@canvas/utils/intersect'
import { set } from '@common/utils/object'
import { createLineSelectionPath } from '@canvas/utils/selection/lineSelection'
import { createPolygonPath } from '@canvas/utils/shapes/path'
import { roundForGrid } from '@canvas/utils/transform'
import { uniqueId } from '@common/utils/util'
import { UtilsSettings } from '@canvas/constants/app'

const buildPath = <T extends DrawableShape<'polygon'>>(shape: T, settings: UtilsSettings): T => {
	const path = createPolygonPath(shape)

	return {
		...shape,
		path,
		selection: createLineSelectionPath(path, shape, settings)
	}
}

export const refreshPolygon = buildPath

export const createPolygon = (
	shape: {
		id: string
		type: 'polygon'
		settings: ToolsSettingsType<'polygon'>
	},
	cursorPosition: Point,
	settings: UtilsSettings
): ShapeEntity<'polygon'> => {
	return buildPath(
		{
			toolId: shape.id,
			type: shape.type,
			id: uniqueId(`${shape.type}_`),
			points: new Array(shape.settings.pointsCount.default).fill(cursorPosition),
			rotation: 0,
			style: {
				opacity: shape.settings.opacity.default,
				fillColor: shape.settings.fillColor.default,
				strokeColor: shape.settings.strokeColor.default,
				lineWidth: shape.settings.lineWidth.default,
				lineDash: shape.settings.lineDash.default,
				pointsCount: shape.settings.pointsCount.default
			}
		},
		settings
	)
}

export const drawPolygon = (ctx: CanvasRenderingContext2D, polygon: DrawableShape<'polygon'>): void => {
	if (!polygon.path) return
	if (ctx.globalAlpha === 0) return
	polygon.style?.fillColor !== 'transparent' && ctx.fill(polygon.path)
	polygon.style?.strokeColor !== 'transparent' && ctx.stroke(polygon.path)
}

export const getPolygonBorder = (polygon: Polygon, settings: UtilsSettings): Rect => {
	const minX = Math.min(...polygon.points.map(point => point[0])) - settings.selectionPadding
	const maxX = Math.max(...polygon.points.map(point => point[0])) + settings.selectionPadding

	const minY = Math.min(...polygon.points.map(point => point[1])) - settings.selectionPadding
	const maxY = Math.max(...polygon.points.map(point => point[1])) + settings.selectionPadding

	return { x: minX, width: maxX - minX, y: minY, height: maxY - minY }
}

export const translatePolygon = <U extends DrawableShape<'polygon'>>(
	cursorPosition: Point,
	originalShape: U,
	originalCursorPosition: Point,
	settings: UtilsSettings
) => {
	const { borders } = getShapeInfos(originalShape, settings)

	return buildPath(
		{
			...originalShape,
			points: originalShape.points.map(([x, y]) =>
				settings.gridGap
					? [
							x + roundForGrid(borders.x + cursorPosition[0] - originalCursorPosition[0], settings) - borders.x,
							y + roundForGrid(borders.y + cursorPosition[1] - originalCursorPosition[1], settings) - borders.y
					  ]
					: [
							roundForGrid(x + cursorPosition[0] - originalCursorPosition[0], settings),
							roundForGrid(y + cursorPosition[1] - originalCursorPosition[1], settings)
					  ]
			)
		},
		settings
	)
}

export const resizePolygon = (
	cursorPosition: Point,
	originalShape: DrawableShape<'polygon'>,
	selectionMode: SelectionModeResize<number>,
	settings: UtilsSettings
): DrawableShape<'polygon'> => {
	const roundCursorPosition: Point = [roundForGrid(cursorPosition[0], settings), roundForGrid(cursorPosition[1], settings)]

	const { center } = getShapeInfos(originalShape, settings)

	const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
		roundCursorPosition,
		originalShape.rotation,
		center,
		settings.canvasOffset
	)
	const updatedShape = set(['points', selectionMode.anchor], cursorPositionBeforeResize, originalShape)

	return buildPath(updatedShape, settings)
}

export const updatePolygonLinesCount = <T extends DrawableShape<'polygon'>>(shape: T, newPointsCount: number, settings: UtilsSettings): T => {
	const currentPointsCount = shape.points.length
	if (currentPointsCount === newPointsCount) return shape
	if (currentPointsCount > newPointsCount) {
		const totalPoints = shape.points.slice(0, newPointsCount)
		return buildPath(
			{
				...shape,
				points: totalPoints,
				style: {
					...shape.style,
					pointsCount: totalPoints.length
				}
			},
			settings
		)
	}
	//TODO : better distribution for new points
	const nbPointsToAdd = newPointsCount - currentPointsCount
	const newPoints: Point[] = new Array(nbPointsToAdd)
		.fill(undefined)
		.map((_val, index) => [
			shape.points[0][0] + ((shape.points[1][0] - shape.points[0][0]) * (index + 1)) / (nbPointsToAdd + 1),
			shape.points[0][1] + ((shape.points[1][1] - shape.points[0][1]) * (index + 1)) / (nbPointsToAdd + 1)
		])

	const totalPoints = [shape.points[0], ...newPoints, ...shape.points.slice(1, shape.points.length)]

	return buildPath(
		{
			...shape,
			points: totalPoints,
			style: {
				...shape.style,
				pointsCount: totalPoints.length
			}
		},
		settings
	)
}
