import _ from 'lodash/fp'
import { calculateTextFontSize } from './transform'
import { DrawablePicture, Point, DrawableShape, ShapeEnum, StyledShape } from 'types/Shapes'

export const createPicture = (file: File, maxPictureSize: number) => {
  return new Promise<DrawablePicture>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const maxSize = Math.min(Math.max(img.width, img.height), maxPictureSize)
      const imgRatio = img.width / img.height

      const pictureShape: DrawablePicture = {
        type: ShapeEnum.picture,
        id: _.uniqueId(ShapeEnum.picture),
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
        id: _.uniqueId(shape),
        points: [[cursorPosition]],
        translation: [0, 0],
        scale: [1, 1],
        rotation: 0,
        style: defaultConf.style
      }
    case ShapeEnum.line:
      return {
        type: ShapeEnum.line,
        id: _.uniqueId(shape),
        points: [cursorPosition, cursorPosition],
        translation: [0, 0],
        scale: [1, 1],
        rotation: 0,
        style: defaultConf.style
      }
    case ShapeEnum.polygon:
      return {
        type: ShapeEnum.polygon,
        id: _.uniqueId(shape),
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
        id: _.uniqueId(shape),
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
        id: _.uniqueId(shape),
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
        id: _.uniqueId(shape),
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
        id: _.uniqueId(shape),
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

export const copyShape = (shape: DrawableShape) => {
  return {
    ...shape,
    id: _.uniqueId(shape.type),
    translation: [shape.translation[0] + 20, shape.translation[1] + 20]
  } as DrawableShape
}
