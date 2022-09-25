import { GridFormatType } from 'constants/app'
import _ from 'lodash/fp'
import { SelectionModeResize } from 'types/Mode'
import type { Point, Circle, Rect, DrawableShape, ShapeEntity } from 'types/Shapes'
import type { ToolsSettingsType } from 'types/tools'
import {
  getPointPositionAfterCanvasTransformation,
  getPointPositionBeforeCanvasTransformation
} from 'utils/intersect'
import { roundForGrid } from 'utils/transform'
import { getShapeInfos } from 'utils/shapes/index'

const createCirclePath = (shape: DrawableShape<'circle'>) => {
  const path = new Path2D()
  path.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI)
  return path
}

const buildPath = <T extends DrawableShape<'circle'>>(shape: T): T => {
  return {
    ...shape,
    path: createCirclePath(shape)
  }
}

export const createCircle = (
  shape: {
    id: string
    type: 'circle'
    settings: ToolsSettingsType<'circle'>
  },
  cursorPosition: Point
): ShapeEntity<'circle'> => {
  return buildPath({
    toolId: shape.id,
    type: shape.type,
    id: _.uniqueId(`${shape.type}_`),
    x: cursorPosition[0],
    y: cursorPosition[1],
    radius: 1,
    rotation: 0,
    style: {
      globalAlpha: shape.settings.opacity.default,
      fillColor: shape.settings.fillColor.default,
      strokeColor: shape.settings.strokeColor.default,
      lineWidth: shape.settings.lineWidth.default,
      lineDash: shape.settings.lineDash.default
    }
  })
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
  gridFormat: GridFormatType
) => {
  return buildPath({
    ...originalShape,
    x: roundForGrid(originalShape.x + cursorPosition[0] - originalCursorPosition[0], gridFormat),
    y: roundForGrid(originalShape.y + cursorPosition[1] - originalCursorPosition[1], gridFormat)
  })
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
  canvasOffset: Point,
  originalShape: DrawableShape<'circle'>,
  selectionMode: SelectionModeResize,
  selectionPadding: number
): DrawableShape<'circle'> => {
  const { center, borders } = getShapeInfos(originalShape, selectionPadding)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    originalShape.rotation,
    center,
    canvasOffset
  )

  const newCursorPosition = [cursorPositionBeforeResize[0], cursorPositionBeforeResize[1]]

  const scaledRadius =
    selectionMode.anchor[1] === 0.5
      ? (selectionMode.anchor[0] === 0
          ? borders.x +
            borders.width -
            newCursorPosition[0] +
            selectionPadding * (selectionMode.anchor[0] === 0 ? -2 : 2)
          : newCursorPosition[0] -
            borders.x -
            selectionPadding * (selectionMode.anchor[0] === 0 ? -2 : 2)) / 2
      : (selectionMode.anchor[1] === 0
          ? borders.y +
            borders.height -
            newCursorPosition[1] +
            selectionPadding * (selectionMode.anchor[1] === 0 ? -2 : 2)
          : newCursorPosition[1] -
            borders.y -
            selectionPadding * (selectionMode.anchor[1] === 0 ? -2 : 2)) / 2

  const shapeWithNewDimensions = {
    ...originalShape,
    ...{
      radius: Math.abs(scaledRadius)
    }
  }
  const { center: shapeWithNewDimensionsCenter } = getShapeInfos(
    shapeWithNewDimensions,
    selectionPadding
  )

  const [oppTrueX, oppTrueY] = getCircleOppositeAnchorAbsolutePosition(
    selectionMode.anchor,
    center,
    originalShape,
    canvasOffset
  )

  const [newOppTrueX, newOppTrueY] = getCircleOppositeAnchorAbsolutePosition(
    selectionMode.anchor,
    shapeWithNewDimensionsCenter,
    shapeWithNewDimensions,
    canvasOffset,
    [scaledRadius < 0, scaledRadius < 0]
  )

  return buildPath({
    ...shapeWithNewDimensions,
    x: shapeWithNewDimensions.x - (newOppTrueX - oppTrueX),
    y: shapeWithNewDimensions.y - (newOppTrueY - oppTrueY)
  })
}
