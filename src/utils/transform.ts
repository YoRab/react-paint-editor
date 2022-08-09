import _ from 'lodash/fp'

import { getShapeInfos } from './shapeData'
import type { SelectionModeData, SelectionModeResize } from 'types/Mode'
import type {
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
  Text,
  DrawableCurve
} from 'types/Shapes'
import {
  getPointPositionAfterCanvasTransformation,
  getPointPositionBeforeCanvasTransformation
} from './intersect'
import {
  GRID_ROTATION_STEPS,
  GRID_STEP,
  STYLE_FONT_DEFAULT,
  STYLE_FONT_SIZE_DEFAULT
} from 'constants/style'

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

export const roundForGrid = (value: number, withGrid: boolean) => {
  const step = value >= 0 ? GRID_STEP : -GRID_STEP
  return withGrid ? value + step / 2 - ((value + step / 2) % step) : Math.round(value)
}

export const translateShape = (
  cursorPosition: Point,
  originalShape: DrawableShape,
  originalCursorPosition: Point,
  withGrid: boolean
): DrawableShape => {
  switch (originalShape.type) {
    case 'rect':
    case 'square':
    case 'ellipse':
    case 'circle':
    case 'picture':
    default:
      return {
        ...originalShape,
        x: roundForGrid(originalShape.x + cursorPosition[0] - originalCursorPosition[0], withGrid),
        y: roundForGrid(originalShape.y + cursorPosition[1] - originalCursorPosition[1], withGrid)
      }
    case 'line':
      return {
        ...originalShape,
        points: originalShape.points.map(([x, y]) => [
          roundForGrid(x + cursorPosition[0] - originalCursorPosition[0], withGrid),
          roundForGrid(y + cursorPosition[1] - originalCursorPosition[1], withGrid)
        ]) as [Point, Point]
      }
    case 'polygon':
    case 'curve':
      if (withGrid) {
        const { borders } = getShapeInfos(originalShape, 0)
        const translationX =
          roundForGrid(borders.x + cursorPosition[0] - originalCursorPosition[0], true) - borders.x
        const translationY =
          roundForGrid(borders.y + cursorPosition[1] - originalCursorPosition[1], true) - borders.y
        return {
          ...originalShape,
          points: originalShape.points.map(([x, y]) => [x + translationX, y + translationY])
        }
      } else {
        return {
          ...originalShape,
          points: originalShape.points.map(([x, y]) => [
            roundForGrid(x + cursorPosition[0] - originalCursorPosition[0], withGrid),
            roundForGrid(y + cursorPosition[1] - originalCursorPosition[1], withGrid)
          ]) as Point[]
        }
      }
    case 'brush':
      if (withGrid) {
        const { borders } = getShapeInfos(originalShape, 0)
        const translationX =
          roundForGrid(borders.x + cursorPosition[0] - originalCursorPosition[0], true) - borders.x
        const translationY =
          roundForGrid(borders.y + cursorPosition[1] - originalCursorPosition[1], true) - borders.y
        return {
          ...originalShape,
          points: originalShape.points.map(coord =>
            coord.map(([x, y]) => [x + translationX, y + translationY])
          ) as Point[][]
        }
      } else {
        return {
          ...originalShape,
          points: originalShape.points.map(coord =>
            coord.map(([x, y]) => [
              x + cursorPosition[0] - originalCursorPosition[0],
              y + cursorPosition[1] - originalCursorPosition[1]
            ])
          ) as Point[][]
        }
      }
  }
}
export const rotateShape = (
  shape: DrawableShape,
  cursorPosition: Point,
  originalShape: DrawableShape,
  originalCursorPosition: Point,
  shapeCenter: Point,
  withGrid: boolean
) => {
  const p1x = shapeCenter[0] - originalCursorPosition[0]
  const p1y = shapeCenter[1] - originalCursorPosition[1]
  const p2x = shapeCenter[0] - cursorPosition[0]
  const p2y = shapeCenter[1] - cursorPosition[1]
  const rotation = originalShape.rotation + Math.atan2(p2y, p2x) - Math.atan2(p1y, p1x)
  return {
    ...shape,
    ...{
      rotation: withGrid
        ? rotation +
          Math.PI / GRID_ROTATION_STEPS / 2 -
          ((rotation + Math.PI / GRID_ROTATION_STEPS / 2) % (Math.PI / GRID_ROTATION_STEPS))
        : rotation
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
  selectionMode: SelectionModeResize,
  selectionPadding: number
): DrawableBrush => {
  const { center, borders } = getShapeInfos(originalShape, selectionPadding)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    canvasOffset,
    originalShape.rotation,
    center
  )

  const scaledWidth =
    selectionMode.anchor[0] === 0.5
      ? 1
      : selectionMode.anchor[0] === 0
      ? (borders.x + borders.width - cursorPositionBeforeResize[0] + selectionPadding * -2) /
        (borders.width + selectionPadding * -2)
      : (cursorPositionBeforeResize[0] - borders.x - selectionPadding * 2) /
        (borders.width - selectionPadding * 2)

  const scaledHeight =
    selectionMode.anchor[1] === 0.5
      ? 1
      : selectionMode.anchor[1] === 0
      ? (borders.y + borders.height - cursorPositionBeforeResize[1] + selectionPadding * -2) /
        (borders.height + selectionPadding * -2)
      : (cursorPositionBeforeResize[1] - borders.y - selectionPadding * 2) /
        (borders.height - selectionPadding * 2)

  const shapeWithNewDimensions = {
    ...originalShape,
    points: originalShape.points.map(points => {
      return points.map(
        point =>
          [
            (point[0] - borders.x) * scaledWidth + borders.x,
            (point[1] - borders.y) * scaledHeight + borders.y
          ] as Point
      )
    })
  }

  const { center: shapeWithNewDimensionsCenter, borders: shapeWithNewDimensionsBorders } =
    getShapeInfos(shapeWithNewDimensions, selectionPadding)

  const [oppTrueX, oppTrueY] = getRectOppositeAnchorAbsolutePosition(selectionMode.anchor, center, {
    ...originalShape,
    ...borders
  })

  const [newOppTrueX, newOppTrueY] = getRectOppositeAnchorAbsolutePosition(
    selectionMode.anchor,
    shapeWithNewDimensionsCenter,
    { ...shapeWithNewDimensions, ...shapeWithNewDimensionsBorders },
    [scaledWidth < 0, scaledHeight < 0]
  )

  return {
    ...shapeWithNewDimensions,
    points: shapeWithNewDimensions.points.map(coord =>
      coord.map(([x, y]) => [x - (newOppTrueX - oppTrueX), y - (newOppTrueY - oppTrueY)])
    )
  }
}
export const resizeLine = (
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableLine | DrawablePolygon | DrawableCurve,
  selectionMode: SelectionModeResize<number>,
  selectionPadding: number
): DrawableLine | DrawablePolygon | DrawableCurve => {
  const { center } = getShapeInfos(originalShape, selectionPadding)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    canvasOffset,
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
    const totalPoints = shape.points.slice(0, newPointsCount)
    return {
      ...shape,
      points: totalPoints,
      style: {
        ...shape.style,
        pointsCount: totalPoints.length
      }
    }
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
    const totalPoints = [
      shape.points[0],
      ...newPoints,
      ...shape.points.slice(1, shape.points.length)
    ]

    return {
      ...shape,
      points: totalPoints,
      style: {
        ...shape.style,
        pointsCount: totalPoints.length
      }
    }
  }
}

