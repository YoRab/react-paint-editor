import { GridFormatType } from '../../constants/app'
import _ from 'lodash/fp'
import { SelectionModeResize } from '../../types/Mode'
import type {
  Point,
  Circle,
  Rect,
  DrawableShape,
  ShapeEntity
} from '../../types/Shapes'
import type { ToolsSettingsType } from '../../types/tools'
import { roundForGrid } from '../../utils/transform'
import { createCirclePath } from './path'
import { createRecSelectionPath, resizeRectSelection } from '../../utils/selection/rectSelection'

const buildPath = <T extends DrawableShape<'circle'>>(
  shape: T,
  currentScale: number,
  selectionPadding: number
): T => {
  return {
    ...shape,
    path: createCirclePath(shape),
    selection: createRecSelectionPath(shape, currentScale, selectionPadding)
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
  currentScale: number,
  selectionPadding: number
): ShapeEntity<'circle'> => {
  return buildPath(
    {
      toolId: shape.id,
      type: shape.type,
      id: _.uniqueId(`${shape.type}_`),
      x: cursorPosition[0],
      y: cursorPosition[1],
      radius: 0,
      rotation: 0,
      style: {
        opacity: shape.settings.opacity.default,
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

export const drawCircle = (
  ctx: CanvasRenderingContext2D,
  circle: DrawableShape<'circle'>
): void => {
  if (ctx.globalAlpha === 0 || !circle.path) return
  circle.style?.fillColor !== 'transparent' && ctx.fill(circle.path)
  circle.style?.strokeColor !== 'transparent' && ctx.stroke(circle.path)
}

export const getCircleBorder = (circle: Circle, selectionPadding: number): Rect => {
  return {
    x: circle.x - circle.radius - selectionPadding,
    width: (circle.radius + selectionPadding) * 2,
    y: circle.y - circle.radius - selectionPadding,
    height: (circle.radius + selectionPadding) * 2
  }
}

export const translateCircle = <U extends DrawableShape<'circle'>>(
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

export const resizeCircle = (
  cursorPosition: Point,
  originalShape: DrawableShape<'circle'>,
  selectionMode: SelectionModeResize,
  gridFormat: GridFormatType,
  selectionPadding: number,
  currentScale: number
): DrawableShape<'circle'> => {
  const { borderX, borderHeight, borderY, borderWidth } = resizeRectSelection(
    cursorPosition,
    originalShape,
    selectionMode,
    gridFormat,
    selectionPadding,
    true
  )

  return buildPath(
    {
      ...originalShape,
      radius: Math.max(0, borderWidth / 2 - selectionPadding),
      x: borderX + borderWidth / 2,
      y: borderY + borderHeight / 2
    },
    currentScale,
    selectionPadding
  )
}
