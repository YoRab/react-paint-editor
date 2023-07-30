import _ from 'lodash/fp'
import { SelectionModeResize } from '../../types/Mode'
import type { Point, DrawableEllipse, Ellipse, Rect, DrawableShape } from '../../types/Shapes'
import type { ToolsSettingsType } from '../../types/tools'
import { updateCanvasContext } from '../../utils/canvas'
import {
  getPointPositionAfterCanvasTransformation,
  getPointPositionBeforeCanvasTransformation
} from '../../utils/intersect'
import { getNormalizedSize } from '../../utils/transform'
import { getShapeInfos } from '.'

export const createEllipse = (
  shape: {
    id: string
    icon: string
    label: string
    type: 'ellipse'
    settings: ToolsSettingsType<'ellipse'>
  },
  cursorPosition: Point
): DrawableEllipse | undefined => {
  return {
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
  }
}

export const drawEllipse = (ctx: CanvasRenderingContext2D, ellipse: Ellipse): void => {
  updateCanvasContext(ctx, ellipse.style)

  if (ctx.globalAlpha === 0) return

  ctx.beginPath()
  ctx.ellipse(ellipse.x, ellipse.y, ellipse.radiusX, ellipse.radiusY, 0, 0, 2 * Math.PI)
  ellipse.style?.fillColor !== 'transparent' && ctx.fill()
  ellipse.style?.strokeColor !== 'transparent' && ctx.stroke()
}

export const getEllipseBorder = (ellipse: Ellipse, selectionPadding: number): Rect => {
  return {
    x: ellipse.x - ellipse.radiusX - selectionPadding,
    width: (ellipse.radiusX + selectionPadding) * 2,
    y: ellipse.y - ellipse.radiusY - selectionPadding,
    height: (ellipse.radiusY + selectionPadding) * 2
  }
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
  originalShape: DrawableEllipse,
  selectionMode: SelectionModeResize,
  selectionPadding: number,
  keepRatio = false
): DrawableEllipse => {
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

  return {
    ...shapeWithNewDimensions,
    x: shapeWithNewDimensions.x - (newOppTrueX - oppTrueX),
    y: shapeWithNewDimensions.y - (newOppTrueY - oppTrueY)
  }
}
