import { UtilsSettings } from '../../constants/app'
import { SelectionModeResize } from '../../types/Mode'
import type { DrawableShape, Point, Rect, ShapeEntity } from '../../types/Shapes'
import type { ToolsSettingsType } from '../../types/tools'
import { set } from '../../utils/object'
import { createRecSelectionPath, resizeRectSelection } from '../../utils/selection/rectSelection'
import { getShapeInfos } from '../../utils/shapes/index'
import { roundForGrid, roundValues, scalePoint } from '../../utils/transform'
import { uniqueId } from '../../utils/util'

const createBrushPath = (brush: DrawableShape<'brush'>, { algo }: UtilsSettings) => {
	if (brush.points.length < 1 || brush.style?.strokeColor === 'transparent') return undefined

	const brushPoints = brush.points.flat()
	const brushPointX = brushPoints.map(point => point[0])
	const brushPointY = brushPoints.map(point => point[1])

	const minX = Math.min(...brushPointX)
	const minY = Math.min(...brushPointY)

	const path = new Path2D()

	for (const points of brush.points) {
		if (!points.length) return
		if (points.length === 1) {
			path.rect(...scalePoint(points[0], minX, minY, brush.scaleX, brush.scaleY), 1, 1)
		} else {
			path.moveTo(...scalePoint(points[0], minX, minY, brush.scaleX, brush.scaleY))
			switch (algo) {
				case 'quadratic':
					for (let i = 0; i < points.slice(1).length - 2; i++) {
						const scaledPoint = scalePoint(points[i], minX, minY, brush.scaleX, brush.scaleY)
						const scaledPoint2 = scalePoint(points[i + 1], minX, minY, brush.scaleX, brush.scaleY)
						const xc = (scaledPoint[0] + scaledPoint2[0]) / 2
						const yc = (scaledPoint[1] + scaledPoint2[1]) / 2
						path.quadraticCurveTo(...scaledPoint, xc, yc)
					}
					path.quadraticCurveTo(
						...scalePoint(points[points.length - 2], minX, minY, brush.scaleX, brush.scaleY),
						...scalePoint(points[points.length - 1], minX, minY, brush.scaleX, brush.scaleY)
					)
					break
				default:
					for (const point of points.slice(1)) {
						path.lineTo(...scalePoint(point, minX, minY, brush.scaleX, brush.scaleY))
					}
					break
			}
		}
	}

	return path
}

const buildPath = <T extends DrawableShape<'brush'>>(brush: T, settings: UtilsSettings): T => {
	const path = createBrushPath(brush, settings)
	return {
		...brush,
		path,
		selection: createRecSelectionPath(path, brush, settings)
	}
}

export const refreshBrush = buildPath

export const createBrush = (
	shape: {
		id: string
		type: 'brush'
		settings: ToolsSettingsType<'brush'>
	},
	cursorPosition: Point,
	settings: UtilsSettings
): ShapeEntity<'brush'> => {
	return buildPath(
		{
			toolId: shape.id,
			type: shape.type,
			id: uniqueId(`${shape.type}_`),
			points: [[cursorPosition]],
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			style: {
				opacity: shape.settings.opacity.default,
				strokeColor: shape.settings.strokeColor.default,
				lineWidth: shape.settings.lineWidth.default,
				lineDash: shape.settings.lineDash.default
			}
		},
		settings
	)
}

export const drawBrush = (ctx: CanvasRenderingContext2D, shape: DrawableShape<'brush'>): void => {
	if (shape.points.length < 1 || !shape.path) return
	if (ctx.globalAlpha === 0) return
	if (shape.style?.strokeColor === 'transparent' || ctx.globalAlpha === 0) return
	ctx.stroke(shape.path)
}

