import type { UtilsSettings } from '@canvas/constants/app'
import type { SelectionModeResize } from '@canvas/types/Mode'
import type { Point, Rect, SelectionType, ShapeEntity, ShapesFrame } from '@canvas/types/Shapes'
import { resizeRectSelection } from '@canvas/utils/selection/rectSelection'
import { rotatePoint } from '@canvas/utils/trigo'

/** Shared context when resizing shapes inside a group */
export type GroupResizeContext = {
  newBorderX: number
  newBorderY: number
  newBorderWidth: number
  newBorderHeight: number
  widthMultiplier: number
  heightMultiplier: number
  isXinverted: boolean
  isYinverted: boolean
  /** Center of the new borders, around which the shapes are turned back */
  groupCenter: Point
  /** Center of the borders before the resize, around which the shapes are placed in the frame */
  originalCenter: Point
  /** Rotation of the frame in which the shapes are resized */
  rotation: number
  settings: UtilsSettings
  originalBorders: { x: number; y: number; width: number; height: number }
}

/** Context to resize the shapes of a group (or a single shape) so that the borders of the group become the new ones */
export const buildGroupResizeContext = (
  group: ShapesFrame,
  newBorders: Rect,
  settings: UtilsSettings,
  {
    isXinverted = false,
    isYinverted = false,
    rotation = group.rotation ?? 0
  }: { isXinverted?: boolean; isYinverted?: boolean; rotation?: number } = {}
): GroupResizeContext => {
  const { borders, center } = group.computed
  const widthMultiplier = (newBorders.width - 2 * settings.selectionPadding) / (borders.width - 2 * settings.selectionPadding || 1)
  const heightMultiplier = (newBorders.height - 2 * settings.selectionPadding) / (borders.height - 2 * settings.selectionPadding || 1)

  return {
    newBorderX: newBorders.x,
    newBorderY: newBorders.y,
    newBorderWidth: newBorders.width,
    newBorderHeight: newBorders.height,
    widthMultiplier,
    heightMultiplier,
    isXinverted,
    isYinverted,
    groupCenter: [newBorders.x + newBorders.width / 2, newBorders.y + newBorders.height / 2],
    originalCenter: center,
    rotation,
    settings,
    originalBorders: borders
  }
}

export const getGroupResizeContext = (
  cursorPosition: Point,
  group: SelectionType,
  selectionMode: SelectionModeResize,
  settings: UtilsSettings,
  keepRatio: boolean,
  isAltPressed: boolean
): GroupResizeContext => {
  const { borderX, borderHeight, borderY, borderWidth, isXinverted, isYinverted } = resizeRectSelection(
    cursorPosition,
    group,
    selectionMode,
    settings,
    keepRatio,
    isAltPressed
  )
  return buildGroupResizeContext(group, { x: borderX, y: borderY, width: borderWidth, height: borderHeight }, settings, { isXinverted, isYinverted })
}

export const getShapePositionInNewBorder = (shape: ShapeEntity, ctx: GroupResizeContext): { x: number; y: number } => {
  const shapeCenterWithNoRotation = rotatePoint({
    origin: ctx.originalCenter,
    point: shape.computed.center,
    rotation: ctx.rotation
  })

  const xOffsetInGroup =
    (shapeCenterWithNoRotation[0] -
      (shape.computed.borders.width / 2 - ctx.settings.selectionPadding) -
      (ctx.originalBorders.x + ctx.settings.selectionPadding)) *
    ctx.widthMultiplier
  const yOffsetInGroup =
    (shapeCenterWithNoRotation[1] -
      (shape.computed.borders.height / 2 - ctx.settings.selectionPadding) -
      (ctx.originalBorders.y + ctx.settings.selectionPadding)) *
    ctx.heightMultiplier

  const x =
    ctx.newBorderX +
    ctx.settings.selectionPadding +
    (ctx.isXinverted
      ? ctx.newBorderWidth -
        2 * ctx.settings.selectionPadding -
        (shape.computed.borders.width - 2 * ctx.settings.selectionPadding || 1) * ctx.widthMultiplier -
        xOffsetInGroup
      : xOffsetInGroup)
  const y =
    ctx.newBorderY +
    ctx.settings.selectionPadding +
    (ctx.isYinverted
      ? ctx.newBorderHeight -
        2 * ctx.settings.selectionPadding -
        (shape.computed.borders.height - 2 * ctx.settings.selectionPadding || 1) * ctx.heightMultiplier -
        yOffsetInGroup
      : yOffsetInGroup)

  return { x, y }
}

export const getPositionWithoutGroupRotation = (
  ctx: GroupResizeContext,
  positionInBorderX: number,
  positionInBorderY: number,
  sizeInBorderW: number,
  sizeInBorderH: number
): Point =>
  rotatePoint({
    origin: ctx.groupCenter,
    point: [positionInBorderX + sizeInBorderW / 2, positionInBorderY + sizeInBorderH / 2],
    rotation: -ctx.rotation
  })

/**
 * Position of a point of a shape once its group is resized: it is placed in the frame of the group, turned like it, as
 * a shape without size. A line, a polygon or a curve is stretched along the sides of the frame, even when it is turned
 */
export const getPointPositionInNewBorder = (point: Point, ctx: GroupResizeContext): Point => {
  const { selectionPadding } = ctx.settings
  const [x, y] = rotatePoint({ origin: ctx.originalCenter, point, rotation: ctx.rotation })
  const xInBorder = (x - ctx.originalBorders.x - selectionPadding) * ctx.widthMultiplier
  const yInBorder = (y - ctx.originalBorders.y - selectionPadding) * ctx.heightMultiplier
  const newPoint: Point = [
    ctx.newBorderX + selectionPadding + (ctx.isXinverted ? ctx.newBorderWidth - 2 * selectionPadding - xInBorder : xInBorder),
    ctx.newBorderY + selectionPadding + (ctx.isYinverted ? ctx.newBorderHeight - 2 * selectionPadding - yInBorder : yInBorder)
  ]
  return rotatePoint({ origin: ctx.groupCenter, point: newPoint, rotation: -ctx.rotation })
}

/**
 * Rotation of a shape mirrored with its group, when one side of the group goes past the other one: a shape turned by θ,
 * mirrored along a side of a frame turned by R, is turned by 2R − θ, and mirrored along its own side
 */
export const getMirroredRotation = (rotation: number | undefined, ctx: GroupResizeContext): number => {
  const shapeRotation = rotation ?? 0
  return ctx.isXinverted !== ctx.isYinverted ? 2 * ctx.rotation - shapeRotation : shapeRotation
}
