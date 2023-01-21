import { GridFormatType } from 'constants/app'
import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from 'constants/shapes'
import _ from 'lodash/fp'
import { SelectionModeResize } from 'types/Mode'
import type {
  Point,
  Ellipse,
  Rect,
  DrawableShape,
  ShapeEntity,
  SelectionDefaultType
} from 'types/Shapes'
import type { ToolsSettingsType } from 'types/tools'
import { updateCanvasContext } from 'utils/canvas'
import { roundForGrid } from 'utils/transform'
import { createCirclePath } from './circle'
import { resizeShapeBorder } from './common'
import { getShapeInfos } from './index'
import { createLinePath } from './line'
import { createRecPath } from './rectangle'

const createEllipsePath = (ellipse: DrawableShape<'ellipse'>) => {
  const path = new Path2D()
  path.ellipse(ellipse.x, ellipse.y, ellipse.radiusX, ellipse.radiusY, 0, 0, 2 * Math.PI)

  return path
}

const createEllipseSelectionPath = (
  rect: DrawableShape<'ellipse'>,
  currentScale: number,
  selectionPadding: number
): SelectionDefaultType => {
  const { borders } = getShapeInfos(rect, selectionPadding)

  return {
    border: createRecPath(borders),
    line: createLinePath({
      points: [
        [borders.x + borders.width / 2, borders.y],
        [
          borders.x + borders.width / 2,
          borders.y - SELECTION_ANCHOR_SIZE / 2 - SELECTION_ROTATED_ANCHOR_POSITION / currentScale
        ]
      ]
    }),
    anchors: [
      createCirclePath({
        x: borders.x + borders.width / 2,
        y: borders.y - SELECTION_ANCHOR_SIZE / 2 - SELECTION_ROTATED_ANCHOR_POSITION / currentScale,
        radius: SELECTION_ANCHOR_SIZE / 2 / currentScale
      }),
      ...SELECTION_RESIZE_ANCHOR_POSITIONS.map(anchorPosition =>
        createCirclePath({
          x: borders.x + borders.width * anchorPosition[0],
          y: borders.y + borders.height * anchorPosition[1],
          radius: SELECTION_ANCHOR_SIZE / 2 / currentScale
        })
      )
    ]
  }
}

const buildPath = <T extends DrawableShape<'ellipse'>>(
  shape: T,
  currentScale: number,
  selectionPadding: number
): T => {
  return {
    ...shape,
    path: createEllipsePath(shape),
    selection: createEllipseSelectionPath(shape, currentScale, selectionPadding)
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
      id: _.uniqueId(`${shape.type}_`),
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

export const drawSelectionEllipse = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape<'ellipse'>,
  selectionColor: string,
  selectionWidth: number,
  currentScale: number,
  withAnchors: boolean
): void => {
  if (!shape.selection) return

  updateCanvasContext(ctx, {
    fillColor: 'transparent',
    strokeColor: selectionColor,
    lineWidth: selectionWidth / currentScale
  })

  ctx.stroke(shape.selection.border)

  if (!withAnchors || shape.locked) return

  ctx.stroke(shape.selection.line)

  updateCanvasContext(ctx, {
    fillColor: 'rgb(255,255,255)',
    strokeColor: 'rgb(150,150,150)',
    lineWidth: 2 / currentScale
  })

  for (const anchor of shape.selection.anchors) {
    ctx.fill(anchor)
    ctx.stroke(anchor)
  }
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
  const { borderX, borderHeight, borderY, borderWidth } = resizeShapeBorder(
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
