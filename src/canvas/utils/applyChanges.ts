import type { UtilsSettings } from '@canvas/constants/app'
import type { DataChanges } from '@canvas/types/editor'
import type { ExportedGroup, ExportedShape, GroupShapeInput, ShapeEntity } from '@canvas/types/Shapes'
import { compact } from '@canvas/utils/array'
import { getIds, isSameExport, mergeExportedChanges } from '@canvas/utils/data'
import { shallowEqual } from '@canvas/utils/equality'
import { buildGroupEntity } from '@canvas/utils/shapeInput'
import { foldGroupInto, GROUP_MIN_SHAPES, indexShapeTree, isGroup, refreshGroup } from '@canvas/utils/shapes/tree'

/** A shape received which is not a group */
export type ReceivedShape = Exclude<ExportedShape, ExportedGroup>

/** Builds the entity of a shape received, which replaces the current one of its id, if any */
export type BuildReceivedShape = (exported: ReceivedShape, current: ShapeEntity | undefined) => ShapeEntity

/** The ids of the shapes of each list of the tree: the drawing under undefined, then each group */
const getLists = (shapes: readonly ShapeEntity[]): Map<string | undefined, string[]> => {
  const lists = new Map<string | undefined, string[]>()
  const collect = (list: readonly ShapeEntity[], parentId: string | undefined) => {
    lists.set(parentId, getIds(list))
    for (const shape of list) if (isGroup(shape)) collect(shape.shapes, shape.id)
  }
  collect(shapes, undefined)
  return lists
}

/**
 * A list received, with the shapes of the list here which it does not hold, like shapes added here meanwhile, unless they
 * are placed in a list received: each one stays after the shape preceding it here, at the front when there is none
 */
const mergeList = (local: readonly string[], received: string[], placedIds: ReadonlySet<string>): string[] => {
  const receivedIds = new Set(received)
  const keptAfter = new Map<string | undefined, string[]>()
  let previousId: string | undefined
  for (const id of local) {
    if (receivedIds.has(id)) previousId = id
    else if (!placedIds.has(id)) {
      const kept = keptAfter.get(previousId)
      if (kept) kept.push(id)
      else keptAfter.set(previousId, [id])
    }
  }
  if (!keptAfter.size) return received
  return [...(keptAfter.get(undefined) ?? []), ...received.flatMap(id => [id, ...(keptAfter.get(id) ?? [])])]
}

/**
 * The tree of shapes with changes of another instance, see actions.applyChanges, or with a step of the history replayed on
 * the changes received since:
 * - a shape added is built, unless it is already the same. A shape updated gets the fields changed from its previous
 *   version, which keeps the other fields of a shape changed here meanwhile. A shape updated which is no longer here is left
 *   out: it was removed here meanwhile. The shapes removed are left out
 * - the lists received (the order of the changes, the shapes of a group received) give the places of their shapes, which
 *   leave their former lists, and keep the shapes they do not hold (see mergeList). A shape received without a place goes to
 *   the foreground of the drawing. A group left with a single shape is dissolved, a group left without shapes is left out
 * The shapes and the groups which do not change keep their objects: the same tree is returned when nothing changes
 */
export const applyDataChanges = (
  shapes: ShapeEntity[],
  changes: DataChanges,
  buildShape: BuildReceivedShape,
  settings: UtilsSettings
): ShapeEntity[] => {
  const lists = getLists(shapes)
  const entities = new Map(indexShapeTree(shapes).byId)
  for (const { id } of changes.removed) {
    entities.delete(id)
    lists.delete(id)
  }

  // the shapes received, with their previous version when they are updated
  const received = new Map<string, { exported: ExportedShape; previous?: ExportedShape }>()
  for (const exported of changes.added) received.set(exported.id, { exported })
  for (const { shape, previous } of changes.updated) {
    if (!received.has(shape.id)) received.set(shape.id, { exported: shape, previous })
  }

  // a group received is built once its shapes are placed
  const receivedGroups = new Map<string, ExportedGroup>()
  const receivedIds = new Set<string>()
  const receive = (exported: ExportedShape, previous: ExportedShape | undefined) => {
    const current = entities.get(exported.id)
    // a shape updated elsewhere which was removed here meanwhile stays removed, with the shapes of its group
    if (!current && previous) return
    receivedIds.add(exported.id)
    const merged = current && previous ? mergeExportedChanges(current, previous, exported) : exported
    if (current && isSameExport(current, merged)) return
    if (merged.type !== 'group') {
      entities.set(merged.id, buildShape(merged, current))
      return
    }
    receivedGroups.set(merged.id, merged)
    // a shape of the group which is received on its own, or which is here, is not changed by the group
    for (const child of merged.shapes) {
      if (!received.has(child.id) && !receivedIds.has(child.id) && !entities.has(child.id)) receive(child, undefined)
    }
  }
  for (const { exported, previous } of received.values()) receive(exported, previous)

  // the lists received: the shapes of the groups received, then the order, whose groups must be known here. The key of a
  // drawing given through JSON is missing
  const receivedLists = new Map<string | undefined, string[]>()
  for (const group of receivedGroups.values()) {
    receivedLists.set(group.id, getIds(group.shapes))
  }
  for (const { parentId, ids } of changes.order ?? []) {
    const parent = parentId === undefined ? undefined : entities.get(parentId)
    if (parentId === undefined || receivedGroups.has(parentId) || (parent && isGroup(parent))) receivedLists.set(parentId, ids)
  }
  const placedIds = new Set([...receivedLists.values()].flat())
  for (const [parentId, ids] of lists) {
    const receivedList = receivedLists.get(parentId)
    lists.set(parentId, receivedList ? mergeList(ids, receivedList, placedIds) : ids.filter(id => !placedIds.has(id)))
  }
  for (const [parentId, ids] of receivedLists) if (!lists.has(parentId)) lists.set(parentId, ids)
  const listedIds = new Set([...lists.values()].flat())
  const unplacedIds = [...receivedIds].filter(id => !listedIds.has(id))
  if (unplacedIds.length) lists.set(undefined, [...unplacedIds, ...(lists.get(undefined) ?? [])])

  // each shape is placed once, in the first list holding it
  const placed = new Set<string>()
  const buildList = (parentId: string | undefined): ShapeEntity[] =>
    compact(
      (lists.get(parentId) ?? []).map(id => {
        if (placed.has(id)) return undefined
        placed.add(id)
        const receivedGroup = receivedGroups.get(id)
        const current = entities.get(id)
        if (!receivedGroup && !(current && isGroup(current))) return current
        const groupShapes = buildList(id)
        // a group left with a single shape is dissolved, like by removeShapesFromTree: the shape takes its place
        if (groupShapes.length < GROUP_MIN_SHAPES)
          return groupShapes[0] && foldGroupInto(receivedGroup ?? (current as ShapeEntity<'group'>), groupShapes[0])
        if (receivedGroup) return buildGroupEntity(receivedGroup as unknown as GroupShapeInput, id, groupShapes, settings)
        const group = current as ShapeEntity<'group'>
        return shallowEqual(groupShapes, group.shapes) ? group : refreshGroup({ ...group, shapes: groupShapes }, settings)
      })
    )
  const newShapes = buildList(undefined)
  return shallowEqual(newShapes, shapes) ? shapes : newShapes
}
