import type { UtilsSettings } from '@canvas/constants/app'
import { GRID_ROTATION_STEPS } from '@canvas/constants/grid'
import { PICTURE_DEFAULT_SIZE } from '@canvas/constants/picture'
import type { SelectionModeData } from '@common/types/Mode'
import type { DrawableShape, Line, Point, ShapeEntity } from '@common/types/Shapes'
import { resizeShape, rotateShape, translateShape } from './shapes'
import { addNewPointToShape } from './shapes/brush'
import { getAngleFromVector, rotatePoint } from './trigo'

export const getNormalizedSize = (originalWidth: number, originalHeight: number, width: number, height: number) => {
  const originalRatio = originalWidth / originalHeight
  const newRatio = width / height
  if (newRatio > originalRatio || height < 0) {
    return width > originalWidth ? [width, width / originalRatio] : [height * originalRatio, height]
  }
  if (newRatio < originalRatio) {
    return height > originalHeight ? [height * originalRatio, height] : [width, width / originalRatio]
  }
  return [width, height]
}

export const roundValues = (prop: number, precision = 2): number => {
  return Math.round(prop * 10 ** precision) / 10 ** precision
}

export const scalePoint = (point: Point, minX: number, minY: number, scaleX = 1, scaleY = 1): Point => {
  return [minX + (point[0] - minX) * scaleX, minY + (point[1] - minY) * scaleY]
}
export const roundForGrid = (value: number, settings: UtilsSettings, gridOffset = 0) => {
  if (!settings.gridGap) return roundValues(value)
  const valueWithOffset = value + gridOffset
  const step = valueWithOffset >= 0 ? settings.gridGap : -settings.gridGap
  return valueWithOffset + step / 2 - ((valueWithOffset + step / 2) % step) - gridOffset
}

export const roundRotationForGrid = (rotation: number, settings: UtilsSettings, gridOffset = 0) => {
  if (!settings.gridGap) return roundValues(rotation, 3)
  return rotation + Math.PI / GRID_ROTATION_STEPS / 2 - ((rotation + Math.PI / GRID_ROTATION_STEPS / 2) % (Math.PI / GRID_ROTATION_STEPS))
}

export const transformShape = (
  ctx: CanvasRenderingContext2D,
  shape: ShapeEntity,
  cursorPosition: Point,
  selectionMode: SelectionModeData<Point | number>,
  settings: UtilsSettings,
  isShiftPressed: boolean
): ShapeEntity => {
  switch (selectionMode.mode) {
    case 'brush':
      return addNewPointToShape(shape as ShapeEntity<'brush'>, cursorPosition, settings)
    case 'translate':
      return translateShape(cursorPosition, selectionMode.originalShape, selectionMode.cursorStartPosition, settings)
    case 'rotate':
      return rotateShape(shape, cursorPosition, selectionMode.originalShape, selectionMode.cursorStartPosition, selectionMode.center, settings)
    case 'resize':
      return resizeShape(ctx, shape, cursorPosition, selectionMode.originalShape, selectionMode, settings, isShiftPressed)
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

export const shortenLine = ({ line, size, direction }: { line: DrawableShape<'line'>; size: number; direction: 'start' | 'end' | 'both' }): Line => {
  const rotation = Math.PI / 2 - getAngleFromVector({ targetVector: [line.points[0], line.points[1]] })

  const origin: Point = [
    line.points[0][0] + (line.points[1][0] - line.points[0][0]) / 2,
    line.points[0][1] + (line.points[1][1] - line.points[0][1]) / 2
  ]

  let firstPoint: Point
  if (['start', 'both'].includes(direction)) {
    const rotatedPoint = rotatePoint({ point: line.points[0], origin, rotation: -rotation })
    firstPoint = rotatePoint({ point: [rotatedPoint[0], rotatedPoint[1] + size], origin, rotation: rotation })
  } else {
    firstPoint = [...line.points[0]]
  }

  let lastPoint: Point
  if (['end', 'both'].includes(direction)) {
    const rotatedPoint = rotatePoint({ point: line.points[1], origin, rotation: -rotation })
    lastPoint = rotatePoint({ point: [rotatedPoint[0], rotatedPoint[1] - size], origin, rotation: rotation })
  } else {
    lastPoint = [...line.points[1]]
  }

  return {
    points: [firstPoint, lastPoint]
  }
}
