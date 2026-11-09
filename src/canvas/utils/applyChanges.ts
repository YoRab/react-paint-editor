import type { UtilsSettings } from '@canvas/constants/app'
import type { DataChanges } from '@canvas/types/editor'
import type { ExportedGroup, ExportedShape, GroupShapeInput, ShapeEntity } from '@canvas/types/Shapes'
import { compact } from '@canvas/utils/array'
import { flattenExportedShapes, getIds, isSameExport } from '@canvas/utils/data'
import { shallowEqual } from '@canvas/utils/equality'
import { buildGroupEntity } from '@canvas/utils/shapeInput'
import { indexShapeTree, isGroup, refreshGroup } from '@canvas/utils/shapes/tree'

/** A shape received which is not a group */
export type ReceivedShape = Exclude<ExportedShape, ExportedGroup>

/** Builds the entity of a shape received, which replaces the current one of its id, if any */
type BuildReceivedShape = (exported: ReceivedShape, current: ShapeEntity | undefined) => ShapeEntity

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
 * The tree of shapes with changes of another instance, see actions.applyChanges. The shapes received are built again
 * unless they are already the same, the shapes removed are left out, and the lists received (the order of the changes, the
 * shapes of a group received) give the places of their shapes, which leave their former lists. A shape received without a
 * place goes to the foreground of the drawing. A group left without shapes is left out. The shapes and the groups which
 * do not change keep their objects: the same tree is returned when nothing changes
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

  // a group received is built once its shapes are placed. A shape is listed by its group too: it is received once
  const receivedGroups = new Map<string, ExportedGroup>()
  const receivedIds = new Set<string>()
  for (const exported of flattenExportedShapes([...changes.added, ...changes.updated.map(({ shape }) => shape)])) {
    if (receivedIds.has(exported.id)) continue
    receivedIds.add(exported.id)
    const current = entities.get(exported.id)
    if (current && isSameExport(current, exported)) continue
    if (exported.type === 'group') receivedGroups.set(exported.id, exported)
    else entities.set(exported.id, buildShape(exported, current))
  }

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
    if (!receivedLists.has(parentId))
      lists.set(
        parentId,
        ids.filter(id => !placedIds.has(id))
      )
  }
  for (const [parentId, ids] of receivedLists) lists.set(parentId, ids)
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
        if (!groupShapes.length) return undefined
        if (receivedGroup) return buildGroupEntity(receivedGroup as unknown as GroupShapeInput, id, groupShapes, settings)
        const group = current as ShapeEntity<'group'>
        return shallowEqual(groupShapes, group.shapes) ? group : refreshGroup({ ...group, shapes: groupShapes }, settings)
      })
    )
  const newShapes = buildList(undefined)
  return shallowEqual(newShapes, shapes) ? shapes : newShapes
}
