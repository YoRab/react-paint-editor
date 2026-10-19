import type { DataChanges } from '@canvas/types/editor'
import type { ExportedShape, ShapeEntity, StateData } from '@canvas/types/Shapes'
import { shallowEqual } from '@canvas/utils/equality'
import { isEqual } from '@canvas/utils/object'
import { getBase64Image, isSourceEncodedOnExport } from './file'

/** Fields left out of the export: the image, the paths and the computed data are built again from the others */
const OMITTED_FIELDS = new Set(['img', 'path', 'arrows', 'tempPoint', 'computed'])

/** Flags only exported when they are set */
const OPTIONAL_FLAGS = new Set(['flipX', 'flipY'])

/** The fields kept, copied into a new object: removing fields from a copy would slow down the access to the copy */
const buildExportedShape = (shape: ShapeEntity): ExportedShape => {
  const exported: Record<string, unknown> = {}
  for (const field of Object.keys(shape)) {
    const value = (shape as Record<string, unknown>)[field]
    if (OMITTED_FIELDS.has(field) || (OPTIONAL_FLAGS.has(field) && (value === undefined || value === false))) continue
    exported[field] = value
  }
  return exported as unknown as ExportedShape
}

/**
 * Exports of the shapes, built once per shape: a shape is never changed, only replaced, and all the shapes are exported on
 * each change of the history
 */
const exportCache = new WeakMap<ShapeEntity, ExportedShape>()

const getCachedExport = (shape: ShapeEntity): ExportedShape => {
  const cached = exportCache.get(shape)
  if (cached) return cached
  const exported = buildExportedShape(shape)
  exportCache.set(shape, exported)
  return exported
}

/** The export of a shape, shared between the calls: it is copied before it is given to the consumers */
const getExportedShape = (shape: ShapeEntity): ExportedShape => {
  const exported = getCachedExport(shape)
  // the source of a picture may be encoded from its image, which may be loaded after the first export
  return shape.type === 'picture' && isSourceEncodedOnExport(shape.src)
    ? ({ ...exported, src: getBase64Image(shape.img) } as ExportedShape)
    : exported
}

/** The shape as exported: its id and its data are kept, the computed data are left out. Each call returns a new object */
const cleanShapeBeforeExport = (shape: ShapeEntity): ExportedShape => ({ ...getExportedShape(shape) })

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
      const previous = getExportedShape(previousShape)
      if (!isEqual(previous, exportedShape)) updated.push({ shape: exportedShape, previous: { ...previous } })
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
