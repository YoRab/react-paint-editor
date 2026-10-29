import type { ShapeEntity } from '@canvas/index'

/** What a layer shows of a shape: it does not change while the shape is moved */
export type LayerItem = {
  id: string
  type: ShapeEntity['type']
  /** Name of a group, shown instead of its id */
  name: string | undefined
  visible: boolean | undefined
  locked: boolean | undefined
  /** Number of groups holding the shape */
  depth: number
  /** Group holding the shape, undefined for a shape of the drawing */
  parentId: string | undefined
}

/**
 * The layers of the shapes, from the foreground, each group followed by the layers of its shapes. A layer which has not
 * changed keeps its identity from the previous layers, found by id
 */
export const buildLayers = (shapes: readonly ShapeEntity[], previousLayers: ReadonlyMap<string, LayerItem> = new Map()): LayerItem[] => {
  const layers: LayerItem[] = []
  const addLayers = (nodes: readonly ShapeEntity[], depth: number, parentId: string | undefined) => {
    for (const shape of nodes) {
      const { id, type, visible, locked } = shape
      const name = shape.type === 'group' ? shape.name : undefined
      const previous = previousLayers.get(id)
      const isSame =
        previous?.type === type &&
        previous.name === name &&
        previous.visible === visible &&
        previous.locked === locked &&
        previous.depth === depth &&
        previous.parentId === parentId
      layers.push(isSame ? previous : { id, type, name, visible, locked, depth, parentId })
      if (shape.type === 'group') addLayers(shape.shapes, depth + 1, id)
    }
  }
  addLayers(shapes, 0, undefined)
  return layers
}

/** The layers shown: the layers of the shapes of a collapsed group are left out */
export const getShownLayers = (layers: LayerItem[], collapsedIds: ReadonlySet<string>): LayerItem[] => {
  if (!collapsedIds.size) return layers
  const shownLayers: LayerItem[] = []
  // the layers deeper than a collapsed group, which follow it, are its shapes
  let collapsedDepth = Number.POSITIVE_INFINITY
  for (const layer of layers) {
    if (layer.depth > collapsedDepth) continue
    collapsedDepth = collapsedIds.has(layer.id) ? layer.depth : Number.POSITIVE_INFINITY
    shownLayers.push(layer)
  }
  return shownLayers
}

/** The groups holding the shapes of these ids, at any depth */
export const getLayerAncestorIds = (layers: readonly LayerItem[], ids: readonly string[]): Set<string> => {
  const parentIds = new Map(layers.map(layer => [layer.id, layer.parentId]))
  const ancestorIds = new Set<string>()
  for (const id of ids) {
    for (let parentId = parentIds.get(id); parentId !== undefined && !ancestorIds.has(parentId); parentId = parentIds.get(parentId)) {
      ancestorIds.add(parentId)
    }
  }
  return ancestorIds
}
