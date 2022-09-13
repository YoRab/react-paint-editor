import type { SelectionModeData } from 'types/Mode'
import type { Point, DrawableShape, DrawableBrush } from 'types/Shapes'
import { GRID_STEP } from 'constants/style'
import type { GridFormatType } from 'constants/app'
import { resizeShape, rotateShape, translateShape } from './shapes'
import { addNewPointToShape } from './shapes/brush'

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
  switch (selectionMode.mode) {
    case 'brush':
      return addNewPointToShape(shape as DrawableBrush, cursorPosition)
    case 'translate':
      return translateShape(
        cursorPosition,
        selectionMode.originalShape,
        selectionMode.cursorStartPosition,
        gridFormat
      )
    case 'rotate':
      return rotateShape(
        shape,
        cursorPosition,
        selectionMode.originalShape,
        selectionMode.cursorStartPosition,
        selectionMode.center,
        gridFormat
      )
    case 'resize':
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
    default:
      return shape
  }
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
