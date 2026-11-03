import { type CustomTool, flattenShapes, getParentGroup, type ReactPaint, type ShapeEntity } from '@canvas/index'
import { TOOL_LABELS } from '@editor/constants/tools'

/** Longest name taken from the content of a text */
const MAX_TEXT_NAME_LENGTH = 30

/** The first line of a text which is not empty, shortened */
const getTextName = (value: readonly string[]): string | undefined => {
  const line = value.find(row => row.trim())?.trim()
  if (!line) return undefined
  return line.length > MAX_TEXT_NAME_LENGTH ? `${line.slice(0, MAX_TEXT_NAME_LENGTH - 1)}…` : line
}

/**
 * Numbers of the default names given to the shapes, by id, kept from one naming to the next, see getShapeNames: the
 * removed shapes keep theirs, to take it again when they are put back
 */
export type ShapeNumbers = Map<string, ShapeNumber>

type ShapeNumber = {
  label: string
  rank: number
  /** Last naming which gave the number, see namingCount */
  naming: number
}

/** Counter of the namings, which tells the shape named last among the shapes of the same number */
let namingCount = 0

/**
 * Names of the shapes, the shapes of the groups too: the name given to a shape, the content of a text, or else the label of
 * its tool or of its type, numbered: 'Rectangle 2'. A shape keeps the number found in the numbers, which are completed:
 * it is not numbered again when it is moved. The other shapes take the numbers following the ones of their label, from
 * the background
 */
export const getShapeNames = (
  shapes: readonly ShapeEntity[],
  tools: readonly CustomTool[] = [],
  numbers: ShapeNumbers = new Map()
): Map<string, string> => {
  const toolLabels = new Map(tools.map(tool => [tool.id, tool.label]))
  const names = new Map<string, string>()
  // the shapes without a name, by label, from the background
  const unnamedIds = new Map<string, string[]>()
  for (const shape of flattenShapes(shapes).reverse()) {
    const name = shape.name ?? (shape.type === 'text' ? getTextName(shape.value) : undefined)
    if (name !== undefined) {
      names.set(shape.id, name)
      continue
    }
    const label = (shape.toolId && toolLabels.get(shape.toolId)) || TOOL_LABELS[shape.type]
    const ids = unnamedIds.get(label)
    if (ids) ids.push(shape.id)
    else unnamedIds.set(label, [shape.id])
  }
  const naming = ++namingCount
  for (const [label, ids] of unnamedIds) {
    // A shape keeps its number. A shape put back may find it given to another one meanwhile: the number stays with the
    // shape named last, which was shown with it
    const owners = new Map<number, string>()
    for (const id of ids) {
      const known = numbers.get(id)
      if (known?.label !== label) continue
      const owner = owners.get(known.rank)
      if (owner === undefined || numbers.get(owner)!.naming < known.naming) owners.set(known.rank, id)
    }
    let lastRank = 0
    for (const rank of owners.keys()) lastRank = Math.max(lastRank, rank)
    for (const id of ids) {
      let known = numbers.get(id)
      if (known && owners.get(known.rank) === id) known.naming = naming
      else {
        lastRank++
        known = { label, rank: lastRank, naming }
        numbers.set(id, known)
      }
      names.set(id, `${label} ${known.rank}`)
    }
  }
  return names
}

type PaintShapeNames = { numbers: ShapeNumbers; shapes?: readonly ShapeEntity[]; tools?: readonly CustomTool[]; names: Map<string, string> }

/** Whether the shapes would be named the same: a move or a resize changes none of the fields a name reads */
const haveSameNames = (a: readonly ShapeEntity[], b: readonly ShapeEntity[]): boolean =>
  a.length === b.length &&
  a.every((shape, index) => {
    const other = b[index]!
    if (shape === other) return true
    if (shape.id !== other.id || shape.type !== other.type || shape.toolId !== other.toolId || shape.name !== other.name) return false
    if (shape.type === 'text') return other.type === 'text' && shape.value === other.value
    return shape.type !== 'group' || (other.type === 'group' && haveSameNames(shape.shapes, other.shapes))
  })

const paintShapeNames = new WeakMap<ReactPaint, PaintShapeNames>()

/**
 * Names of the shapes of a canvas, see getShapeNames: its shapes keep their numbers while it lives, and the layers and the
 * announcements show the same names. They are only computed again when the shapes or the tools change
 */
