import type { UtilsSettings } from '@canvas/constants/app'
import { getPointPositionBeforeCanvasTransformation } from '@canvas/utils/intersect'
import { createRecSelectionPath, resizeRectSelection } from '@canvas/utils/selection/rectSelection'
import { boundVectorToSingleAxis, roundForGrid } from '@canvas/utils/transform'
import type { SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Point, Rect, ShapeEntity } from '@common/types/Shapes'
import type { ToolsSettingsType } from '@common/types/tools'
import { uniqueId } from '@common/utils/util'
import { createRecPath, getComputedShapeInfos } from './path'

type rectish = 'text' | 'rect' | 'square' | 'picture'
export const getComputedRect = (rect: DrawableShape<rectish>, settings: UtilsSettings) => {
  return getComputedShapeInfos(rect, getRectBorder, settings)
}

const buildPath = <T extends DrawableShape<rectish>>(rect: T, settings: UtilsSettings, isGroup = false): T => {
  const path = createRecPath(rect)
  const computed = getComputedRect(rect, settings)
  return {
    ...rect,
    path,
    computed,
    selection: createRecSelectionPath(path, computed, settings, isGroup)
  }
}

export const refreshRect = buildPath

export const createRectangle = <T extends 'rect' | 'square'>(
  shape: {
    id: string
    type: T
    settings: ToolsSettingsType<T>
  },
  cursorPosition: Point,
  settings: UtilsSettings,
  isGroup = false,
  width = 0,
  height = 0
): ShapeEntity<T> => {
  const recShape = {
    toolId: shape.id,
    type: shape.type,
    id: uniqueId(`${shape.type}_`),
    x: cursorPosition[0],
    y: cursorPosition[1],
    width,
    height,
    rotation: 0,
    style: {
      opacity: shape.settings.opacity.default,
      fillColor: shape.settings.fillColor.default,
      strokeColor: shape.settings.strokeColor.default,
      lineWidth: shape.settings.lineWidth.default,
      lineDash: shape.settings.lineDash.default
    }
  } as unknown as ShapeEntity<T>
  return buildPath(recShape, settings, isGroup) as ShapeEntity<T>
}

export const drawRect = (ctx: CanvasRenderingContext2D, shape: DrawableShape<'rect' | 'square'>): void => {
  if (ctx.globalAlpha === 0 || !shape.path) return

  shape.style?.fillColor !== 'transparent' && ctx.fill(shape.path)
  shape.style?.strokeColor !== 'transparent' && ctx.stroke(shape.path)
}

export const getRectBorder = (rect: Rect, settings: Pick<UtilsSettings, 'selectionPadding'>): Rect => {
  return {
    x: rect.x - settings.selectionPadding,
    width: rect.width + settings.selectionPadding * 2,
    y: rect.y - settings.selectionPadding,
    height: rect.height + settings.selectionPadding * 2
  }
}

export const getRectOppositeAnchorAbsolutePosition = <T extends DrawableShape & Rect>(
  anchor: Point,
  center: Point,
  shape: T,
  [negW, negH] = [false, false]
) => {
  const oppositeX =
    anchor[0] === 0.5 ? shape.x + shape.width / 2 : anchor[0] === 0 ? shape.x + (negW ? 0 : shape.width) : shape.x + (negW ? shape.width : 0)
  const oppositeY =
    anchor[1] === 0.5 ? shape.y + shape.height / 2 : anchor[1] === 0 ? shape.y + (negH ? 0 : shape.height) : shape.y + (negH ? shape.height : 0)

  return getPointPositionBeforeCanvasTransformation([oppositeX, oppositeY], shape.rotation, center)
}

export const translateRect = <T extends 'rect' | 'square', U extends DrawableShape<T>>(
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

export const resizeRect = <T extends rectish>(
  cursorPosition: Point,
  originalShape: DrawableShape<T>,
  selectionMode: SelectionModeResize,
  settings: UtilsSettings,
  keepRatio = false,
  resizeFromCenter = false
): DrawableShape<T> => {
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
      width: Math.max(0, borderWidth - 2 * settings.selectionPadding),
      height: Math.max(0, borderHeight - 2 * settings.selectionPadding),
      x: borderX + settings.selectionPadding,
      y: borderY + settings.selectionPadding
    },
    settings
  ) as DrawableShape<T>
}
