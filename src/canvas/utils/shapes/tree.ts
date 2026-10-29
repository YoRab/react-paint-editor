import type { UtilsSettings } from '@canvas/constants/app'
import { SHAPES_WITH_ROTATION } from '@canvas/constants/shapes'
import type { DrawableShape, Point, ShapeEntity, StyleShape } from '@canvas/types/Shapes'
import { shallowEqual } from '@canvas/utils/equality'
import { buildShapesFrame } from '@canvas/utils/selection'
import { getBoundingRect, getPointsBounds, getRectCorners, rotatePoint } from '@canvas/utils/trigo'
import { createShapeId } from '@canvas/utils/util'

/*
 * The shapes of the drawing are a tree: a group holds its shapes, from the foreground, which keep their own positions and
 * rotations in the drawing. These utils walk the tree and change it, building again the frames of the groups changed
 */

/** Smallest number of shapes of a group: a group of a single shape is dissolved */
export const GROUP_MIN_SHAPES = 2

export const isGroup = (shape: ShapeEntity): shape is ShapeEntity<'group'> => shape.type === 'group'

/** All the shapes of the tree, each group before its shapes, from the foreground */
export const flattenShapes = (shapes: readonly ShapeEntity[]): ShapeEntity[] => {
  const nodes: ShapeEntity[] = []
  const walk = (list: readonly ShapeEntity[]) => {
    for (const shape of list) {
      nodes.push(shape)
      if (shape.type === 'group') walk(shape.shapes)
    }
  }
  walk(shapes)
  return nodes
}

/** The shapes drawn by the shapes: the shapes of the groups, from the foreground */
export const getShapeLeaves = (shapes: readonly ShapeEntity[]): ShapeEntity[] => {
  const leaves: ShapeEntity[] = []
  const walk = (list: readonly ShapeEntity[]) => {
    for (const shape of list) {
      if (shape.type === 'group') walk(shape.shapes)
      else leaves.push(shape)
    }
  }
  walk(shapes)
  return leaves
}

/** A shape drawn in the tree, with the groups holding it, from the outermost one, and its flags with theirs */
export type ShapeLeaf = {
  leaf: ShapeEntity
  ancestors: ShapeEntity<'group'>[]
  /** Visible only when its groups are visible too */
  visible: boolean
  /** Locked when one of its groups is locked */
  locked: boolean
}

export type ShapeTreeIndex = {
  byId: Map<string, ShapeEntity>
  /** The groups holding each shape of a group, from the outermost one: the shapes of a group share them */
  ancestorsById: Map<string, ShapeEntity<'group'>[]>
  /** The shapes drawn, from the foreground */
  leaves: ShapeLeaf[]
}

const buildShapeTreeIndex = (shapes: readonly ShapeEntity[]): ShapeTreeIndex => {
  const index: ShapeTreeIndex = { byId: new Map(), ancestorsById: new Map(), leaves: [] }
  const walk = (list: readonly ShapeEntity[], ancestors: ShapeEntity<'group'>[], visible: boolean, locked: boolean) => {
    for (const shape of list) {
      index.byId.set(shape.id, shape)
      if (ancestors.length) index.ancestorsById.set(shape.id, ancestors)
      const isVisible = visible && shape.visible !== false
      const isLocked = locked || !!shape.locked
      if (shape.type === 'group') walk(shape.shapes, [...ancestors, shape], isVisible, isLocked)
      else index.leaves.push({ leaf: shape, ancestors, visible: isVisible, locked: isLocked })
    }
  }
  walk(shapes, [], true, false)
  return index
}

/** Indexes of the trees, built once per list of shapes: a list is never changed, only replaced */
const treeIndexes = new WeakMap<readonly ShapeEntity[], ShapeTreeIndex>()

/** The shapes of the tree by id, their groups and the shapes drawn */
export const indexShapeTree = (shapes: readonly ShapeEntity[]): ShapeTreeIndex => {
  const cached = treeIndexes.get(shapes)
  if (cached) return cached
  const index = buildShapeTreeIndex(shapes)
  treeIndexes.set(shapes, index)
  return index
}

/** The groups holding a shape of the tree, from the outermost one */
const getAncestors = (index: ShapeTreeIndex, id: string): readonly ShapeEntity<'group'>[] => index.ancestorsById.get(id) ?? []

