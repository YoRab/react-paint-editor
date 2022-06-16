import _ from 'lodash/fp'
import { calculateTextFontSize, fitContentInsideContainer } from './transform'
import { DrawablePicture, Point, DrawableShape, ShapeEnum } from 'types/Shapes'
import { getBase64Image } from './file'
import { CustomTool } from 'types/tools'
import { DEFAULT_SHAPE_PICTURE } from 'constants/tools'

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
        maxPictureHeight,
        true
      )

      const pictureShape: DrawablePicture = {
        toolId: DEFAULT_SHAPE_PICTURE.id,
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
  shape: CustomTool,
  cursorPosition: Point
): DrawableShape | undefined => {
  switch (shape.type) {
    case ShapeEnum.brush:
      shape.settings
      return {
        toolId: shape.id,
        type: ShapeEnum.brush,
        id: _.uniqueId(`${shape.type}_`),
        points: [[cursorPosition]],
        translation: [0, 0],
        rotation: 0,
        style: {
          globalAlpha: shape.settings.opacity.default,
          strokeColor: shape.settings.strokeColor.default,
          lineWidth: shape.settings.lineWidth.default,
          lineDash: shape.settings.lineDash.default
        }
      }
    case ShapeEnum.line:
      return {
        toolId: shape.id,
        type: ShapeEnum.line,
        id: _.uniqueId(`${shape.type}_`),
        points: [cursorPosition, cursorPosition],
        translation: [0, 0],
        rotation: 0,
        style: {
          globalAlpha: shape.settings.opacity.default,
          strokeColor: shape.settings.strokeColor.default,
          lineWidth: shape.settings.lineWidth.default,
          lineDash: shape.settings.lineDash.default,
          lineArrow: shape.settings.lineArrow.default
        }
      }
    case ShapeEnum.polygon:
      return {
        toolId: shape.id,
        type: ShapeEnum.polygon,
        id: _.uniqueId(`${shape.type}_`),
        points: _.flow(
          _.range(0),
          _.map(() => cursorPosition)
        )(shape.settings.pointsCount.default),
        translation: [0, 0],
        rotation: 0,
        style: {
          globalAlpha: shape.settings.opacity.default,
          fillColor: shape.settings.fillColor.default,
          strokeColor: shape.settings.strokeColor.default,
          lineWidth: shape.settings.lineWidth.default,
          lineDash: shape.settings.lineDash.default,
          pointsCount: shape.settings.pointsCount.default
        }
      }
    case ShapeEnum.curve:
      return {
        toolId: shape.id,
        type: ShapeEnum.curve,
        id: _.uniqueId(`${shape.type}_`),
        points: _.flow(
          _.range(0),
          _.map(() => cursorPosition)
        )(shape.settings.pointsCount.default),
        translation: [0, 0],
        rotation: 0,
        style: {
          globalAlpha: shape.settings.opacity.default,
          fillColor: shape.settings.fillColor.default,
          strokeColor: shape.settings.strokeColor.default,
          lineWidth: shape.settings.lineWidth.default,
          lineDash: shape.settings.lineDash.default,
          pointsCount: shape.settings.pointsCount.default
        }
      }
    case ShapeEnum.rect:
    case ShapeEnum.square:
      return {
        toolId: shape.id,
        type: shape.type,
        id: _.uniqueId(`${shape.type}_`),
        x: cursorPosition[0],
        y: cursorPosition[1],
        width: 1,
        height: 1,
        translation: [0, 0],
        rotation: 0,
        style: {
          globalAlpha: shape.settings.opacity.default,
          fillColor: shape.settings.fillColor.default,
          strokeColor: shape.settings.strokeColor.default,
          lineWidth: shape.settings.lineWidth.default,
          lineDash: shape.settings.lineDash.default
        }
      }
    case ShapeEnum.text:
      const defaultValue: string[] = []
      const fontSize = calculateTextFontSize(
        ctx,
        defaultValue,
        50,
        shape.settings.fontFamily.default
      )
      return {
        toolId: shape.id,
        type: ShapeEnum.text,
        id: _.uniqueId(`${shape.type}_`),
        x: cursorPosition[0],
        y: cursorPosition[1],
        value: defaultValue,
        fontSize,
        width: 50,
        height: fontSize * (defaultValue.length || 1),
        translation: [0, 0],
        rotation: 0,
        style: {
          globalAlpha: shape.settings.opacity.default,
          strokeColor: shape.settings.strokeColor.default,
          fontFamily: shape.settings.fontFamily.default
        }
      }
    case ShapeEnum.ellipse:
      return {
        toolId: shape.id,
        type: ShapeEnum.ellipse,
        id: _.uniqueId(`${shape.type}_`),
        x: cursorPosition[0],
        y: cursorPosition[1],
        radiusX: 0,
        radiusY: 0,
        translation: [0, 0],
        rotation: 0,
        style: {
          globalAlpha: shape.settings.opacity.default,
          fillColor: shape.settings.fillColor.default,
          strokeColor: shape.settings.strokeColor.default,
          lineWidth: shape.settings.lineWidth.default,
          lineDash: shape.settings.lineDash.default
        }
      }
    case ShapeEnum.circle:
      return {
        toolId: shape.id,
        type: ShapeEnum.circle,
        id: _.uniqueId(`${shape.type}_`),
        x: cursorPosition[0],
        y: cursorPosition[1],
        radius: 0,
        translation: [0, 0],
        rotation: 0,
        style: {
          globalAlpha: shape.settings.opacity.default,
          fillColor: shape.settings.fillColor.default,
          strokeColor: shape.settings.strokeColor.default,
          lineWidth: shape.settings.lineWidth.default,
          lineDash: shape.settings.lineDash.default
        }
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
