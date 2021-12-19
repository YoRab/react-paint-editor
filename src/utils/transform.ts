import _ from 'lodash/fp'

import { getShapeInfos } from './shapeData'
import { SELECTION_PADDING } from 'constants/shapes'
import { SelectionModeData, SelectionModeLib, SelectionModeResize } from 'types/Mode'
import {
  DrawableCircle,
  DrawableEllipse,
  Point,
  DrawableRect,
  DrawableShape,
  DrawablePicture,
  Rect,
  Ellipse,
  Circle,
  DrawableLine,
  DrawablePolygon,
  DrawableBrush,
  DrawableText,
  Text
} from 'types/Shapes'
import {
  getPointPositionAfterCanvasTransformation,
  getPointPositionBeforeCanvasTransformation
} from './intersect'

export const getNormalizedSize = (originalShape: Rect, width: number, height: number) => {
  const originalRatio = originalShape.width / originalShape.height
  const newRatio = width / height
  if (newRatio > originalRatio || height < 0) {
    return width > originalShape.width
      ? [width, width / originalRatio]
      : [height * originalRatio, height]
  } else if (newRatio < originalRatio) {
    return height > originalShape.height
      ? [height * originalRatio, height]
      : [width, width / originalRatio]
  }
  return [width, height]
}

export const translateShape = (
  shape: DrawableShape,
  cursorPosition: Point,
  originalShape: DrawableShape,
  originalCursorPosition: Point
): DrawableShape => {
  return {
    ...shape,
    ...{
      translation: [
        originalShape.translation[0] + cursorPosition[0] - originalCursorPosition[0],
        originalShape.translation[1] + cursorPosition[1] - originalCursorPosition[1]
      ]
    }
  }
}

export const rotateShape = (
  shape: DrawableShape,
  cursorPosition: Point,
  originalShape: DrawableShape,
  originalCursorPosition: Point,
  shapeCenter: Point
) => {
  const p1x = shapeCenter[0] + originalShape.translation[0] - originalCursorPosition[0]
  const p1y = shapeCenter[1] + originalShape.translation[1] - originalCursorPosition[1]
  const p2x = shapeCenter[0] + originalShape.translation[0] - cursorPosition[0]
  const p2y = shapeCenter[1] + originalShape.translation[1] - cursorPosition[1]
  const rotation = originalShape.rotation + Math.atan2(p2y, p2x) - Math.atan2(p1y, p1x)
  return {
    ...shape,
    ...{
      rotation
    }
  }
}

export const paintNewPointToShape = (shape: DrawableBrush, cursorPosition: Point) => {
  return {
    ...shape,
    ...{
      points: _.set(
        shape.points.length - 1,
        [...shape.points[shape.points.length - 1], cursorPosition],
        shape.points
      )
    }
  }
}

export const createNewPointGroupToShape = (shape: DrawableBrush, cursorPosition: Point) => {
  return {
    ...shape,
    ...{
      points: _.set(shape.points.length, [cursorPosition], shape.points)
    }
  }
}

