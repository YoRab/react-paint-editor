import type { UtilsSettings } from '@canvas/constants/app'
import { getPointPositionAfterCanvasTransformation } from '@canvas/utils/intersect'
import { createLineSelectionPath } from '@canvas/utils/selection/lineSelection'
import { catmullRomToBezier, createCurvePath, getCatmullRomPoints, getComputedShapeInfos, getCubicBezierBounds } from '@canvas/utils/shapes/path'
import { boundVectorToSingleAxis, roundForGrid } from '@canvas/utils/transform'
import type { SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Point, Rect, ShapeEntity } from '@common/types/Shapes'
import type { ToolsSettingsType } from '@common/types/tools'
import { set } from '@common/utils/object'
import { uniqueId } from '@common/utils/util'
import { getPolygonBorder } from './polygon'
import { getRectBorder } from '@canvas/utils/shapes/rectangle'

const getCurveBorder = (curve: DrawableShape<'curve'>, settings: Pick<UtilsSettings, 'selectionPadding'>): Rect => {
  const points = curve.tempPoint ? [...curve.points, curve.tempPoint] : curve.points
  if (points.length < 2) {
    const single = points[0] ?? ([0, 0] as Point)
    const p = settings.selectionPadding
    return { x: single[0] - p, y: single[1] - p, width: 2 * p, height: 2 * p }
  }
  if (points.length < 3) {
    return getPolygonBorder({ ...curve, points } as Parameters<typeof getPolygonBorder>[0], settings)
  }

  const pts = getCatmullRomPoints(curve, points)
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[i + 2]!

    const { cp1, cp2 } = catmullRomToBezier(p0, p1, p2, p3)

    const bounds = getCubicBezierBounds(p1, cp1, cp2, p2)
    minX = Math.min(minX, bounds.minX)
    maxX = Math.max(maxX, bounds.maxX)
    minY = Math.min(minY, bounds.minY)
    maxY = Math.max(maxY, bounds.maxY)
  }

  return getRectBorder({ x: minX, y: minY, width: maxX - minX, height: maxY - minY }, settings)
}

export const getComputedCurve = (curve: DrawableShape<'curve'>, settings: UtilsSettings) => {
  return getComputedShapeInfos(curve, getCurveBorder, settings)
}

const buildPath = <T extends DrawableShape<'curve'>>(shape: T & { id: string }, settings: UtilsSettings): ShapeEntity<'curve'> => {
  const path = createCurvePath(shape)
  const computed = getComputedCurve(shape, settings)
  return {
    ...shape,
    path,
    selection: createLineSelectionPath(path, shape, computed, settings),
    computed
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

export const resizeCurve = (
  cursorPosition: Point,
  originalShape: ShapeEntity<'curve'>,
  selectionMode: SelectionModeResize<number>,
  settings: UtilsSettings
): ShapeEntity<'curve'> => {
  const roundCursorPosition: Point = [roundForGrid(cursorPosition[0], settings), roundForGrid(cursorPosition[1], settings)]

  const originalCenter = originalShape.computed.center

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(roundCursorPosition, originalShape.rotation ?? 0, originalCenter)
  const updatedShape = set(['points', selectionMode.anchor], cursorPositionBeforeResize, originalShape)

  return buildPath(updatedShape, settings)
}

export const drawCurve = (ctx: CanvasRenderingContext2D, curve: ShapeEntity<'curve'>): void => {
  if (!curve.path) return
  if (ctx.globalAlpha === 0) return
  curve.style?.fillColor !== 'transparent' && ctx.fill(curve.path)
  curve.style?.strokeColor !== 'transparent' && ctx.stroke(curve.path)
}

export const translateCurve = (
  cursorPosition: Point,
  originalShape: ShapeEntity<'curve'>,
  originalCursorPosition: Point,
  settings: UtilsSettings,
  singleAxis: boolean
) => {
  const originalBorders = originalShape.computed.borders
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
              x + roundForGrid(originalBorders.x + translationVector[0], settings) - originalBorders.x,
              y + roundForGrid(originalBorders.y + translationVector[1], settings) - originalBorders.y
            ]
          : [roundForGrid(x + translationVector[0], settings), roundForGrid(y + translationVector[1], settings)]
      )
    },
    settings
  )
}

export const addCurveLine = (
  shape: ShapeEntity<'curve'>,
  lineIndex: number,
  cursorPosition: Point,
  settings: UtilsSettings
): ShapeEntity<'curve'> => {
  if (lineIndex < 0 || lineIndex > shape.points.length - 1) return shape

  const totalPoints: Point[] = [...shape.points.slice(0, lineIndex + 1), cursorPosition, ...shape.points.slice(lineIndex + 1)]

  return buildPath(
    {
      ...shape,
      points: totalPoints
    },
    settings
  )
}

export const addCurvePoint = (
  shape: ShapeEntity<'curve'>,
  cursorPosition: Point,
  settings: UtilsSettings,
  temporary = false
): ShapeEntity<'curve'> => {
  const roundCursorPosition: Point = [roundForGrid(cursorPosition[0], settings), roundForGrid(cursorPosition[1], settings)]

  const originalCenter = shape.computed.center

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(roundCursorPosition, shape.rotation ?? 0, originalCenter)
  const updatedShape = {
    ...shape,
    points: temporary ? shape.points : [...shape.points, cursorPositionBeforeResize],
    tempPoint: temporary ? cursorPositionBeforeResize : undefined
  }
  return buildPath(updatedShape, settings)
}
