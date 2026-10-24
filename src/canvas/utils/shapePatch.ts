import type { UtilsSettings } from '@canvas/constants/app'
import type { ShapeEntity, ShapePatch, StyleShape } from '@canvas/types/Shapes'
import { isRecord } from '@canvas/utils/object'
import { getCommonFieldsError, getGeometryError, getUnknownFieldError, isEditableShapeType, normalizeGeometry } from '@canvas/utils/shapeInput'
import { refreshShape } from '@canvas/utils/shapes'
import { fitTextFontSize, getComputedText, getTextLineCount, isFontStyleField, resizeTextShapeWithNewContent } from '@canvas/utils/shapes/text'

/** Checks a patch against the shape it updates. Returns the error message, or undefined when the patch is valid */
const getPatchError = (shape: ShapeEntity | undefined, patch: Record<string, unknown>): string | undefined => {
  if (!shape) return undefined
  const { type } = shape
  if (!isEditableShapeType(type)) return `a ${type} cannot be updated`
  if (patch.type !== undefined && patch.type !== type) return 'the type of a shape cannot change'
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
 * equal sides. The box of a text follows its new content or font size; its font size follows a new width or font,
 * like in the editor. The image of a picture whose source changes is reloaded by the caller.
 */
export const applyShapePatch = (ctx: CanvasRenderingContext2D, shape: ShapeEntity, patch: ShapePatch, settings: UtilsSettings): ShapeEntity => {
  const { id: _id, type: _type, ...fields } = patch as ShapePatch & { type?: unknown }
  const style = fields.style ? { ...shape.style, ...fields.style } : shape.style
  const next = normalizeGeometry({ ...shape, ...fields, style } as ShapeEntity)

  if (next.type === 'square' && ('width' in fields || 'height' in fields)) {
    const side = 'width' in fields ? next.width : next.height
    return refreshShape({ ...next, width: side, height: side }, settings)
  }

  if (next.type === 'text') {
    const hasContentChanged = 'value' in fields || 'fontSize' in fields || 'height' in fields
    const hasFontChanged = Object.keys(fields.style ?? {}).some(field => isFontStyleField(field as keyof StyleShape))
    if ('width' in fields || (hasFontChanged && !hasContentChanged)) return refreshShape(fitTextFontSize(ctx, next), settings)
    if (hasContentChanged) {
      const fontSize = 'fontSize' in fields ? next.fontSize : 'height' in fields ? next.height / getTextLineCount(next.value) : next.fontSize
      // the text keeps its top left corner, found from the center of the patched box
      const anchored = { ...next, fontSize, computed: getComputedText(next, settings) }
      return refreshShape(resizeTextShapeWithNewContent(ctx, anchored, next.value, settings), settings)
    }
  }

  return refreshShape(next, settings)
}
