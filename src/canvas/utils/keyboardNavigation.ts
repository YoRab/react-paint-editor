import type { Point, Rect, ShapeEntity } from '@canvas/types/Shapes'
import { getParentGroup } from '@canvas/utils/shapes/tree'
import { getRectCenter } from '@canvas/utils/trigo'

/** The shapes Tab goes through: the visible ones which are not locked */
const isNavigable = (shape: ShapeEntity) => shape.visible !== false && !shape.locked

/**
 * The shape after the selected one, or before it, among the shapes of its group or of the drawing, from the foreground:
 * it goes round. The first or the last shape of the drawing without selection
 */
export const getNextShape = (shapes: ShapeEntity[], selectedShapes: ShapeEntity[], direction: 1 | -1): ShapeEntity | undefined => {
  const current = selectedShapes[0]
  const list = current ? (getParentGroup(shapes, current.id)?.shapes ?? shapes) : shapes
  const candidates = list.filter(isNavigable)
  if (!candidates.length) return undefined
  const index = current ? candidates.findIndex(shape => shape.id === current.id) : -1
  if (index < 0) return direction > 0 ? candidates[0] : candidates.at(-1)
  return candidates[(index + direction + candidates.length) % candidates.length]
}

/** The first shape of a group which Tab goes through, given by Enter on the group */
export const getFirstShapeOfGroup = (group: ShapeEntity): ShapeEntity | undefined =>
  group.type === 'group' ? group.shapes.find(isNavigable) : undefined

/** Offset of the view showing the box in its middle, or undefined when the box is already inside the view */
export const getOffsetShowingBox = (box: Rect, view: Rect): Point | undefined => {
  const isInside = box.x >= view.x && box.y >= view.y && box.x + box.width <= view.x + view.width && box.y + box.height <= view.y + view.height
  const [centerX, centerY] = getRectCenter(box)
  return isInside ? undefined : [view.width / 2 - centerX, view.height / 2 - centerY]
}
