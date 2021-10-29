import _ from 'lodash/fp'

import { HoverModeData, SelectionModeData, SelectionModeLib } from 'types/Mode'
import { DrawablePicture, Point, DrawableShape, ShapeEnum } from 'types/Shapes'
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
    const center: Point = [centerBeforeResize[0], centerBeforeResize[1]]
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

export const createPicture = (file: unknown, maxPictureSize: number) => {
  return new Promise<DrawablePicture>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const maxSize = Math.min(Math.max(img.width, img.height), maxPictureSize)
      const imgRatio = img.width / img.height

      const pictureShape: DrawablePicture = {
        type: ShapeEnum.picture,
        id: _.uniqueId('picture_'),
        x: 0,
        y: 0,
        width: imgRatio < 1 ? imgRatio * maxSize : maxSize,
        height: imgRatio > 1 ? maxSize / imgRatio : maxSize,
        img,
        translation: [0, 0],
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
  shape: ShapeEnum,
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
    case ShapeEnum.rect:
      return {
        type: ShapeEnum.rect,
        id: _.uniqueId('rect_'),
        x: cursorPosition[0],
        y: cursorPosition[1],
        width: 0,
        height: 0,
        translation: [0, 0],
        rotation: 0,
        style: defaultConf.style
      }
    case ShapeEnum.ellipse:
      return {
        type: ShapeEnum.ellipse,
        id: _.uniqueId('ellipse_'),
        x: cursorPosition[0],
        y: cursorPosition[1],
        radiusX: 0,
        radiusY: 0,
        translation: [0, 0],
        rotation: 0,
        style: defaultConf.style
      }
    case ShapeEnum.circle:
    default:
      return {
        type: ShapeEnum.circle,
        id: _.uniqueId('circle_'),
        x: cursorPosition[0],
        y: cursorPosition[1],
        radius: 0,
        translation: [0, 0],
        rotation: 0,
        style: defaultConf.style
      }
  }
}

export const selectShape = (
  shapes: DrawableShape[],
  cursorPosition: Point,
  canvasOffset: Point,
  selectedShape: DrawableShape | undefined,
  hoverMode: HoverModeData
): { mode: SelectionModeData; shape: DrawableShape | undefined } => {
  if (selectedShape) {
    const newSelectionMode = getNewSelectionData(hoverMode, selectedShape, cursorPosition)
    if (newSelectionMode) {
      return { shape: selectedShape, mode: newSelectionMode }
    }
  }
  const foundShape = _.find(shape => {
    return !!checkPositionIntersection(shape, cursorPosition, canvasOffset, false)
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