/** The group holding a shape of the tree, undefined for a shape which is not in a group */
export const getParentGroup = (shapes: readonly ShapeEntity[], id: string): ShapeEntity<'group'> | undefined =>
  getAncestors(indexShapeTree(shapes), id).at(-1)

/** The groups holding the shapes, at any depth */
const getAncestorIds = (index: ShapeTreeIndex, ids: Iterable<string>): Set<string> => {
  const ancestorIds = new Set<string>()
  for (const id of ids) {
    for (const group of getAncestors(index, id)) ancestorIds.add(group.id)
  }
  return ancestorIds
}

/** The highest locked group holding a shape */
const getLockedAncestor = (index: ShapeTreeIndex, id: string): ShapeEntity<'group'> | undefined => getAncestors(index, id).find(group => group.locked)

/** Whether a shape of the tree is held by a group, at any depth */
const isHeldBy = (index: ShapeTreeIndex, id: string, groupId: string) => getAncestors(index, id).some(group => group.id === groupId)

/**
 * The shapes acted on together, as they are selected, from shapes of the tree: each one once, in their order, a shape of
 * a locked group replaced by the highest locked group, which is selected as a whole, and a shape held by another one of
 * them left out, which acts with it
 */
export const normalizeShapeNodes = (shapes: readonly ShapeEntity[], nodes: readonly ShapeEntity[]): ShapeEntity[] => {
  const index = indexShapeTree(shapes)
  const nodesById = new Map<string, ShapeEntity>()
  for (const node of nodes) {
    const unit = getLockedAncestor(index, node.id) ?? node
    if (!nodesById.has(unit.id)) nodesById.set(unit.id, unit)
  }
  return [...nodesById.values()].filter(node => !getAncestors(index, node.id).some(group => nodesById.has(group.id)))
}

/**
 * The groups opened by selected shapes, in which a click selects a shape (see resolveUnit): the groups holding them, at
 * any depth
 */
export const getOpenedGroupIds = (shapes: readonly ShapeEntity[], nodes: readonly ShapeEntity[]): Set<string> =>
  getAncestorIds(
    indexShapeTree(shapes),
    nodes.map(node => node.id)
  )

/**
 * The shape selected by a click on a shape of the tree, with groups opened by the selection (see getOpenedGroupIds): the
 * shape holding it in the deepest opened group which holds it, or in the tree itself. A shape of a locked group gives the
 * highest locked group, selected as a whole
 */
export const resolveUnit = (shapes: readonly ShapeEntity[], id: string, openedGroupIds: ReadonlySet<string>): ShapeEntity | undefined => {
  const index = indexShapeTree(shapes)
  const shape = index.byId.get(id)
  return shape && resolveUnitOf(shape, getAncestors(index, id), openedGroupIds)
}

/** See resolveUnit: the shape selected by a click on a shape held by these groups, from the outermost one */
export const resolveUnitOf = (shape: ShapeEntity, ancestors: readonly ShapeEntity<'group'>[], openedGroupIds: ReadonlySet<string>): ShapeEntity => {
  // the shape held by the deepest opened group
  let depth = ancestors.length
  while (depth > 0 && !openedGroupIds.has(ancestors[depth - 1]!.id)) depth--
  return ancestors.find((group, groupDepth) => groupDepth < depth && group.locked) ?? ancestors[depth] ?? shape
}

/** The deepest group holding all the shapes, undefined when they are not all in a same group */
export const getCommonGroup = (shapes: readonly ShapeEntity[], nodes: readonly ShapeEntity[]): ShapeEntity<'group'> | undefined => {
  const index = indexShapeTree(shapes)
  const [first, ...others] = nodes
  if (!first) return undefined
  return [...getAncestors(index, first.id)].reverse().find(group => others.every(node => isHeldBy(index, node.id, group.id)))
}

/** The rotation shared by the shapes which can be turned, among the shapes drawn by the shapes: 0 when they differ */
export const getCommonRotation = (shapes: readonly ShapeEntity[]): number => {
  const turnedShapes = getShapeLeaves(shapes).filter(shape => SHAPES_WITH_ROTATION.includes(shape.type))
  const rotation = turnedShapes[0]?.rotation ?? 0
  return turnedShapes.every(shape => (shape.rotation ?? 0) === rotation) ? rotation : 0
}

