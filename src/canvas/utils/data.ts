import type { UtilsSettings } from '@canvas/constants/app'
import type { DrawableShape, ShapeEntity, StateData } from '@common/types/Shapes'
import { omit } from '@common/utils/object'
import { uniqueId } from '@common/utils/util'
import { getStringifiedImage } from './file'
import { refreshShape } from './shapes'

export const cleanShapesBeforeExport = (shapes: DrawableShape[]): DrawableShape[] => {
  const propsToOmit = ['img', 'id', 'selection', 'path', 'arrows']
  return shapes.map(shape => {
    if (shape.type === 'picture') {
      if (!shape.src.startsWith('http')) {
        return omit(propsToOmit, { ...shape, src: getStringifiedImage(shape) })
      }
    }
    return omit(propsToOmit, shape)
  })
}

export const buildDataToExport = (shapes: DrawableShape[], width: number, height: number) => {
  return {
    shapes: cleanShapesBeforeExport(shapes),
    config: {
      width,
      height
    }
  } as StateData
}

export const addDefaultAndTempShapeProps = (shape: DrawableShape, settings: UtilsSettings) => {
  return refreshShape({ ...shape, id: uniqueId(`${shape.type}_`) } as ShapeEntity, settings)
}