export const resizeCircle = (
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableCircle,
  selectionMode: SelectionModeResize,
  selectionPadding: number
): DrawableCircle => {
  const { center, borders } = getShapeInfos(originalShape, selectionPadding)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    canvasOffset,
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
    x: shapeWithNewDimensions.x - (newOppTrueX - oppTrueX),
    y: shapeWithNewDimensions.y - (newOppTrueY - oppTrueY)
  }
}

export const resizeEllipse = (
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableEllipse,
  selectionMode: SelectionModeResize,
  selectionPadding: number
): DrawableEllipse => {
  const { center, borders } = getShapeInfos(originalShape, selectionPadding)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    canvasOffset,
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

  const shapeWithNewDimensions = {
    ...originalShape,
    ...{
      radiusX: Math.abs(scaledRadiusX),
      radiusY: Math.abs(scaledRadiusY)
    }
  }
  const { center: shapeWithNewDimensionsCenter } = getShapeInfos(
    shapeWithNewDimensions,
    selectionPadding
  )

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
    x: shapeWithNewDimensions.x - (newOppTrueX - oppTrueX),
    y: shapeWithNewDimensions.y - (newOppTrueY - oppTrueY)
  }
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

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    canvasOffset,
    originalShape.rotation,
    center
  )

  const scaledWidth =
    selectionMode.anchor[0] === 0.5
      ? originalShape.width
      : selectionMode.anchor[0] === 0
      ? borders.x + borders.width - cursorPositionBeforeResize[0] + selectionPadding * -2
      : cursorPositionBeforeResize[0] - borders.x - selectionPadding * 2

  const scaledHeight =
    selectionMode.anchor[1] === 0.5
      ? originalShape.height
      : selectionMode.anchor[1] === 0
      ? borders.y + borders.height - cursorPositionBeforeResize[1] + selectionPadding * -2
      : cursorPositionBeforeResize[1] - borders.y - selectionPadding * 2

  const [widthWithRatio, heightWithRatio] = keepRatio
    ? getNormalizedSize(originalShape, scaledWidth, scaledHeight)
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

