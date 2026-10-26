import type { UtilsSettings } from '@canvas/constants/app'
import type { SelectionModeResize } from '@canvas/types/Mode'
import type { DrawableShape, Point, Rect, ShapeEntity } from '@canvas/types/Shapes'
import type { ToolsSettingsType } from '@canvas/types/tools'
import { drawPathWithFillAndStroke } from '@canvas/utils/fill'
import { getPointPositionAfterCanvasTransformation } from '@canvas/utils/intersect'
import { set } from '@canvas/utils/object'
import { addCurveArrowHeads, drawArrowHeads, withArrowHeadsOuterBorder } from '@canvas/utils/shapes/arrow'
import {
  type BezierSegment,
  createCurvePath,
  getComputedShapeInfos,
  getCubicBezierBounds,
  getCurveSegments,
  getDefaultOuterBorder,
  getDrawnPoints,
  isClosedPath
} from '@canvas/utils/shapes/path'
import { getRectBorder } from '@canvas/utils/shapes/rectangle'
import { getToolDefaultStyle } from '@canvas/utils/tools'
import { roundForGrid } from '@canvas/utils/transform'
import { createShapeId } from '@canvas/utils/util'
import { getPolygonBorder } from './polygon'

/** Borders of the drawn curve, of its segments or of its single point, with the selection padding */
const getCurveBorder = (segments: BezierSegment[], points: Point[], settings: Pick<UtilsSettings, 'selectionPadding'>): Rect => {
  if (!segments.length) {
    const [x, y] = points[0] ?? [0, 0]
    return getRectBorder({ x, y, width: 0, height: 0 }, settings)
  }

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const segment of segments) {
    const bounds = getCubicBezierBounds(...segment)
    minX = Math.min(minX, bounds.minX)
    maxX = Math.max(maxX, bounds.maxX)
    minY = Math.min(minY, bounds.minY)
    maxY = Math.max(maxY, bounds.maxY)
  }

  return getRectBorder({ x: minX, y: minY, width: maxX - minX, height: maxY - minY }, settings)
}

const buildPath = <T extends DrawableShape<'curve'>>(shape: T & { id: string }, settings: UtilsSettings): ShapeEntity<'curve'> => {
  const points = getDrawnPoints(shape)
  const isClosed = isClosedPath(shape, points)
  const segments = getCurveSegments(shape, points)
  const { segments: strokeSegments, arrows, bounds } = addCurveArrowHeads(shape.style, segments, isClosed)
  // the outer borders hold the drawn curve, which goes beyond its points, and its stroke
  const outerBorders = getDefaultOuterBorder(shape, getCurveBorder(segments, points, settings))
  return {
    ...shape,
    path: createCurvePath(strokeSegments, isClosed),
    arrows,
    computed: getComputedShapeInfos(
      shape,
      getPolygonBorder,
      settings,
      withArrowHeadsOuterBorder(() => outerBorders, bounds)
    )
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
      id: createShapeId(shape.type),
      points: [cursorPosition],
      style: getToolDefaultStyle(shape)
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
  drawPathWithFillAndStroke(ctx, curve)
  drawArrowHeads(ctx, curve.arrows)
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

export const removeCurvePoint = (shape: ShapeEntity<'curve'>, pointIndex: number, settings: UtilsSettings): ShapeEntity<'curve'> => {
  if (pointIndex < 0 || pointIndex > shape.points.length - 1) return shape

  const updatedShape = {
    ...shape,
    points: shape.points.filter((_, index) => index !== pointIndex)
  }
  return buildPath(updatedShape, settings)
}
