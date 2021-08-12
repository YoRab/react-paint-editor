import { getShapeInfos } from './shapeData'
import _ from 'lodash/fp'
import { SELECTION_PADDING } from '../constants/shapes'
import { SelectionModeData, SelectionModeLib, SelectionModeResize } from '../types/Mode'
import {
  CircleDrawable,
  EllipseDrawable,
  Point,
  RectDrawable,
  ShapeDrawable
} from '../types/Shapes'
import { getPointPositionAfterShapeTransformation } from './intersect'

const getLengthBetweenTwoPoints = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2))
}
export const translateShape = (
  shape: ShapeDrawable,
  cursorPosition: Point,
  originalShape: ShapeDrawable,
  originalCursorPosition: Point
): ShapeDrawable => {
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
  shape: ShapeDrawable,
  cursorPosition: Point,
  originalShape: ShapeDrawable,
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

export const isDiagAnchor = (anchor: [number, number]) => {
  return (anchor[0] === 0 || anchor[0] === 1) && (anchor[1] === 0 || anchor[1] === 1)
}

export const resizeCircle = (
  shape: CircleDrawable,
  cursorPosition: Point,
  selectionMode: SelectionModeResize
): CircleDrawable => {
  const { center } = getShapeInfos(shape)
  const trueCenter: Point = [center[0] + shape.translation[0], center[1] + shape.translation[1]]

  return {
    ...shape,
    ...{
      radius: Math.abs(
        getLengthBetweenTwoPoints(trueCenter, cursorPosition) /
          (isDiagAnchor(selectionMode.anchor) ? Math.sqrt(2) : 1) -
          SELECTION_PADDING
      )
    }
  }
}

export const resizeEllipse = (
  shape: EllipseDrawable,
  cursorPosition: Point,
  selectionMode: SelectionModeResize
): EllipseDrawable => {
  const { center, borders } = getShapeInfos(shape)
  // if (selectionMode.anchor[0] === 0.5 || selectionMode.anchor[1] === 0.5) {
  //   const centerAfterTranslation: Point = [
  //     center[0] + shape.translation[0],
  //     center[1] + shape.translation[1]
  //   ]

  //   return {
  //     ...shape,
  //     ...{
  //       [selectionMode.anchor[0] === 0 || selectionMode.anchor[0] === 1 ? 'radiusX' : 'radiusY']:
  //         Math.abs(
  //           getLengthBetweenTwoPoints(centerAfterTranslation, cursorPosition) - SELECTION_PADDING
  //         )
  //     }
  //   }
  // }

  const newCursorPosition = getPointPositionAfterShapeTransformation(
    cursorPosition,
    shape.translation,
    shape.rotation,
    center
  )

  const radiusX =
    selectionMode.anchor[0] === 0.5
      ? shape.radiusX
      : Math.abs(
          ((selectionMode.anchor[0] === 0 ? borders.x + borders.width : borders.x) -
            newCursorPosition[0] +
            SELECTION_PADDING * (selectionMode.anchor[0] === 0 ? -2 : 2)) /
            2
        )

  // const radiusX =
  //   selectionMode.anchor[0] === 0.5
  //     ? shape.radiusX
  //     : Math.abs(
  //         center[0] -
  //           newCursorPosition[0] +
  //           SELECTION_PADDING * (selectionMode.anchor[0] === 0 ? -1 : 1)
  //       )

  const x = shape.x + (shape.radiusX - radiusX)

  return {
    ...shape,
    ...{
      x,
      radiusX,
      radiusY:
        selectionMode.anchor[1] === 0.5
          ? shape.radiusY
          : Math.abs(
              center[1] -
                newCursorPosition[1] +
                SELECTION_PADDING * (selectionMode.anchor[1] === 0 ? -1 : 1)
            )
    }
  }
}

export const resizeRect = (
  shape: RectDrawable,
  cursorPosition: Point,
  selectionMode: SelectionModeResize
): RectDrawable => {
  const { center } = getShapeInfos(shape)
  if (selectionMode.anchor[0] === 0.5 || selectionMode.anchor[1] === 0.5) {
    const centerAfterTranslation: Point = [
      center[0] + shape.translation[0],
      center[1] + shape.translation[1]
    ]

    return {
      ...shape,
      ...{
        [selectionMode.anchor[0] === 0 || selectionMode.anchor[0] === 1 ? 'width' : 'height']:
          2 *
          Math.abs(
            getLengthBetweenTwoPoints(centerAfterTranslation, cursorPosition) - SELECTION_PADDING
          )
      }
    }
  }

  const newCursorPosition = getPointPositionAfterShapeTransformation(
    cursorPosition,
    shape.translation,
    shape.rotation,
    center
  )
  return {
    ...shape,
    ...{
      radiusX: Math.abs(
        center[0] -
          newCursorPosition[0] +
          SELECTION_PADDING * (selectionMode.anchor[0] === 0 ? -1 : 1)
      ),
      radiusY: Math.abs(
        center[1] -
          newCursorPosition[1] +
          SELECTION_PADDING * (selectionMode.anchor[1] === 0 ? -1 : 1)
      )
    }
  }
}

export const resizeShape = (
  shape: ShapeDrawable,
  cursorPosition: Point,
  selectionMode: SelectionModeData
): ShapeDrawable => {
  if (shape.type === 'circle')
    return resizeCircle(shape, cursorPosition, selectionMode as SelectionModeResize)
  else if (shape.type === 'ellipse')
    return resizeEllipse(shape, cursorPosition, selectionMode as SelectionModeResize)
  else if (shape.type === 'rect')
    return resizeRect(shape, cursorPosition, selectionMode as SelectionModeResize)
  return shape
}

export const transformShape = (
  shape: ShapeDrawable,
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
    return resizeShape(shape, cursorPosition, selectionMode)
  }
  return shape
}
