import type { DataChanges } from '@canvas/types/editor'
import type { ExportedShape, ShapeEntity, StateData } from '@canvas/types/Shapes'
import { shallowEqual } from '@canvas/utils/equality'
import { isEqual, omit } from '@canvas/utils/object'
import { getStringifiedImage } from './file'

const propsToOmit: (string | [string, unknown[]])[] = [
  'img',
  'selection',
  'path',
  'arrows',
  'tempPoint',
  'computed',
  ['flipX', [undefined, false]],
  ['flipY', [undefined, false]]
]

/** The shape as exported: its id and its data are kept, the computed data are left out */
const cleanShapeBeforeExport = (shape: ShapeEntity): ExportedShape => {
  if (shape.type === 'picture') {
    if (!shape.src.startsWith('http')) {
      return omit(propsToOmit, { ...shape, src: getStringifiedImage(shape) }) as unknown as ExportedShape
    }
  }
  return omit(propsToOmit, shape) as unknown as ExportedShape
}

export const cleanShapesBeforeExport = (shapes: ShapeEntity[]): ExportedShape[] => shapes.map(cleanShapeBeforeExport)

export const buildDataToExport = (shapes: ShapeEntity[], width: number, height: number): Required<StateData> => {
  return {
    shapes: cleanShapesBeforeExport(shapes),
    config: {
      width,
      height
    }
  }
}

/** Changes from the previous shapes to the new ones, found by id. The new shapes are given with their export */
export const getDataChanges = (previousShapes: ShapeEntity[], shapes: ShapeEntity[], exportedShapes: ExportedShape[]): DataChanges => {
  const previousById = new Map(previousShapes.map(shape => [shape.id, shape]))
  const ids = new Set(shapes.map(shape => shape.id))
  const added: ExportedShape[] = []
  const updated: DataChanges['updated'] = []
  shapes.forEach((shape, index) => {
    const previousShape = previousById.get(shape.id)
    const exportedShape = exportedShapes[index]!
    if (!previousShape) {
      added.push(exportedShape)
    } else if (previousShape !== shape) {
      // a shape is rebuilt without change when its computed data are refreshed
      const previous = cleanShapeBeforeExport(previousShape)
      if (!isEqual(previous, exportedShape)) updated.push({ shape: exportedShape, previous })
    }
  })
  const keptIds = shapes.filter(shape => previousById.has(shape.id)).map(shape => shape.id)
  const previousKeptIds = previousShapes.filter(shape => ids.has(shape.id)).map(shape => shape.id)
  return {
    added,
    updated,
    removed: cleanShapesBeforeExport(previousShapes.filter(shape => !ids.has(shape.id))),
    reordered: !shallowEqual(keptIds, previousKeptIds)
  }
}
