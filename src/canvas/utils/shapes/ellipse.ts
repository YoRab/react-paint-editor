import type { UtilsSettings } from '@canvas/constants/app'
import type { SelectionModeResize } from '@canvas/types/Mode'
import type { DrawableShape, Ellipse, Point, Rect, ShapeEntity } from '@canvas/types/Shapes'
import type { ToolsSettingsType } from '@canvas/types/tools'
import { drawPathWithFillAndStroke } from '@canvas/utils/fill'
import { resizeRectSelection } from '@canvas/utils/selection/rectSelection'
import { createEllipsePath, expandRect, getComputedShapeInfos } from '@canvas/utils/shapes/path'
import { getToolDefaultStyle } from '@canvas/utils/tools'
import { createShapeId } from '@canvas/utils/util'
import { type GroupResizeContext, getMirroredRotation, getPositionWithoutGroupRotation, getShapePositionInNewBorder } from './group'

const getEllipseBorder = (ellipse: Ellipse, settings: Pick<UtilsSettings, 'selectionPadding'>): Rect => {
  const baseRect: Rect = {
    x: ellipse.x - ellipse.radiusX,
    y: ellipse.y - ellipse.radiusY,
    width: ellipse.radiusX * 2,
    height: ellipse.radiusY * 2
  }
  return expandRect(baseRect, settings.selectionPadding)
}

const buildPath = <T extends DrawableShape<'ellipse'>>(shape: T & { id: string }, settings: UtilsSettings): ShapeEntity<'ellipse'> => {
  const path = createEllipsePath(shape)
  const computed = getComputedShapeInfos(shape, getEllipseBorder, settings)
  return {
    ...shape,
    path,
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
      id: createShapeId(shape.type),
      x: cursorPosition[0],
      y: cursorPosition[1],
      radiusX: 0,
      radiusY: 0,
      style: getToolDefaultStyle(shape)
    },
    settings
  )
}

export const drawEllipse = (ctx: CanvasRenderingContext2D, ellipse: ShapeEntity<'ellipse'>): void => {
  drawPathWithFillAndStroke(ctx, ellipse)
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

export const resizeEllipseInGroup = (shape: ShapeEntity<'ellipse'>, groupCtx: GroupResizeContext): ShapeEntity<'ellipse'> => {
  const { settings, widthMultiplier, heightMultiplier } = groupCtx
  const pos = getShapePositionInNewBorder(shape, groupCtx)
  const newRadiusX = (shape.radiusX || 0.5) * widthMultiplier
  const newRadiusY = (shape.radiusY || 0.5) * heightMultiplier
  const newCenter = getPositionWithoutGroupRotation(groupCtx, pos.x, pos.y, newRadiusX * 2, newRadiusY * 2)
  return buildPath(
    {
      ...shape,
      radiusX: newRadiusX,
      radiusY: newRadiusY,
      x: newCenter[0],
      y: newCenter[1],
      rotation: getMirroredRotation(shape.rotation, groupCtx)
    },
    settings
  )
}
