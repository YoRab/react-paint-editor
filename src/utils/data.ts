import type { DrawableShape, DrawableShapeJson, ExportDataType, ShapeEntity } from '../types/Shapes'
import { getBase64Image } from './file'
import { refreshShape } from './shapes'
import { omit } from '../utils/object'
import { uniqueId } from '../utils/util'

export const cleanShapesBeforeExport = (shapes: DrawableShape[]): DrawableShapeJson[] => {
  const propsToOmit = ['img', 'id', 'selection', 'path', 'arrows']
  return shapes.map(shape => {
    if (shape.type === 'picture') {
      if (!shape.src.startsWith('http')) {
        return omit(propsToOmit, { ...shape, src: getBase64Image(shape.img) })
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
  } as ExportDataType
}

export const addDefaultAndTempShapeProps = (
  shape: DrawableShape,
  currentScale: number,
  selectionPadding: number
) => {
  return refreshShape(
    { ...shape, id: uniqueId(`${shape.type}_`) } as ShapeEntity,
    currentScale,
    selectionPadding
  )
}
