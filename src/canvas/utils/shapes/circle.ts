import type { UtilsSettings } from '@canvas/constants/app'
import { createRecSelectionPath, resizeRectSelection } from '@canvas/utils/selection/rectSelection'
import { boundVectorToSingleAxis, roundForGrid } from '@canvas/utils/transform'
import type { SelectionModeResize } from '@common/types/Mode'
import type { Circle, DrawableShape, Point, Rect, ShapeEntity } from '@common/types/Shapes'
import type { ToolsSettingsType } from '@common/types/tools'
import { uniqueId } from '@common/utils/util'
import { createCirclePath, getComputedShapeInfos } from './path'

const getCircleBorder = (circle: Circle, settings: Pick<UtilsSettings, 'selectionPadding'>): Rect => {
  return {
    x: circle.x - circle.radius - settings.selectionPadding,
    width: (circle.radius + settings.selectionPadding) * 2,
    y: circle.y - circle.radius - settings.selectionPadding,
    height: (circle.radius + settings.selectionPadding) * 2
  }
}

export const getComputedCircle = (circle: DrawableShape<'circle'>, settings: UtilsSettings) => {
  return getComputedShapeInfos(circle, getCircleBorder, settings)
}

const buildPath = <T extends DrawableShape<'circle'>>(shape: T & { id: string }, settings: UtilsSettings): ShapeEntity<'circle'> => {
  const path = createCirclePath(shape)
  const computed = getComputedCircle(shape, settings)
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
  if (ctx.globalAlpha === 0 || !circle.path) return
  circle.style?.fillColor !== 'transparent' && ctx.fill(circle.path)
  circle.style?.strokeColor !== 'transparent' && ctx.stroke(circle.path)
}

export const translateCircle = (
  cursorPosition: Point,
  originalShape: ShapeEntity<'circle'>,
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
