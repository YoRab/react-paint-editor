import { GridFormatType } from 'constants/app'
import _ from 'lodash/fp'
import { SelectionModeResize } from 'types/Mode'
import type {
  Point,
  Circle,
  Rect,
  DrawableShape,
  ShapeEntity,
  SelectionDefaultType
} from 'types/Shapes'
import type { ToolsSettingsType } from 'types/tools'
import { getPointPositionBeforeCanvasTransformation } from 'utils/intersect'
import { roundForGrid } from 'utils/transform'
import { getShapeInfos } from 'utils/shapes/index'
import { updateCanvasContext } from 'utils/canvas'
import { createRecPath } from './rectangle'
import { createLinePath } from './line'
import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from 'constants/shapes'
import { resizeShapeBorder } from './common'

export const createCirclePath = (shape: Circle) => {
  const path = new Path2D()
  path.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI)
  return path
}

const createCircleSelectionPath = (
  rect: DrawableShape<'circle'>,
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

const buildPath = <T extends DrawableShape<'circle'>>(
  shape: T,
  currentScale: number,
  selectionPadding: number
): T => {
  return {
    ...shape,
    path: createCirclePath(shape),
    selection: createCircleSelectionPath(shape, currentScale, selectionPadding)
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

export const drawCircle = (
  ctx: CanvasRenderingContext2D,
  circle: DrawableShape<'circle'>
): void => {
  if (ctx.globalAlpha === 0 || !circle.path) return
  circle.style?.fillColor !== 'transparent' && ctx.fill(circle.path)
  circle.style?.strokeColor !== 'transparent' && ctx.stroke(circle.path)
}

export const drawSelectionCircle = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape<'circle'>,
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

const getCircleOppositeAnchorAbsolutePosition = <T extends DrawableShape & Circle>(
  anchor: Point,
  center: Point,
  shape: T,
  canvasOffset: Point,
  [negW, negH] = [false, false]
) => {
  const oppositeX =
    anchor[0] === 0.5
      ? shape.x
      : anchor[0] === 0
      ? shape.x + (negW ? -shape.radius : shape.radius)
      : shape.x + (negW ? shape.radius : -shape.radius)
  const oppositeY =
    anchor[1] === 0.5
      ? shape.y
      : anchor[1] === 0
      ? shape.y + (negH ? -shape.radius : shape.radius)
      : shape.y + (negH ? shape.radius : -shape.radius)

  return getPointPositionBeforeCanvasTransformation(
    [oppositeX, oppositeY],
    shape.rotation,
    center,
    canvasOffset
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
  const { borderX, borderHeight, borderY, borderWidth } = resizeShapeBorder(
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
