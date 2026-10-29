import type { PictureSrcResolver, UtilsSettings } from '@canvas/constants/app'
import type { DrawableShape, EditableShapeType, GroupShapeInput, Point, ShapeEntity, ShapeInput } from '@canvas/types/Shapes'
import type { CustomTool } from '@canvas/types/tools'
import { compact } from '@canvas/utils/array'
import { loadPicture } from '@canvas/utils/file'
import { isRecord } from '@canvas/utils/object'
import { refreshShape } from '@canvas/utils/shapes'
import { sizeText } from '@canvas/utils/shapes/text'
import { foldGroupInto, GROUP_MIN_SHAPES, getCommonRotation, getShapeLeaves, refreshGroup, removeShapesFromTree } from '@canvas/utils/shapes/tree'
import { findShapeTool, getToolDefaultStyle } from '@canvas/utils/tools'
import { createShapeId } from '@canvas/utils/util'

const COMMON_FIELDS = ['id', 'type', 'rotation', 'toolId', 'visible', 'locked', 'style', 'data']

/** Fields of a group: it has no tool, its style only has an opacity */
export const GROUP_FIELDS = ['id', 'type', 'rotation', 'visible', 'locked', 'style', 'data', 'shapes', 'name']

/** Fields of each type of shape besides the common ones: the only ones that can be given to create or update a shape */
const SHAPE_FIELDS: Record<EditableShapeType, string[]> = {
  rect: ['x', 'y', 'width', 'height'],
  square: ['x', 'y', 'width', 'height'],
  picture: ['x', 'y', 'width', 'height', 'src', 'flipX', 'flipY', 'ratio'],
  text: ['x', 'y', 'width', 'height', 'value', 'fontSize', 'flipX', 'flipY', 'ratio'],
  circle: ['x', 'y', 'radius'],
  ellipse: ['x', 'y', 'radiusX', 'radiusY'],
  line: ['points'],
  polygon: ['points'],
  curve: ['points'],
  brush: ['points', 'scaleX', 'scaleY']
}

const EDITABLE_SHAPE_TYPES = Object.keys(SHAPE_FIELDS)

export const isEditableShapeType = (type: unknown): type is EditableShapeType => EDITABLE_SHAPE_TYPES.includes(type as string)

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const isPoint = (value: unknown): value is Point => Array.isArray(value) && value.length === 2 && isFiniteNumber(value[0]) && isFiniteNumber(value[1])

const isPointList = (value: unknown, min: number): value is Point[] => Array.isArray(value) && value.length >= min && value.every(isPoint)

/** Checks that a shape, or a patch, only has the fields of its type */
export const getUnknownFieldError = (shape: Record<string, unknown>, type: EditableShapeType): string | undefined => {
  const unknownField = Object.keys(shape).find(field => !COMMON_FIELDS.includes(field) && !SHAPE_FIELDS[type].includes(field))
  return unknownField === undefined ? undefined : `unknown field "${unknownField}" for a ${type}`
}

/** Checks the types of the common fields given to create or update a shape */
export const getCommonFieldsError = (shape: Record<string, unknown>): string | undefined => {
  if (shape.rotation !== undefined && !isFiniteNumber(shape.rotation)) return '"rotation" must be a finite number'
  if (shape.style !== undefined && !isRecord(shape.style)) return '"style" must be an object'
  if (shape.data !== undefined && !isRecord(shape.data)) return '"data" must be an object'
  if (shape.visible !== undefined && typeof shape.visible !== 'boolean') return '"visible" must be a boolean'
  if (shape.locked !== undefined && typeof shape.locked !== 'boolean') return '"locked" must be a boolean'
  return undefined
}

/** Checks the geometry of a shape of the type: other fields are not read */
export const getGeometryError = (shape: Record<string, unknown>, type: EditableShapeType): string | undefined => {
  const numbers = (...fields: string[]) => fields.find(field => !isFiniteNumber(shape[field]))
  switch (type) {
    case 'rect':
    case 'square':
    case 'picture': {
      const field = numbers('x', 'y', 'width', 'height')
      if (field) return `"${field}" must be a finite number`
      if (type === 'picture' && (typeof shape.src !== 'string' || !shape.src)) return '"src" must be a non empty string'
      return undefined
    }
    case 'text': {
      const field = numbers('x', 'y') ?? ['width', 'height', 'fontSize'].find(key => shape[key] !== undefined && !isFiniteNumber(shape[key]))
      if (field) return `"${field}" must be a finite number`
      const { value } = shape
      if (!Array.isArray(value) || !value.length || value.some(line => typeof line !== 'string'))
        return '"value" must be a non empty array of strings'
      return undefined
    }
    case 'circle': {
      const field = numbers('x', 'y', 'radius')
      return field && `"${field}" must be a finite number`
    }
    case 'ellipse': {
      const field = numbers('x', 'y', 'radiusX', 'radiusY')
      return field && `"${field}" must be a finite number`
    }
    case 'line':
      return isPointList(shape.points, 2) && shape.points.length === 2 ? undefined : '"points" must hold exactly 2 points'
    case 'polygon':
    case 'curve':
      return isPointList(shape.points, 2) ? undefined : '"points" must hold at least 2 points'
    case 'brush':
      return Array.isArray(shape.points) && shape.points.length > 0 && shape.points.every(group => isPointList(group, 1))
        ? undefined
        : '"points" must be a non empty array of non empty point lists'
  }
}

