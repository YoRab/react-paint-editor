import { GridFormatType } from '../../constants/app'
import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from '../../constants/shapes'
import _ from 'lodash/fp'
import { SelectionModeResize } from '../../types/Mode'
import type {
  Point,
  Ellipse,
  Rect,
  DrawableShape,
  ShapeEntity,
  SelectionDefaultType
} from '../../types/Shapes'
import type { ToolsSettingsType } from '../../types/tools'
import { updateCanvasContext } from '../../utils/canvas'
import {
  getPointPositionAfterCanvasTransformation,
  getPointPositionBeforeCanvasTransformation
} from '../../utils/intersect'
import { getNormalizedSize, roundForGrid } from '../../utils/transform'
import { createCirclePath } from './circle'
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
  currentScale: number
): SelectionDefaultType => {
  const { borders } = getShapeInfos(rect, 0)

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

const buildPath = <T extends DrawableShape<'ellipse'>>(shape: T, currentScale: number): T => {
  return {
    ...shape,
    path: createEllipsePath(shape),
    selection: createEllipseSelectionPath(shape, currentScale)
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
  currentScale: number
): ShapeEntity<'ellipse'> => {
  return buildPath(
    {
      toolId: shape.id,
      type: shape.type,
      id: _.uniqueId(`${shape.type}_`),
      x: cursorPosition[0],
      y: cursorPosition[1],
      radiusX: 1,
      radiusY: 1,
      rotation: 0,
      style: {
        globalAlpha: shape.settings.opacity.default,
        fillColor: shape.settings.fillColor.default,
        strokeColor: shape.settings.strokeColor.default,
        lineWidth: shape.settings.lineWidth.default,
        lineDash: shape.settings.lineDash.default
      }
    },
    currentScale
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
  currentScale: number
) => {
  return buildPath(
    {
      ...originalShape,
      x: roundForGrid(originalShape.x + cursorPosition[0] - originalCursorPosition[0], gridFormat),
      y: roundForGrid(originalShape.y + cursorPosition[1] - originalCursorPosition[1], gridFormat)
    },
    currentScale
  )
}

const getEllipseOppositeAnchorAbsolutePosition = <T extends DrawableShape & Ellipse>(
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
        ? shape.x + (negW ? -shape.radiusX : shape.radiusX)
        : shape.x + (negW ? shape.radiusX : -shape.radiusX)
  const oppositeY =
    anchor[1] === 0.5
      ? shape.y
      : anchor[1] === 0
        ? shape.y + (negH ? -shape.radiusY : shape.radiusY)
        : shape.y + (negH ? shape.radiusY : -shape.radiusY)

  return getPointPositionBeforeCanvasTransformation(
    [oppositeX, oppositeY],
    shape.rotation,
    center,
    canvasOffset
  )
}

export const resizeEllipse = (
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableShape<'ellipse'>,
  selectionMode: SelectionModeResize,
  selectionPadding: number,
  currentScale: number,
  keepRatio = false
): DrawableShape<'ellipse'> => {
  const { center, borders } = getShapeInfos(originalShape, selectionPadding)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    originalShape.rotation,
    center,
    canvasOffset
  )

  const newCursorPosition = [cursorPositionBeforeResize[0], cursorPositionBeforeResize[1]]

  const scaledRadiusX =
    selectionMode.anchor[0] === 0.5
      ? originalShape.radiusX
      : (selectionMode.anchor[0] === 0
        ? borders.x +
        borders.width -
        newCursorPosition[0] +
        selectionPadding * (selectionMode.anchor[0] === 0 ? -2 : 2)
        : newCursorPosition[0] -
        borders.x -
        selectionPadding * (selectionMode.anchor[0] === 0 ? -2 : 2)) / 2

  const scaledRadiusY =
    selectionMode.anchor[1] === 0.5
      ? originalShape.radiusY
      : (selectionMode.anchor[1] === 0
        ? borders.y +
        borders.height -
        newCursorPosition[1] +
        selectionPadding * (selectionMode.anchor[1] === 0 ? -2 : 2)
        : newCursorPosition[1] -
        borders.y -
        selectionPadding * (selectionMode.anchor[1] === 0 ? -2 : 2)) / 2

  const [radiusXWithRatio, radiusYWithRatio] = keepRatio
    ? getNormalizedSize(originalShape.radiusX, originalShape.radiusY, scaledRadiusX, scaledRadiusY)
    : [scaledRadiusX, scaledRadiusY]

  const shapeWithNewDimensions = {
    ...originalShape,
    ...{
      radiusX: Math.abs(radiusXWithRatio),
      radiusY: Math.abs(radiusYWithRatio)
    }
  }
  const { center: shapeWithNewDimensionsCenter } = getShapeInfos(
    shapeWithNewDimensions,
    selectionPadding
  )

  const [oppTrueX, oppTrueY] = getEllipseOppositeAnchorAbsolutePosition(
    selectionMode.anchor,
    center,
    originalShape,
    canvasOffset
  )

  const [newOppTrueX, newOppTrueY] = getEllipseOppositeAnchorAbsolutePosition(
    selectionMode.anchor,
    shapeWithNewDimensionsCenter,
    shapeWithNewDimensions,
    canvasOffset,
    [radiusXWithRatio < 0, radiusYWithRatio < 0]
  )

  return buildPath(
    {
      ...shapeWithNewDimensions,
      x: shapeWithNewDimensions.x - (newOppTrueX - oppTrueX),
      y: shapeWithNewDimensions.y - (newOppTrueY - oppTrueY)
    },
    currentScale
  )
}
