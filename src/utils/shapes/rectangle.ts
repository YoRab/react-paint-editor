import { GridFormatType } from 'constants/app'
import _ from 'lodash/fp'
import { SelectionModeResize } from 'types/Mode'
import type { Point, DrawableRect, Rect, DrawableShape, DrawableSquare } from 'types/Shapes'
import type { ToolsSettingsType } from 'types/tools'
import {
  getPointPositionAfterCanvasTransformation,
  getPointPositionBeforeCanvasTransformation
} from 'utils/intersect'
import { getNormalizedSize, roundForGrid } from 'utils/transform'
import { getShapeInfos } from '.'

type RectangleOrSquareType<T> = T extends 'rect' ? DrawableRect : DrawableSquare

const createRecPath = <T extends DrawableShape & Rect>(rect: T) => {
  const path = new Path2D()
  path.rect(rect.x, rect.y, rect.width, rect.height)
  return path
}

const buildPath = <T extends DrawableShape & Rect>(rect: T) => {
  return {
    ...rect,
    path: createRecPath(rect)
  }
}

export const createRectangle = <T extends 'rect' | 'square'>(
  shape: {
    id: string
    type: T
    settings: ToolsSettingsType<T>
  },
  cursorPosition: Point
): RectangleOrSquareType<T> => {
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
  } as RectangleOrSquareType<T>
  return buildPath(recShape)
}

export const drawRect = (ctx: CanvasRenderingContext2D, shape: DrawableRect): void => {
  if (ctx.globalAlpha === 0 || !shape.path) return

  shape.style?.fillColor !== 'transparent' && ctx.fill(shape.path)
  shape.style?.strokeColor !== 'transparent' && ctx.stroke(shape.path)
}

export const legacyDrawRect = (ctx: CanvasRenderingContext2D, rect: Rect): void => {
  if (ctx.globalAlpha === 0) return

  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.width, rect.height)
  rect.style?.fillColor !== 'transparent' && ctx.fill()
  rect.style?.strokeColor !== 'transparent' && ctx.stroke()
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

export const translateRect = <T extends DrawableShape & Rect>(
  cursorPosition: Point,
  originalShape: T,
  originalCursorPosition: Point,
  gridFormat: GridFormatType
): T => {
  return buildPath({
    ...originalShape,
    x: roundForGrid(originalShape.x + cursorPosition[0] - originalCursorPosition[0], gridFormat),
    y: roundForGrid(originalShape.y + cursorPosition[1] - originalCursorPosition[1], gridFormat)
  })
}

export const resizeRect = <T extends DrawableShape & Rect>(
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: T,
  selectionMode: SelectionModeResize,
  selectionPadding: number,
  keepRatio = false
): T => {
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

  return buildPath({
    ...shapeWithNewDimensions,
    x: shapeWithNewDimensions.x - (newOppTrueX - oppTrueX),
    y: shapeWithNewDimensions.y - (newOppTrueY - oppTrueY)
  })
}
