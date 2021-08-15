import _ from 'lodash/fp'

import { HoverModeData, SelectionModeData, SelectionModeLib } from 'types/Mode'
import { DrawablePicture, Point, DrawableShape, ShapeType } from 'types/Shapes'
import { checkPositionIntersection } from './intersect'
import { getShapeInfos } from './shapeData'

export const getNewSelectionData = (
  hoverMode: HoverModeData,
  selectedShape: DrawableShape,
  cursorPosition: Point
): SelectionModeData | undefined => {
  if (hoverMode.mode === 'translate') {
    return {
      mode: SelectionModeLib.translate,
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape
    }
  } else if (hoverMode.mode === 'rotate') {
    const { center: centerBeforeResize } = getShapeInfos(selectedShape)
    const center: Point = [
      centerBeforeResize[0] - selectedShape.translationOnceRotated[0],
      centerBeforeResize[1] - selectedShape.translationOnceRotated[1]
    ]
    return {
      mode: SelectionModeLib.rotate,
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape,
      center
    }
  } else if (hoverMode.mode === 'resize') {
    return {
      mode: SelectionModeLib.resize,
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape,
      anchor: hoverMode.anchor
    }
  }
  return undefined
}

export const createPicture = (file: any, maxPictureSize: number) => {
  return new Promise<DrawablePicture>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const maxSize = Math.min(Math.max(img.width, img.height), maxPictureSize)
      const imgRatio = img.width / img.height

      const pictureShape: DrawablePicture = {
        type: ShapeType.picture,
        id: _.uniqueId('picture_'),
        x: 0,
        y: 0,
        width: imgRatio < 1 ? imgRatio * maxSize : maxSize,
        height: imgRatio > 1 ? maxSize / imgRatio : maxSize,
        img,
        translationOnceRotated: [0, 0],
        translationBeforeRotation: [0, 0],
        rotation: 0
      }
      resolve(pictureShape)
    }
    img.src = URL.createObjectURL(file)
    setTimeout(() => {
      reject('timeout')
    }, 4000)
  })
}

export const createShape = (
  shape: ShapeType,
  cursorPosition: Point,
  defaultConf: {
    style?: {
      fillColor?: string
      strokeColor?: string
      lineWidth?: number
    }
  }
): DrawableShape => {
  switch (shape) {
    case ShapeType.rect:
      return {
        type: ShapeType.rect,
        id: _.uniqueId('rect_'),
        x: cursorPosition[0],
        y: cursorPosition[1],
        width: 0,
        height: 0,
        translationOnceRotated: [0, 0],
        translationBeforeRotation: [0, 0],
        rotation: 0,
        style: defaultConf.style
      }
    case ShapeType.ellipse:
      return {
        type: ShapeType.ellipse,
        id: _.uniqueId('ellipse_'),
        x: cursorPosition[0],
        y: cursorPosition[1],
        radiusX: 0,
        radiusY: 0,
        translationOnceRotated: [0, 0],
        translationBeforeRotation: [0, 0],
        rotation: 0,
        style: defaultConf.style
      }
    case ShapeType.circle:
    default:
      return {
        type: ShapeType.circle,
        id: _.uniqueId('circle_'),
        x: cursorPosition[0],
        y: cursorPosition[1],
        radius: 0,
        translationOnceRotated: [0, 0],
        translationBeforeRotation: [0, 0],
        rotation: 0,
        style: defaultConf.style
      }
  }
}

export const selectShape = (
  shapes: DrawableShape[],
  cursorPosition: Point,
  selectedShape: DrawableShape | undefined,
  hoverMode: HoverModeData
): { mode: SelectionModeData; shape: DrawableShape | undefined } => {
  if (selectedShape) {
    const newSelectionMode = getNewSelectionData(hoverMode, selectedShape, cursorPosition)
    if (newSelectionMode) {
      return { shape: selectedShape, mode: newSelectionMode }
    }
  }
  const foundShape = _.findLast(shape => {
    return !!checkPositionIntersection(shape, cursorPosition, false)
  }, shapes)
  if (!!foundShape) {
    return {
      shape: foundShape,
      mode: {
        mode: SelectionModeLib.translate,
        cursorStartPosition: cursorPosition,
        originalShape: foundShape
      }
    }
  } else {
    return {
      shape: undefined,
      mode: {
        mode: SelectionModeLib.default
      }
    }
  }
}
