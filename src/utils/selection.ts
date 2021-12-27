import _ from 'lodash/fp'

import { HoverModeData, SelectionModeData, SelectionModeLib } from 'types/Mode'
import { DrawablePicture, Point, DrawableShape, ShapeEnum, StyledShape } from 'types/Shapes'
import { checkPositionIntersection } from './intersect'
import { getShapeInfos } from './shapeData'
import { calculateTextFontSize } from './transform'

export const getNewSelectionData = (
  hoverMode: HoverModeData,
  selectedShape: DrawableShape,
  cursorPosition: Point
): SelectionModeData<Point | number> | undefined => {
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

export const createPicture = (file: File, maxPictureSize: number) => {
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
        scale: [1, 1],
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
  ctx: CanvasRenderingContext2D,
  shape: ShapeEnum,
  cursorPosition: Point,
  defaultConf: StyledShape
): DrawableShape => {
  switch (shape) {
    case ShapeEnum.brush:
      return {
        type: ShapeEnum.brush,
        id: _.uniqueId('brush_'),
        points: [[cursorPosition]],
        translation: [0, 0],
        scale: [1, 1],
        rotation: 0,
        style: defaultConf.style
      }
    case ShapeEnum.line:
      return {
        type: ShapeEnum.line,
        id: _.uniqueId('line_'),
        points: [cursorPosition, cursorPosition],
        translation: [0, 0],
        scale: [1, 1],
        rotation: 0,
        style: defaultConf.style
      }
    case ShapeEnum.polygon:
      return {
        type: ShapeEnum.polygon,
        id: _.uniqueId('polygon_'),
        points: _.flow(
          _.range(0),
          _.map(() => cursorPosition)
        )(defaultConf.style?.pointsCount ?? 2),
        translation: [0, 0],
        scale: [1, 1],
        rotation: 0,
        style: defaultConf.style
      }
    case ShapeEnum.rect:
      return {
        type: ShapeEnum.rect,
        id: _.uniqueId('rect_'),
        x: cursorPosition[0],
        y: cursorPosition[1],
        width: 0,
        height: 0,
        translation: [0, 0],
        scale: [1, 1],
        rotation: 0,
        style: defaultConf.style
      }
    case ShapeEnum.text:
      const defaultValue: string[] = []
      const fontSize = calculateTextFontSize(ctx, defaultValue, 50, defaultConf.style?.fontFamily)
      return {
        type: ShapeEnum.text,
        id: _.uniqueId('text_'),
        x: cursorPosition[0],
        y: cursorPosition[1],
        value: defaultValue,
        fontSize,
        width: 50,
        height: fontSize * (defaultValue.length || 1),
        translation: [0, 0],
        scale: [1, 1],
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
        scale: [1, 1],
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
        scale: [1, 1],
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
): { mode: SelectionModeData<Point | number>; shape: DrawableShape | undefined } => {
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