export const getPaintShapeNames = (paint: ReactPaint, shapes: readonly ShapeEntity[], tools: readonly CustomTool[]): ReadonlyMap<string, string> => {
  let entry = paintShapeNames.get(paint)
  if (!entry) {
    entry = { numbers: new Map(), names: new Map() }
    paintShapeNames.set(paint, entry)
  }
  if (entry.shapes !== shapes || entry.tools !== tools) {
    if (entry.tools !== tools || !entry.shapes || !haveSameNames(entry.shapes, shapes)) entry.names = getShapeNames(shapes, tools, entry.numbers)
    entry.shapes = shapes
    entry.tools = tools
  }
  return entry.names
}

/** What a layer shows of a shape: it does not change while the shape is moved */
export type LayerItem = {
  id: string
  type: ShapeEntity['type']
  /** Tool which drew the shape, whose icon the layer shows */
  toolId: string | undefined
  /** Name given to the shape */
  name: string | undefined
  /** What the layer shows: the name of the shape, or its default name, see getShapeNames */
  label: string
  visible: boolean | undefined
  locked: boolean | undefined
  /** Number of groups holding the shape */
  depth: number
  /** Group holding the shape, undefined for a shape of the drawing */
  parentId: string | undefined
  /** Whether the shape is the first of its group, from the foreground, or the last: it cannot move further */
  isFirst: boolean
  isLast: boolean
}

/**
 * The layers of the shapes, from the foreground, each group followed by the layers of its shapes, with the names of the
 * shapes. A layer which has not changed keeps its identity from the previous layers, found by id
 */
export const buildLayers = (
  shapes: readonly ShapeEntity[],
  previousLayers: ReadonlyMap<string, LayerItem> = new Map(),
  labels: ReadonlyMap<string, string> = getShapeNames(shapes)
): LayerItem[] => {
  const layers: LayerItem[] = []
  const addLayers = (nodes: readonly ShapeEntity[], depth: number, parentId: string | undefined) => {
    nodes.forEach((shape, index) => {
      const { id, type, toolId, name, visible, locked } = shape
      const label = labels.get(id) ?? id
      const isFirst = index === 0
      const isLast = index === nodes.length - 1
      const previous = previousLayers.get(id)
      const isSame =
        previous?.type === type &&
        previous.toolId === toolId &&
        previous.name === name &&
        previous.label === label &&
        previous.visible === visible &&
        previous.locked === locked &&
        previous.depth === depth &&
        previous.parentId === parentId &&
        previous.isFirst === isFirst &&
        previous.isLast === isLast
      layers.push(isSame ? previous : { id, type, toolId, name, label, visible, locked, depth, parentId, isFirst, isLast })
      if (shape.type === 'group') addLayers(shape.shapes, depth + 1, id)
    })
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

/** Rows of a shape among the layers shown: a group is followed by the layers of its shapes shown */
export type LayerBlock = { first: number; last: number }

/**
 * The blocks of the shapes of the group of a layer, among the layers shown, and the index of the layer among them: a shape
 * is dropped between them. Undefined when the layer is not shown
 */
export const getSiblingBlocks = (layers: readonly LayerItem[], id: string): { blocks: LayerBlock[]; index: number } | undefined => {
  const layer = layers.find(item => item.id === id)
  if (!layer) return undefined
  const blocks: LayerBlock[] = []
  let index = -1
  for (let first = 0; first < layers.length; first++) {
    const sibling = layers[first]!
    if (sibling.parentId !== layer.parentId) continue
    // the layers deeper than the sibling, which follow it, are its shapes
    let last = first
    while ((layers[last + 1]?.depth ?? -1) > sibling.depth) last++
    if (sibling.id === id) index = blocks.length
    blocks.push({ first, last })
    first = last
  }
  return { blocks, index }
}

/**
 * Place of a shape among the shapes of its group, from the foreground, with the names of the shapes, as announced:
 * 'Rectangle 2 : position 1 sur 4'
 */
export const getLayerMoveMessage = (
  shapes: readonly ShapeEntity[],
  id: string,
  names: ReadonlyMap<string, string> = getShapeNames(shapes)
): string => {
  const parent = getParentGroup(shapes, id)
  const siblings = parent?.shapes ?? shapes
  const index = siblings.findIndex(shape => shape.id === id)
  if (index === -1) return ''
  const place = `${names.get(id)} : position ${index + 1} sur ${siblings.length}`
  return parent ? `${place} dans ${names.get(parent.id)}` : place
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
