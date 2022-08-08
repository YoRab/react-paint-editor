import _ from 'lodash/fp'
import { calculateTextFontSize, fitContentInsideContainer, translateShape } from './transform'
import type {
  DrawablePicture,
  Point,
  DrawableShape,
  DrawableShapeJson,
  ExportDataType
} from 'types/Shapes'
import { fetchAndStringify, getBase64Image } from './file'
import type { CustomTool } from 'types/tools'
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
        type: 'picture',
        id: _.uniqueId(`${'picture'}_`),
        x: (maxPictureWidth - width) / 2,
        y: (maxPictureHeight - height) / 2,
        width,
        height,
        src: fileOrUrl instanceof File ? img.src : fileOrUrl,
        img,
        rotation: 0
      }
      resolve(pictureShape)
    }

    img.onerror = () => {
      reject(new Error('Some images could not be loaded'))
    }
    if (fileOrUrl instanceof File) {
      img.src = URL.createObjectURL(fileOrUrl)
    } else {
      fetchAndStringify(fileOrUrl)
        .then(picData => {
          img.src = picData
        })
        .catch(() => {
          img.src = '' // to trigger onerror
        })
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
    case 'brush':
      shape.settings
      return {
        toolId: shape.id,
        type: shape.type,
        id: _.uniqueId(`${shape.type}_`),
        points: [[cursorPosition]],
        rotation: 0,
        style: {
          globalAlpha: shape.settings.opacity.default,
          strokeColor: shape.settings.strokeColor.default,
          lineWidth: shape.settings.lineWidth.default,
          lineDash: shape.settings.lineDash.default
        }
      }
    case 'line':
      return {
        toolId: shape.id,
        type: shape.type,
        id: _.uniqueId(`${shape.type}_`),
        points: [cursorPosition, cursorPosition],
        rotation: 0,
        style: {
          globalAlpha: shape.settings.opacity.default,
          strokeColor: shape.settings.strokeColor.default,
          lineWidth: shape.settings.lineWidth.default,
          lineDash: shape.settings.lineDash.default,
          lineArrow: shape.settings.lineArrow.default
        }
      }
    case 'polygon':
      return {
        toolId: shape.id,
        type: shape.type,
        id: _.uniqueId(`${shape.type}_`),
        points: _.flow(
          _.range(0),
          _.map(() => cursorPosition)
        )(shape.settings.pointsCount.default),
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
    case 'curve':
      return {
        toolId: shape.id,
        type: shape.type,
        id: _.uniqueId(`${shape.type}_`),
        points: _.flow(
          _.range(0),
          _.map(() => cursorPosition)
        )(shape.settings.pointsCount.default),
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
    case 'rect':
    case 'square':
      return {
        toolId: shape.id,
        type: shape.type,
        id: _.uniqueId(`${shape.type}_`),
        x: cursorPosition[0],
        y: cursorPosition[1],
        width: 1,
        height: 1,
        rotation: 0,
        style: {
          globalAlpha: shape.settings.opacity.default,
          fillColor: shape.settings.fillColor.default,
          strokeColor: shape.settings.strokeColor.default,
          lineWidth: shape.settings.lineWidth.default,
          lineDash: shape.settings.lineDash.default
        }
      }
    case 'text':
      const defaultValue: string[] = ['Texte']
      const fontSize = calculateTextFontSize(
        ctx,
        defaultValue,
        50,
        shape.settings?.fontBold.default ?? false,
        shape.settings?.fontItalic.default ?? false,
        shape.settings.fontFamily.default
      )
      return {
        toolId: shape.id,
        type: shape.type,
        id: _.uniqueId(`${shape.type}_`),
        x: cursorPosition[0],
        y: cursorPosition[1],
        value: defaultValue,
        fontSize,
        width: 50,
        height: fontSize * (defaultValue.length || 1),
        rotation: 0,
        style: {
          globalAlpha: shape.settings.opacity.default,
          strokeColor: shape.settings.strokeColor.default,
          fontFamily: shape.settings.fontFamily.default
        }
      }
    case 'ellipse':
      return {
        toolId: shape.id,
        type: shape.type,
        id: _.uniqueId(`${shape.type}_`),
        x: cursorPosition[0],
        y: cursorPosition[1],
        radiusX: 0,
        radiusY: 0,
        rotation: 0,
        style: {
          globalAlpha: shape.settings.opacity.default,
          fillColor: shape.settings.fillColor.default,
          strokeColor: shape.settings.strokeColor.default,
          lineWidth: shape.settings.lineWidth.default,
          lineDash: shape.settings.lineDash.default
        }
      }
    case 'circle':
      return {
        toolId: shape.id,
        type: shape.type,
        id: _.uniqueId(`${shape.type}_`),
        x: cursorPosition[0],
        y: cursorPosition[1],
        radius: 0,
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
    ...translateShape([20, 20], shape, [0, 0]),
    id: _.uniqueId(`${shape.type}_`)
  } as DrawableShape
}

export const roundValues = <T extends unknown>(prop: T, precision = 0): T => {
  if (_.isArray(prop)) {
    return prop.map((value: unknown) => roundValues(value, precision)) as T
  }
  if (_.isObject(prop)) {
    return _.mapValues((value: unknown) => roundValues(value, precision), prop) as T
  }
  if (_.isNumber(prop)) {
    return +prop.toFixed(precision) as T
  }
  return prop
}

export const cleanShapesBeforeExport = (shapes: DrawableShape[]) => {
  const propsToOmit = ['img', 'id']
  return shapes.map(shape => {
    if (shape.type === 'picture') {
      if (!shape.src.startsWith('http')) {
        return roundValues(_.omit(propsToOmit, { ...shape, src: getBase64Image(shape.img) }))
      }
    }
    return roundValues(_.omit(propsToOmit, shape))
  }) as DrawableShapeJson[]
}

export const buildDataToExport = (shapes: DrawableShape[], width: number, height: number) => {
  return {
    shapes: cleanShapesBeforeExport(shapes),
    config: {
      width,
      height
    }
  } as ExportDataType
}

export const addDefaultAndTempShapeProps = (shape: DrawableShape) => {
  return { ...shape, id: _.uniqueId(`${shape.type}_`) }
}