export const resizeBrush = (
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableBrush,
  selectionMode: SelectionModeResize
): DrawableBrush => {
  const { center, borders } = getShapeInfos(originalShape)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    canvasOffset,
    originalShape.translation,
    originalShape.rotation,
    center
  )

  const scaledWidth =
    selectionMode.anchor[0] === 0.5
      ? originalShape.scale[0]
      : selectionMode.anchor[0] === 0
      ? (borders.x + borders.width - cursorPositionBeforeResize[0] + SELECTION_PADDING * -2) /
        (borders.width + SELECTION_PADDING * -2)
      : (cursorPositionBeforeResize[0] - borders.x - SELECTION_PADDING * 2) /
        (borders.width - SELECTION_PADDING * 2)

  const scaledHeight =
    selectionMode.anchor[1] === 0.5
      ? originalShape.scale[1]
      : selectionMode.anchor[1] === 0
      ? (borders.y + borders.height - cursorPositionBeforeResize[1] + SELECTION_PADDING * -2) /
        (borders.height + SELECTION_PADDING * -2)
      : (cursorPositionBeforeResize[1] - borders.y - SELECTION_PADDING * 2) /
        (borders.height - SELECTION_PADDING * 2)

  const shapeWithNewDimensions = {
    ...originalShape,
    ...{
      scale: [scaledWidth, scaledHeight] as Point
    }
  }
  const { center: shapeWithNewDimensionsCenter } = getShapeInfos(shapeWithNewDimensions)

  return shapeWithNewDimensions
  // const [oppTrueX, oppTrueY] = getRectOppositeAnchorAbsolutePosition(
  //   selectionMode.anchor,
  //   center,
  //   originalShape
  // )

  // const [newOppTrueX, newOppTrueY] = getRectOppositeAnchorAbsolutePosition(
  //   selectionMode.anchor,
  //   shapeWithNewDimensionsCenter,
  //   shapeWithNewDimensions,
  //   [widthWithRatio < 0, heightWithRatio < 0]
  // )

  // return {
  //   ...shapeWithNewDimensions,
  //   ...{
  //     translation: [
  //       originalShape.translation[0] - (newOppTrueX - oppTrueX),
  //       originalShape.translation[1] - (newOppTrueY - oppTrueY)
  //     ]
  //   }
  // }
}

export const resizeLine = (
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableLine | DrawablePolygon,
  selectionMode: SelectionModeResize<number>
): DrawableLine | DrawablePolygon => {
  const { center } = getShapeInfos(originalShape)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    canvasOffset,
    originalShape.translation,
    originalShape.rotation,
    center
  )
  const updatedShape = _.set(
    ['points', selectionMode.anchor],
    cursorPositionBeforeResize,
    originalShape
  )

  return updatedShape
}

export const updatePolygonLinesCount = (
  shape: DrawablePolygon,
  newPointsCount: number
): DrawablePolygon => {
  const currentPointsCount = shape.points.length
  if (currentPointsCount === newPointsCount) return shape
  if (currentPointsCount > newPointsCount) {
    return _.set('points', shape.points.slice(0, newPointsCount), shape)
  } else {
    //TODO : better distribution for new points
    const nbPointsToAdd = newPointsCount - currentPointsCount
    const newPoints = _.flow(
      _.range(0),
      _.map(index => [
        shape.points[0][0] +
          ((shape.points[1][0] - shape.points[0][0]) * (index + 1)) / (nbPointsToAdd + 1),
        shape.points[0][1] +
          ((shape.points[1][1] - shape.points[0][1]) * (index + 1)) / (nbPointsToAdd + 1)
      ])
    )(nbPointsToAdd) as Point[]

    return _.set(
      'points',
      [shape.points[0], ...newPoints, ...shape.points.slice(1, shape.points.length)],
      shape
    )
  }
}

