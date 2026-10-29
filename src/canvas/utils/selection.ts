import type { UtilsSettings } from '@canvas/constants/app'
import { SETTINGS_DEFAULT_RECT } from '@canvas/constants/tools'
import type { HoverModeData, SelectionModeData } from '@canvas/types/Mode'
import type { Point, Rect, SelectionType, ShapeEntity, StyleShape } from '@canvas/types/Shapes'
import { compact } from '@canvas/utils/array'
import { shallowEqual } from '@canvas/utils/equality'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { hasPointAnchors } from '@canvas/utils/selection/anchors'
import { expandRect } from '@canvas/utils/shapes/path'
import { createRectangle } from '@canvas/utils/shapes/rectangle'
import {
  getOpenedGroupIds,
  getShapeLeaves,
  indexShapeTree,
  isGroup,
  normalizeShapeNodes,
  resolveUnitOf,
  type ShapeLeaf
} from '@canvas/utils/shapes/tree'
import { roundValues } from '@canvas/utils/transform'
import { getPointsBounds, getRectCorners, isPointInsideRect, rotatePoint } from '@canvas/utils/trigo'
import { checkPositionIntersection, checkSelectionIntersection } from './intersect'

/** Whether no gesture is running: the hovered shape is only searched and shown then */
export const isIdleSelectionMode = ({ mode }: SelectionModeData<Point | number>) =>
  mode === 'default' || mode === 'contextMenu' || mode === 'textedition'

export const getNewSelectionData = (
  hoverMode: HoverModeData,
  selectedShape: SelectionType,
  cursorPosition: Point
): SelectionModeData<Point | number> | undefined => {
  if (hoverMode.mode === 'translate') {
    return {
      mode: 'translate',
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape,
      hasBeenDuplicated: false,
      dateStart: Date.now(),
      selectedShapesLengthAtMouseDown: getSelectedShapes(selectedShape).length
    }
  }
  if (hoverMode.mode === 'rotate') {
    const { center: centerBeforeResize } = selectedShape.computed
    const center: Point = [centerBeforeResize[0], centerBeforeResize[1]]
    return {
      mode: 'rotate',
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape,
      center,
      selectedShapesLengthAtMouseDown: getSelectedShapes(selectedShape).length
    }
  }
  if (hoverMode.mode === 'resize') {
    return {
      mode: 'resize',
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape,
      anchor: hoverMode.anchor,
      selectedShapesLengthAtMouseDown: getSelectedShapes(selectedShape).length
    }
  }
  return undefined
}

type UnitSearch = {
  /** Whether the point is in the frame of the selection: a selected shape is searched in its own frame only then */
  isInSelection: boolean
  /** The selected shapes are searched first, like on a press: a drag moves the selection, even behind the shapes covering it */
  preferSelection?: boolean
  /** Radius of the touch around the point */
  touchRadius?: number | undefined
  /** The search of the hovered shape: the locked shapes are left out, and the shapes are first searched in their boxes */
  isHover?: boolean
}

/**
 * The shape selected by a click at a point, from the foreground: the shape holding the shape drawn there in the groups
 * opened by the selection (see resolveUnit), a selected one being there in its selection frame
 */
const findUnitAt = (
  ctx: CanvasRenderingContext2D,
  shapes: ShapeEntity[],
  position: Point,
  settings: UtilsSettings,
  selectedShapes: ShapeEntity[],
  { isInSelection, preferSelection = false, touchRadius, isHover = false }: UnitSearch
): ShapeEntity | undefined => {
  const selectedIds = new Set(selectedShapes.map(shape => shape.id))
  const openedGroupIds = getOpenedGroupIds(shapes, selectedShapes)
  // a selected shape is tested once in its frame, a group drawing several shapes
  const framedIds = new Map<string, boolean>()
  const isInFrame = (unit: ShapeEntity) => {
    let isFramed = framedIds.get(unit.id)
    if (isFramed === undefined) {
      isFramed = isInSelection && !!checkSelectionIntersection(ctx, unit, position, settings, !isHover, touchRadius)
      framedIds.set(unit.id, isFramed)
    }
    return isFramed
  }
  /** The shape selected through a shape drawn under the point. The shapes drawn by a shape follow each other in the tree */
  const getUnitAt = ({ leaf, ancestors }: ShapeLeaf, isSelectedOnly: boolean): ShapeEntity | undefined => {
    // the box of a group holds the boxes of its shapes
    if (isHover && !isPointInsideRect(leaf.computed.boundingBox, position)) return undefined
    const unit = resolveUnitOf(leaf, ancestors, openedGroupIds)
    if (isHover && unit.locked) return undefined
    if (selectedIds.has(unit.id)) return isInFrame(unit) ? unit : undefined
    return !isSelectedOnly && checkPositionIntersection(ctx, leaf, position, settings) ? unit : undefined
  }
  const { leaves } = indexShapeTree(shapes)
  const findUnit = (isSelectedOnly: boolean) => {
    for (const leaf of leaves) {
      const unit = getUnitAt(leaf, isSelectedOnly)
      if (unit) return unit
    }
    return undefined
  }
  return (preferSelection ? findUnit(true) : undefined) ?? findUnit(false)
}

