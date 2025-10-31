import type { UtilsSettings } from '@canvas/constants/app'
import { getPointPositionAfterCanvasTransformation } from '@canvas/utils/intersect'
import { createLineSelectionPath } from '@canvas/utils/selection/lineSelection'
import { getShapeInfos } from '@canvas/utils/shapes/index'
import { createPolygonPath } from '@canvas/utils/shapes/path'
import { boundVectorToSingleAxis, roundForGrid } from '@canvas/utils/transform'
import type { SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Point, Polygon, Rect, ShapeEntity } from '@common/types/Shapes'
import type { ToolsSettingsType } from '@common/types/tools'
import { set } from '@common/utils/object'
import { uniqueId } from '@common/utils/util'

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
      points: [cursorPosition],
      rotation: 0,
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

export const drawPolygon = (ctx: CanvasRenderingContext2D, polygon: DrawableShape<'polygon'>): void => {
  if (!polygon.path) return
  if (ctx.globalAlpha === 0) return
  polygon.style?.fillColor !== 'transparent' && ctx.fill(polygon.path)
  polygon.style?.strokeColor !== 'transparent' && ctx.stroke(polygon.path)
}

export const getPolygonBorder = (polygon: Polygon, settings: Pick<UtilsSettings, 'selectionPadding'>): Rect => {
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
  settings: UtilsSettings,
  singleAxis: boolean
) => {
  const translationVector = boundVectorToSingleAxis(
    [cursorPosition[0] - originalCursorPosition[0], cursorPosition[1] - originalCursorPosition[1]],
    singleAxis
  )

  const { borders } = getShapeInfos(originalShape, settings)

  return buildPath(
    {
      ...originalShape,
      points: originalShape.points.map(([x, y]) =>
        settings.gridGap
          ? [
              x + roundForGrid(borders.x + translationVector[0], settings) - borders.x,
              y + roundForGrid(borders.y + translationVector[1], settings) - borders.y
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

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(roundCursorPosition, originalShape.rotation, center)
  const updatedShape = set(['points', selectionMode.anchor], cursorPositionBeforeResize, originalShape)

  return buildPath(updatedShape, settings)
}

export const addPolygonLine = <T extends DrawableShape<'polygon'>>(
  shape: T,
  lineIndex: number,
  cursorPosition: Point,
  settings: UtilsSettings
): T => {
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

export const addPolygonPoint = <T extends DrawableShape<'polygon'>>(
  shape: T,
  cursorPosition: Point,
  settings: UtilsSettings,
  temporary = false
): T => {
  const roundCursorPosition: Point = [roundForGrid(cursorPosition[0], settings), roundForGrid(cursorPosition[1], settings)]

  const { center } = getShapeInfos(shape, settings)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(roundCursorPosition, shape.rotation, center)

  const updatedShape = {
    ...shape,
    points: temporary ? shape.points : [...shape.points, cursorPositionBeforeResize],
    tempPoint: temporary ? cursorPositionBeforeResize : undefined
  }

  return buildPath(updatedShape, settings)
}
