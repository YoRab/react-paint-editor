import type { UtilsSettings } from '@canvas/constants/app'
import type { SelectionModeResize } from '@canvas/types/Mode'
import type { DrawableShape, Line, Point, Rect, ShapeEntity } from '@canvas/types/Shapes'
import type { ToolsSettingsType } from '@canvas/types/tools'
import { drawPathWithFillAndStroke } from '@canvas/utils/fill'
import { getPointPositionAfterCanvasTransformation } from '@canvas/utils/intersect'
import { set } from '@canvas/utils/object'
import { addStraightArrowHeads, drawArrowHeads, withArrowHeadsOuterBorder } from '@canvas/utils/shapes/arrow'
import { createLinePath, getComputedShapeInfos, getDefaultOuterBorder } from '@canvas/utils/shapes/path'
import { getToolDefaultStyle } from '@canvas/utils/tools'
import { roundForGrid } from '@canvas/utils/transform'
import { createShapeId } from '@canvas/utils/util'
import { refreshCurve } from './curve'
import { type GroupResizeContext, getPointPositionInNewBorder } from './group'
import { refreshPolygon } from './polygon'

const getLineBorder = (line: Line, settings: Pick<UtilsSettings, 'selectionPadding'>): Rect => {
  const x = Math.min(line.points[0][0], line.points[1][0]) - settings.selectionPadding
  const width = Math.abs(line.points[0][0] - line.points[1][0]) + settings.selectionPadding * 2
  const y = Math.min(line.points[0][1], line.points[1][1]) - settings.selectionPadding
  const height = Math.abs(line.points[0][1] - line.points[1][1]) + settings.selectionPadding * 2
  return { x, width, y, height }
}

const buildPath = <T extends DrawableShape<'line'>>(line: T & { id: string }, settings: UtilsSettings): ShapeEntity<'line'> => {
  const { points, arrows, bounds } = addStraightArrowHeads(line.style, line.points)
  return {
    ...line,
    path: createLinePath({ points: [points[0]!, points[1]!] }),
    arrows,
    computed: getComputedShapeInfos(line, getLineBorder, settings, withArrowHeadsOuterBorder(getDefaultOuterBorder, bounds))
  }
}

export const refreshLine = buildPath

export const createLine = (
  shape: {
    id: string
    type: 'line'
    settings: ToolsSettingsType<'line'>
  },
  cursorPosition: Point,
  settings: UtilsSettings
): ShapeEntity<'line'> => {
  const lineShape = {
    toolId: shape.id,
    type: shape.type,
    id: createShapeId(shape.type),
    points: [cursorPosition, cursorPosition] as const,
    style: getToolDefaultStyle(shape)
  }
  return buildPath(lineShape, settings)
}

export const drawLine = (ctx: CanvasRenderingContext2D, shape: ShapeEntity<'line'>): void => {
  drawPathWithFillAndStroke(ctx, shape)
  drawArrowHeads(ctx, shape.arrows)
}

export const resizeLine = (
  cursorPosition: Point,
  originalShape: ShapeEntity<'line'>,
  selectionMode: SelectionModeResize<number>,
  settings: UtilsSettings
): ShapeEntity<'line'> => {
  const roundCursorPosition: Point = [roundForGrid(cursorPosition[0], settings), roundForGrid(cursorPosition[1], settings)]

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    roundCursorPosition,
    originalShape.rotation ?? 0,
    originalShape.computed.center
  )
  const updatedShape = set(['points', selectionMode.anchor], cursorPositionBeforeResize, originalShape)

  return buildPath(updatedShape, settings)
}

const refreshPointBasedShape = (
  shape: ShapeEntity<'line' | 'polygon' | 'curve'>,
  settings: UtilsSettings
): ShapeEntity<'line' | 'polygon' | 'curve'> => {
  if (shape.type === 'line') return buildPath(shape, settings)
  if (shape.type === 'polygon') return refreshPolygon(shape, settings)
  return refreshCurve(shape, settings)
}

/** The points are placed in the frame of the group, turned like it: the shape is stretched along its sides */
export const resizeLinePolygonCurveInGroup = <T extends ShapeEntity<'line' | 'polygon' | 'curve'>>(shape: T, groupCtx: GroupResizeContext): T =>
  refreshPointBasedShape(
    {
      ...shape,
      points: shape.points.map(point => getPointPositionInNewBorder(point, groupCtx))
    } as T,
    groupCtx.settings
  ) as T
