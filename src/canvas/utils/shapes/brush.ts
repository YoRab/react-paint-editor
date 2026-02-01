import type { UtilsSettings } from '@canvas/constants/app'
import { createRecSelectionPath, resizeRectSelection } from '@canvas/utils/selection/rectSelection'
import { createBrushPath, getComputedShapeInfos } from '@canvas/utils/shapes/path'
import { boundVectorToSingleAxis, roundForGrid, roundValues, scalePoint } from '@canvas/utils/transform'
import type { SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Point, Rect, ShapeEntity } from '@common/types/Shapes'
import type { ToolsSettingsType } from '@common/types/tools'
import { set } from '@common/utils/object'
import { uniqueId } from '@common/utils/util'

const getBrushBorder = (brush: DrawableShape<'brush'>, { selectionPadding }: Pick<UtilsSettings, 'selectionPadding'>): Rect => {
  const brushPoints = brush.points.flat()
  const minX = Math.min(...brushPoints.map(point => point[0]))
  const minY = Math.min(...brushPoints.map(point => point[1]))

  const scaledPoints = brushPoints.map(point => scalePoint(point, minX, minY, brush.scaleX, brush.scaleY))

  const maxX = Math.max(...scaledPoints.map(point => point[0])) + selectionPadding
  const maxY = Math.max(...scaledPoints.map(point => point[1])) + selectionPadding

  return {
    x: minX - selectionPadding,
    width: maxX - minX + selectionPadding,
    y: minY - selectionPadding,
    height: maxY - minY + selectionPadding
  }
}

export const getComputedBrush = (brush: DrawableShape<'brush'>, settings: UtilsSettings) => {
  return getComputedShapeInfos(brush, getBrushBorder, settings)
}

const buildPath = <T extends DrawableShape<'brush'>>(brush: T & { id: string }, settings: UtilsSettings): ShapeEntity<'brush'> => {
  const path = createBrushPath(brush, settings)
  const computed = getComputedBrush(brush, settings)
  return {
    ...brush,
    path,
    selection: createRecSelectionPath(path, computed, settings),
    computed
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
  settings: UtilsSettings
): ShapeEntity<'brush'> => {
  return buildPath(
    {
      toolId: shape.id,
      type: shape.type,
      id: uniqueId(`${shape.type}_`),
      points: [[cursorPosition]],
      scaleX: 1,
      scaleY: 1,
      style: {
        opacity: shape.settings.opacity.default,
        strokeColor: shape.settings.strokeColor.default,
        lineWidth: shape.settings.lineWidth.default,
        lineDash: shape.settings.lineDash.default
      }
    },
    settings
  )
}

export const drawBrush = (ctx: CanvasRenderingContext2D, shape: ShapeEntity<'brush'>): void => {
  if (shape.points.length < 1 || !shape.path) return
  if (ctx.globalAlpha === 0) return
  if (shape.style?.strokeColor === 'transparent' || ctx.globalAlpha === 0) return
  ctx.stroke(shape.path)
}

export const translateBrush = (
  cursorPosition: Point,
  originalShape: ShapeEntity<'brush'>,
  originalCursorPosition: Point,
  settings: UtilsSettings,
  singleAxis: boolean
) => {
  const originalBorders = originalShape.computed.borders
  const translationVector = boundVectorToSingleAxis(
    [cursorPosition[0] - originalCursorPosition[0], cursorPosition[1] - originalCursorPosition[1]],
    singleAxis
  )
  const translationX = settings.gridGap ? roundForGrid(originalBorders.x + translationVector[0], settings) - originalBorders.x : translationVector[0]
  const translationY = settings.gridGap ? roundForGrid(originalBorders.y + translationVector[1], settings) - originalBorders.y : translationVector[1]
  return buildPath(
    {
      ...originalShape,
      points: originalShape.points.map(coord => coord.map(([x, y]) => [x + translationX, y + translationY])) as Point[][]
    },
    settings
  )
}

export const resizeBrush = (
  cursorPosition: Point,
  originalShape: ShapeEntity<'brush'>,
  selectionMode: SelectionModeResize,
  settings: UtilsSettings,
  keepRatio: boolean,
  resizeFromCenter: boolean
): ShapeEntity<'brush'> => {
  const originalBordersWithoutScale = getBrushBorder({ ...originalShape, scaleX: 1, scaleY: 1 }, settings)
  const originalBorders = originalShape.computed.borders

  const { borderX, borderHeight, borderY, borderWidth } = resizeRectSelection(
    cursorPosition,
    originalShape,
    selectionMode,
    settings,
    keepRatio,
    resizeFromCenter
  )

  const originalShapeWidth = Math.max(0, originalBordersWithoutScale.width - 2 * settings.selectionPadding)
  const originalShapeHeight = Math.max(0, originalBordersWithoutScale.height - 2 * settings.selectionPadding)
  const shapeWidth = Math.max(0, borderWidth - 2 * settings.selectionPadding)
  const shapeHeight = Math.max(0, borderHeight - 2 * settings.selectionPadding)

  const scaleX = originalShapeWidth ? shapeWidth / originalShapeWidth : 1
  const scaleY = originalShapeHeight ? shapeHeight / originalShapeHeight : 1

  if (!originalShapeWidth || !originalShapeHeight) return originalShape

  const diffX = roundValues(borderX - originalBorders.x)
  const diffY = roundValues(borderY - originalBorders.y)
  return buildPath(
    {
      ...originalShape,
      points: originalShape.points.map(coord => coord.map(([x, y]) => [x + diffX, y + diffY])),
      scaleX,
      scaleY
    },
    settings
  )
}

export const addNewPointToShape = (shape: ShapeEntity<'brush'>, cursorPosition: Point, settings: UtilsSettings): ShapeEntity<'brush'> => {
  const brushShape = {
    ...shape,
    ...{
      points: set(
        shape.points.length - 1,
        [...shape.points[shape.points.length - 1]!, [Math.round(cursorPosition[0]), Math.round(cursorPosition[1])]],
        shape.points
      )
    }
  }
  return buildPath(brushShape, settings)
}

export const addNewPointGroupToShape = (shape: ShapeEntity<'brush'>, cursorPosition: Point, settings: UtilsSettings): ShapeEntity<'brush'> => {
  const brushShape = {
    ...shape,
    ...{
      points: set(shape.points.length, [[Math.round(cursorPosition[0]), Math.round(cursorPosition[1])]], shape.points)
    }
  }
  return buildPath(brushShape, settings)
}