export const resizeCircle = (
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableCircle,
  selectionMode: SelectionModeResize
): DrawableCircle => {
  const { center, borders } = getShapeInfos(originalShape)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    canvasOffset,
    originalShape.translation,
    originalShape.rotation,
    center
  )

  const newCursorPosition = [cursorPositionBeforeResize[0], cursorPositionBeforeResize[1]]

  const scaledRadius =
    selectionMode.anchor[1] === 0.5
      ? (selectionMode.anchor[0] === 0
          ? borders.x +
            borders.width -
            newCursorPosition[0] +
            SELECTION_PADDING * (selectionMode.anchor[0] === 0 ? -2 : 2)
          : newCursorPosition[0] -
            borders.x -
            SELECTION_PADDING * (selectionMode.anchor[0] === 0 ? -2 : 2)) / 2
      : (selectionMode.anchor[1] === 0
          ? borders.y +
            borders.height -
            newCursorPosition[1] +
            SELECTION_PADDING * (selectionMode.anchor[1] === 0 ? -2 : 2)
          : newCursorPosition[1] -
            borders.y -
            SELECTION_PADDING * (selectionMode.anchor[1] === 0 ? -2 : 2)) / 2

  const shapeWithNewDimensions = {
    ...originalShape,
    ...{
      radius: Math.abs(scaledRadius)
    }
  }
  const { center: shapeWithNewDimensionsCenter } = getShapeInfos(shapeWithNewDimensions)

  const [oppTrueX, oppTrueY] = getCircleOppositeAnchorAbsolutePosition(
    selectionMode.anchor,
    center,
    originalShape
  )

  const [newOppTrueX, newOppTrueY] = getCircleOppositeAnchorAbsolutePosition(
    selectionMode.anchor,
    shapeWithNewDimensionsCenter,
    shapeWithNewDimensions,
    [scaledRadius < 0, scaledRadius < 0]
  )

  return {
    ...shapeWithNewDimensions,
    ...{
      translation: [
        originalShape.translation[0] - (newOppTrueX - oppTrueX),
        originalShape.translation[1] - (newOppTrueY - oppTrueY)
      ]
    }
  }
}

export const resizeEllipse = (
  cursorPosition: Point,
  canvasOffset: Point,

  originalShape: DrawableEllipse,
  selectionMode: SelectionModeResize
): DrawableEllipse => {
  const { center, borders } = getShapeInfos(originalShape)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    canvasOffset,
    originalShape.translation,
    originalShape.rotation,
    center
  )

  const newCursorPosition = [cursorPositionBeforeResize[0], cursorPositionBeforeResize[1]]

  const scaledRadiusX =
    selectionMode.anchor[0] === 0.5
      ? originalShape.radiusX
      : (selectionMode.anchor[0] === 0
          ? borders.x +
            borders.width -
            newCursorPosition[0] +
            SELECTION_PADDING * (selectionMode.anchor[0] === 0 ? -2 : 2)
          : newCursorPosition[0] -
            borders.x -
            SELECTION_PADDING * (selectionMode.anchor[0] === 0 ? -2 : 2)) / 2

  const scaledRadiusY =
    selectionMode.anchor[1] === 0.5
      ? originalShape.radiusY
      : (selectionMode.anchor[1] === 0
          ? borders.y +
            borders.height -
            newCursorPosition[1] +
            SELECTION_PADDING * (selectionMode.anchor[1] === 0 ? -2 : 2)
          : newCursorPosition[1] -
            borders.y -
            SELECTION_PADDING * (selectionMode.anchor[1] === 0 ? -2 : 2)) / 2

  const shapeWithNewDimensions = {
    ...originalShape,
    ...{
      radiusX: Math.abs(scaledRadiusX),
      radiusY: Math.abs(scaledRadiusY)
    }
  }
  const { center: shapeWithNewDimensionsCenter } = getShapeInfos(shapeWithNewDimensions)

  const [oppTrueX, oppTrueY] = getEllipseOppositeAnchorAbsolutePosition(
    selectionMode.anchor,
    center,
    originalShape
  )

  const [newOppTrueX, newOppTrueY] = getEllipseOppositeAnchorAbsolutePosition(
    selectionMode.anchor,
    shapeWithNewDimensionsCenter,
    shapeWithNewDimensions,
    [scaledRadiusX < 0, scaledRadiusY < 0]
  )

  return {
    ...shapeWithNewDimensions,
    ...{
      translation: [
        originalShape.translation[0] - (newOppTrueX - oppTrueX),
        originalShape.translation[1] - (newOppTrueY - oppTrueY)
      ]
    }
  }
}

