import _ from 'lodash/fp'
import type { DrawableShape, DrawableShapeJson, ExportDataType } from '../types/Shapes'
import { getBase64Image } from './file'

export const cleanShapesBeforeExport = (shapes: DrawableShape[]) => {
  const propsToOmit = ['img', 'id']
  return shapes.map(shape => {
    if (shape.type === 'picture') {
      if (!shape.src.startsWith('http')) {
        return _.omit(propsToOmit, { ...shape, src: getBase64Image(shape.img) })
      }
    }
    return _.omit(propsToOmit, shape)
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
