import type { UtilsSettings } from '@canvas/constants/app'
import { createRecSelectionPath, resizeRectSelection } from '@canvas/utils/selection/rectSelection'
import { createEllipsePath, getComputedShapeInfos } from '@canvas/utils/shapes/path'
import type { SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Ellipse, Point, Rect, SelectionType, ShapeEntity } from '@common/types/Shapes'
import type { ToolsSettingsType } from '@common/types/tools'
import { uniqueId } from '@common/utils/util'
import { type GroupResizeContext, getPositionWithoutGroupRotation, getShapePositionInNewBorder } from './group'

const getEllipseBorder = (ellipse: Ellipse, settings: Pick<UtilsSettings, 'selectionPadding'>): Rect => {
  return {
    x: ellipse.x - ellipse.radiusX - settings.selectionPadding,
    width: (ellipse.radiusX + settings.selectionPadding) * 2,
    y: ellipse.y - ellipse.radiusY - settings.selectionPadding,
    height: (ellipse.radiusY + settings.selectionPadding) * 2
  }
}

export const getComputedEllipse = (ellipse: DrawableShape<'ellipse'>, settings: UtilsSettings) => {
  return getComputedShapeInfos(ellipse, getEllipseBorder, settings)
}

const buildPath = <T extends DrawableShape<'ellipse'>>(shape: T & { id: string }, settings: UtilsSettings): ShapeEntity<'ellipse'> => {
  const path = createEllipsePath(shape)
  const computed = getComputedEllipse(shape, settings)
  return {
    ...shape,
    path,
    selection: createRecSelectionPath(path, computed, settings),
    computed
  }
}

export const refreshEllipse = buildPath

export const createEllipse = (
  shape: {
    id: string
    type: 'ellipse'
    settings: ToolsSettingsType<'ellipse'>
  },
  cursorPosition: Point,
  settings: UtilsSettings
): ShapeEntity<'ellipse'> => {
  return buildPath(
    {
      toolId: shape.id,
      type: shape.type,
      id: uniqueId(`${shape.type}_`),
      x: cursorPosition[0],
      y: cursorPosition[1],
      radiusX: 0,
      radiusY: 0,
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

export const drawEllipse = (ctx: CanvasRenderingContext2D, ellipse: ShapeEntity<'ellipse'>): void => {
  if (ctx.globalAlpha === 0 || !ellipse.path) return
  ellipse.style?.fillColor !== 'transparent' && ctx.fill(ellipse.path)
  ellipse.style?.strokeColor !== 'transparent' && ctx.stroke(ellipse.path)
}

export const resizeEllipse = (
  cursorPosition: Point,
  originalShape: ShapeEntity<'ellipse'>,
  selectionMode: SelectionModeResize,
  settings: UtilsSettings,
  keepRatio = false,
  resizeFromCenter = false
): ShapeEntity<'ellipse'> => {
  const { borderX, borderHeight, borderY, borderWidth } = resizeRectSelection(
    cursorPosition,
    originalShape,
    selectionMode,
    settings,
    keepRatio,
    resizeFromCenter
  )

  return buildPath(
    {
      ...originalShape,
      radiusX: Math.max(0, borderWidth / 2 - settings.selectionPadding),
      radiusY: Math.max(0, borderHeight / 2 - settings.selectionPadding),
      x: borderX + borderWidth / 2,
      y: borderY + borderHeight / 2
    },
    settings
  )
}

export const resizeEllipseInGroup = (
  shape: ShapeEntity<'ellipse'>,
  group: SelectionType & { type: 'group' },
  groupCtx: GroupResizeContext
): ShapeEntity<'ellipse'> => {
  const pos = getShapePositionInNewBorder(shape, group, groupCtx)
  const newRadiusX = shape.radiusX * groupCtx.widthMultiplier
  const newRadiusY = shape.radiusY * groupCtx.heightMultiplier
  const newCenter = getPositionWithoutGroupRotation(groupCtx, pos.x, pos.y, newRadiusX * 2, newRadiusY * 2)
  return buildPath({ ...shape, radiusX: newRadiusX, radiusY: newRadiusY, x: newCenter[0], y: newCenter[1] }, groupCtx.settings)
}