export const resizeRect = <T extends DrawableShape & Rect>(
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: T,
  selectionMode: SelectionModeResize,
  keepRatio = false
): T => {
  const { center, borders } = getShapeInfos(originalShape)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    canvasOffset,

    originalShape.translation,
    originalShape.rotation,
    center
  )

  const scaledWidth =
    selectionMode.anchor[0] === 0.5
      ? originalShape.width
      : selectionMode.anchor[0] === 0
      ? borders.x + borders.width - cursorPositionBeforeResize[0] + SELECTION_PADDING * -2
      : cursorPositionBeforeResize[0] - borders.x - SELECTION_PADDING * 2

  const scaledHeight =
    selectionMode.anchor[1] === 0.5
      ? originalShape.height
      : selectionMode.anchor[1] === 0
      ? borders.y + borders.height - cursorPositionBeforeResize[1] + SELECTION_PADDING * -2
      : cursorPositionBeforeResize[1] - borders.y - SELECTION_PADDING * 2

  const [widthWithRatio, heightWithRatio] = keepRatio
    ? getNormalizedSize(originalShape, scaledWidth, scaledHeight)
    : [scaledWidth, scaledHeight]

  const shapeWithNewDimensions = {
    ...originalShape,
    ...{
      width: Math.abs(widthWithRatio),
      height: Math.abs(heightWithRatio)
    }
  }
  const { center: shapeWithNewDimensionsCenter } = getShapeInfos(shapeWithNewDimensions)

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
    ...{
      translation: [
        originalShape.translation[0] - (newOppTrueX - oppTrueX),
        originalShape.translation[1] - (newOppTrueY - oppTrueY)
      ]
    }
  }
}

export const resizeText = <T extends DrawableShape & Text>(
  ctx: CanvasRenderingContext2D,
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: T,
  selectionMode: SelectionModeResize
): T => {
  const newRect = resizeRect(cursorPosition, canvasOffset, originalShape, selectionMode, true)
  return {
    ...newRect,
    fontSize: calculateTextFontSize(ctx, newRect.value, '', newRect.width)
  }
}

const getRectOppositeAnchorAbsolutePosition = <T extends DrawableShape & Rect>(
  anchor: Point,
  center: Point,
  shape: T,
  [negW, negH] = [false, false]
) => {
  const oppositeX =
    (anchor[0] === 0.5
      ? shape.x + shape.width / 2
      : anchor[0] === 0
      ? shape.x + (negW ? 0 : shape.width)
      : shape.x + (negW ? shape.width : 0)) + shape.translation[0]
  const oppositeY =
    (anchor[1] === 0.5
      ? shape.y + shape.height / 2
      : anchor[1] === 0
      ? shape.y + (negH ? 0 : shape.height)
      : shape.y + (negH ? shape.height : 0)) + shape.translation[1]

  return getPointPositionBeforeCanvasTransformation(
    [oppositeX, oppositeY],
    shape.translation,
    shape.rotation,
    center
  )
}

const getEllipseOppositeAnchorAbsolutePosition = <T extends DrawableShape & Ellipse>(
  anchor: Point,
  center: Point,
  shape: T,
  [negW, negH] = [false, false]
) => {
  const oppositeX =
    (anchor[0] === 0.5
      ? shape.x + shape.radiusX / 2
      : anchor[0] === 0
      ? shape.x + (negW ? -shape.radiusX : shape.radiusX)
      : shape.x + (negW ? shape.radiusX : -shape.radiusX)) + shape.translation[0]
  const oppositeY =
    (anchor[1] === 0.5
      ? shape.y + shape.radiusY / 2
      : anchor[1] === 0
      ? shape.y + (negH ? -shape.radiusY : shape.radiusY)
      : shape.y + (negH ? shape.radiusY : -shape.radiusY)) + shape.translation[1]

  return getPointPositionBeforeCanvasTransformation(
    [oppositeX, oppositeY],
    shape.translation,
    shape.rotation,
    center
  )
}

