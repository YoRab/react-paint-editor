import type { SelectionModeData } from '../types/Mode'
import type { Point, ShapeEntity } from '../types/Shapes'
import type { GridFormatType } from '../constants/app'
import { GRID_ROTATION_STEPS, GRID_STEP } from '../constants/style'
import { resizeShape, rotateShape, translateShape } from './shapes'
import { addNewPointToShape } from './shapes/brush'
import { PICTURE_DEFAULT_SIZE } from '../constants/picture'

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

export const roundValues = (prop: number, precision = 2): number => {
  return Math.round(prop * 10 ** precision) / 10 ** precision
}

export const roundForGrid = (value: number, gridFormat: GridFormatType, gridOffset: number = 0) => {
  if (!gridFormat) return roundValues(value)
  const valueWithOffset = value + gridOffset
  const step = valueWithOffset >= 0 ? GRID_STEP[gridFormat - 1] : -GRID_STEP[gridFormat - 1]
  return valueWithOffset + step / 2 - ((valueWithOffset + step / 2) % step) - gridOffset
}

export const roundRotationForGrid = (rotation: number, gridFormat: GridFormatType, gridOffset: number = 0) => {
  if (!gridFormat) return roundValues(rotation, 3)
  return rotation + Math.PI / GRID_ROTATION_STEPS / 2 - ((rotation + Math.PI / GRID_ROTATION_STEPS / 2) % (Math.PI / GRID_ROTATION_STEPS))
}

export const transformShape = (
  ctx: CanvasRenderingContext2D,
  shape: ShapeEntity,
  cursorPosition: Point,
  gridFormat: GridFormatType,
  canvasOffset: Point,
  selectionMode: SelectionModeData<Point | number>,
  selectionPadding: number,
  isShiftPressed: boolean,
  currentScale: number
): ShapeEntity => {
  switch (selectionMode.mode) {
    case 'brush':
      return addNewPointToShape(
        shape as ShapeEntity<'brush'>,
        cursorPosition,
        currentScale,
        selectionPadding
      )
    case 'translate':
      return translateShape(
        cursorPosition,
        selectionMode.originalShape,
        selectionMode.cursorStartPosition,
        gridFormat,
        currentScale,
        selectionPadding
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
      return resizeShape(
        ctx,
        shape,
        cursorPosition,
        canvasOffset,
        selectionMode.originalShape,
        selectionMode,
        gridFormat,
        selectionPadding,
        isShiftPressed,
        currentScale
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
  if (!contentWidth || !contentHeight || !containerHeight || !containerWidth)
    return [PICTURE_DEFAULT_SIZE, PICTURE_DEFAULT_SIZE]
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
