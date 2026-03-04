import type { UtilsSettings } from '@canvas/constants/app'
import { drawPathWithFillAndStroke } from '@canvas/utils/canvas'
import { createRecSelectionPath, resizeRectSelection } from '@canvas/utils/selection/rectSelection'
import type { SelectionModeResize } from '@common/types/Mode'
import type { Circle, DrawableShape, Point, Rect, SelectionType, ShapeEntity } from '@common/types/Shapes'
import type { ToolsSettingsType } from '@common/types/tools'
import { uniqueId } from '@common/utils/util'
import { type GroupResizeContext, getPositionWithoutGroupRotation, getShapePositionInNewBorder } from './group'
import { createCirclePath, expandRect, getComputedShapeInfos } from './path'

const getCircleBorder = (circle: Circle, settings: Pick<UtilsSettings, 'selectionPadding'>): Rect => {
  const baseRect: Rect = {
    x: circle.x - circle.radius,
    y: circle.y - circle.radius,
    width: circle.radius * 2,
    height: circle.radius * 2
  }
  return expandRect(baseRect, settings.selectionPadding)
}

const buildPath = <T extends DrawableShape<'circle'>>(shape: T & { id: string }, settings: UtilsSettings): ShapeEntity<'circle'> => {
  const path = createCirclePath(shape)
  const computed = getComputedShapeInfos(shape, getCircleBorder, settings)
  return {
    ...shape,
    path,
    selection: createRecSelectionPath(path, computed, settings),
    computed
  }
}

export const refreshCircle = buildPath

export const createCircle = (
  shape: {
    id: string
    type: 'circle'
    settings: ToolsSettingsType<'circle'>
  },
  cursorPosition: Point,
  settings: UtilsSettings
): ShapeEntity<'circle'> => {
  return buildPath(
    {
      toolId: shape.id,
      type: shape.type,
      id: uniqueId(`${shape.type}_`),
      x: cursorPosition[0],
      y: cursorPosition[1],
      radius: 0,
      style: {
        opacity: shape.settings.opacity.default,
        fillColor: shape.settings.fillColor.default,
        strokeColor: shape.settings.strokeColor.default,
        lineWidth: shape.settings.lineWidth.default,
        lineDash: shape.settings.lineDash.default
      }
    },
    settings
  )
}

export const drawCircle = (ctx: CanvasRenderingContext2D, circle: ShapeEntity<'circle'>): void => {
  drawPathWithFillAndStroke(ctx, circle.path, circle.style)
}

export const resizeCircle = (
  cursorPosition: Point,
  originalShape: ShapeEntity<'circle'>,
  selectionMode: SelectionModeResize,
  settings: UtilsSettings,
  resizeFromCenter: boolean
): ShapeEntity<'circle'> => {
  const { borderX, borderHeight, borderY, borderWidth } = resizeRectSelection(
    cursorPosition,
    originalShape,
    selectionMode,
    settings,
    true,
    resizeFromCenter
  )

  return buildPath(
    {
      ...originalShape,
      radius: Math.max(0, borderWidth / 2 - settings.selectionPadding),
      x: borderX + borderWidth / 2,
      y: borderY + borderHeight / 2
    },
    settings
  )
}

export const resizeCircleInGroup = (
  shape: ShapeEntity<'circle'>,
  group: SelectionType & { type: 'group' },
  groupCtx: GroupResizeContext
): ShapeEntity<'circle'> => {
  const pos = getShapePositionInNewBorder(shape, group, groupCtx)
  const newRadius = (shape.radius || 0.5) * groupCtx.widthMultiplier
  const newCenter = getPositionWithoutGroupRotation(groupCtx, pos.x, pos.y, newRadius * 2, newRadius * 2)
  return buildPath({ ...shape, radius: newRadius, x: newCenter[0], y: newCenter[1] }, groupCtx.settings)
}
