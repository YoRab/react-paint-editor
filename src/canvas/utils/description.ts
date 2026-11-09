import type { CanvasLocale } from '@canvas/constants/locale'
import type { ShapeEntity } from '@canvas/types/Shapes'
import { shallowEqual } from '@canvas/utils/equality'
import { formatMessage } from '@canvas/utils/locale'

/** A shape of the drawing as the assistive technologies read it: a group with its shapes */
export type ShapeDescription = { id: string; label: string; shapes?: ShapeDescription[] }

/** Type of the shape, its name, and the content of a text: 'Text “Title”: Hello' */
export const getShapeLabel = (shape: ShapeEntity, { lang, canvas }: CanvasLocale): string => {
  const type = canvas.shapeTypes[shape.type]
  const label = shape.name ? formatMessage(canvas.namedShape, { type, name: shape.name }, lang) : type
  return shape.type === 'text' ? formatMessage(canvas.textShape, { label, text: shape.value.join(' ') }, lang) : label
}

/** The fields of a shape its description reads, kept with the description: a moved shape is a new object, which reads the same */
type DescribedShape = {
  type: ShapeEntity['type']
  name: string | undefined
  value: string[] | undefined
  selected: boolean
  description: ShapeDescription
  /** Last description of the drawing which read the shape */
  reading: number
}

/**
 * Describes the visible shapes of the drawing, from the foreground, the selected ones being told. The descriptions keep
 * their identity while they read the same: a move of the shapes does not change them
 */
export const createShapesDescriber = (locale: CanvasLocale) => {
  // each shape is described again only when a field its description reads changes
  const cache = new Map<string, DescribedShape>()
  let last: ShapeDescription[] = []
  let reading = 0
  let readCount = 0

  const describe = (shape: ShapeEntity, selectedIds: ReadonlySet<string>): ShapeDescription => {
    readCount++
    const selected = selectedIds.has(shape.id)
    const value = shape.type === 'text' ? shape.value : undefined
    // the descriptions of the shapes of a group keep their identity too
    const shapes = shape.type === 'group' ? describeList(shape.shapes, selectedIds) : undefined
    const cached = cache.get(shape.id)
    if (
      cached?.type === shape.type &&
      cached.name === shape.name &&
      cached.value === value &&
      cached.selected === selected &&
      shallowEqual(cached.description.shapes, shapes)
    ) {
      cached.reading = reading
      return cached.description
    }
    const label = getShapeLabel(shape, locale)
    const description = {
      id: shape.id,
      label: selected ? formatMessage(locale.canvas.selectedShape, { label }, locale.lang) : label,
      ...(shapes ? { shapes } : {})
    }
    cache.set(shape.id, { type: shape.type, name: shape.name, value, selected, description, reading })
    return description
  }

  const describeList = (shapes: readonly ShapeEntity[], selectedIds: ReadonlySet<string>) => {
    const descriptions: ShapeDescription[] = []
    for (const shape of shapes) if (shape.visible !== false) descriptions.push(describe(shape, selectedIds))
    return descriptions
  }

  return (shapes: readonly ShapeEntity[], selectedIds: readonly string[]): ShapeDescription[] => {
    reading++
    readCount = 0
    const descriptions = describeList(shapes, new Set(selectedIds))
    // the shapes removed or hidden are forgotten
    if (cache.size > readCount) {
      for (const [id, cached] of cache) if (cached.reading !== reading) cache.delete(id)
    }
    if (!shallowEqual(descriptions, last)) last = descriptions
    return last
  }
}
