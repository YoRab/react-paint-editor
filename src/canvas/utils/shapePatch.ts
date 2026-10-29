import type { UtilsSettings } from '@canvas/constants/app'
import type { ShapeEntity, ShapePatch, StyleShape } from '@canvas/types/Shapes'
import { isRecord, omitUndefined } from '@canvas/utils/object'
import {
  GROUP_FIELDS,
  getCommonFieldsError,
  getGeometryError,
  getGroupFieldsError,
  getUnknownFieldError,
  normalizeGeometry
} from '@canvas/utils/shapeInput'
import { refreshShape } from '@canvas/utils/shapes'
import { fitTextFontSize, fitTextToStyle, getTextHeightInFontSizes, resizeTextShapeWithNewContent } from '@canvas/utils/shapes/text'

/** Fields of a group which a patch changes: its rotation and its shapes change with their own actions */
const GROUP_PATCH_FIELDS = GROUP_FIELDS.filter(field => field !== 'rotation' && field !== 'shapes')

/** Checks a patch against the shape it updates. Returns the error message, or undefined when the patch is valid */
const getPatchError = (shape: ShapeEntity | undefined, patch: Record<string, unknown>): string | undefined => {
  if (!shape) return undefined
  const { type } = shape
  if (patch.type !== undefined && patch.type !== type) return 'the type of a shape cannot change'
  if (type === 'group') return getGroupFieldsError(patch, GROUP_PATCH_FIELDS)
  return getUnknownFieldError(patch, type) ?? getCommonFieldsError(patch) ?? getGeometryError({ ...shape, ...patch }, type)
}

/** Throws an error naming the faulty patch when one of them is invalid. The patches of unknown shapes are ignored */
export const assertValidPatches = (patches: unknown[], shapesById: ReadonlyMap<string, ShapeEntity>) => {
  patches.forEach((patch, index) => {
    const error = isRecord(patch) && typeof patch.id === 'string' ? getPatchError(shapesById.get(patch.id), patch) : '"id" must be a string'
    if (error) throw new Error(`react-paint updateShapes: invalid patch at index ${index}, ${error}`)
  })
}

/**
 * Applies a patch to a shape: its fields replace the current ones, except the style which is merged. A square keeps
 * equal sides. The box of a text follows its new content, font size or line height; its font size follows a new width
 * or font, like in the editor. The image of a picture whose source changes is reloaded by the caller. A patch of a
 * group only changes its flags, its data, its name and its opacity.
 */
export const applyShapePatch = (ctx: CanvasRenderingContext2D, shape: ShapeEntity, patch: ShapePatch, settings: UtilsSettings): ShapeEntity => {
  const { id: _id, type: _type, ...fields } = patch as ShapePatch & { type?: unknown }
  const style = fields.style ? { ...shape.style, ...fields.style } : shape.style
  // the fields of a group do not change its frame. A name set to undefined is removed
  if (shape.type === 'group') return omitUndefined({ ...shape, ...fields, style } as ShapeEntity)
  const next = normalizeGeometry({ ...shape, ...fields, style } as ShapeEntity)

  if (next.type === 'square' && ('width' in fields || 'height' in fields)) {
    const side = 'width' in fields ? next.width : next.height
    return refreshShape({ ...next, width: side, height: side }, settings)
  }

  if (next.type === 'text') {
    if ('width' in fields) return refreshShape(fitTextFontSize(ctx, next), settings)
    if ('value' in fields || 'fontSize' in fields || 'height' in fields) {
      // a new height without font size is shared by the lines. The text keeps the top of its patched box
      const fontSize = 'height' in fields && !('fontSize' in fields) ? next.height / getTextHeightInFontSizes(next) : next.fontSize
      return refreshShape(resizeTextShapeWithNewContent(ctx, { ...next, fontSize }, next.value), settings)
    }
    return refreshShape(fitTextToStyle(ctx, next, Object.keys(fields.style ?? {}) as (keyof StyleShape)[]), settings)
  }

  return refreshShape(next, settings)
}