/** The shape hovered at a point, which a click would select (see findUnitAt), out of the locked ones */
export const findHoveredShape = (
  ctx: CanvasRenderingContext2D,
  shapes: ShapeEntity[],
  position: Point,
  settings: UtilsSettings,
  selection: SelectionType | undefined
): ShapeEntity | undefined => findUnitAt(ctx, shapes, position, settings, getSelectedShapes(selection), { isInSelection: true, isHover: true })

/**
 * The shape selected by a double click at a point in a selected group: the shape of the group holding the shape drawn
 * there, which opens the group, undefined out of its shapes
 */
export const findShapeInGroup = (
  ctx: CanvasRenderingContext2D,
  shapes: ShapeEntity[],
  group: ShapeEntity<'group'>,
  position: Point,
  settings: UtilsSettings
): ShapeEntity | undefined => {
  const found = indexShapeTree(shapes).leaves.find(
    ({ leaf, ancestors }) => ancestors.some(ancestor => ancestor.id === group.id) && !!checkPositionIntersection(ctx, leaf, position, settings)
  )
  return found && resolveUnitOf(found.leaf, found.ancestors, new Set([group.id, ...getOpenedGroupIds(shapes, [group])]))
}

export const selectShape = (
  ctx: CanvasRenderingContext2D,
  shapes: ShapeEntity[],
  cursorPosition: Point,
  settings: UtilsSettings,
  selectedShape: SelectionType | undefined,
  isTouchGesture: boolean,
  withFrameSelection: boolean,
  behavior: 'add' | 'toggle' | 'replace' = 'replace',
  preferSelection = true
): {
  mode: SelectionModeData<Point | number>
  shape: SelectionType | undefined
} => {
  const touchRadius = isTouchGesture ? 20 : undefined
  let selectedShapePositionIntersection: false | HoverModeData = false
  if (selectedShape) {
    selectedShapePositionIntersection = checkSelectionIntersection(ctx, selectedShape, cursorPosition, settings, true, touchRadius)

    const newSelectionMode = getNewSelectionData(selectedShapePositionIntersection || { mode: 'default' }, selectedShape, cursorPosition)
    if (newSelectionMode?.mode === 'resize' || newSelectionMode?.mode === 'rotate') {
      return { shape: selectedShape, mode: newSelectionMode }
    }
  }
  const selectedShapes = getSelectedShapes(selectedShape)
  const selectedIds = new Set(selectedShapes.map(shape => shape.id))
  const foundShape = findUnitAt(ctx, shapes, cursorPosition, settings, selectedShapes, {
    isInSelection: !!selectedShapePositionIntersection,
    preferSelection,
    touchRadius
  })
  // a toggle removes the shape under the cursor from the selection, or adds it when it is not selected
  const action = behavior === 'toggle' ? (foundShape && selectedIds.has(foundShape.id) ? 'remove' : 'add') : behavior

  // the selection is kept on its shape, or inside its frame outside of its shapes
  if (
    selectedShape &&
    (foundShape ? selectedShape.type !== 'multiSelection' && selectedShape.id === foundShape.id : selectedShapePositionIntersection)
  ) {
    return {
      shape: selectedShape,
      mode: {
        mode: 'translate',
        cursorStartPosition: cursorPosition,
        hasBeenDuplicated: false,
        dateStart: Date.now(),
        originalShape: selectedShape,
        selectedShapesLengthAtMouseDown: getSelectedShapes(selectedShape).length
      }
    }
  }

  if (foundShape?.locked && action === 'add') {
    return {
      shape: selectedShape,
      mode: {
        mode: withFrameSelection ? 'selectionFrame' : 'default'
      }
    }
  }

  if (foundShape && action === 'add' && selectedShape?.locked) {
    const foundShapeGroup = buildShapesSelection([foundShape], settings)
    return {
      shape: foundShapeGroup,
      mode: {
        mode: 'translate',
        cursorStartPosition: cursorPosition,
        hasBeenDuplicated: false,
        dateStart: Date.now(),
        originalShape: foundShapeGroup!,
        selectedShapesLengthAtMouseDown: getSelectedShapes(selectedShape).length
      }
    }
  }

  if (foundShape) {
    if (action === 'add') {
      const foundShapeGroup = buildShapesSelection(addToSelectedShapes(selectedShape, [foundShape]), settings)
      return {
        shape: foundShapeGroup,
        mode: {
          mode: 'translate',
          cursorStartPosition: cursorPosition,
          hasBeenDuplicated: false,
          dateStart: Date.now(),
          originalShape: foundShapeGroup!,
          selectedShapesLengthAtMouseDown: getSelectedShapes(selectedShape).length
        }
      }
    }
    if (action === 'remove') {
      const foundShapeGroup = buildShapesSelection(omitFromSelectedShapes(selectedShape, [foundShape]), settings)
      return {
        shape: foundShapeGroup,
        mode: {
          mode: 'translate',
          cursorStartPosition: cursorPosition,
          hasBeenDuplicated: false,
          dateStart: Date.now(),
          originalShape: foundShapeGroup!,
          selectedShapesLengthAtMouseDown: getSelectedShapes(selectedShape).length
        }
      }
    }
    const foundShapeGroup = selectedIds.has(foundShape.id) ? selectedShape : foundShape
    return {
      shape: foundShapeGroup,
      mode: {
        mode: 'translate',
        cursorStartPosition: cursorPosition,
        hasBeenDuplicated: false,
        dateStart: Date.now(),
        originalShape: foundShapeGroup!,
        selectedShapesLengthAtMouseDown: getSelectedShapes(selectedShape).length
      }
    }
  }

  return {
    shape: behavior !== 'replace' ? selectedShape : undefined,
    mode: {
      mode: withFrameSelection ? 'selectionFrame' : 'default'
    }
  }
}

