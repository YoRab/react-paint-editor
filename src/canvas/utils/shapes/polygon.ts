import type { UtilsSettings } from '@canvas/constants/app'
import type { SelectionModeResize } from '@canvas/types/Mode'
import type { DrawableShape, Point, Polygon, Rect, ShapeEntity } from '@canvas/types/Shapes'
import type { ToolsSettingsType } from '@canvas/types/tools'
import { drawPathWithFillAndStroke } from '@canvas/utils/canvas'
import { getPointPositionAfterCanvasTransformation } from '@canvas/utils/intersect'
import { set } from '@canvas/utils/object'
import { createPolygonPath, expandRect, getComputedShapeInfos } from '@canvas/utils/shapes/path'
import { roundForGrid } from '@canvas/utils/transform'
import { getPointsBounds } from '@canvas/utils/trigo'
import { createShapeId } from '@canvas/utils/util'

const buildPath = <T extends DrawableShape<'polygon'>>(shape: T & { id: string }, settings: UtilsSettings): ShapeEntity<'polygon'> => {
  const path = createPolygonPath(shape)
  const computed = getComputedShapeInfos(shape, getPolygonBorder, settings)
  return {
    ...shape,
    path,
    computed
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
      id: createShapeId(shape.type),
      points: [cursorPosition],
      style: {
        opacity: shape.settings.opacity.default,
        fillColor: shape.settings.fillColor.default,
        strokeColor: shape.settings.strokeColor.default,
        lineWidth: shape.settings.lineWidth.default,
        lineDash: shape.settings.lineDash.default,
        closedPoints: shape.settings.closedPoints.default
      }
    },
    settings
  )
}

export const drawPolygon = (ctx: CanvasRenderingContext2D, polygon: ShapeEntity<'polygon'>): void => {
  drawPathWithFillAndStroke(ctx, polygon.path, polygon.style)
}

export const getPolygonBorder = (polygon: Polygon, settings: Pick<UtilsSettings, 'selectionPadding'>): Rect => {
  const { minX, minY, maxX, maxY } = getPointsBounds([polygon.points])

  const baseRect: Rect = { x: minX, width: maxX - minX, y: minY, height: maxY - minY }
  return expandRect(baseRect, settings.selectionPadding)
}
export const resizePolygon = (
  cursorPosition: Point,
  originalShape: ShapeEntity<'polygon'>,
  selectionMode: SelectionModeResize<number>,
  settings: UtilsSettings
): ShapeEntity<'polygon'> => {
  const roundCursorPosition: Point = [roundForGrid(cursorPosition[0], settings), roundForGrid(cursorPosition[1], settings)]

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    roundCursorPosition,
    originalShape.rotation ?? 0,
    originalShape.computed.center
  )
  const updatedShape = set(['points', selectionMode.anchor], cursorPositionBeforeResize, originalShape)

  return buildPath(updatedShape, settings)
}

export const addPolygonLine = (
  shape: ShapeEntity<'polygon'>,
  lineIndex: number,
  cursorPosition: Point,
  settings: UtilsSettings
): ShapeEntity<'polygon'> => {
  if (lineIndex < 0 || lineIndex > shape.points.length - 1) return shape

  const totalPoints = [...shape.points.slice(0, lineIndex + 1), cursorPosition, ...shape.points.slice(lineIndex + 1)]

  return buildPath(
    {
      ...shape,
      points: totalPoints
    },
    settings
  )
}

export const addPolygonPoint = (
  shape: ShapeEntity<'polygon'>,
  cursorPosition: Point,
  settings: UtilsSettings,
  temporary = false
): ShapeEntity<'polygon'> => {
  const roundCursorPosition: Point = [roundForGrid(cursorPosition[0], settings), roundForGrid(cursorPosition[1], settings)]

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(roundCursorPosition, shape.rotation ?? 0, shape.computed.center)

  const updatedShape = {
    ...shape,
    points: temporary ? shape.points : [...shape.points, cursorPositionBeforeResize],
    tempPoint: temporary ? cursorPositionBeforeResize : undefined
  }

  return buildPath(updatedShape, settings)
}

export const removePolygonPoint = (shape: ShapeEntity<'polygon'>, pointIndex: number, settings: UtilsSettings): ShapeEntity<'polygon'> => {
  if (pointIndex < 0 || pointIndex > shape.points.length - 1) return shape

  const updatedShape = {
    ...shape,
    points: shape.points.filter((_, index) => index !== pointIndex)
  }
  return buildPath(updatedShape, settings)
}