const getCircleOppositeAnchorAbsolutePosition = <T extends DrawableShape & Circle>(
  anchor: Point,
  center: Point,
  shape: T,
  [negW, negH] = [false, false]
) => {
  const oppositeX =
    (anchor[0] === 0.5
      ? shape.x
      : anchor[0] === 0
      ? shape.x + (negW ? -shape.radius : shape.radius)
      : shape.x + (negW ? shape.radius : -shape.radius)) + shape.translation[0]
  const oppositeY =
    (anchor[1] === 0.5
      ? shape.y
      : anchor[1] === 0
      ? shape.y + (negH ? -shape.radius : shape.radius)
      : shape.y + (negH ? shape.radius : -shape.radius)) + shape.translation[1]

  return getPointPositionBeforeCanvasTransformation(
    [oppositeX, oppositeY],
    shape.translation,
    shape.rotation,
    center
  )
}

export const resizePicture = (
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawablePicture,
  selectionMode: SelectionModeResize
): DrawablePicture => {
  return resizeRect(cursorPosition, canvasOffset, originalShape, selectionMode, true)
}

export const resizeShape = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape,
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableShape,
  selectionMode: SelectionModeData<Point | number>
): DrawableShape => {
  if (shape.type === 'line' || shape.type === 'polygon')
    return resizeLine(
      cursorPosition,
      canvasOffset,
      originalShape as DrawableLine,
      selectionMode as SelectionModeResize<number>
    )
  else if (shape.type === 'brush')
    return resizeBrush(
      cursorPosition,
      canvasOffset,
      originalShape as DrawableBrush,
      selectionMode as SelectionModeResize
    )
  else if (shape.type === 'circle')
    return resizeCircle(
      cursorPosition,
      canvasOffset,
      originalShape as DrawableCircle,
      selectionMode as SelectionModeResize
    )
  else if (shape.type === 'ellipse')
    return resizeEllipse(
      cursorPosition,
      canvasOffset,
      originalShape as DrawableEllipse,
      selectionMode as SelectionModeResize
    )
  else if (shape.type === 'rect')
    return resizeRect(
      cursorPosition,
      canvasOffset,
      originalShape as DrawableRect,
      selectionMode as SelectionModeResize
    )
  else if (shape.type === 'text')
    return resizeText(
      ctx,
      cursorPosition,
      canvasOffset,
      originalShape as DrawableText,
      selectionMode as SelectionModeResize
    )
  else if (shape.type === 'picture')
    return resizePicture(
      cursorPosition,
      canvasOffset,
      originalShape as DrawablePicture,
      selectionMode as SelectionModeResize
    )
  return shape
}

export const transformShape = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape,
  cursorPosition: Point,
  canvasOffset: Point,
  selectionMode: SelectionModeData<Point | number>
) => {
  if (selectionMode.mode === SelectionModeLib.brush) {
    return paintNewPointToShape(shape as DrawableBrush, cursorPosition)
  } else if (selectionMode.mode === SelectionModeLib.translate) {
    return translateShape(
      shape,
      cursorPosition,
      selectionMode.originalShape,
      selectionMode.cursorStartPosition
    )
  } else if (selectionMode.mode === SelectionModeLib.rotate) {
    return rotateShape(
      shape,
      cursorPosition,
      selectionMode.originalShape,
      selectionMode.cursorStartPosition,
      selectionMode.center
    )
  } else if (selectionMode.mode === SelectionModeLib.resize) {
    return resizeShape(
      ctx,
      shape,
      cursorPosition,
      canvasOffset,
      selectionMode.originalShape,
      selectionMode
    )
  }
  return shape
}

export const calculateTextFontSize = (
  ctx: CanvasRenderingContext2D,
  text: string[],
  fontFace: string,
  maxWidth: number
) => {
  ctx.font = `1px serif`
  return (
    _.flow(
      _.map((value: string) => maxWidth / ctx.measureText(value).width),
      _.min
    )(text) ?? 12
  )
}
