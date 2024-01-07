import type { GridFormatType } from '../../constants/app'
import type { SelectionModeResize } from '../../types/Mode'
import type { Point, DrawableShape, ShapeEntity, Rect } from '../../types/Shapes'
import type { ToolsSettingsType } from '../../types/tools'
import { getPointPositionBeforeCanvasTransformation } from '../../utils/intersect'
import { roundForGrid } from '../../utils/transform'
import { createRecPath } from './path'
import { createRecSelectionPath, resizeRectSelection } from '../../utils/selection/rectSelection'
import { uniqueId } from '../../utils/util'

type rectish = 'text' | 'rect' | 'square' | 'picture'


const buildPath = <T extends DrawableShape<rectish>>(
  rect: T,
  currentScale: number,
  selectionPadding: number
): T => {
  return {
    ...rect,
    path: createRecPath(rect),
    selection: createRecSelectionPath(rect, currentScale, selectionPadding)
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
  currentScale: number,
  selectionPadding: number
): ShapeEntity<T> => {
  const recShape = {
    toolId: shape.id,
    type: shape.type,
    id: uniqueId(`${shape.type}_`),
    x: cursorPosition[0],
    y: cursorPosition[1],
    width: 0,
    height: 0,
    rotation: 0,
    style: {
      opacity: shape.settings.opacity.default,
      fillColor: shape.settings.fillColor.default,
      strokeColor: shape.settings.strokeColor.default,
      lineWidth: shape.settings.lineWidth.default,
      lineDash: shape.settings.lineDash.default
    }
  } as unknown as ShapeEntity<T>
  return buildPath(recShape, currentScale, selectionPadding) as ShapeEntity<T>
}

export const drawRect = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape<'rect' | 'square'>
): void => {
  if (ctx.globalAlpha === 0 || !shape.path) return

  shape.style?.fillColor !== 'transparent' && ctx.fill(shape.path)
  shape.style?.strokeColor !== 'transparent' && ctx.stroke(shape.path)
}



export const getRectBorder = (rect: Rect, selectionPadding: number): Rect => {
  return {
    x: rect.x - selectionPadding,
    width: rect.width + selectionPadding * 2,
    y: rect.y - selectionPadding,
    height: rect.height + selectionPadding * 2
  }
}

export const getRectOppositeAnchorAbsolutePosition = <T extends DrawableShape & Rect>(
  anchor: Point,
  center: Point,
  shape: T,
  canvasOffset: Point,
  [negW, negH] = [false, false]
) => {
  const oppositeX =
    anchor[0] === 0.5
      ? shape.x + shape.width / 2
      : anchor[0] === 0
        ? shape.x + (negW ? 0 : shape.width)
        : shape.x + (negW ? shape.width : 0)
  const oppositeY =
    anchor[1] === 0.5
      ? shape.y + shape.height / 2
      : anchor[1] === 0
        ? shape.y + (negH ? 0 : shape.height)
        : shape.y + (negH ? shape.height : 0)

  return getPointPositionBeforeCanvasTransformation(
    [oppositeX, oppositeY],
    shape.rotation,
    center,
    canvasOffset
  )
}

export const translateRect = <T extends 'rect' | 'square', U extends DrawableShape<T>>(
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

export const resizeRect = <T extends rectish>(
  cursorPosition: Point,
  originalShape: DrawableShape<T>,
  selectionMode: SelectionModeResize,
  gridFormat: GridFormatType,
  selectionPadding: number,
  currentScale: number,
  keepRatio = false
): DrawableShape<T> => {
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
      width: Math.max(0, borderWidth - 2 * selectionPadding),
      height: Math.max(0, borderHeight - 2 * selectionPadding),
      x: borderX + selectionPadding,
      y: borderY + selectionPadding
    },
    currentScale,
    selectionPadding
  ) as DrawableShape<T>
}