/** Checks the fields of a group, given or patched, except its shapes */
export const getGroupFieldsError = (group: Record<string, unknown>, fields: string[]): string | undefined => {
  const unknownField = Object.keys(group).find(field => !fields.includes(field))
  if (unknownField === 'rotation') return '"rotation" of a group is changed by rotateShapes'
  if (unknownField === 'shapes') return '"shapes" of a group are changed by groupShapes and ungroupShapes'
  if (unknownField !== undefined) return `unknown field "${unknownField}" for a group`
  if (group.name !== undefined && typeof group.name !== 'string') return '"name" must be a string'
  const styleField = isRecord(group.style) ? Object.keys(group.style).find(field => field !== 'opacity') : undefined
  if (styleField !== undefined) return `the style of a group only has an opacity, not "${styleField}"`
  return getCommonFieldsError(group)
}

/**
 * Checks a shape given to create or update a shape: its type, the fields allowed for this type and its geometry, the
 * shapes of a group too. Returns the error message, or undefined when the shape is valid.
 */
export const getShapeInputError = (shape: unknown): string | undefined => {
  if (!isRecord(shape)) return 'a shape must be an object'
  const { type } = shape
  if (type !== 'group' && !isEditableShapeType(type)) return `unknown shape type "${String(type)}"`
  if (shape.id !== undefined && (typeof shape.id !== 'string' || !shape.id)) return '"id" must be a non empty string'
  if (type === 'group') return getGroupInputError(shape)
  return getUnknownFieldError(shape, type) ?? getCommonFieldsError(shape) ?? getGeometryError(shape, type)
}

const getGroupInputError = (group: Record<string, unknown>): string | undefined => {
  const fieldsError = getGroupFieldsError(group, GROUP_FIELDS)
  if (fieldsError) return fieldsError
  const { shapes } = group
  if (!Array.isArray(shapes) || shapes.length < GROUP_MIN_SHAPES) return `"shapes" must hold at least ${GROUP_MIN_SHAPES} shapes`
  for (const [index, shape] of shapes.entries()) {
    const error = getShapeInputError(shape)
    if (error) return `shapes[${index}], ${error}`
  }
  return undefined
}

/** Throws an error naming the faulty shape when one of them is invalid */
export const assertValidShapes = (shapes: unknown[], action: string) => {
  shapes.forEach((shape, index) => {
    const error = getShapeInputError(shape)
    if (error) throw new Error(`react-paint ${action}: invalid shape at index ${index}, ${error}`)
  })
}

/**
 * Geometry of a shape with its negative sizes made positive, as the canvas draws them: a box keeps the area between x and
 * x + width, a circle or an ellipse its radii. The flips of a picture or a text are kept. A negative box was never drawn,
 * and a negative radius could not be drawn
 */
export const normalizeGeometry = <T extends { type: string }>(shape: T): T => {
  const input = shape as unknown as ShapeInput
  switch (input.type) {
    case 'rect':
    case 'square':
    case 'picture':
    case 'text': {
      const { x, y, width = 0, height = 0 } = input
      if (width >= 0 && height >= 0) return shape
      return { ...shape, ...(width < 0 ? { x: x + width, width: -width } : {}), ...(height < 0 ? { y: y + height, height: -height } : {}) }
    }
    case 'circle':
      return input.radius < 0 ? { ...shape, radius: -input.radius } : shape
    case 'ellipse':
      return input.radiusX < 0 || input.radiusY < 0 ? { ...shape, radiusX: Math.abs(input.radiusX), radiusY: Math.abs(input.radiusY) } : shape
    default:
      return shape
  }
}

type BuildShapeOptions = {
  ctx: CanvasRenderingContext2D
  settings: UtilsSettings
  tools: CustomTool[]
  /** Ids already taken: an id given with the shape is kept when it is free. The id of the new shape is added to it */
  usedIds: Set<string>
  /** Completes the style with the default style of the tool of the shape. Loaded shapes keep their own style */
  completeStyle: boolean
}

