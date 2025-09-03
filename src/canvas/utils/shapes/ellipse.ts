import type { UtilsSettings } from '@canvas/constants/app'
import { createRecSelectionPath, resizeRectSelection } from '@canvas/utils/selection/rectSelection'
import { createEllipsePath } from '@canvas/utils/shapes/path'
import { boundVectorToSingleAxis, roundForGrid } from '@canvas/utils/transform'
import type { SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Ellipse, Point, Rect, ShapeEntity } from '@common/types/Shapes'
import type { ToolsSettingsType } from '@common/types/tools'
import { uniqueId } from '@common/utils/util'

const buildPath = <T extends DrawableShape<'ellipse'>>(shape: T, settings: UtilsSettings): T => {
  const path = createEllipsePath(shape)
  return {
    ...shape,
    path,
    selection: createRecSelectionPath(path, shape, settings)
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
      rotation: 0,
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

export const drawEllipse = (ctx: CanvasRenderingContext2D, ellipse: DrawableShape<'ellipse'>): void => {
  if (ctx.globalAlpha === 0 || !ellipse.path) return
  ellipse.style?.fillColor !== 'transparent' && ctx.fill(ellipse.path)
  ellipse.style?.strokeColor !== 'transparent' && ctx.stroke(ellipse.path)
}

export const getEllipseBorder = (ellipse: Ellipse, settings: UtilsSettings): Rect => {
  return {
    x: ellipse.x - ellipse.radiusX - settings.selectionPadding,
    width: (ellipse.radiusX + settings.selectionPadding) * 2,
    y: ellipse.y - ellipse.radiusY - settings.selectionPadding,
    height: (ellipse.radiusY + settings.selectionPadding) * 2
  }
}

export const translateEllipse = <U extends DrawableShape<'ellipse'>>(
  cursorPosition: Point,
  originalShape: U,
  originalCursorPosition: Point,
  settings: UtilsSettings,
  singleAxis: boolean
) => {
  const translationVector = boundVectorToSingleAxis(
    [cursorPosition[0] - originalCursorPosition[0], cursorPosition[1] - originalCursorPosition[1]],
    singleAxis
  )

  return buildPath(
    {
      ...originalShape,
      x: roundForGrid(originalShape.x + translationVector[0], settings),
      y: roundForGrid(originalShape.y + translationVector[1], settings)
    },
    settings
  )
}

export const resizeEllipse = (
  cursorPosition: Point,
  originalShape: DrawableShape<'ellipse'>,
  selectionMode: SelectionModeResize,
  settings: UtilsSettings,
  keepRatio = false,
  resizeFromCenter = false
): DrawableShape<'ellipse'> => {
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