/**
 * Points of a shape, turned by the rotation around the origin, whose box holds the shape in a frame of this rotation: the
 * corners of its box, or the points of a line, a polygon or a curve, which give their borders. The box of a shape made
 * of points would not fit it in a turned frame
 */
const getPointsInFrame = (shape: ShapeEntity, rotation: number, { selectionPadding }: UtilsSettings): Point[] => {
  const inFrame = (point: Point) =>
    rotatePoint({ point: rotatePoint({ point, origin: shape.computed.center, rotation: -(shape.rotation ?? 0) }), origin: [0, 0], rotation })
  if (hasPointAnchors(shape)) return shape.points.map(inFrame)
  return getRectCorners(expandRect(shape.computed.borders, -selectionPadding)).map(inFrame)
}

const buildGroupBorders = (shapes: ShapeEntity[], rotation: number, settings: UtilsSettings): Rect => {
  const movedBorders = shapes.map(shape => getPointsInFrame(shape, rotation, settings))
  const { minX: movedbordersXMin, minY: movedBordersYMin, maxX: movedBordersXMax, maxY: movedBordersYMax } = getPointsBounds(movedBorders)

  const movedCenter = [(movedbordersXMin + movedBordersXMax) / 2, (movedBordersYMin + movedBordersYMax) / 2] as Point

  const realCenter = rotatePoint({
    point: movedCenter,
    origin: [0, 0],
    rotation: -rotation
  })

  const origVector = [movedCenter[0] - realCenter[0], movedCenter[1] - realCenter[1]] as Point

  const minX = roundValues(movedbordersXMin - origVector[0])
  const maxX = roundValues(movedBordersXMax - origVector[0])
  const minY = roundValues(movedBordersYMin - origVector[1])
  const maxY = roundValues(movedBordersYMax - origVector[1])

  return {
    width: maxX - minX,
    height: maxY - minY,
    x: minX,
    y: minY
  }
}

/**
 * Frame of shapes drawn, turned by the rotation: its borders hold their borders, turned, with the padding of the
 * selection around them. Its path is the one of its box
 */
export const buildShapesFrame = (shapes: ShapeEntity[], rotation: number, settings: UtilsSettings): Pick<ShapeEntity, 'computed' | 'path'> => {
  const borders = buildGroupBorders(shapes, rotation, settings)
  const { computed, path } = createRectangle(
    {
      id: 'frame',
      type: 'rect',
      settings: SETTINGS_DEFAULT_RECT
    },
    [borders.x, borders.y],
    settings,
    borders.width,
    borders.height
  )
  return { computed, path }
}

/**
 * The selection of the shapes: the shape itself when it is alone, or their frame when there are several, turned like
 * them when they are all turned the same way. The frame holds the shapes drawn by the groups
 */
