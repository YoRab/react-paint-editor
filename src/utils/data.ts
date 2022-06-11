import _ from 'lodash/fp'
import { calculateTextFontSize, fitContentInsideContainer } from './transform'
import { DrawablePicture, Point, DrawableShape, ShapeEnum, StyledShape } from 'types/Shapes'
import { getBase64Image } from './file'

export const createPicture = (
  fileOrUrl: File | string,
  maxPictureWidth: number,
  maxPictureHeight: number
) => {
  return new Promise<DrawablePicture>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const [width, height] = fitContentInsideContainer(
        img.width,
        img.height,
        maxPictureWidth,
        maxPictureHeight
      )

      const pictureShape: DrawablePicture = {
        type: ShapeEnum.picture,
        id: _.uniqueId(`${ShapeEnum.picture}_`),
        x: (maxPictureWidth - width) / 2,
        y: (maxPictureHeight - height) / 2,
        width,
        height,
        src: img.src,
        img,
        translation: [0, 0],
        rotation: 0
      }
      resolve(pictureShape)
    }
    if (fileOrUrl instanceof File) {
      img.src = URL.createObjectURL(fileOrUrl)
    } else {
      img.src = fileOrUrl
    }

    img.onerror = () => {
      reject(new Error('Error while loading the src'))
    }
    setTimeout(() => {
      reject(new Error('Timeout while loading the src'))
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
        id: _.uniqueId(`${shape}_`),
        points: [[cursorPosition]],
        translation: [0, 0],
        rotation: 0,
        style: defaultConf.style
      }
    case ShapeEnum.line:
      return {
        type: ShapeEnum.line,
        id: _.uniqueId(`${shape}_`),
        points: [cursorPosition, cursorPosition],
        translation: [0, 0],
        rotation: 0,
        style: defaultConf.style
      }
    case ShapeEnum.polygon:
      return {
        type: ShapeEnum.polygon,
        id: _.uniqueId(`${shape}_`),
        points: _.flow(
          _.range(0),
          _.map(() => cursorPosition)
        )(defaultConf.style?.pointsCount ?? 3),
        translation: [0, 0],
        rotation: 0,
        style: defaultConf.style
      }
    case ShapeEnum.curve:
      return {
        type: ShapeEnum.curve,
        id: _.uniqueId(`${shape}_`),
        points: _.flow(
          _.range(0),
          _.map(() => cursorPosition)
        )(defaultConf.style?.pointsCount ?? 3),
        translation: [0, 0],
        rotation: 0,
        style: defaultConf.style
      }
    case ShapeEnum.rect:
    case ShapeEnum.square:
      return {
        type: shape,
        id: _.uniqueId(`${shape}_`),
        x: cursorPosition[0],
        y: cursorPosition[1],
        width: 1,
        height: 1,
        translation: [0, 0],
        rotation: 0,
        style: defaultConf.style
      }
    case ShapeEnum.text:
      const defaultValue: string[] = []
      const fontSize = calculateTextFontSize(ctx, defaultValue, 50, defaultConf.style?.fontFamily)
      return {
        type: ShapeEnum.text,
        id: _.uniqueId(`${shape}_`),
        x: cursorPosition[0],
        y: cursorPosition[1],
        value: defaultValue,
        fontSize,
        width: 50,
        height: fontSize * (defaultValue.length || 1),
        translation: [0, 0],
        rotation: 0,
        style: defaultConf.style
      }
    case ShapeEnum.ellipse:
      return {
        type: ShapeEnum.ellipse,
        id: _.uniqueId(`${shape}_`),
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
        id: _.uniqueId(`${shape}_`),
        x: cursorPosition[0],
        y: cursorPosition[1],
        radius: 0,
        translation: [0, 0],
        rotation: 0,
        style: defaultConf.style
      }
  }
}

export const copyShape = (shape: DrawableShape) => {
  return {
    ...shape,
    id: _.uniqueId(`${shape.type}_`),
    translation: [shape.translation[0] + 20, shape.translation[1] + 20]
  } as DrawableShape
}

export const roundValues = <T extends unknown>(prop: T, precision = 2): T => {
  if (_.isArray(prop)) {
    return prop.map(roundValues) as T
  }
  if (_.isObject(prop)) {
    return _.mapValues(roundValues, prop) as T
  }
  if (_.isNumber(prop)) {
    return +prop.toFixed(precision) as T
  }
  return prop
}

export const cleanShapesBeforeExport = (shapes: DrawableShape[]) => {
  const propsToOmit = ['img', 'id']
  return shapes.map(shape => {
    if (shape.type === ShapeEnum.picture) {
      if (!shape.src.startsWith('http')) {
        return roundValues(_.omit(propsToOmit, { ...shape, src: getBase64Image(shape.img) }))
      }
    }
    return roundValues(_.omit(propsToOmit, shape))
  })
}

export const addDefaultAndTempShapeProps = (shape: DrawableShape) => {
  return { ...shape, id: _.uniqueId(`${shape.type}_`) }
}
