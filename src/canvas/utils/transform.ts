import type { UtilsSettings } from '@canvas/constants/app'
import { GRID_ROTATION_STEPS, SHIFT_ANGLE_STEPS } from '@canvas/constants/grid'
import { PICTURE_DEFAULT_SIZE } from '@canvas/constants/picture'
import type { SelectionModeData } from '@canvas/types/Mode'
import type { Point, SelectionType, ShapeEntity } from '@canvas/types/Shapes'
import { getPointPositionBeforeCanvasTransformation } from '@canvas/utils/intersect'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { resizeShapes, rotateShape, translateShapes } from './shapes'
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

/** A rotation turns by 15° with Shift, by 10° on the grid, freely otherwise */
export const roundRotationForGrid = (rotation: number, settings: UtilsSettings, isShiftPressed: boolean) => {
  if (isShiftPressed) return roundToStep(rotation, Math.PI / SHIFT_ANGLE_STEPS)
  if (!settings.gridGap) return roundValues(rotation, 3)
  return roundToStep(rotation, Math.PI / GRID_ROTATION_STEPS)
}

/**
 * The point goes on the closest direction from its origin which is a multiple of 15°, projected on it:
 * a segment drawn horizontal, vertical or at a regular angle
 */
export const snapAngle = (point: Point, origin: Point): Point => {
  const vector: Point = [point[0] - origin[0], point[1] - origin[1]]
  if (!vector[0] && !vector[1]) return point
  const angle = roundToStep(Math.atan2(vector[1], vector[0]), Math.PI / SHIFT_ANGLE_STEPS)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const distance = vector[0] * cos + vector[1] * sin
  return [roundValues(origin[0] + distance * cos), roundValues(origin[1] + distance * sin)]
}

/**
 * The position, in the canvas, given to the point of a line, a polygon or a curve at an index, which the cursor moves or adds
 * (the index of a new point is the count of points): on the grid, and with Shift the segment from the point before it (the
 * point after it for the first one) takes a regular angle. The points of the shape are turned with it
 */
export const snapToShapePoint = (
  cursorPosition: Point,
  settings: UtilsSettings,
  shape: ShapeEntity<'line' | 'polygon' | 'curve'>,
  index: number,
  isShiftPressed: boolean
): Point => {
  const position: Point = [roundForGrid(cursorPosition[0], settings), roundForGrid(cursorPosition[1], settings)]
  if (!isShiftPressed) return position
  const neighbor = shape.points[index === 0 ? 1 : index - 1]
  if (!neighbor) return position
  return snapAngle(position, getPointPositionBeforeCanvasTransformation(neighbor, shape.rotation ?? 0, shape.computed.center))
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
    return getSelectedShapes(originalShape).map(shape => rotateShape(shape, rotationToAdd, center, settings))
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
