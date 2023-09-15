import { GridFormatType } from '../../constants/app'
import { SELECTION_ANCHOR_SIZE } from '../../constants/shapes'
import _ from 'lodash/fp'
import { SelectionModeResize } from '../../types/Mode'
import type {
  Point,
  DrawableShape,
  Polygon,
  Rect,
  ShapeEntity,
  SelectionLinesType
} from '../../types/Shapes'
import type { ToolsSettingsType } from '../../types/tools'
import { getPointPositionAfterCanvasTransformation } from '../../utils/intersect'
import { roundForGrid } from '../../utils/transform'
import { getShapeInfos } from '.'
import { createCirclePath } from './circle'
import { createRecPath } from './rectangle'

const createPloygonPath = (polygon: DrawableShape<'polygon'>) => {
  if (polygon.points.length < 1) return undefined

  const path = new Path2D()

  path.moveTo(...polygon.points[0])
  polygon.points.slice(1).forEach(point => {
    path.lineTo(...point)
  })
  path.lineTo(...polygon.points[0])

  return path
}

const createPolygonSelectionPath = (
  shape: DrawableShape<'polygon'>,
  currentScale: number,
  selectionPadding: number
): SelectionLinesType => {
  const { borders } = getShapeInfos(shape, selectionPadding)

  return {
    border: createRecPath(borders),
    anchors: [
      ...shape.points.map(point => {
        return createCirclePath({
          x: point[0],
          y: point[1],
          radius: SELECTION_ANCHOR_SIZE / 2 / currentScale
        })
      })
    ]
  }
}

const buildPath = <T extends DrawableShape<'polygon'>>(
  shape: T,
  currentScale: number,
  selectionPadding: number
): T => {
  return {
    ...shape,
    path: createPloygonPath(shape),
    selection: createPolygonSelectionPath(shape, currentScale, selectionPadding)
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
  currentScale: number,
  selectionPadding: number
): ShapeEntity<'polygon'> => {
  return buildPath(
    {
      toolId: shape.id,
      type: shape.type,
      id: _.uniqueId(`${shape.type}_`),
      points: _.flow(
        _.range(0),
        _.map(() => cursorPosition)
      )(shape.settings.pointsCount.default),
      rotation: 0,
      style: {
        globalAlpha: shape.settings.opacity.default,
        fillColor: shape.settings.fillColor.default,
        strokeColor: shape.settings.strokeColor.default,
        lineWidth: shape.settings.lineWidth.default,
        lineDash: shape.settings.lineDash.default,
        pointsCount: shape.settings.pointsCount.default
      }
    },
    currentScale,
    selectionPadding
  )
}

export const drawPolygon = (
  ctx: CanvasRenderingContext2D,
  polygon: DrawableShape<'polygon'>
): void => {
  if (!polygon.path) return
  if (ctx.globalAlpha === 0) return
  polygon.style?.fillColor !== 'transparent' && ctx.fill(polygon.path)
  polygon.style?.strokeColor !== 'transparent' && ctx.stroke(polygon.path)
}

export const getPolygonBorder = (polygon: Polygon, selectionPadding: number): Rect => {
  const minX: number = _.flow(
    _.map((point: Point) => point[0]),
    _.min,
    _.add(-selectionPadding)
  )(polygon.points)
  const maxX: number = _.flow(
    _.map((point: Point) => point[0]),
    _.max,
    _.add(selectionPadding)
  )(polygon.points)
  const minY: number = _.flow(
    _.map((point: Point) => point[1]),
    _.min,
    _.add(-selectionPadding)
  )(polygon.points)
  const maxY: number = _.flow(
    _.map((point: Point) => point[1]),
    _.max,
    _.add(selectionPadding)
  )(polygon.points)

  return { x: minX, width: maxX - minX, y: minY, height: maxY - minY }
}

export const translatePolygon = <U extends DrawableShape<'polygon'>>(
  cursorPosition: Point,
  originalShape: U,
  originalCursorPosition: Point,
  gridFormat: GridFormatType,
  currentScale: number,
  selectionPadding: number
) => {
  if (gridFormat) {
    const { borders } = getShapeInfos(originalShape, selectionPadding)
    const translationX =
      roundForGrid(borders.x + cursorPosition[0] - originalCursorPosition[0], gridFormat) -
      borders.x
    const translationY =
      roundForGrid(borders.y + cursorPosition[1] - originalCursorPosition[1], gridFormat) -
      borders.y
    return {
      ...originalShape,
      points: originalShape.points.map(([x, y]) => [x + translationX, y + translationY])
    }
  } else {
    return buildPath(
      {
        ...originalShape,
        points: originalShape.points.map(([x, y]) => [
          roundForGrid(x + cursorPosition[0] - originalCursorPosition[0], gridFormat),
          roundForGrid(y + cursorPosition[1] - originalCursorPosition[1], gridFormat)
        ]) as Point[]
      },
      currentScale,
      selectionPadding
    )
  }
}

export const resizePolygon = (
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableShape<'polygon'>,
  selectionMode: SelectionModeResize<number>,
  gridFormat: GridFormatType,
  selectionPadding: number,
  currentScale: number
): DrawableShape<'polygon'> => {

  const roundCursorPosition: Point = [
    roundForGrid(cursorPosition[0], gridFormat),
    roundForGrid(cursorPosition[1], gridFormat)
  ]

  const { center } = getShapeInfos(originalShape, selectionPadding)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    roundCursorPosition,
    originalShape.rotation,
    center,
    canvasOffset
  )
  const updatedShape = _.set(
    ['points', selectionMode.anchor],
    cursorPositionBeforeResize,
    originalShape
  )

  return buildPath(updatedShape, currentScale, selectionPadding)
}

export const updatePolygonLinesCount = <T extends DrawableShape<'polygon'>>(
  shape: T,
  newPointsCount: number,
  currentScale: number,
  selectionPadding: number
) => {
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
      currentScale,
      selectionPadding
    )
  } else {
    //TODO : better distribution for new points
    const nbPointsToAdd = newPointsCount - currentPointsCount
    const newPoints = _.flow(
      _.range(0),
      _.map(index => [
        shape.points[0][0] +
        ((shape.points[1][0] - shape.points[0][0]) * (index + 1)) / (nbPointsToAdd + 1),
        shape.points[0][1] +
        ((shape.points[1][1] - shape.points[0][1]) * (index + 1)) / (nbPointsToAdd + 1)
      ])
    )(nbPointsToAdd) as Point[]
    const totalPoints = [
      shape.points[0],
      ...newPoints,
      ...shape.points.slice(1, shape.points.length)
    ]

    return buildPath(
      {
        ...shape,
        points: totalPoints,
        style: {
          ...shape.style,
          pointsCount: totalPoints.length
        }
      },
      currentScale,
      selectionPadding
    )
  }
}
