import type { UtilsSettings } from '@canvas/constants/app'
import { getPointPositionAfterCanvasTransformation } from '@canvas/utils/intersect'
import { createLineSelectionPath } from '@canvas/utils/selection/lineSelection'
import { getShapeInfos } from '@canvas/utils/shapes/index'
import { createCurvePath } from '@canvas/utils/shapes/path'
import { boundVectorToSingleAxis, roundForGrid } from '@canvas/utils/transform'
import type { SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Point, ShapeEntity } from '@common/types/Shapes'
import type { ToolsSettingsType } from '@common/types/tools'
import { set } from '@common/utils/object'
import { uniqueId } from '@common/utils/util'
import { getPolygonBorder } from './polygon'

const buildPath = <T extends DrawableShape<'curve'>>(shape: T, settings: UtilsSettings): T => {
  const path = createCurvePath(shape)
  return {
    ...shape,
    path,
    selection: createLineSelectionPath(path, shape, settings, true)
  }
}

export const refreshCurve = buildPath

export const createCurve = (
  shape: {
    id: string
    type: 'curve'
    settings: ToolsSettingsType<'curve'>
  },
  cursorPosition: Point,
  settings: UtilsSettings
): ShapeEntity<'curve'> => {
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

export const resizeCurve = (
  cursorPosition: Point,
  originalShape: DrawableShape<'curve'>,
  selectionMode: SelectionModeResize<number>,
  settings: UtilsSettings
): DrawableShape<'curve'> => {
  const roundCursorPosition: Point = [roundForGrid(cursorPosition[0], settings), roundForGrid(cursorPosition[1], settings)]

  const { center } = getShapeInfos(originalShape, settings)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(roundCursorPosition, originalShape.rotation, center)
  const updatedShape = set(['points', selectionMode.anchor], cursorPositionBeforeResize, originalShape)

  return buildPath(updatedShape, settings)
}

export const drawCurve = (ctx: CanvasRenderingContext2D, curve: DrawableShape<'curve'>): void => {
  if (!curve.path) return
  if (ctx.globalAlpha === 0) return
  curve.style?.fillColor !== 'transparent' && ctx.fill(curve.path)
  curve.style?.strokeColor !== 'transparent' && ctx.stroke(curve.path)
}

export const getCurveBorder = getPolygonBorder

export const translateCurve = <U extends DrawableShape<'curve'>>(
  cursorPosition: Point,
  originalShape: U,
  originalCursorPosition: Point,
  settings: UtilsSettings,
  singleAxis: boolean
) => {
  const { borders } = getShapeInfos(originalShape, settings)
  const translationVector = boundVectorToSingleAxis(
    [cursorPosition[0] - originalCursorPosition[0], cursorPosition[1] - originalCursorPosition[1]],
    singleAxis
  )

  return buildPath(
    {
      ...originalShape,
      points: originalShape.points.map(([x, y]) =>
        settings.gridGap
          ? [
              x + roundForGrid(borders.x + translationVector[0], settings) - borders.x,
              y + roundForGrid(borders.y + translationVector[1], settings) - borders.y
            ]
          : [roundForGrid(x + translationVector[0], settings), roundForGrid(y + translationVector[1], settings)]
      )
    },
    settings
  )
}

export const updateCurveLinesCount = <T extends DrawableShape<'curve'>>(shape: T, newPointsCount: number, settings: UtilsSettings): T => {
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