/** The id given with a shape when it is free, or else a new one, taken in the ids used */
const takeShapeId = (input: { id?: unknown; type: ShapeInput['type'] }, usedIds: Set<string>): string => {
  const id = typeof input.id === 'string' && input.id && !usedIds.has(input.id) ? input.id : createShapeId(input.type)
  usedIds.add(id)
  return id
}

/** A group of shapes already built. Without rotation, it is turned like its shapes when they are all turned the same way */
const buildGroupEntity = (input: GroupShapeInput, id: string, shapes: ShapeEntity[], settings: UtilsSettings): ShapeEntity<'group'> => {
  const { shapes: _shapes, ...fields } = input
  return refreshGroup({ ...fields, id, rotation: input.rotation ?? getCommonRotation(shapes), shapes }, settings)
}

/**
 * Builds the entity of a shape given by the consumer, a group with its shapes, whose ids are free in the whole drawing.
 * The image of a picture is created empty: see loadPicture
 */
export const buildShapeEntity = (input: ShapeInput, options: BuildShapeOptions): ShapeEntity => {
  const { ctx, settings, tools, usedIds, completeStyle } = options
  const id = takeShapeId(input, usedIds)
  if (input.type === 'group') {
    return buildGroupEntity(
      input,
      id,
      input.shapes.map(shape => buildShapeEntity(shape, options)),
      settings
    )
  }
  const tool = completeStyle ? findShapeTool(tools, input) : undefined
  const style = tool ? { ...getToolDefaultStyle(tool), ...input.style } : input.style
  const shape = normalizeGeometry({ ...input, id, ...(style ? { style } : {}) })
  switch (shape.type) {
    case 'text':
      // a text given without its size takes the font size of its tool
      return refreshShape(sizeText(ctx, shape, tool?.type === 'text' ? tool.settings.fontSize?.default : undefined), settings)
    case 'picture':
      return refreshShape({ ...shape, img: new Image() }, settings)
    default:
      return refreshShape(shape as DrawableShape & { id: string }, settings)
  }
}

type DecodeOptions = Omit<BuildShapeOptions, 'completeStyle'> & { resolvePictureSrc: PictureSrcResolver | undefined }

/** A picture of loaded data whose image cannot be loaded, and the reason */
type FailedPicture = { shape: ShapeEntity<'picture'>; error: unknown }

/**
 * A shape of loaded data, a group with the shapes it can load: a group left with a single shape is dissolved, and an
 * empty one is left out, like a shape of an unknown type
 */
const decodeShape = (input: unknown, options: BuildShapeOptions): ShapeEntity | undefined => {
  if (!isRecord(input)) return undefined
  if (input.type === 'group') {
    const shapes = Array.isArray(input.shapes) ? compact(input.shapes.map(shape => decodeShape(shape, options))) : []
    if (shapes.length < GROUP_MIN_SHAPES) return shapes[0] && foldGroupInto(input, shapes[0])
    const group = input as unknown as GroupShapeInput
    return buildGroupEntity(group, takeShapeId(group, options.usedIds), shapes, options.settings)
  }
  return isEditableShapeType(input.type) ? buildShapeEntity(input as unknown as ShapeInput, options) : undefined
}

/**
 * Builds the shapes of loaded data and waits for their pictures. The shapes of an unknown type are left out, like the
 * pictures which cannot be loaded, with a warning: these pictures are returned apart, and their groups are dissolved
 * when a single shape is left. The others keep their style.
 */
export const decodeImportedData = async (
  inputs: ShapeInput[],
  { resolvePictureSrc, ...options }: DecodeOptions
): Promise<{ shapes: ShapeEntity[]; failedPictures: FailedPicture[] }> => {
  if (!inputs) return { shapes: [], failedPictures: [] }
  const buildOptions = { ...options, completeStyle: false }
  const shapes = compact(inputs.map(input => decodeShape(input, buildOptions)))
  const pictures = getShapeLeaves(shapes).filter((shape): shape is ShapeEntity<'picture'> => shape.type === 'picture')
  const loadings = await Promise.allSettled(pictures.map(picture => loadPicture(picture.img, picture.src, resolvePictureSrc)))
  const failedPictures: FailedPicture[] = []
  loadings.forEach((loading, index) => {
    if (loading.status === 'fulfilled') return
    const shape = pictures[index]!
    failedPictures.push({ shape, error: loading.reason })
    console.warn(`react-paint: the picture ${shape.id} is left out, it could not be loaded`, loading.reason)
  })
  const failedIds = new Set(failedPictures.map(({ shape }) => shape.id))
  return { shapes: removeShapesFromTree(shapes, failedIds, options.settings), failedPictures }
}