export const resizeText = <T extends DrawableShape & Text>(
  ctx: CanvasRenderingContext2D,
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: T,
  selectionMode: SelectionModeResize,
  selectionPadding: number
): T => {
  const newRect = resizeRect(
    cursorPosition,
    canvasOffset,
    originalShape,
    selectionMode,
    selectionPadding,
    true
  )
  return {
    ...newRect,
    fontSize: calculateTextFontSize(
      ctx,
      newRect.value,
      newRect.width,
      newRect.style?.fontBold ?? false,
      newRect.style?.fontItalic ?? false,
      newRect.style?.fontFamily
    )
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

const getEllipseOppositeAnchorAbsolutePosition = <T extends DrawableShape & Ellipse>(
  anchor: Point,
  center: Point,
  shape: T,
  [negW, negH] = [false, false]
) => {
  const oppositeX =
    anchor[0] === 0.5
      ? shape.x + shape.radiusX / 2
      : anchor[0] === 0
      ? shape.x + (negW ? -shape.radiusX : shape.radiusX)
      : shape.x + (negW ? shape.radiusX : -shape.radiusX)
  const oppositeY =
    anchor[1] === 0.5
      ? shape.y + shape.radiusY / 2
      : anchor[1] === 0
      ? shape.y + (negH ? -shape.radiusY : shape.radiusY)
      : shape.y + (negH ? shape.radiusY : -shape.radiusY)

  return getPointPositionBeforeCanvasTransformation([oppositeX, oppositeY], shape.rotation, center)
}

const getCircleOppositeAnchorAbsolutePosition = <T extends DrawableShape & Circle>(
  anchor: Point,
  center: Point,
  shape: T,
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

  return getPointPositionBeforeCanvasTransformation([oppositeX, oppositeY], shape.rotation, center)
}

export const resizePicture = (
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawablePicture,
  selectionMode: SelectionModeResize,
  selectionPadding: number
): DrawablePicture => {
  return resizeRect(
    cursorPosition,
    canvasOffset,
    originalShape,
    selectionMode,
    selectionPadding,
    true
  )
}

export const resizeShape = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape,
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableShape,
  selectionMode: SelectionModeData<Point | number>,
  selectionPadding: number
): DrawableShape => {
  if (shape.type === 'line' || shape.type === 'polygon' || shape.type === 'curve')
    return resizeLine(
      cursorPosition,
      canvasOffset,
      originalShape as DrawableLine,
      selectionMode as SelectionModeResize<number>,
      selectionPadding
    )
  else if (shape.type === 'brush')
    return resizeBrush(
      cursorPosition,
      canvasOffset,
      originalShape as DrawableBrush,
      selectionMode as SelectionModeResize,
      selectionPadding
    )
  else if (shape.type === 'circle')
    return resizeCircle(
      cursorPosition,
      canvasOffset,
      originalShape as DrawableCircle,
      selectionMode as SelectionModeResize,
      selectionPadding
    )
  else if (shape.type === 'ellipse')
    return resizeEllipse(
      cursorPosition,
      canvasOffset,
      originalShape as DrawableEllipse,
      selectionMode as SelectionModeResize,
      selectionPadding
    )
  else if (shape.type === 'rect')
    return resizeRect(
      cursorPosition,
      canvasOffset,
      originalShape as DrawableRect,
      selectionMode as SelectionModeResize,
      selectionPadding
    )
  else if (shape.type === 'square')
    return resizeRect(
      cursorPosition,
      canvasOffset,
      originalShape as DrawableRect,
      selectionMode as SelectionModeResize,
      selectionPadding,
      true
    )
  else if (shape.type === 'text')
    return resizeText(
      ctx,
      cursorPosition,
      canvasOffset,
      originalShape as DrawableText,
      selectionMode as SelectionModeResize,
      selectionPadding
    )
  else if (shape.type === 'picture')
    return resizePicture(
      cursorPosition,
      canvasOffset,
      originalShape as DrawablePicture,
      selectionMode as SelectionModeResize,
      selectionPadding
    )
  return shape
}

export const transformShape = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape,
  cursorPosition: Point,
  withGrid: boolean,
  canvasOffset: Point,
  selectionMode: SelectionModeData<Point | number>,
  selectionPadding: number
) => {
  if (selectionMode.mode === 'brush') {
    return paintNewPointToShape(shape as DrawableBrush, cursorPosition)
  } else if (selectionMode.mode === 'translate') {
    return translateShape(
      cursorPosition,
      selectionMode.originalShape,
      selectionMode.cursorStartPosition,
      withGrid
    )
  } else if (selectionMode.mode === 'rotate') {
    return rotateShape(
      shape,
      cursorPosition,
      selectionMode.originalShape,
      selectionMode.cursorStartPosition,
      selectionMode.center,
      withGrid
    )
  } else if (selectionMode.mode === 'resize') {
    const roundCursorPosition: Point = [
      roundForGrid(cursorPosition[0], withGrid),
      roundForGrid(cursorPosition[1], withGrid)
    ]
    return resizeShape(
      ctx,
      shape,
      roundCursorPosition,
      canvasOffset,
      selectionMode.originalShape,
      selectionMode,
      selectionPadding
    )
  }
  return shape
}

