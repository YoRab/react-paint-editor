import { GridFormatType } from '../../constants/app'
import { SelectionModeResize } from '../../types/Mode'
import type {
  Point,
  Ellipse,
  Rect,
  DrawableShape,
  ShapeEntity
} from '../../types/Shapes'
import type { ToolsSettingsType } from '../../types/tools'
import { roundForGrid } from '../../utils/transform'
import { createRecSelectionPath, resizeRectSelection } from '../../utils/selection/rectSelection'
import { createEllipsePath } from '../../utils/shapes/path'
import { uniqueId } from '../../utils/util'

const buildPath = <T extends DrawableShape<'ellipse'>>(
  shape: T,
  currentScale: number,
  selectionPadding: number
): T => {
  return {
    ...shape,
    path: createEllipsePath(shape),
    selection: createRecSelectionPath(shape, currentScale, selectionPadding)
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
  currentScale: number,
  selectionPadding: number
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
        globalAlpha: shape.settings.opacity.default,
        fillColor: shape.settings.fillColor.default,
        strokeColor: shape.settings.strokeColor.default,
        lineWidth: shape.settings.lineWidth.default,
        lineDash: shape.settings.lineDash.default
      }
    },
    currentScale,
    selectionPadding
  )
}

export const drawEllipse = (
  ctx: CanvasRenderingContext2D,
  ellipse: DrawableShape<'ellipse'>
): void => {
  if (ctx.globalAlpha === 0 || !ellipse.path) return
  ellipse.style?.fillColor !== 'transparent' && ctx.fill(ellipse.path)
  ellipse.style?.strokeColor !== 'transparent' && ctx.stroke(ellipse.path)
}

export const getEllipseBorder = (ellipse: Ellipse, selectionPadding: number): Rect => {
  return {
    x: ellipse.x - ellipse.radiusX - selectionPadding,
    width: (ellipse.radiusX + selectionPadding) * 2,
    y: ellipse.y - ellipse.radiusY - selectionPadding,
    height: (ellipse.radiusY + selectionPadding) * 2
  }
}

export const translateEllipse = <U extends DrawableShape<'ellipse'>>(
  cursorPosition: Point,
  originalShape: U,
  originalCursorPosition: Point,
  gridFormat: GridFormatType,
  currentScale: number,
  selectionPadding: number
) => {
  return buildPath(
    {
      ...originalShape,
      x: roundForGrid(originalShape.x + cursorPosition[0] - originalCursorPosition[0], gridFormat),
      y: roundForGrid(originalShape.y + cursorPosition[1] - originalCursorPosition[1], gridFormat)
    },
    currentScale,
    selectionPadding
  )
}

export const resizeEllipse = (
  cursorPosition: Point,
  originalShape: DrawableShape<'ellipse'>,
  selectionMode: SelectionModeResize,
  gridFormat: GridFormatType,
  selectionPadding: number,
  currentScale: number,
  keepRatio = false
): DrawableShape<'ellipse'> => {
  const { borderX, borderHeight, borderY, borderWidth } = resizeRectSelection(
    cursorPosition,
    originalShape,
    selectionMode,
    gridFormat,
    selectionPadding,
    keepRatio
  )

  return buildPath(
    {
      ...originalShape,
      radiusX: Math.max(0, borderWidth / 2 - selectionPadding),
      radiusY: Math.max(0, borderHeight / 2 - selectionPadding),
      x: borderX + borderWidth / 2,
      y: borderY + borderHeight / 2
    },
    currentScale,
    selectionPadding
  )
}
