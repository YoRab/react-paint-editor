import type { DataChanges } from '@canvas/types/editor'
import type { ExportedShape, ShapeEntity, StateData } from '@canvas/types/Shapes'
import { shallowEqual } from '@canvas/utils/equality'
import { isEqual } from '@canvas/utils/object'
import { roundValues } from '@canvas/utils/transform'
import { getBase64Image, isSourceEncodedOnExport } from './file'

/** Fields left out of the export: the image, the paths and the computed data are built again from the others */
const OMITTED_FIELDS = new Set(['img', 'path', 'arrows', 'tempPoint', 'computed'])

/** Flags only exported when they are set */
const OPTIONAL_FLAGS = new Set(['flipX', 'flipY'])

/**
 * Decimals of the exported positions and sizes: a thousandth of a unit, so that the data loaded again are drawn like the
 * exact ones, even the dashes at the end of a long stroke, where the rounding of each point adds up
 */
const LENGTH_DECIMALS = 3

/**
 * Decimals of the exported angles and factors: they are multiplied by the size of the shape, 6 decimals keep a
 * thousandth of a unit on a shape of 1000 units
 */
const FACTOR_DECIMALS = 6

/** Numbers rounded in the export, by field: the computations of the canvas leave them with endless decimals */
const ROUNDED_FIELDS = new Map([
  ['x', LENGTH_DECIMALS],
  ['y', LENGTH_DECIMALS],
  ['width', LENGTH_DECIMALS],
  ['height', LENGTH_DECIMALS],
  ['radius', LENGTH_DECIMALS],
  ['radiusX', LENGTH_DECIMALS],
  ['radiusY', LENGTH_DECIMALS],
  ['fontSize', LENGTH_DECIMALS],
  ['rotation', FACTOR_DECIMALS],
  ['scaleX', FACTOR_DECIMALS],
  ['scaleY', FACTOR_DECIMALS],
  ['ratio', FACTOR_DECIMALS]
])

/**
 * Rounded lists of points, by list: a shape rebuilt without moving, like after a change of style, keeps its points, and
 * its export shares their rounded list, compared at once in the changes
 */
const roundedLists = new WeakMap<unknown[], unknown[]>()

/** Rounds the coordinates of points, in lists of lists for a brush. A list without change is kept, not copied */
const roundCoordinates = (value: unknown): unknown => {
  if (typeof value === 'number') return roundValues(value, LENGTH_DECIMALS)
  if (!Array.isArray(value)) return value
  // only the lists are kept, not each point
  const isList = Array.isArray(value[0])
  const cached = isList ? roundedLists.get(value) : undefined
  if (cached) return cached
  const rounded = value.map(roundCoordinates)
  const result = rounded.some((item, i) => item !== value[i]) ? rounded : value
  if (isList) roundedLists.set(value, result)
  return result
}

const roundField = (field: string, value: unknown): unknown => {
  if (field === 'points') return roundCoordinates(value)
  const decimals = ROUNDED_FIELDS.get(field)
  return decimals !== undefined && typeof value === 'number' ? roundValues(value, decimals) : value
}

/** The fields kept and rounded, copied into a new object: removing fields from a copy would slow down the access to the copy */
const buildExportedShape = (shape: ShapeEntity): ExportedShape => {
  const exported: Record<string, unknown> = {}
  for (const field of Object.keys(shape)) {
    const value = (shape as Record<string, unknown>)[field]
    if (OMITTED_FIELDS.has(field) || (OPTIONAL_FLAGS.has(field) && (value === undefined || value === false))) continue
    exported[field] = roundField(field, value)
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
