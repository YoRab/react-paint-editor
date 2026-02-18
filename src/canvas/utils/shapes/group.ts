import type { UtilsSettings } from '@canvas/constants/app'
import { resizeRectSelection } from '@canvas/utils/selection/rectSelection'
import { rotatePoint } from '@canvas/utils/trigo'
import type { SelectionModeResize } from '@common/types/Mode'
import type { Point, SelectionType, ShapeEntity } from '@common/types/Shapes'

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
  groupCenter: Point
  rotation: number
  settings: UtilsSettings
  originalBorders: { x: number; y: number; width: number; height: number }
}

export const getGroupResizeContext = (
  cursorPosition: Point,
  group: SelectionType & { type: 'group' },
  selectionMode: SelectionModeResize,
  settings: UtilsSettings,
  keepRatio: boolean,
  isAltPressed: boolean
): GroupResizeContext => {
  const { borders } = group.computed
  const {
    borderX: newBorderX,
    borderHeight: newBorderHeight,
    borderY: newBorderY,
    borderWidth: newBorderWidth,
    isXinverted,
    isYinverted
  } = resizeRectSelection(cursorPosition, group, selectionMode, settings, keepRatio, isAltPressed)

  const widthMultiplier = (newBorderWidth - 2 * settings.selectionPadding) / (borders.width - 2 * settings.selectionPadding || 1)
  const heightMultiplier = (newBorderHeight - 2 * settings.selectionPadding) / (borders.height - 2 * settings.selectionPadding || 1)

  return {
    newBorderX,
    newBorderY,
    newBorderWidth,
    newBorderHeight,
    widthMultiplier,
    heightMultiplier,
    isXinverted,
    isYinverted,
    groupCenter: [newBorderX + newBorderWidth / 2, newBorderY + newBorderHeight / 2],
    rotation: group.rotation ?? 0,
    settings,
    originalBorders: borders
  }
}

export const getShapePositionInNewBorder = (
  shape: ShapeEntity,
  group: SelectionType & { type: 'group' },
  ctx: GroupResizeContext
): { x: number; y: number } => {
  const shapeCenterWithNoRotation = rotatePoint({
    origin: group.computed.center,
    point: shape.computed.center,
    rotation: group.rotation ?? 0
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