export const calculateTextFontSize = (
  ctx: CanvasRenderingContext2D,
  text: string[],
  maxWidth: number,
  fontBold: boolean,
  fontItalic: boolean,
  fontFamily: string | undefined = STYLE_FONT_DEFAULT
) => {
  ctx.font = `${fontItalic ? 'italic' : ''} ${fontBold ? 'bold' : ''} 1px ${fontFamily}`
  return (
    _.flow(
      _.map((value: string) => maxWidth / ctx.measureText(value).width),
      _.min
    )(text) ?? STYLE_FONT_SIZE_DEFAULT
  )
}

const calculateTextWidth = (
  ctx: CanvasRenderingContext2D,
  text: string[],
  fontSize: number,
  fontBold: boolean,
  fontItalic: boolean,
  fontFamily: string | undefined = STYLE_FONT_DEFAULT
) => {
  ctx.font = `${fontItalic ? 'italic' : ''} ${fontBold ? 'bold' : ''} ${fontSize}px ${fontFamily}`
  return (
    _.flow(
      _.map((value: string) => ctx.measureText(value).width),
      _.max
    )(text) ?? 20
  )
}

export const resizeTextShapeWithNewContent = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableText,
  newValue: string[]
) => {
  const newShape = _.set('value', newValue, shape)
  const newWidth = calculateTextWidth(
    ctx,
    newShape.value,
    newShape.fontSize,
    newShape.style?.fontBold ?? false,
    newShape.style?.fontItalic ?? false,
    newShape.style?.fontFamily
  )
  const newHeight = newShape.fontSize * newShape.value.length

  const resizedShape = {
    ...newShape,
    width: newWidth,
    height: newHeight
  }

  const selectionPadding = 0
  const { center } = getShapeInfos(shape, selectionPadding)

  const { center: shapeWithNewDimensionsCenter } = getShapeInfos(resizedShape, selectionPadding)

  const [oppTrueX, oppTrueY] = getRectOppositeAnchorAbsolutePosition([1, 0.5], center, shape)

  const [newOppTrueX, newOppTrueY] = getRectOppositeAnchorAbsolutePosition(
    [1, 0.5],
    shapeWithNewDimensionsCenter,
    resizedShape,
    [false, false]
  )

  return {
    ...resizedShape,
    x: resizedShape.x - (newOppTrueX - oppTrueX),
    y: resizedShape.y - (newOppTrueY - oppTrueY)
  }
}

export const degreesToRadians = (degrees: number) => degrees * (Math.PI / 180)

export const radiansToDegrees = (radians: number) => (radians * 180) / Math.PI

export const fitContentInsideContainer = (
  contentWidth: number,
  contentHeight: number,
  containerWidth: number,
  containerHeight: number,
  shouldFillContainer = false
) => {
  const contentRatio = contentWidth / contentHeight
  const containerRatio = containerWidth / containerHeight
  if (contentRatio > containerRatio) {
    const newWidth = shouldFillContainer ? containerWidth : Math.min(contentWidth, containerWidth)
    return [newWidth, newWidth / contentRatio]
  } else {
    const newHeight = shouldFillContainer
      ? containerHeight
      : Math.min(contentHeight, containerHeight)
    return [newHeight * contentRatio, newHeight]
  }
}
