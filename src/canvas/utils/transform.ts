import type { UtilsSettings } from '@canvas/constants/app'
import { GRID_ROTATION_STEPS } from '@canvas/constants/grid'
import { PICTURE_DEFAULT_SIZE } from '@canvas/constants/picture'
import type { SelectionModeData } from '@canvas/types/Mode'
import type { Point, SelectionType, ShapeEntity } from '@canvas/types/Shapes'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { refreshShape, resizeShapes, rotateShape, translateShapes } from './shapes'
import { addNewPointToShape } from './shapes/brush'

export const roundValues = (prop: number, precision = 2): number => {
  const factor = 10 ** precision
  return Math.round(prop * factor) / factor
}

export const scalePoint = (point: Point, minX: number, minY: number, scaleX = 1, scaleY = 1): Point => {
  return [minX + (point[0] - minX) * scaleX, minY + (point[1] - minY) * scaleY]
}
/**
 * The closest multiple of the gap. The remainder keeps the sign of the value: the step takes it too, so that a negative
 * value goes to its closest step instead of the step closer to 0
 */
const roundToStep = (value: number, gap: number) => {
  const step = value >= 0 ? gap : -gap
  return value + step / 2 - ((value + step / 2) % step)
}

export const roundForGrid = (value: number, settings: UtilsSettings, gridOffset = 0) => {
  if (!settings.gridGap) return roundValues(value)
  return roundToStep(value + gridOffset, settings.gridGap) - gridOffset
}

export const roundRotationForGrid = (rotation: number, settings: UtilsSettings, isShiftPressed: boolean) => {
  if (!settings.gridGap && !isShiftPressed) return roundValues(rotation, 3)
  return roundToStep(rotation, Math.PI / GRID_ROTATION_STEPS)
}

export const boundVectorToSingleAxis = (vector: Point, isShiftPressed: boolean): Point => {
  if (isShiftPressed) {
    return [Math.abs(vector[0]) > Math.abs(vector[1]) ? vector[0] : 0, Math.abs(vector[1]) > Math.abs(vector[0]) ? vector[1] : 0]
  }
  return vector
}

/** The selected shapes, transformed by the gesture: the selection is built again from them when they are updated */
export const transformSelectedShapes = (
  ctx: CanvasRenderingContext2D,
  selectedShape: SelectionType,
  cursorPosition: Point,
  selectionMode: SelectionModeData<Point | number>,
  settings: UtilsSettings,
  isShiftPressed: boolean,
  isAltPressed: boolean
): ShapeEntity[] => {
  if (selectionMode.mode === 'translate') {
    return translateShapes(cursorPosition, selectionMode.originalShape, selectionMode.cursorStartPosition, settings, isShiftPressed)
  }

  if (selectionMode.mode === 'rotate') {
    const { originalShape, cursorStartPosition } = selectionMode
    const center = originalShape.computed.center
    const [cx, cy] = center
    const rotationToAdd = roundRotationForGrid(
      Math.atan2(cy - cursorPosition[1], cx - cursorPosition[0]) - Math.atan2(cy - cursorStartPosition[1], cx - cursorStartPosition[0]),
      settings,
      isShiftPressed
    )
    return getSelectedShapes(originalShape).map(shape => refreshShape(rotateShape(shape, rotationToAdd, center), settings))
  }

  if (selectionMode.mode === 'resize') {
    return resizeShapes(ctx, cursorPosition, selectionMode.originalShape, selectionMode, settings, isShiftPressed, isAltPressed)
  }

  if (selectionMode.mode === 'brush') {
    return getSelectedShapes(selectedShape).map(shape => addNewPointToShape(shape as ShapeEntity<'brush'>, cursorPosition, settings))
  }

  return getSelectedShapes(selectedShape)
}

export const fitContentInsideContainer = (
  contentWidth: number,
  contentHeight: number,
  containerWidth: number,
  containerHeight: number,
  shouldFillContainer = false
): Point => {
  if (!contentWidth || !contentHeight || !containerHeight || !containerWidth) return [PICTURE_DEFAULT_SIZE, PICTURE_DEFAULT_SIZE]
  const contentRatio = contentWidth / contentHeight
  const containerRatio = containerWidth / containerHeight
  if (contentRatio > containerRatio) {
    const newWidth = shouldFillContainer ? containerWidth : Math.min(contentWidth, containerWidth)
    return [newWidth, newWidth / contentRatio]
  }
  const newHeight = shouldFillContainer ? containerHeight : Math.min(contentHeight, containerHeight)
  return [newHeight * contentRatio, newHeight]
}
