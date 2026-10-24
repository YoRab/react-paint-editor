import type { UtilsSettings } from '@canvas/constants/app'
import type { SelectionModeResize } from '@canvas/types/Mode'
import type { DrawableShape, Point, Rect, SelectionType, ShapeEntity } from '@canvas/types/Shapes'
import type { ToolsSettingsType } from '@canvas/types/tools'
import { resizeRectSelection } from '@canvas/utils/selection/rectSelection'
import { addBrushPoint, createBrushPath, expandRect, extendBrushPath, getBrushPointsBounds, getComputedShapeInfos } from '@canvas/utils/shapes/path'
import { getToolDefaultStyle } from '@canvas/utils/tools'
import { roundValues, scalePoint } from '@canvas/utils/transform'
import { createShapeId } from '@canvas/utils/util'
import { type GroupResizeContext, getPositionWithoutGroupRotation, getShapePositionInNewBorder } from './group'

export const getBrushBorder = (brush: DrawableShape<'brush'>, { selectionPadding }: Pick<UtilsSettings, 'selectionPadding'>): Rect => {
  const bounds = getBrushPointsBounds(brush.points)
  const { minX, minY } = bounds

  // the points are scaled from the top left corner, which stays in place: the farthest point stays the farthest one
  const [scaledMaxX, scaledMaxY] = scalePoint([bounds.maxX, bounds.maxY], minX, minY, brush.scaleX, brush.scaleY)
  const maxX = Math.max(minX, scaledMaxX)
  const maxY = Math.max(minY, scaledMaxY)

  const baseRect: Rect = {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }

  return expandRect(baseRect, selectionPadding)
}

const buildPath = <T extends DrawableShape<'brush'>>(
  brush: T & { id: string },
  settings: UtilsSettings,
  path = createBrushPath(brush, settings)
): ShapeEntity<'brush'> => {
  const computed = getComputedShapeInfos(brush, getBrushBorder, settings)
  return {
    ...brush,
    path,
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
      id: createShapeId(shape.type),
      points: [[cursorPosition]],
      scaleX: 1,
      scaleY: 1,
      style: getToolDefaultStyle(shape)
    },
    settings
  )
}

export const drawBrush = (ctx: CanvasRenderingContext2D, shape: ShapeEntity<'brush'>): void => {
  if (shape.points.length < 1) return
  if (ctx.globalAlpha === 0) return
  if (shape.style?.strokeColor === 'transparent' || ctx.globalAlpha === 0) return
  ctx.stroke(shape.path)
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

  const { borderX, borderHeight, borderY, borderWidth, isXinverted, isYinverted } = resizeRectSelection(
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

  const diffX = roundValues(borderX - originalBorders.x) + (isXinverted ? 2 * originalBorders.x + originalBordersWithoutScale.width : 0)
  const diffY = roundValues(borderY - originalBorders.y) + (isYinverted ? 2 * originalBorders.y + originalBordersWithoutScale.height : 0)
  return buildPath(
    {
      ...originalShape,
      points: originalShape.points.map(coord =>
        coord.map(([x, y]) => [isXinverted ? -x + diffX : x + diffX, isYinverted ? -y + diffY : y + diffY] as Point)
      ),
      scaleX,
      scaleY
    },
    settings
  )
}

export const resizeBrushInGroup = (
  shape: ShapeEntity<'brush'>,
  group: SelectionType & { type: 'group' },
  groupCtx: GroupResizeContext
): ShapeEntity<'brush'> => {
  const { isXinverted, isYinverted, settings, widthMultiplier, heightMultiplier } = groupCtx
  const originalBordersWithoutScale = getBrushBorder({ ...shape, scaleX: 1, scaleY: 1 }, settings)
  const originalShapeWidthWithoutScale = originalBordersWithoutScale.width - 2 * settings.selectionPadding
  const originalShapeHeightWithoutScale = originalBordersWithoutScale.height - 2 * settings.selectionPadding
  const scaleX = (shape.scaleX ?? 1) ? (shape.scaleX ?? 1) * widthMultiplier : widthMultiplier / originalShapeWidthWithoutScale
  const scaleY = (shape.scaleY ?? 1) ? (shape.scaleY ?? 1) * heightMultiplier : heightMultiplier / originalShapeHeightWithoutScale
  const newWidth = originalShapeWidthWithoutScale * scaleX
  const newHeight = originalShapeHeightWithoutScale * scaleY

  const pos = getShapePositionInNewBorder(shape, group, groupCtx)
  const newCenter = getPositionWithoutGroupRotation(groupCtx, pos.x, pos.y, newWidth, newHeight)
  const diffX =
    roundValues(newCenter[0] - newWidth / 2 - shape.computed.borders.x - settings.selectionPadding) +
    (isXinverted ? 2 * shape.computed.borders.x + originalBordersWithoutScale.width : 0)
  const diffY =
    roundValues(newCenter[1] - newHeight / 2 - shape.computed.borders.y - settings.selectionPadding) +
    (isYinverted ? 2 * shape.computed.borders.y + originalBordersWithoutScale.height : 0)
  const shouldFlipRotation =
    (isXinverted || isYinverted) && !(isXinverted && isYinverted) && (shape.rotation ?? 0) !== 0 && groupCtx.rotation !== shape.rotation

  return buildPath(
    {
      ...shape,
      points: shape.points.map(coord => coord.map(([x, y]) => [isXinverted ? -x + diffX : x + diffX, isYinverted ? -y + diffY : y + diffY] as Point)),
      scaleX,
      scaleY,
      rotation: shouldFlipRotation ? -(shape.rotation ?? 0) : (shape.rotation ?? 0)
    },
    groupCtx.settings
  )
}

const roundPoint = ([x, y]: Point): Point => [Math.round(x), Math.round(y)]

export const addNewPointToShape = (shape: ShapeEntity<'brush'>, cursorPosition: Point, settings: UtilsSettings): ShapeEntity<'brush'> => {
  const point = roundPoint(cursorPosition)
  const brushShape = { ...shape, points: addBrushPoint(shape.points, shape.points.length - 1, point) }
  return buildPath(brushShape, settings, extendBrushPath(shape, point, settings))
}

export const addNewPointGroupToShape = (shape: ShapeEntity<'brush'>, cursorPosition: Point, settings: UtilsSettings): ShapeEntity<'brush'> =>
  buildPath({ ...shape, points: addBrushPoint(shape.points, shape.points.length, roundPoint(cursorPosition)) }, settings)