export const getBrushBorder = (brush: DrawableShape<'brush'>, { selectionPadding }: UtilsSettings): Rect => {
	const brushPoints = brush.points.flat()
	const minX = Math.min(...brushPoints.map(point => point[0]))
	const minY = Math.min(...brushPoints.map(point => point[1]))

	const scaledPoints = brushPoints.map(point => scalePoint(point, minX, minY, brush.scaleX, brush.scaleY))

	const maxX = Math.max(...scaledPoints.map(point => point[0])) + selectionPadding
	const maxY = Math.max(...scaledPoints.map(point => point[1])) + selectionPadding

	return {
		x: minX - selectionPadding,
		width: maxX - minX + selectionPadding,
		y: minY - selectionPadding,
		height: maxY - minY + selectionPadding
	}
}

export const translateBrush = <U extends DrawableShape<'brush'>>(
	cursorPosition: Point,
	originalShape: U,
	originalCursorPosition: Point,
	settings: UtilsSettings
) => {
	const { borders } = getShapeInfos(originalShape, settings)
	const translationX = settings.gridFormat
		? roundForGrid(borders.x + cursorPosition[0] - originalCursorPosition[0], settings) - borders.x
		: cursorPosition[0] - originalCursorPosition[0]
	const translationY = settings.gridFormat
		? roundForGrid(borders.y + cursorPosition[1] - originalCursorPosition[1], settings) - borders.y
		: cursorPosition[1] - originalCursorPosition[1]
	return buildPath(
		{
			...originalShape,
			points: originalShape.points.map(coord => coord.map(([x, y]) => [x + translationX, y + translationY])) as Point[][]
		},
		settings
	)
}

export const resizeBrush = (
	cursorPosition: Point,
	originalShape: DrawableShape<'brush'>,
	selectionMode: SelectionModeResize,
	settings: UtilsSettings,
	keepRatio: boolean
): DrawableShape<'brush'> => {
	const { borders: originalBordersWithoutScale } = getShapeInfos({ ...originalShape, scaleX: 1, scaleY: 1 }, settings)
	const { borders: originalBorders } = getShapeInfos(originalShape, settings)

	const { borderX, borderHeight, borderY, borderWidth } = resizeRectSelection(cursorPosition, originalShape, selectionMode, settings, keepRatio)

	const originalShapeWidth = Math.max(0, originalBordersWithoutScale.width - 2 * settings.selectionPadding)
	const originalShapeHeight = Math.max(0, originalBordersWithoutScale.height - 2 * settings.selectionPadding)
	const shapeWidth = Math.max(0, borderWidth - 2 * settings.selectionPadding)
	const shapeHeight = Math.max(0, borderHeight - 2 * settings.selectionPadding)

	const scaleX = originalShapeWidth ? shapeWidth / originalShapeWidth : 1
	const scaleY = originalShapeHeight ? shapeHeight / originalShapeHeight : 1

	if (!originalShapeWidth || !originalShapeHeight) return originalShape

	const diffX = roundValues(borderX - originalBorders.x)
	const diffY = roundValues(borderY - originalBorders.y)
	return buildPath(
		{
			...originalShape,
			points: originalShape.points.map(coord => coord.map(([x, y]) => [x + diffX, y + diffY])),
			scaleX,
			scaleY
		},
		settings
	)
}

export const addNewPointToShape = <T extends DrawableShape<'brush'>>(shape: T, cursorPosition: Point, settings: UtilsSettings) => {
	const brushShape = {
		...shape,
		...{
			points: set(
				shape.points.length - 1,
				[...shape.points[shape.points.length - 1], [Math.round(cursorPosition[0]), Math.round(cursorPosition[1])]],
				shape.points
			)
		}
	}
	return buildPath(brushShape, settings)
}

export const addNewPointGroupToShape = <T extends DrawableShape<'brush'>>(shape: T, cursorPosition: Point, settings: UtilsSettings): T => {
	const brushShape = {
		...shape,
		...{
			points: set(shape.points.length, [[Math.round(cursorPosition[0]), Math.round(cursorPosition[1])]], shape.points)
		}
	}
	return buildPath(brushShape, settings)
}
