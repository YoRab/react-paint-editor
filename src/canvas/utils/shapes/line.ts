import type { UtilsSettings } from '@canvas/constants/app'
import type { SelectionModeResize } from '@canvas/types/Mode'
import type { DrawableShape, Line, Point, Rect, SelectionType, ShapeEntity } from '@canvas/types/Shapes'
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
import { type GroupResizeContext, getPositionWithoutGroupRotation, getShapePositionInNewBorder } from './group'
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

export const resizeLinePolygonCurveInGroup = <T extends ShapeEntity<'line' | 'polygon' | 'curve'>>(
  shape: T,
  group: SelectionType & { type: 'group' },
  groupCtx: GroupResizeContext
): T => {
  const { isXinverted, isYinverted, settings, widthMultiplier, heightMultiplier } = groupCtx

  const oldWidth = shape.computed.borders.width - 2 * settings.selectionPadding
  const oldHeight = shape.computed.borders.height - 2 * settings.selectionPadding
  const newWidth = oldWidth * widthMultiplier
  const newHeight = oldHeight * heightMultiplier

  const pos = getShapePositionInNewBorder(shape, group, groupCtx)
  const newCenter = getPositionWithoutGroupRotation(groupCtx, pos.x, pos.y, newWidth, newHeight)
  const oldX = shape.computed.center[0] - oldWidth / 2
  const oldY = shape.computed.center[1] - oldHeight / 2
  const newX = newCenter[0] - newWidth / 2
  const newY = newCenter[1] - newHeight / 2
  return refreshPointBasedShape(
    {
      ...shape,
      points: shape.points.map(
        ([x, y]): Point => [
          newX + (isXinverted ? newWidth - (x - oldX) * widthMultiplier : (x - oldX) * widthMultiplier),
          newY + (isYinverted ? newHeight - (y - oldY) * heightMultiplier : (y - oldY) * heightMultiplier)
        ]
      )
    } as T,
    groupCtx.settings
  ) as T
}
