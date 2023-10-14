import { GridFormatType } from '../../constants/app'
import _ from 'lodash/fp'
import { SelectionModeResize } from '../../types/Mode'
import type {
  Point,
  Brush,
  Rect,
  DrawableShape,
  ShapeEntity
} from '../../types/Shapes'
import type { ToolsSettingsType } from '../../types/tools'
import { roundForGrid } from '../../utils/transform'
import { getShapeInfos } from '../../utils/shapes/index'
import { createRecSelectionPath, resizeRectSelection } from '../../utils/selection/rectSelection'

const createBrushPath = (brush: DrawableShape<'brush'>) => {
  if (brush.points.length < 1 || brush.style?.strokeColor === 'transparent') return undefined

  const path = new Path2D()

  brush.points.forEach(points => {
    if (points.length === 1) {
      path.rect(points[0][0], points[0][1], 1, 1)
    } else {
      path.moveTo(...points[0])
      points.slice(1).forEach(point => {
        path.lineTo(...point)
      })
    }
  })

  return path
}

const buildPath = <T extends DrawableShape<'brush'>>(
  brush: T,
  currentScale: number,
  selectionPadding: number
): T => {
  return {
    ...brush,
    path: createBrushPath(brush),
    selection: createRecSelectionPath(brush, currentScale, selectionPadding)
  }
}

export const refreshBrush = buildPath

export const createBrush = (
  shape: {
    id: string
    type: 'brush'
    settings: ToolsSettingsType<'brush'>
  },
  cursorPosition: Point,
  currentScale: number,
  selectionPadding: number
): ShapeEntity<'brush'> => {
  return buildPath(
    {
      toolId: shape.id,
      type: shape.type,
      id: _.uniqueId(`${shape.type}_`),
      points: [[cursorPosition]],
      rotation: 0,
      style: {
        globalAlpha: shape.settings.opacity.default,
        strokeColor: shape.settings.strokeColor.default,
        lineWidth: shape.settings.lineWidth.default,
        lineDash: shape.settings.lineDash.default
      }
    },
    currentScale,
    selectionPadding
  )
}

export const drawBrush = (ctx: CanvasRenderingContext2D, shape: DrawableShape<'brush'>): void => {
  if (shape.points.length < 1 || !shape.path) return
  if (ctx.globalAlpha === 0) return
  if (shape.style?.strokeColor === 'transparent' || ctx.globalAlpha === 0) return
  ctx.stroke(shape.path)
}

export const getBrushBorder = (brush: Brush, selectionPadding: number): Rect => {
  const brushPoints = _.flatMap(points => points, brush.points)
  const minX: number = _.flow(
    _.map((point: Point) => point[0]),
    _.min,
    _.add(-selectionPadding)
  )(brushPoints)
  const maxX: number = _.flow(
    _.map((point: Point) => point[0]),
    _.max,
    _.add(selectionPadding)
  )(brushPoints)
  const minY: number = _.flow(
    _.map((point: Point) => point[1]),
    _.min,
    _.add(-selectionPadding)
  )(brushPoints)
  const maxY: number = _.flow(
    _.map((point: Point) => point[1]),
    _.max,
    _.add(selectionPadding)
  )(brushPoints)

  return { x: minX, width: maxX - minX, y: minY, height: maxY - minY }
}

export const translateBrush = <U extends DrawableShape<'brush'>>(
  cursorPosition: Point,
  originalShape: U,
  originalCursorPosition: Point,
  gridFormat: GridFormatType,
  currentScale: number,
  selectionPadding: number
) => {
  const { borders } = getShapeInfos(originalShape, selectionPadding)
  const translationX = gridFormat
    ? roundForGrid(borders.x + cursorPosition[0] - originalCursorPosition[0], gridFormat) -
    borders.x
    : cursorPosition[0] - originalCursorPosition[0]
  const translationY = gridFormat
    ? roundForGrid(borders.y + cursorPosition[1] - originalCursorPosition[1], gridFormat) -
    borders.y
    : cursorPosition[1] - originalCursorPosition[1]
  return buildPath(
    {
      ...originalShape,
      points: originalShape.points.map(coord =>
        coord.map(([x, y]) => [x + translationX, y + translationY])
      ) as Point[][]
    },
    currentScale,
    selectionPadding
  )
}

export const resizeBrush = (
  cursorPosition: Point,
  originalShape: DrawableShape<'brush'>,
  selectionMode: SelectionModeResize,
  gridFormat: GridFormatType,
  selectionPadding: number,
  currentScale: number,
  keepRatio: boolean
): DrawableShape<'brush'> => {
  const { borders: originalBorders } = getShapeInfos(originalShape, selectionPadding)

  const { borderX, borderHeight, borderY, borderWidth } = resizeRectSelection(
    cursorPosition,
    originalShape,
    selectionMode,
    gridFormat,
    selectionPadding,
    keepRatio
  )

  const originalShapeWidth = Math.max(0, originalBorders.width - 2 * selectionPadding)
  const originalShapeHeight = Math.max(0, originalBorders.height - 2 * selectionPadding)
  const shapeWidth = Math.max(0, borderWidth - 2 * selectionPadding)
  const shapeHeight = Math.max(0, borderHeight - 2 * selectionPadding)

  return buildPath(
    {
      ...originalShape,
      points: originalShape.points.map(coord =>
        coord.map(([x, y]) => [
          borderX +
          selectionPadding +
          ((x - originalBorders.x - selectionPadding) / originalShapeWidth) * shapeWidth,
          borderY +
          selectionPadding +
          ((y - originalBorders.y - selectionPadding) / originalShapeHeight) * shapeHeight
        ])
      )
    },
    currentScale,
    selectionPadding
  )
}

export const addNewPointToShape = <T extends DrawableShape<'brush'>>(
  shape: T,
  cursorPosition: Point,
  currentScale: number,
  selectionPadding: number
) => {
  const brushShape = {
    ...shape,
    ...{
      points: _.set(
        shape.points.length - 1,
        [
          ...shape.points[shape.points.length - 1],
          [Math.round(cursorPosition[0]), Math.round(cursorPosition[1])]
        ],
        shape.points
      )
    }
  }
  return buildPath(brushShape, currentScale, selectionPadding)
}

export const addNewPointGroupToShape = <T extends DrawableShape<'brush'>>(
  shape: T,
  cursorPosition: Point,
  currentScale: number,
  selectionPadding: number
): T => {
  const brushShape = {
    ...shape,
    ...{
      points: _.set(
        shape.points.length,
        [[Math.round(cursorPosition[0]), Math.round(cursorPosition[1])]],
        shape.points
      )
    }
  }
  return buildPath(brushShape, currentScale, selectionPadding)
}