export const buildShapesSelection = (shapes: ShapeEntity[], settings: UtilsSettings): SelectionType | undefined => {
  if (!shapes.length) return undefined
  if (shapes.length === 1) return shapes[0]

  const sameRotation = !shapes.some(shape => shape.rotation !== shapes[0]!.rotation)
  const rotation = sameRotation ? (shapes[0]?.rotation ?? 0) : 0

  const frame = buildShapesFrame(getShapeLeaves(shapes), rotation, settings)

  return {
    id: shapes.map(shape => shape.id).join('-'),
    type: 'multiSelection',
    shapes,
    rotation,
    visible: true,
    locked: false,
    style: getCommonStyle(shapes),
    computed: frame.computed,
    path: frame.path
  }
}

/** The fields of the style which the shapes share, with the same value */
const getCommonStyle = (shapes: ShapeEntity[]): StyleShape =>
  shapes.slice(1).reduce<Record<string, unknown>>((acc, shape) => {
    const shapeStyle: Record<string, unknown> = shape.style ?? {}
    const newAcc: Record<string, unknown> = {}
    for (const key in shapeStyle) {
      if (acc[key] !== undefined && acc[key] === shapeStyle[key]) newAcc[key] = acc[key]
    }
    return newAcc
  }, shapes[0]?.style ?? {})

/** The shapes drawn by the selection: the selected shapes, the shapes of the groups in place of the groups */
export const getSelectedLeaves = (selection: SelectionType | undefined): ShapeEntity[] => getShapeLeaves(getSelectedShapes(selection))

const selectionStyles = new WeakMap<SelectionType, StyleShape>()

/**
 * The style of a selection, as an editor shows it: the fields shared by the shapes it draws, the shapes of its groups, and
 * the opacity shared by the selected shapes themselves, the one of a group being its own
 */
export const getSelectionStyle = (selection: SelectionType | undefined): StyleShape => {
  if (!selection) return {}
  const nodes = getSelectedShapes(selection)
  // without group, the style of the selection is the one of its shapes
  if (!nodes.some(isGroup)) return selection.style ?? {}
  const cached = selectionStyles.get(selection)
  if (cached) return cached
  const { opacity: _, ...style } = getCommonStyle(getShapeLeaves(nodes))
  const opacities = nodes.map(node => (node.type === 'group' ? (node.style?.opacity ?? 100) : node.style?.opacity))
  const opacity = opacities.every(value => value === opacities[0]) ? opacities[0] : undefined
  const selectionStyle: StyleShape = opacity === undefined ? style : { ...style, opacity }
  selectionStyles.set(selection, selectionStyle)
  return selectionStyle
}

/**
 * The selection after a change of the shapes of the drawing: each selected shape becomes its version in the new tree, and
 * the shapes removed are left out. A shape replaced by others, like a group dissolved or ungrouped, gives them, found by
 * their ids. A selected copy of a shape which has not changed is kept, like a polygon being drawn with its temporary point.
 * The selection is normalized (see normalizeShapeNodes), and kept when its shapes are the same
 */
export const reselect = (
  selection: SelectionType | undefined,
  previousShapes: readonly ShapeEntity[],
  shapes: readonly ShapeEntity[],
  settings: UtilsSettings,
  replacedIds?: ReadonlyMap<string, readonly string[]>
): SelectionType | undefined => {
  if (!selection || previousShapes === shapes) return selection
  const selectedShapes = getSelectedShapes(selection)
  const previousById = indexShapeTree(previousShapes).byId
  const { byId } = indexShapeTree(shapes)
  const nodes: ShapeEntity[] = []
  for (const shape of selectedShapes) {
    const replacingIds = replacedIds?.get(shape.id)
    if (replacingIds) {
      nodes.push(...compact(replacingIds.map(id => byId.get(id))))
      continue
    }
    const node = byId.get(shape.id)
    if (node) nodes.push(node === previousById.get(shape.id) ? shape : node)
  }
  const newSelectedShapes = normalizeShapeNodes(shapes, nodes)
  return shallowEqual(newSelectedShapes, selectedShapes) ? selection : buildShapesSelection(newSelectedShapes, settings)
}

export const addToSelectedShapes = (selection: SelectionType | undefined, shapes: ShapeEntity[]): ShapeEntity[] => {
  const currentShapes = getSelectedShapes(selection)
  return [...new Set([...currentShapes, ...shapes])]
}

export const omitFromSelectedShapes = (selection: SelectionType | undefined, shapes: ShapeEntity[]): ShapeEntity[] => {
  const omittedIds = new Set(shapes.map(shape => shape.id))
  return getSelectedShapes(selection).filter(selectedShape => !omittedIds.has(selectedShape.id))
}
