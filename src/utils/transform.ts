import _ from 'lodash/fp'

import type { SelectionModeData } from 'types/Mode'
import type { Point, DrawableShape, DrawablePolygon, DrawableBrush } from 'types/Shapes'
import { GRID_STEP, STYLE_FONT_DEFAULT, STYLE_FONT_SIZE_DEFAULT } from 'constants/style'
import type { GridFormatType } from 'constants/app'
import { resizeShape, rotateShape, translateShape } from './shapes'

export const getNormalizedSize = (
  originalWidth: number,
  originalHeight: number,
  width: number,
  height: number
) => {
  const originalRatio = originalWidth / originalHeight
  const newRatio = width / height
  if (newRatio > originalRatio || height < 0) {
    return width > originalWidth ? [width, width / originalRatio] : [height * originalRatio, height]
  } else if (newRatio < originalRatio) {
    return height > originalHeight
      ? [height * originalRatio, height]
      : [width, width / originalRatio]
  }
  return [width, height]
}

export const roundForGrid = (value: number, gridFormat: GridFormatType) => {
  const step = value >= 0 ? GRID_STEP[gridFormat - 1] : -GRID_STEP[gridFormat - 1]
  return gridFormat ? value + step / 2 - ((value + step / 2) % step) : Math.round(value)
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

export const transformShape = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape,
  cursorPosition: Point,
  gridFormat: GridFormatType,
  canvasOffset: Point,
  selectionMode: SelectionModeData<Point | number>,
  selectionPadding: number,
  isShiftPressed: boolean
) => {
  if (selectionMode.mode === 'brush') {
    return paintNewPointToShape(shape as DrawableBrush, cursorPosition)
  } else if (selectionMode.mode === 'translate') {
    return translateShape(
      cursorPosition,
      selectionMode.originalShape,
      selectionMode.cursorStartPosition,
      gridFormat
    )
  } else if (selectionMode.mode === 'rotate') {
    return rotateShape(
      shape,
      cursorPosition,
      selectionMode.originalShape,
      selectionMode.cursorStartPosition,
      selectionMode.center,
      gridFormat
    )
  } else if (selectionMode.mode === 'resize') {
    const roundCursorPosition: Point = [
      roundForGrid(cursorPosition[0], gridFormat),
      roundForGrid(cursorPosition[1], gridFormat)
    ]
    return resizeShape(
      ctx,
      shape,
      roundCursorPosition,
      canvasOffset,
      selectionMode.originalShape,
      selectionMode,
      selectionPadding,
      isShiftPressed
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
