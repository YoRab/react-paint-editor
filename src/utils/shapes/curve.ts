import { GridFormatType } from 'constants/app'
import _ from 'lodash/fp'
import { SelectionModeResize } from 'types/Mode'
import type { Point, DrawableShape, ShapeEntity, SelectionLinesType } from 'types/Shapes'
import type { ToolsSettingsType } from 'types/tools'
import { getPointPositionAfterCanvasTransformation } from 'utils/intersect'
import { roundForGrid } from 'utils/transform'
import { getShapeInfos } from 'utils/shapes/index'
import { getPolygonBorder } from './polygon'
import { createRecPath } from './rectangle'
import { createCirclePath } from './circle'
import { SELECTION_ANCHOR_SIZE } from 'constants/shapes'

const createCurvePath = (curve: DrawableShape<'curve'>) => {
  if (curve.points.length < 3) return undefined

  const path = new Path2D()

  path.moveTo(...curve.points[0])
  for (let i = 1; i < curve.points.length - 1; i++) {
    path.quadraticCurveTo(
      ...curve.points[i],
      curve.points.length - 2 === i
        ? curve.points[i + 1][0]
        : (curve.points[i + 1][0] - curve.points[i][0]) / 2 + curve.points[i][0],
      curve.points.length - 2 === i
        ? curve.points[i + 1][1]
        : (curve.points[i + 1][1] - curve.points[i][1]) / 2 + curve.points[i][1]
    )
  }

  return path
}

const createCurveSelectionPath = (
  shape: DrawableShape<'curve'>,
  currentScale: number
): SelectionLinesType => {
  const { borders } = getShapeInfos(shape, 0)

  return {
    border: createRecPath(borders),
    anchors: [
      ...shape.points.map((point, i) => {
        if (i > 0 && i < shape.points.length - 1) {
          return createRecPath({
            x: point[0] - SELECTION_ANCHOR_SIZE / 2,
            y: point[1] - SELECTION_ANCHOR_SIZE / 2,
            width: SELECTION_ANCHOR_SIZE / currentScale,
            height: SELECTION_ANCHOR_SIZE / currentScale
          })
        } else {
          return createCirclePath({
            x: point[0],
            y: point[1],
            radius: SELECTION_ANCHOR_SIZE / 2 / currentScale
          })
        }
      })
    ]
  }
}

const buildPath = <T extends DrawableShape<'curve'>>(shape: T, currentScale: number): T => {
  return {
    ...shape,
    path: createCurvePath(shape),
    selection: createCurveSelectionPath(shape, currentScale)
  }
}

export const createCurve = (
  shape: {
    id: string
    type: 'curve'
    settings: ToolsSettingsType<'curve'>
  },
  cursorPosition: Point,
  currentScale: number
): ShapeEntity<'curve'> => {
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
    currentScale
  )
}

export const resizeCurve = (
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableShape<'curve'>,
  selectionMode: SelectionModeResize<number>,
  selectionPadding: number,
  currentScale: number
): DrawableShape<'curve'> => {
  const { center } = getShapeInfos(originalShape, selectionPadding)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    originalShape.rotation,
    center,
    canvasOffset
  )
  const updatedShape = _.set(
    ['points', selectionMode.anchor],
    cursorPositionBeforeResize,
    originalShape
  )

  return buildPath(updatedShape, currentScale)
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
  gridFormat: GridFormatType,
  currentScale: number
) => {
  const { borders } = getShapeInfos(originalShape, 0)

  return buildPath(
    {
      ...originalShape,
      points: originalShape.points.map(([x, y]) =>
        gridFormat
          ? [
              x +
                roundForGrid(
                  borders.x + cursorPosition[0] - originalCursorPosition[0],
                  gridFormat
                ) -
                borders.x,
              y +
                roundForGrid(
                  borders.y + cursorPosition[1] - originalCursorPosition[1],
                  gridFormat
                ) -
                borders.y
            ]
          : [
              roundForGrid(x + cursorPosition[0] - originalCursorPosition[0], gridFormat),
              roundForGrid(y + cursorPosition[1] - originalCursorPosition[1], gridFormat)
            ]
      )
    },
    currentScale
  )
}