/** Box of the points in the frame turned by the rotation around the center */
const getBoxInFrame = (points: Point[], center: Point, rotation: number) => {
  const { minX, minY, maxX, maxY } = getPointsBounds([points.map(point => rotatePoint({ origin: center, point, rotation }))])
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/**
 * Builds again the frame of a group from the shapes it draws: its borders, turned by its rotation, frame them with the
 * padding of the selection, its outer borders frame their outer borders in the same frame, and its bounding box frames
 * their bounding boxes. Its shapes are already built
 */
export const refreshGroup = (group: DrawableShape<'group'> & { id: string }, settings: UtilsSettings): ShapeEntity<'group'> => {
  const leaves = getShapeLeaves(group.shapes)
  const rotation = group.rotation ?? 0
  const { computed, path } = buildShapesFrame(leaves, rotation, settings)
  const outerCorners = leaves.flatMap(leaf =>
    getRectCorners(leaf.computed.outerBorders).map(point => rotatePoint({ origin: leaf.computed.center, point, rotation: -(leaf.rotation ?? 0) }))
  )
  return {
    ...group,
    computed: {
      borders: computed.borders,
      center: computed.center,
      outerBorders: getBoxInFrame(outerCorners, computed.center, rotation),
      boundingBox: getBoundingRect(leaves.map(leaf => leaf.computed.boundingBox))
    },
    path
  } as ShapeEntity<'group'>
}

/**
 * The shape left alone in a group, which takes its place: it keeps what the group gave it. It is hidden or locked with
 * the group, and its opacity is multiplied by the one of the group, which is exact for a single shape
 */
export const foldGroupInto = (
  group: { visible?: boolean | undefined; locked?: boolean | undefined; style?: StyleShape | undefined },
  shape: ShapeEntity
): ShapeEntity => {
  const groupOpacity = group.style?.opacity ?? 100
  const isHidden = group.visible === false && shape.visible !== false
  const isLocked = !!group.locked && !shape.locked
  if (groupOpacity === 100 && !isHidden && !isLocked) return shape
  return {
    ...shape,
    ...(isHidden ? { visible: false } : {}),
    ...(isLocked ? { locked: true } : {}),
    ...(groupOpacity === 100 ? {} : { style: { ...shape.style, opacity: ((shape.style?.opacity ?? 100) * groupOpacity) / 100 } })
  }
}

/** The group with new shapes, its frame built again, or the group itself when its shapes are the same */
const withShapes = (group: ShapeEntity<'group'>, shapes: ShapeEntity[], settings: UtilsSettings): ShapeEntity<'group'> =>
  shapes === group.shapes ? group : refreshGroup({ ...group, shapes }, settings)

/** The group with its shapes mapped, its frame built again, or the group itself when they are all kept */
export const mapGroupShapes = (
  group: ShapeEntity<'group'>,
  map: (shape: ShapeEntity) => ShapeEntity,
  settings: UtilsSettings
): ShapeEntity<'group'> => {
  const shapes = group.shapes.map(map)
  return withShapes(group, shallowEqual(shapes, group.shapes) ? group.shapes : shapes, settings)
}

/**
 * Builds again the lists of the tree holding shapes, found by their ids, at any depth: each shape of these lists is given
 * to rebuild, which returns the shapes taking its place. rebuildShapes gives the shapes of a group built again, when the
 * group holds some of the shapes. The lists which do not change keep their identity
 */
const rebuildTree = (
  shapes: ShapeEntity[],
  ids: Iterable<string>,
  rebuild: (shape: ShapeEntity, rebuildShapes: (group: ShapeEntity<'group'>) => ShapeEntity[]) => ShapeEntity | ShapeEntity[]
): ShapeEntity[] => {
  const ancestorIds = getAncestorIds(indexShapeTree(shapes), ids)
  const rebuildShapes = (group: ShapeEntity<'group'>) => (ancestorIds.has(group.id) ? rebuildList(group.shapes) : group.shapes)
  const rebuildList = (list: ShapeEntity[]): ShapeEntity[] => {
    let hasChanged = false
    const newList: ShapeEntity[] = []
    for (const shape of list) {
      const rebuilt = rebuild(shape, rebuildShapes)
      if (rebuilt !== shape) hasChanged = true
      if (Array.isArray(rebuilt)) newList.push(...rebuilt)
      else newList.push(rebuilt)
    }
    return hasChanged ? newList : list
  }
  return rebuildList(shapes)
}

/**
 * Replaces shapes of the tree, found by their ids, and builds again the frames of their groups. The shapes which are no
 * longer in the tree are ignored. The lists and the groups which do not change keep their identity
 */
export const replaceShapesInTree = (shapes: ShapeEntity[], updatedById: ReadonlyMap<string, ShapeEntity>, settings: UtilsSettings): ShapeEntity[] => {
  if (!updatedById.size) return shapes
  return rebuildTree(shapes, updatedById.keys(), (shape, rebuildShapes) => {
    const replaced = updatedById.get(shape.id) ?? shape
    // a group replaced as a whole may still hold other shapes to replace
    return replaced.type === 'group' ? withShapes(replaced, rebuildShapes(replaced), settings) : replaced
  })
}

/**
 * Removes shapes of the tree, found by their ids. A group left with a single shape is dissolved: the shape takes its place
 * with what the group gave it (see foldGroupInto), and its id is set in replacedIds under the id of the group. An empty
 * group is removed
 */
export const removeShapesFromTree = (
  shapes: ShapeEntity[],
  ids: ReadonlySet<string>,
  settings: UtilsSettings,
  replacedIds = new Map<string, string[]>()
): ShapeEntity[] => {
  if (!ids.size) return shapes
  return rebuildTree(shapes, ids, (shape, rebuildShapes) => {
    if (ids.has(shape.id)) return []
    if (shape.type !== 'group') return shape
    const children = rebuildShapes(shape)
    if (children === shape.shapes || children.length >= GROUP_MIN_SHAPES) return withShapes(shape, children, settings)
    if (!children[0]) return []
    const remaining = foldGroupInto(shape, children[0])
    replacedIds.set(shape.id, [remaining.id])
    return remaining
  })
}

/** Inserts each new shape just in front of a shape of the tree, found by its id, in the same group */
export const insertShapesBefore = (
  shapes: ShapeEntity[],
  newShapesById: ReadonlyMap<string, ShapeEntity>,
  settings: UtilsSettings
): ShapeEntity[] => {
  if (!newShapesById.size) return shapes
  return rebuildTree(shapes, newShapesById.keys(), (shape, rebuildShapes) => {
    const current = shape.type === 'group' ? withShapes(shape, rebuildShapes(shape), settings) : shape
    const newShape = newShapesById.get(shape.id)
    return newShape ? [newShape, current] : current
  })
}

/**
 * Sets lists of shapes of the tree, like a new order of their shapes: the lists of groups by their ids, and the list of
 * the tree itself under undefined. The lists which do not change are ignored
 */
export const setShapeLists = (
  shapes: ShapeEntity[],
  lists: ReadonlyMap<string | undefined, ShapeEntity[]>,
  settings: UtilsSettings
): ShapeEntity[] => {
  const { byId } = indexShapeTree(shapes)
  const updatedGroups = new Map<string, ShapeEntity>()
  for (const [id, list] of lists) {
    const group = id === undefined ? undefined : byId.get(id)
    if (group?.type === 'group' && !shallowEqual(list, group.shapes)) updatedGroups.set(group.id, refreshGroup({ ...group, shapes: list }, settings))
  }
  const rootList = lists.get(undefined)
  return replaceShapesInTree(rootList && !shallowEqual(rootList, shapes) ? rootList : shapes, updatedGroups, settings)
}

/**
 * Ungroups groups of the tree, found by their ids: the shapes of each group take its place, with what it gave them (see
 * foldGroupInto), and their ids are set in replacedIds under its id. A group held by another group ungrouped is ungrouped
 * first
 */
export const ungroupShapesInTree = (
  shapes: ShapeEntity[],
  ids: ReadonlySet<string>,
  settings: UtilsSettings,
  replacedIds = new Map<string, string[]>()
): ShapeEntity[] => {
  if (!ids.size) return shapes
  return rebuildTree(shapes, ids, (shape, rebuildShapes) => {
    if (shape.type !== 'group') return shape
    const children = rebuildShapes(shape)
    if (!ids.has(shape.id)) return withShapes(shape, children, settings)
    const freedShapes = children.map(child => foldGroupInto(shape, child))
    replacedIds.set(
      shape.id,
      freedShapes.map(child => child.id)
    )
    return freedShapes
  })
}

/** A new group of shapes already built, turned like them when they are all turned the same way */
const createGroup = (shapes: ShapeEntity[], settings: UtilsSettings): ShapeEntity<'group'> =>
  refreshGroup({ id: createShapeId('group'), type: 'group', rotation: getCommonRotation(shapes), shapes }, settings)

type GroupPlace = {
  /** The shapes grouped, as they are in the tree, in its order */
  units: ShapeEntity[]
  /** The shape whose place the new group takes */
  place: ShapeEntity
  /** The groups holding the new group, from the outermost one */
  holders: readonly ShapeEntity<'group'>[]
}

/**
 * Where shapes of the tree are grouped, once normalized (see normalizeShapeNodes): the new group takes the place of the
 * shape in front, in the order of the tree, or of its group when all the shapes of this group are grouped. Undefined for
 * less than 2 shapes, or for the shapes of a single group, which would give this group again
 */
const getGroupPlace = (shapes: readonly ShapeEntity[], nodes: readonly ShapeEntity[]): GroupPlace | undefined => {
  if (nodes.length < GROUP_MIN_SHAPES) return undefined
  const index = indexShapeTree(shapes)
  // the shapes are indexed in the order of the tree
  const order = new Map([...index.byId.keys()].map((id, position) => [id, position]))
  const units = normalizeShapeNodes(shapes, nodes)
    .flatMap(node => index.byId.get(node.id) ?? [])
    .sort((a, b) => order.get(a.id)! - order.get(b.id)!)
  const [front] = units
  if (!front || units.length < GROUP_MIN_SHAPES) return undefined
  const unitIds = new Set(units.map(unit => unit.id))
  const isGrouped = (shape: ShapeEntity): boolean => unitIds.has(shape.id) || (shape.type === 'group' && shape.shapes.every(isGrouped))
  // the new group takes the place of the groups whose shapes are all grouped
  const ancestors = getAncestors(index, front.id)
  let depth = ancestors.length
  while (depth > 0 && ancestors[depth - 1]!.shapes.every(isGrouped)) depth--
  const place = ancestors[depth] ?? front
  if (place !== front && units.every(unit => isHeldBy(index, unit.id, place.id))) return undefined
  return { units, place, holders: ancestors.slice(0, depth) }
}

/**
 * Whether shapes of the drawing can be grouped by actions.groupShapes: at least 2 of them, which are not all the shapes
 * of a group, see groupShapesInTree
 */
export const canGroupShapes = (shapes: readonly ShapeEntity[], nodes: readonly ShapeEntity[]): boolean => getGroupPlace(shapes, nodes) !== undefined

/**
 * Groups shapes of the tree in a new group, where getGroupPlace tells, in their order in the tree. The shapes leaving
 * groups keep what these groups gave them (see foldGroupInto), and the groups left with a single shape are dissolved. The
 * shapes replaced are set in replacedIds, see removeShapesFromTree: the shapes grouped are replaced by the new group.
 * Undefined when the shapes cannot be grouped
 */
export const groupShapesInTree = (
  shapes: ShapeEntity[],
  nodes: readonly ShapeEntity[],
  settings: UtilsSettings,
  replacedIds = new Map<string, string[]>()
): { shapes: ShapeEntity[]; group: ShapeEntity<'group'> } | undefined => {
  const groupPlace = getGroupPlace(shapes, nodes)
  if (!groupPlace) return undefined
  const { units, place, holders } = groupPlace
  const index = indexShapeTree(shapes)
  // the groups holding the new group still give their shapes what they gave them
  const holderIds = new Set(holders.map(holder => holder.id))
  const groupedShapes = units.map(unit =>
    getAncestors(index, unit.id).reduceRight<ShapeEntity>(
      (shape, ancestor) => (holderIds.has(ancestor.id) ? shape : foldGroupInto(ancestor, shape)),
      unit
    )
  )
  const group = createGroup(groupedShapes, settings)
  // the place keeps its shapes grouped, and its group keeps a shape which is not grouped: this group is not dissolved
  const movedIds = new Set(units.filter(unit => unit !== place && !isHeldBy(index, unit.id, place.id)).map(unit => unit.id))
  const remaining = removeShapesFromTree(shapes, movedIds, settings, replacedIds)
  for (const unit of units) replacedIds.set(unit.id, [group.id])
  return { shapes: replaceShapesInTree(remaining, new Map([[place.id, group]]), settings), group }
}
