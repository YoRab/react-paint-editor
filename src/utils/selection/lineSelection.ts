import { SELECTION_ANCHOR_SIZE } from 'src/constants/shapes'
import { DrawableShape, Point, SelectionLinesType } from 'src/types/Shapes'
import { updateCanvasContext } from 'src/utils/canvas'
import { getShapeInfos } from 'src/utils/shapes'
import { createCirclePath, createLinePath, createPolygonPath, createRecPath } from 'src/utils/shapes/path'

export const createLineSelectionPath = (
	path: Path2D | undefined,
	shape: DrawableShape<'line' | 'polygon' | 'curve'> & {
		points: readonly Point[]
	},
	currentScale: number,
	selectionPadding: number,
	gravityAnchors = false
): SelectionLinesType => {
	const { borders } = getShapeInfos(shape, selectionPadding)

	return {
		border: createRecPath(borders),
		shapePath: path,
		anchors: [
			...shape.points.map((point, i) => {
				if (gravityAnchors && i > 0 && i < shape.points.length - 1) {
					return createRecPath({
						x: point[0] - SELECTION_ANCHOR_SIZE / 2,
						y: point[1] - SELECTION_ANCHOR_SIZE / 2,
						width: SELECTION_ANCHOR_SIZE / currentScale,
						height: SELECTION_ANCHOR_SIZE / currentScale
					})
				}
				return createCirclePath({
					x: point[0],
					y: point[1],
					radius: SELECTION_ANCHOR_SIZE / 2 / currentScale
				})
			})
		]
	}
}

export const drawLineSelection = ({
	ctx,
	shape,
	withAnchors,
	selectionWidth,
	selectionColor,
	currentScale = 1
}: {
	ctx: CanvasRenderingContext2D
	shape: DrawableShape<'line'> | DrawableShape<'polygon'> | DrawableShape<'curve'>
	withAnchors: boolean
	selectionWidth: number
	selectionColor: string
	currentScale?: number
}) => {
	if (!shape.selection) return

	updateCanvasContext(ctx, {
		fillColor: 'transparent',
		strokeColor: selectionColor,
		lineWidth: selectionWidth / currentScale
	})

	if (shape.selection.shapePath) ctx.stroke(shape.selection.shapePath)

	if (!withAnchors || shape.locked) return

	updateCanvasContext(ctx, {
		fillColor: 'rgb(255,255,255)',
		strokeColor: 'rgb(150,150,150)',
		lineWidth: 2 / currentScale
	})

	for (const anchor of shape.selection.anchors) {
		ctx.fill(anchor)
		ctx.stroke(anchor)
	}
}
