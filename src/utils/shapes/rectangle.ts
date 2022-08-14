import _ from 'lodash/fp'
import { SelectionModeResize } from 'types/Mode'
import type { Point, DrawableRect, Rect, DrawableShape } from 'types/Shapes'
import type { ToolsSettingsType } from 'types/tools'
import { updateCanvasContext } from 'utils/canvas'
import {
  getPointPositionAfterCanvasTransformation,
  getPointPositionBeforeCanvasTransformation
} from 'utils/intersect'
import { getNormalizedSize } from 'utils/transform'
import { getShapeInfos } from '.'

export const createRectangle = (
  shape: {
    id: string
    icon: string
    label: string
    type: 'rect'
    settings: ToolsSettingsType<'rect'>
  },
  cursorPosition: Point
): DrawableRect | undefined => {
  return {
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
  }
}

export const drawRect = (ctx: CanvasRenderingContext2D, rect: Rect): void => {
  updateCanvasContext(ctx, rect.style)

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

const getRectOppositeAnchorAbsolutePosition = <T extends DrawableShape & Rect>(
  anchor: Point,
  center: Point,
  shape: T,
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

  return getPointPositionBeforeCanvasTransformation([oppositeX, oppositeY], shape.rotation, center)
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
    canvasOffset,
    originalShape.rotation,
    center
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
    originalShape
  )

  const [newOppTrueX, newOppTrueY] = getRectOppositeAnchorAbsolutePosition(
    selectionMode.anchor,
    shapeWithNewDimensionsCenter,
    shapeWithNewDimensions,
    [widthWithRatio < 0, heightWithRatio < 0]
  )

  return {
    ...shapeWithNewDimensions,
    x: shapeWithNewDimensions.x - (newOppTrueX - oppTrueX),
    y: shapeWithNewDimensions.y - (newOppTrueY - oppTrueY)
  }
}
