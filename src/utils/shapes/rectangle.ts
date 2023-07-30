import { GridFormatType } from '../../constants/app'
import _ from 'lodash/fp'
import { SelectionModeResize } from '../../types/Mode'
import type { Point, DrawableShape, ShapeEntity, Rect, SelectionDefaultType } from '../../types/Shapes'
import type { ToolsSettingsType } from '../../types/tools'
import {
  getPointPositionAfterCanvasTransformation,
  getPointPositionBeforeCanvasTransformation
} from '../../utils/intersect'
import { getNormalizedSize, roundForGrid } from '../../utils/transform'
import { getShapeInfos } from '../../utils/shapes/index'
import { updateCanvasContext } from '../../utils/canvas'
import { createLinePath } from './line'
import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from '../../constants/shapes'
import { createCirclePath } from './circle'

type rectish = 'text' | 'rect' | 'square' | 'picture'

export const createRecPath = (rect: Rect) => {
  const path = new Path2D()
  path.rect(rect.x, rect.y, rect.width, rect.height)
  return path
}

const createRecSelectionPath = (
  rect: DrawableShape<rectish>,
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

const buildPath = <T extends DrawableShape<rectish>>(rect: T, currentScale: number): T => {
  return {
    ...rect,
    path: createRecPath(rect),
    selection: createRecSelectionPath(rect, currentScale)
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
  currentScale: number
): ShapeEntity<T> => {
  const recShape = {
    toolId: shape.id,
    type: shape.type,
    id: _.uniqueId(`${shape.type}_`),
    x: cursorPosition[0],
    y: cursorPosition[1],
    width: 1,
    height: 1,
    rotation: 0,
    style: {
      globalAlpha: shape.settings.opacity.default,
      fillColor: shape.settings.fillColor.default,
      strokeColor: shape.settings.strokeColor.default,
      lineWidth: shape.settings.lineWidth.default,
      lineDash: shape.settings.lineDash.default
    }
  } as unknown as ShapeEntity<T>
  return buildPath(recShape, currentScale) as ShapeEntity<T>
}

export const drawRect = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape<'rect' | 'square'>
): void => {
  if (ctx.globalAlpha === 0 || !shape.path) return

  shape.style?.fillColor !== 'transparent' && ctx.fill(shape.path)
  shape.style?.strokeColor !== 'transparent' && ctx.stroke(shape.path)
}

export const drawSelectionRect = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape<'rect' | 'square'>,
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

export const resizeRect = <T extends rectish>(
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableShape<T>,
  selectionMode: SelectionModeResize,
  selectionPadding: number,
  currentScale: number,
  keepRatio = false
): DrawableShape<T> => {
  const { center, borders } = getShapeInfos(originalShape, selectionPadding)

  const cusroPositionAfterShapeTransormation = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    originalShape.rotation,
    center,
    canvasOffset
  )

  const scaledWidth =
    selectionMode.anchor[0] === 0.5
      ? originalShape.width
      : selectionMode.anchor[0] === 0
        ? borders.x + borders.width - cusroPositionAfterShapeTransormation[0] + selectionPadding * -2
        : cusroPositionAfterShapeTransormation[0] - borders.x - selectionPadding * 2

  const scaledHeight =
    selectionMode.anchor[1] === 0.5
      ? originalShape.height
      : selectionMode.anchor[1] === 0
        ? borders.y + borders.height - cusroPositionAfterShapeTransormation[1] + selectionPadding * -2
        : cusroPositionAfterShapeTransormation[1] - borders.y - selectionPadding * 2

  const [widthWithRatio, heightWithRatio] = keepRatio
    ? getNormalizedSize(originalShape.width, originalShape.height, scaledWidth, scaledHeight)
    : [scaledWidth, scaledHeight]

  const shapeWithNewDimensions = {
    ...originalShape,
    width: Math.abs(widthWithRatio),
    height: Math.abs(heightWithRatio)
  }
  const { center: shapeWithNewDimensionsCenter } = getShapeInfos(
    shapeWithNewDimensions,
    selectionPadding
  )

  const [oppTrueX, oppTrueY] = getRectOppositeAnchorAbsolutePosition(
    selectionMode.anchor,
    center,
    originalShape,
    canvasOffset
  )

  const [newOppTrueX, newOppTrueY] = getRectOppositeAnchorAbsolutePosition(
    selectionMode.anchor,
    shapeWithNewDimensionsCenter,
    shapeWithNewDimensions,
    canvasOffset,
    [widthWithRatio < 0, heightWithRatio < 0]
  )

  return buildPath(
    {
      ...shapeWithNewDimensions,
      x: shapeWithNewDimensions.x - (newOppTrueX - oppTrueX),
      y: shapeWithNewDimensions.y - (newOppTrueY - oppTrueY)
    },
    currentScale
  ) as DrawableShape<T>
}
