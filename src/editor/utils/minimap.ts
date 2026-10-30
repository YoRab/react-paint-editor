import type { EditorState, Point, Rect, ShapeEntity } from '@canvas/index'

/** Size of the minimap, in pixels of the screen */
export const MINIMAP_SIZE = { width: 180, height: 120 }

/** Margin kept on each side of the minimap, as a ratio of its size: the shapes at the border stay readable */
export const MINIMAP_MARGIN_RATIO = 0.06

/** A fixed drawing can only be panned where it is larger than the view, by more than this many units */
const PAN_EPSILON = 0.5

/** The part of the state the geometry of the minimap reads */
type MinimapState = Pick<EditorState, 'width' | 'height' | 'layout' | 'view'>

/** The boxes of the shapes drawn, in the units of the drawing: a minimap draws one rectangle per shape */
type MinimapShapes = {
  boxes: Rect[]
  selectedBoxes: Rect[]
  /** Box of all of them, undefined when nothing is drawn */
  bounds: Rect | undefined
}

/**
 * The boxes of the shapes drawn, from the tree of the shapes: the shapes of the groups in place of the groups, the
 * hidden ones and the shapes of the hidden groups left out, like the shapes zoomToShapes fits. The shapes of a selected
 * group are selected with it
 */
export const collectMinimapShapes = (shapes: readonly ShapeEntity[], selectedIds: ReadonlySet<string>): MinimapShapes => {
  const boxes: Rect[] = []
  const selectedBoxes: Rect[] = []
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  const walk = (nodes: readonly ShapeEntity[], isSelected: boolean) => {
    for (const shape of nodes) {
      if (shape.visible === false) continue
      const isShapeSelected = isSelected || selectedIds.has(shape.id)
      if (shape.type === 'group') {
        walk(shape.shapes, isShapeSelected)
        continue
      }
      const box = shape.computed.boundingBox
      ;(isShapeSelected ? selectedBoxes : boxes).push(box)
      if (box.x < minX) minX = box.x
      if (box.y < minY) minY = box.y
      if (box.x + box.width > maxX) maxX = box.x + box.width
      if (box.y + box.height > maxY) maxY = box.y + box.height
    }
  }
  walk(shapes, false)

  const bounds = minX > maxX ? undefined : { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  return { boxes, selectedBoxes, bounds }
}

/**
 * Collects the boxes of the shapes of a state, and gives the same result again while its shapes and its selection are the
 * same: the view changes on each frame of a pan, and the shapes do not
 */
export const createMinimapShapesCollector = () => {
  let last: { shapes: EditorState['shapes']; selectedShapeIds: EditorState['selectedShapeIds']; result: MinimapShapes } | undefined
  return ({ shapes, selectedShapeIds }: Pick<EditorState, 'shapes' | 'selectedShapeIds'>): MinimapShapes => {
    if (last?.shapes === shapes && last.selectedShapeIds === selectedShapeIds) return last.result
    const result = collectMinimapShapes(shapes, new Set(selectedShapeIds))
    last = { shapes, selectedShapeIds, result }
    return result
  }
}

/** Smallest rectangle holding both rectangles */
const getUnion = (first: Rect, second: Rect): Rect => {
  const x = Math.min(first.x, second.x)
  const y = Math.min(first.y, second.y)
  return {
    x,
    y,
    width: Math.max(first.x + first.width, second.x + second.width) - x,
    height: Math.max(first.y + first.height, second.y + second.height) - y
  }
}

/**
 * Area the minimap shows: the whole drawing when its size is fixed, else the shapes and the view together, so that both
 * fit in it. Its sides are never zero, so that it can always be scaled
 */
export const getMinimapBounds = (shapesBounds: Rect | undefined, { layout, width, height, view }: MinimapState): Rect => {
  const { visibleArea } = view
  const bounds = layout.size === 'fixed' ? { x: 0, y: 0, width, height } : shapesBounds ? getUnion(shapesBounds, visibleArea) : visibleArea
  return { ...bounds, width: Math.max(bounds.width, 1), height: Math.max(bounds.height, 1) }
}

/** A point of the drawing is drawn at point × scale + delta pixels from the top left corner of the minimap */
export type MinimapTransform = {
  scale: number
  dx: number
  dy: number
}

/** Fits the bounds in the minimap, keeping their proportions and centering them: the margin is a ratio of each side */
export const getMinimapTransform = (bounds: Rect, { width, height }: { width: number; height: number }, margin: number): MinimapTransform => {
  const scale = Math.min((width * (1 - 2 * margin)) / bounds.width, (height * (1 - 2 * margin)) / bounds.height)
  return {
    scale,
    dx: (width - bounds.width * scale) / 2 - bounds.x * scale,
    dy: (height - bounds.height * scale) / 2 - bounds.y * scale
  }
}

/** Point of the drawing at a position of the minimap */
export const toDrawingPoint = ({ scale, dx, dy }: MinimapTransform, [x, y]: Point): Point => [(x - dx) / scale, (y - dy) / scale]

/** Rectangle of the minimap showing a rectangle of the drawing */
export const toMinimapRect = ({ scale, dx, dy }: MinimapTransform, { x, y, width, height }: Rect): Rect => ({
  x: x * scale + dx,
  y: y * scale + dy,
  width: width * scale,
  height: height * scale
})

/**
 * Offset of the view showing the point in its middle. A point of the drawing is displayed at point + offset, so the
 * view starts at -offset: see EditorState['view']
 */
export const getOffsetToCenter = (visibleArea: Rect, [x, y]: Point): Point => [visibleArea.width / 2 - x, visibleArea.height / 2 - y]

/** Whether the view can move: an infinite drawing is always panned, a fixed one only where it is larger than the view */
export const canPanView = ({ layout, width, height, view }: MinimapState): boolean =>
  layout.size === 'infinite' || width > view.visibleArea.width + PAN_EPSILON || height > view.visibleArea.height + PAN_EPSILON
