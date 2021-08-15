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
  Rect
} from 'types/Shapes'
import { getPointPositionAfterCanvasTransformation } from './intersect'

const getLengthBetweenTwoPoints = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2))
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
      translationBeforeRotation: [
        originalShape.translationBeforeRotation[0] + cursorPosition[0] - originalCursorPosition[0],
        originalShape.translationBeforeRotation[1] + cursorPosition[1] - originalCursorPosition[1]
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
  const p1x =
    shapeCenter[0] + originalShape.translationBeforeRotation[0] - originalCursorPosition[0]
  const p1y =
    shapeCenter[1] + originalShape.translationBeforeRotation[1] - originalCursorPosition[1]
  const p2x = shapeCenter[0] + originalShape.translationBeforeRotation[0] - cursorPosition[0]
  const p2y = shapeCenter[1] + originalShape.translationBeforeRotation[1] - cursorPosition[1]
  const rotation = originalShape.rotation + Math.atan2(p2y, p2x) - Math.atan2(p1y, p1x)
  return {
    ...shape,
    ...{
      rotation
    }
  }
}

export const isDiagAnchor = (anchor: [number, number]) => {
  return (anchor[0] === 0 || anchor[0] === 1) && (anchor[1] === 0 || anchor[1] === 1)
}

export const resizeCircle = (
  cursorPosition: Point,
  originalShape: DrawableCircle,
  selectionMode: SelectionModeResize
): DrawableCircle => {
  const { center, borders } = getShapeInfos(originalShape)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    originalShape.translationBeforeRotation,
    originalShape.rotation,
    center
  )

  const newCursorPosition = [
    cursorPositionBeforeResize[0] - originalShape.translationOnceRotated[0],
    cursorPositionBeforeResize[1] - originalShape.translationOnceRotated[1]
  ]

  const radius =
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

  const translationOnceRotated: Point = [
    originalShape.translationOnceRotated[0] +
      (originalShape.radius - radius) *
        (selectionMode.anchor[0] === 0 ? 1 : selectionMode.anchor[0] === 0.5 ? 0 : -1),
    originalShape.translationOnceRotated[1] +
      (originalShape.radius - radius) *
        (selectionMode.anchor[1] === 0 ? 1 : selectionMode.anchor[1] === 0.5 ? 0 : -1)
  ]

  return {
    ...originalShape,
    ...{
      translationOnceRotated,
      radius: Math.abs(radius)
    }
  }
}

export const resizeEllipse = (
  cursorPosition: Point,
  originalShape: DrawableEllipse,
  selectionMode: SelectionModeResize
): DrawableEllipse => {
  const { center, borders } = getShapeInfos(originalShape)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    originalShape.translationBeforeRotation,
    originalShape.rotation,
    center
  )

  const newCursorPosition = [
    cursorPositionBeforeResize[0] - originalShape.translationOnceRotated[0],
    cursorPositionBeforeResize[1] - originalShape.translationOnceRotated[1]
  ]

  const radiusX =
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

  const radiusY =
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

  const translationOnceRotated: Point = [
    originalShape.translationOnceRotated[0] +
      (originalShape.radiusX - radiusX) * (selectionMode.anchor[0] === 0 ? 1 : -1),
    originalShape.translationOnceRotated[1] +
      (originalShape.radiusY - radiusY) * (selectionMode.anchor[1] === 0 ? 1 : -1)
  ]
  return {
    ...originalShape,
    ...{
      translationOnceRotated,
      radiusX: Math.abs(radiusX),
      radiusY: Math.abs(radiusY)
    }
  }
}

export const getNormalizedSize = (originalShape: Rect, width: number, height: number) => {
  const originalRatio = originalShape.width / originalShape.height
  const newRatio = width / height
  if (newRatio > originalRatio) {
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
export const resizeRect = <T extends DrawableShape & Rect>(
  cursorPosition: Point,
  originalShape: T,
  selectionMode: SelectionModeResize,
  keepRatio = false
): T => {
  const { center, borders } = getShapeInfos(originalShape)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    originalShape.translationBeforeRotation,
    originalShape.rotation,
    center
  )

  const newCursorPosition = [
    cursorPositionBeforeResize[0] - originalShape.translationOnceRotated[0],
    cursorPositionBeforeResize[1] - originalShape.translationOnceRotated[1]
  ]

  const newWidth =
    selectionMode.anchor[0] === 0.5
      ? originalShape.width
      : selectionMode.anchor[0] === 0
      ? borders.x +
        borders.width -
        newCursorPosition[0] +
        SELECTION_PADDING * (selectionMode.anchor[0] === 0 ? -2 : 2)
      : newCursorPosition[0] -
        borders.x -
        SELECTION_PADDING * (selectionMode.anchor[0] === 0 ? -2 : 2)

  const newHeight =
    selectionMode.anchor[1] === 0.5
      ? originalShape.height
      : selectionMode.anchor[1] === 0
      ? borders.y +
        borders.height -
        newCursorPosition[1] +
        SELECTION_PADDING * (selectionMode.anchor[1] === 0 ? -2 : 2)
      : newCursorPosition[1] -
        borders.y -
        SELECTION_PADDING * (selectionMode.anchor[1] === 0 ? -2 : 2)

  const [width, height] = keepRatio
    ? getNormalizedSize(originalShape, newWidth, newHeight)
    : [newWidth, newHeight]

  const translationOnceRotated: Point = [
    originalShape.translationOnceRotated[0] +
      (selectionMode.anchor[0] === 0
        ? originalShape.width - Math.max(0, width)
        : Math.min(width, 0)),
    originalShape.translationOnceRotated[1] +
      (selectionMode.anchor[1] === 0
        ? originalShape.height - Math.max(0, height)
        : Math.min(height, 0))
  ]

  return {
    ...originalShape,
    ...{
      translationOnceRotated,
      width: Math.abs(width),
      height: Math.abs(height)
    }
  }
}

export const resizePicture = (
  cursorPosition: Point,
  originalShape: DrawablePicture,
  selectionMode: SelectionModeResize
): DrawablePicture => {
  return resizeRect(cursorPosition, originalShape, selectionMode, true)
}

export const resizeShape = (
  shape: DrawableShape,
  cursorPosition: Point,
  originalShape: DrawableShape,
  selectionMode: SelectionModeData
): DrawableShape => {
  if (shape.type === 'circle')
    return resizeCircle(
      cursorPosition,
      originalShape as DrawableCircle,
      selectionMode as SelectionModeResize
    )
  else if (shape.type === 'ellipse')
    return resizeEllipse(
      cursorPosition,
      originalShape as DrawableEllipse,
      selectionMode as SelectionModeResize
    )
  else if (shape.type === 'rect')
    return resizeRect(
      cursorPosition,
      originalShape as DrawableRect,
      selectionMode as SelectionModeResize
    )
  else if (shape.type === 'picture')
    return resizePicture(
      cursorPosition,
      originalShape as DrawablePicture,
      selectionMode as SelectionModeResize
    )
  return shape
}

export const transformShape = (
  shape: DrawableShape,
  cursorPosition: Point,
  selectionMode: SelectionModeData
) => {
  if (selectionMode.mode === SelectionModeLib.translate) {
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
    return resizeShape(shape, cursorPosition, selectionMode.originalShape, selectionMode)
  }
  return shape
}
