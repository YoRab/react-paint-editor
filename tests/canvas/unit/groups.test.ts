import { createPaintStore } from '@canvas/store/paintStore'
import type { ExportedShape, Point, SelectionType, ShapeEntity, ShapeInput } from '@canvas/types/Shapes'
import { buildDataToExport, getDataChanges } from '@canvas/utils/data'
import { checkPositionIntersection, checkSelectionFrameCollision, findLeavesAtPoints, findShapeAt, findShapesAt } from '@canvas/utils/intersect'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import {
  buildShapesSelection,
  findHoveredShape,
  findShapeInGroup,
  getSelectedLeaves,
  getSelectionStyle,
  reselect,
  selectShape
} from '@canvas/utils/selection'
import { buildShapeEntity, decodeImportedData } from '@canvas/utils/shapeInput'
import { applyShapePatch, assertValidPatches } from '@canvas/utils/shapePatch'
import {
  cloneShape,
  type DrawShapesOptions,
  drawShapes,
  flipShapes,
  getSelectionBounds,
  mustKeepRatio,
  resizeShape,
  resizeShapeInGroup,
  resizeShapesToBounds,
  rotateShape,
  translateShape,
  updateShapeStyle
} from '@canvas/utils/shapes'
import { buildGroupResizeContext } from '@canvas/utils/shapes/group'
import {
  canGroupShapes,
  flattenShapes,
  getCommonGroup,
  getCommonRotation,
  getOpenedGroupIds,
  getParentGroup,
  getShapeLeaves,
  groupShapesInTree,
  indexShapeTree,
  insertShapesBefore,
  normalizeShapeNodes,
  refreshGroup,
  removeShapesFromTree,
  replaceShapesInTree,
  resolveUnit,
  setShapeLists,
  ungroupShapesInTree
} from '@canvas/utils/shapes/tree'
import { getBoundingRect, rotatePoint } from '@canvas/utils/trigo'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createShape, FakeImage, MEASURE_CONTEXT, stubPath2D, UTILS_SETTINGS } from './helpers'

stubPath2D()
vi.stubGlobal('Image', FakeImage)

const settings = UTILS_SETTINGS

/** Settings of the hit test, without zoom */
const hitSettings = { ...settings, canvasZoom: 1, canvasSize: { scaleRatio: 1 } } as typeof settings

/** A rect 100×50, at x and y */
const rect = (id: string, x: number, y = 0, fields: Partial<ShapeEntity<'rect'>> = {}) =>
  createShape<ShapeEntity<'rect'>>({ type: 'rect', x, y, width: 100, height: 50, ...fields }, id)

const group = (id: string, shapes: ShapeEntity[], fields: Partial<ShapeEntity<'group'>> = {}) =>
  refreshGroup({ id, type: 'group', shapes, ...fields }, settings)

const getIds = (shapes: readonly ShapeEntity[]) => shapes.map(shape => shape.id)

const expectPointsClose = (points: readonly Point[], expected: readonly Point[]) => {
  expect(points).toHaveLength(expected.length)
  points.forEach(([x, y], index) => {
    expect(x).toBeCloseTo(expected[index]![0])
    expect(y).toBeCloseTo(expected[index]![1])
  })
}

describe('tree of the shapes', () => {
  const a = rect('a', 0)
  const b = rect('b', 200)
  const c = rect('c', 400)
  const d = rect('d', 600)
  const inner = group('inner', [a, b], { locked: true })
  const outer = group('outer', [inner, c], { visible: false })

  it('flattens the tree, each group before its shapes, and gives the shapes drawn, from the foreground', () => {
    expect(getIds(flattenShapes([outer, d]))).toEqual(['outer', 'inner', 'a', 'b', 'c', 'd'])
    expect(getIds(getShapeLeaves([outer, d]))).toEqual(['a', 'b', 'c', 'd'])
  })

  it('indexes the shapes and their groups, the shapes drawn having the flags of their groups too', () => {
    const index = indexShapeTree([outer, d])
    expect(index.byId.get('a')).toBe(a)
    expect(index.ancestorsById.get('a')).toEqual([outer, inner])
    expect(index.ancestorsById.get('inner')).toEqual([outer])
    expect(index.ancestorsById.has('outer')).toBe(false)
    expect(getParentGroup([outer, d], 'c')).toBe(outer)
    expect(index.leaves.map(({ leaf, ancestors, visible, locked }) => [leaf.id, getIds(ancestors), visible, locked])).toEqual([
      ['a', ['outer', 'inner'], false, true],
      ['b', ['outer', 'inner'], false, true],
      ['c', ['outer'], false, false],
      ['d', [], true, false]
    ])
    // the index is built once per list
    expect(indexShapeTree([outer, d])).not.toBe(index)
    const shapes = [outer, d]
    expect(indexShapeTree(shapes)).toBe(indexShapeTree(shapes))
  })

  it('replaces shapes at any depth, and builds again the frames of their groups only', () => {
    const moved = translateShape(a, 0, 100, settings)
    const [newOuter, newD] = replaceShapesInTree([outer, d], new Map([['a', moved]]), settings) as [ShapeEntity<'group'>, ShapeEntity]
    expect(newD).toBe(d)
    expect(newOuter.shapes[1]).toBe(c)
    const newInner = newOuter.shapes[0] as ShapeEntity<'group'>
    expect(newInner.shapes).toEqual([moved, b])
    // a from y 100 to 150, b from y 0 to 50, with the padding of 5
    expect(newInner.computed.borders).toEqual({ x: -5, y: -5, width: 310, height: 160 })
    expect(newOuter.computed.borders.height).toBe(160)
  })

  it('ignores the shapes which are not in the tree, and keeps the lists without change', () => {
    const shapes = [outer, d]
    expect(replaceShapesInTree(shapes, new Map([['missing', a]]), settings)).toBe(shapes)
    expect(replaceShapesInTree(shapes, new Map(), settings)).toBe(shapes)
    expect(removeShapesFromTree(shapes, new Set(['missing']), settings)).toBe(shapes)
  })

  it('replaces a group as a whole, and the shapes to replace in it', () => {
    const renamed = { ...inner, name: 'Inner' }
    const moved = translateShape(b, 0, 100, settings)
    const [newOuter] = replaceShapesInTree(
      [outer],
      new Map([
        ['inner', renamed],
        ['b', moved]
      ]),
      settings
    ) as [ShapeEntity<'group'>]
    const newInner = newOuter.shapes[0] as ShapeEntity<'group'>
    expect(newInner).toMatchObject({ name: 'Inner', shapes: [a, moved] })
  })

  it('removes shapes and dissolves a group left with a single shape, which keeps what the group gave it', () => {
    const hidden = group('hidden', [a, b], { visible: false, locked: true, style: { opacity: 50 } })
    const replacedIds = new Map<string, string[]>()
    const [remaining, kept] = removeShapesFromTree([hidden, c], new Set(['a']), settings, replacedIds)
    expect(remaining).toMatchObject({ id: 'b', visible: false, locked: true, style: { opacity: 50 } })
    expect(replacedIds).toEqual(new Map([['hidden', ['b']]]))
    expect(kept).toBe(c)
    // an empty group is removed
    expect(getIds(removeShapesFromTree([hidden, c], new Set(['a', 'b']), settings))).toEqual(['c'])
    // a group of a shape and a group keeps the inner group
    expect(getIds(removeShapesFromTree([outer], new Set(['c']), settings))).toEqual(['inner'])
  })

  it('multiplies the opacity of the shape left by the one of its group', () => {
    const faded = rect('faded', 0, 0, { style: { opacity: 50 } })
    const [remaining] = removeShapesFromTree([group('g', [faded, b], { style: { opacity: 50 } })], new Set(['b']), settings)
    expect(remaining?.style?.opacity).toBe(25)
  })

  it('gives the rotation shared by the shapes which can be turned, or 0 when they differ', () => {
    const line = createShape({
      type: 'line',
      points: [
        [0, 0],
        [10, 10]
      ]
    })
    const turned = rect('turned', 0, 0, { rotation: 0.5 })
    expect(getCommonRotation([turned, rect('turned2', 200, 0, { rotation: 0.5 }), line])).toBe(0.5)
    expect(getCommonRotation([group('g', [turned, line]), rect('turned3', 200, 0, { rotation: 0.5 })])).toBe(0.5)
    expect(getCommonRotation([turned, a])).toBe(0)
    expect(getCommonRotation([line])).toBe(0)
  })
})

describe('editing the tree', () => {
  const a = rect('a', 0)
  const b = rect('b', 200)
  const c = rect('c', 400)
  const d = rect('d', 600)
  const inner = group('inner', [a, b])
  const outer = group('outer', [inner, c])
  const shapes = [outer, d]

  const childrenOf = (shape: ShapeEntity | undefined) => getIds((shape as ShapeEntity<'group'>).shapes)

  it('normalizes shapes acted on together: once each, without the shapes of their groups, a locked group in place of its shapes', () => {
    expect(getIds(normalizeShapeNodes(shapes, [a, inner, d, d]))).toEqual(['inner', 'd'])
    const lockedInner = group('inner', [a, b], { locked: true })
    expect(getIds(normalizeShapeNodes([group('outer', [lockedInner, c])], [a, c, b]))).toEqual(['inner', 'c'])
    // a shape out of the tree is kept as it is
    const other = rect('other', 0)
    expect(normalizeShapeNodes(shapes, [other])).toEqual([other])
  })

  it('inserts copies in front of their shapes, in their groups', () => {
    const a2 = rect('a2', 0)
    const d2 = rect('d2', 600)
    const [newOuter, ...rest] = insertShapesBefore(
      shapes,
      new Map([
        ['a', a2],
        ['d', d2]
      ]),
      settings
    )
    expect(getIds(rest)).toEqual(['d2', 'd'])
    expect(childrenOf((newOuter as ShapeEntity<'group'>).shapes[0])).toEqual(['a2', 'a', 'b'])
    expect((newOuter as ShapeEntity<'group'>).shapes[1]).toBe(c)
    expect(insertShapesBefore(shapes, new Map([['missing', a2]]), settings)).toBe(shapes)
  })

  it('sets new lists of shapes of groups and of the tree, and ignores the lists which do not change', () => {
    const [newD, newOuter] = setShapeLists(
      shapes,
      new Map([
        [undefined, [d, outer]],
        ['inner', [b, a]],
        ['outer', outer.shapes]
      ]),
      settings
    )
    expect(newD).toBe(d)
    expect(childrenOf((newOuter as ShapeEntity<'group'>).shapes[0])).toEqual(['b', 'a'])
    expect(setShapeLists(shapes, new Map([[undefined, [...shapes]]]), settings)).toBe(shapes)
  })

  it('ungroups groups: their shapes take their places with what they gave them', () => {
    const fadedInner = group('inner', [a, b], { visible: false, style: { opacity: 50 } })
    const freed = new Map<string, string[]>()
    const [newOuter] = ungroupShapesInTree([group('outer', [fadedInner, c]), d], new Set(['inner']), settings, freed)
    expect(childrenOf(newOuter)).toEqual(['a', 'b', 'c'])
    expect((newOuter as ShapeEntity<'group'>).shapes[0]).toMatchObject({ id: 'a', visible: false, style: { opacity: 50 } })
    expect(freed).toEqual(new Map([['inner', ['a', 'b']]]))
    // a group in a group ungrouped is ungrouped first
    const nested = new Map<string, string[]>()
    expect(getIds(ungroupShapesInTree(shapes, new Set(['outer', 'inner']), settings, nested))).toEqual(['a', 'b', 'c', 'd'])
    expect(nested.get('outer')).toEqual(['a', 'b', 'c'])
    expect(ungroupShapesInTree(shapes, new Set(['d']), settings)).toBe(shapes)
  })

  it('groups shapes in their order, in place of the shape in front, in its group', () => {
    const grouped = groupShapesInTree([a, b, c], [c, a], settings)!
    expect(getIds(grouped.shapes)).toEqual([grouped.group.id, 'b'])
    expect(childrenOf(grouped.group)).toEqual(['a', 'c'])
    expect(grouped.group.id).toMatch(/^group_/)
    // the shape behind leaves its group for the group of the shape in front
    const across = groupShapesInTree(shapes, [d, b], settings)!
    expect(getIds(across.shapes)).toEqual(['outer'])
    const newInner = (across.shapes[0] as ShapeEntity<'group'>).shapes[0]
    expect(childrenOf(newInner)).toEqual(['a', across.group.id])
    expect(childrenOf(across.group)).toEqual(['b', 'd'])
  })

  it('keeps the drawing of the shapes leaving their groups, and dissolves a group left with a single shape', () => {
    const faded = group('faded', [a, b, c], { style: { opacity: 50 } })
    const out = groupShapesInTree([d, faded], [d, b], settings)!
    expect(out.group.shapes[1]).toMatchObject({ id: 'b', style: { opacity: 50 } })
    expect(childrenOf(out.shapes[1])).toEqual(['a', 'c'])

    const replacedIds = new Map<string, string[]>()
    const pair = group('pair', [a, b], { style: { opacity: 50 } })
    const result = groupShapesInTree([d, pair], [d, a], settings, replacedIds)!
    expect(getIds(result.shapes)).toEqual([result.group.id, 'b'])
    expect(result.shapes[1]).toMatchObject({ id: 'b', style: { opacity: 50 } })
    // the group dissolved is replaced by its shape left, the shapes grouped by the group
    expect(replacedIds).toEqual(
      new Map([
        ['pair', ['b']],
        ['d', [result.group.id]],
        ['a', [result.group.id]]
      ])
    )
  })

  it('takes the place of a group whose shapes are all grouped, with other shapes', () => {
    const pair = group('pair', [a, b], { style: { opacity: 50 } })
    const result = groupShapesInTree([pair, d], [a, b, d], settings)!
    expect(getIds(result.shapes)).toEqual([result.group.id])
    expect(result.group.shapes.map(shape => [shape.id, shape.style?.opacity])).toEqual([
      ['a', 50],
      ['b', 50],
      ['d', undefined]
    ])
  })

  it('refuses less than 2 shapes, or the shapes of a single group', () => {
    expect(groupShapesInTree(shapes, [a], settings)).toBeUndefined()
    expect(groupShapesInTree(shapes, [a, a], settings)).toBeUndefined()
    expect(groupShapesInTree(shapes, [a, b], settings)).toBeUndefined()
    expect(groupShapesInTree(shapes, [a, b, c], settings)).toBeUndefined()
    expect(groupShapesInTree(shapes, [inner, c], settings)).toBeUndefined()
    expect(canGroupShapes(shapes, [inner, a, c])).toBe(false)
    expect(canGroupShapes(shapes, [a, c])).toBe(true)
    expect(canGroupShapes(shapes, [outer, d])).toBe(true)
  })

  it('reselects the shapes after a change of the tree', () => {
    const selection = buildShapesSelection([inner, d], settings)
    // the same tree keeps the selection
    expect(reselect(selection, shapes, shapes, settings)).toBe(selection)
    expect(reselect(selection, shapes, [...shapes], settings)).toBe(selection)
    // the selected group follows a change of its shapes
    const moved = translateShape(a, 0, 100, settings)
    const changed = replaceShapesInTree(shapes, new Map([['a', moved]]), settings)
    const reselected = reselect(selection, shapes, changed, settings)
    expect(getSelectedShapes(reselected)[0]).toBe(indexShapeTree(changed).byId.get('inner'))
    // a shape removed is left out, a dissolved group is replaced by its shape left
    const replacedIds = new Map<string, string[]>()
    const removed = removeShapesFromTree(shapes, new Set(['a', 'd']), settings, replacedIds)
    expect(getIds(getSelectedShapes(reselect(selection, shapes, removed, settings, replacedIds)))).toEqual(['b'])
  })

  it('keeps a selected copy of a shape which has not changed, and normalizes the selection', () => {
    const preview = { ...d, x: 0 }
    const changed = replaceShapesInTree(shapes, new Map([['a', translateShape(a, 0, 100, settings)]]), settings)
    expect(reselect(preview, shapes, changed, settings)).toBe(preview)
    // a shape of a group locked is replaced by the group
    const locked = replaceShapesInTree(shapes, new Map([['inner', { ...inner, locked: true }]]), settings)
    expect(getIds(getSelectedShapes(reselect(a, shapes, locked, settings)))).toEqual(['inner'])
  })
})

describe('frame of a group', () => {
  it('frames the shapes it draws with the padding of the selection, turned by its rotation', () => {
    // turned by a quarter, the two shapes 100 wide are side by side along the height of the group
    const shapes = [rect('a', 0, 0, { rotation: Math.PI / 2 }), rect('b', 200, 0, { rotation: Math.PI / 2 })]
    const turned = group('g', shapes, { rotation: Math.PI / 2 })
    expect(turned.computed.borders).toEqual({ x: 95, y: -105, width: 110, height: 260 })
    expect(turned.computed.center).toEqual([150, 25])
    expect(turned.computed.borders).toEqual(buildShapesSelection(shapes, settings)?.computed.borders)
    expect(turned.computed.boundingBox).toEqual(getBoundingRect(shapes.map(shape => shape.computed.boundingBox)))
  })

  it('frames the shapes of the groups it holds, and their outer borders in its frame', () => {
    const outer = group('outer', [group('inner', [rect('a', 0), rect('b', 200)]), rect('c', 0, 100)])
    expect(outer.computed.borders).toEqual({ x: -5, y: -5, width: 310, height: 160 })
    const { outerBorders, borders } = outer.computed
    expect(outerBorders.x).toBeLessThanOrEqual(borders.x + 5)
    expect(outerBorders.width).toBeGreaterThanOrEqual(borders.width - 10)
  })
})

describe('transformations of a group', () => {
  const ROTATION = Math.PI / 6
  const turnedRect = rect('turned', 0, 0, { rotation: ROTATION })
  const line = createShape<ShapeEntity<'line'>>({
    type: 'line',
    points: [
      [0, 100],
      [100, 150]
    ]
  })
  const inner = group('inner', [rect('a', 200, 0, { rotation: ROTATION }), rect('b', 200, 100, { rotation: ROTATION })], { rotation: ROTATION })
  const outer = group('outer', [turnedRect, line, inner], { rotation: ROTATION })

  /** The positions of the points in the frame of a group, around its center */
  const inFrame = (points: readonly Point[], frame: ShapeEntity<'group'>) =>
    points.map(point => rotatePoint({ origin: frame.computed.center, point, rotation: frame.rotation ?? 0 }))

  it('moves its shapes, those of its groups included', () => {
    const moved = translateShape(outer, 10, 20, settings) as ShapeEntity<'group'>
    expect((moved.shapes[0] as ShapeEntity<'rect'>).x).toBe(10)
    expectPointsClose((moved.shapes[1] as ShapeEntity<'line'>).points, [
      [10, 120],
      [110, 170]
    ])
    expect(((moved.shapes[2] as ShapeEntity<'group'>).shapes[0] as ShapeEntity<'rect'>).y).toBe(20)
    expect(moved.computed.center[0]).toBeCloseTo(outer.computed.center[0] + 10)
    expect(moved.computed.borders.width).toBeCloseTo(outer.computed.borders.width)
  })

  it('turns its shapes around a point, with its frame and the frames of its groups', () => {
    const { center } = outer.computed
    const turned = rotateShape(outer, Math.PI / 2, center, settings) as ShapeEntity<'group'>
    expect(turned.rotation).toBeCloseTo(ROTATION + Math.PI / 2)
    expect(turned.shapes[0]?.rotation).toBeCloseTo(ROTATION + Math.PI / 2)
    expect(turned.shapes[2]?.rotation).toBeCloseTo(ROTATION + Math.PI / 2)
    expectPointsClose(
      (turned.shapes[1] as ShapeEntity<'line'>).points,
      line.points.map(point => rotatePoint({ origin: center, point, rotation: -Math.PI / 2 }))
    )
    // the frame turns with its shapes: it keeps its size
    expect(turned.computed.borders.width).toBeCloseTo(outer.computed.borders.width)
    expect(turned.computed.borders.height).toBeCloseTo(outer.computed.borders.height)
  })

  it('resizes its shapes in its turned frame, the points of a line along its sides', () => {
    const padding = settings.selectionPadding
    const { borders } = outer.computed
    const content = getSelectionBounds(outer, settings)
    const [resized] = resizeShapesToBounds(MEASURE_CONTEXT, [outer], { ...content, width: content.width * 2 }, settings) as [ShapeEntity<'group'>]
    expect(resized.rotation).toBe(ROTATION)
    // the frames are rounded to 2 decimals
    expect(resized.computed.borders.width).toBeCloseTo(content.width * 2 + 2 * padding, 1)
    expect(resized.computed.borders.height).toBeCloseTo(borders.height, 1)
    // in the frame, the line is twice as wide, from the same left side
    const [before, after] = [inFrame(line.points, outer), inFrame((resized.shapes[1] as ShapeEntity<'line'>).points, resized)]
    const left = (frame: ShapeEntity<'group'>) => frame.computed.borders.x + padding
    expect(after[0]![0] - left(resized)).toBeCloseTo((before[0]![0] - left(outer)) * 2)
    expect(after[1]![0] - after[0]![0]).toBeCloseTo((before[1]![0] - before[0]![0]) * 2)
    expect(after[1]![1] - after[0]![1]).toBeCloseTo(before[1]![1] - before[0]![1])
    // the rects turned like the frame are stretched
    expect((resized.shapes[0] as ShapeEntity<'rect'>).width).toBeCloseTo(200)
    expect(((resized.shapes[2] as ShapeEntity<'group'>).shapes[0] as ShapeEntity<'rect'>).width).toBeCloseTo(200)
  })

  it('is resized by an anchor of its frame', () => {
    const flat = group('flat', [rect('a', 0), rect('b', 200)])
    const { borders } = flat.computed
    const anchor: Point = [1, 0.5]
    const cursorStartPosition: Point = [borders.x + borders.width, borders.y + borders.height / 2]
    const resized = resizeShape(
      MEASURE_CONTEXT,
      [cursorStartPosition[0] + 300, cursorStartPosition[1]],
      flat,
      { mode: 'resize', anchor, cursorStartPosition, originalShape: flat, selectedShapesLengthAtMouseDown: 1 },
      settings,
      false,
      false
    )
    expect(getIds(resized.shapes)).toEqual(['a', 'b'])
    expect(resized.shapes.map(shape => (shape as ShapeEntity<'rect'>).width)).toEqual([200, 200])
    expect(resized.computed.borders.width).toBe(610)
  })

  it('keeps the proportions of the shapes which are not turned like its frame', () => {
    expect(mustKeepRatio(getShapeLeaves(outer.shapes), ROTATION)).toBe(false)
    expect(mustKeepRatio(getShapeLeaves([...outer.shapes, rect('flat', 0)]), ROTATION)).toBe(true)
  })

  it('mirrors its shapes, turning its groups and its shapes the other way', () => {
    const [flipped] = flipShapes(MEASURE_CONTEXT, [outer], 'flipHorizontally', settings) as [ShapeEntity<'group'>]
    expect(flipped.rotation).toBeCloseTo(-ROTATION)
    expect(flipped.shapes[0]?.rotation).toBeCloseTo(-ROTATION)
    expect(flipped.shapes[2]?.rotation).toBeCloseTo(-ROTATION)
    expect(flipped.computed.center[0]).toBeCloseTo(outer.computed.center[0])
    const [back] = flipShapes(MEASURE_CONTEXT, [flipped], 'flipHorizontally', settings) as [ShapeEntity<'group'>]
    expectPointsClose((back.shapes[1] as ShapeEntity<'line'>).points, line.points)
    expect(back.rotation).toBeCloseTo(ROTATION)
  })

  it('keeps a locked group', () => {
    const locked = { ...outer, locked: true }
    expect(translateShape(locked, 10, 10, settings)).toBe(locked)
    expect(rotateShape(locked, 1, [0, 0], settings)).toBe(locked)
    expect(resizeShapeInGroup(MEASURE_CONTEXT, locked, buildGroupResizeContext(locked, locked.computed.borders, settings))).toBe(locked)
  })
})

describe('style of a group', () => {
  const a = rect('a', 0, 0, { style: { strokeColor: 'black', opacity: 80 } })
  const b = rect('b', 200)
  const inner = group('inner', [b, rect('c', 400)], { style: { opacity: 50 } })
  const outer = group('outer', [a, inner])

  it('keeps its opacity, the opacity of its shapes drawn together, and gives the other fields to the shapes it draws', () => {
    const styled = updateShapeStyle(MEASURE_CONTEXT, outer, { opacity: 30, strokeColor: 'red' }, settings) as ShapeEntity<'group'>
    expect(styled.style).toEqual({ opacity: 30 })
    expect(styled.shapes[0]?.style).toEqual({ strokeColor: 'red', opacity: 80 })
    const styledInner = styled.shapes[1] as ShapeEntity<'group'>
    expect(styledInner.style).toEqual({ opacity: 50 })
    expect(styledInner.shapes.map(shape => shape.style?.strokeColor)).toEqual(['red', 'red'])
  })

  it('keeps the group without change', () => {
    expect(updateShapeStyle(MEASURE_CONTEXT, outer, {}, settings)).toBe(outer)
    expect(updateShapeStyle(MEASURE_CONTEXT, inner, { opacity: 50 }, settings)).toBe(inner)
    // a field of the texts only changes nothing
    expect(updateShapeStyle(MEASURE_CONTEXT, outer, { fontBold: true }, settings)).toBe(outer)
  })

  it('shows the style shared by the shapes a selection draws, with the opacity of the selected shapes themselves', () => {
    const red = (id: string, x: number, opacity?: number) =>
      rect(id, x, 0, { style: { strokeColor: 'red', lineWidth: 2, ...(opacity === undefined ? {} : { opacity }) } })
    const pair = group('pair', [red('p1', 0, 80), red('p2', 200, 40)], { style: { opacity: 50 } })
    expect(getSelectionStyle(pair)).toEqual({ strokeColor: 'red', lineWidth: 2, opacity: 50 })
    const selection = buildShapesSelection([pair, red('p3', 400, 50)], settings)
    expect(getSelectionStyle(selection)).toEqual({ strokeColor: 'red', lineWidth: 2, opacity: 50 })
    expect(getSelectionStyle(selection)).toBe(getSelectionStyle(selection))
    expect(getIds(getSelectedLeaves(selection))).toEqual(['p1', 'p2', 'p3'])
    // a group without opacity is drawn with all of it
    const plain = buildShapesSelection([group('plain', [red('p4', 0), red('p5', 200)]), red('p6', 400, 60)], settings)
    expect(getSelectionStyle(plain)).toEqual({ strokeColor: 'red', lineWidth: 2 })
    expect(getSelectionStyle(undefined)).toEqual({})
  })
})

describe('copies of a group', () => {
  it('gives new ids to the group and to all its shapes, which do not share the data of the application', () => {
    const data = { label: 'A' }
    const original = group('outer', [group('inner', [rect('a', 0, 0, { data }), rect('b', 200)]), rect('c', 400)])
    const copy = cloneShape(original)
    const ids = getIds(flattenShapes([copy]))
    expect(ids).toHaveLength(5)
    expect(ids.some(id => getIds(flattenShapes([original])).includes(id))).toBe(false)
    const copiedA = getShapeLeaves([copy])[0]!
    expect(copiedA.data).toEqual(data)
    expect(copiedA.data).not.toBe(data)
    expect(copy.computed).toBe(original.computed)
  })
})

describe('hit test of a group', () => {
  /** A context whose points are all in the shapes, or none of them */
  const createContext = (isInShape: boolean) =>
    ({ lineWidth: 1, isPointInPath: () => isInShape, isPointInStroke: () => isInShape }) as unknown as CanvasRenderingContext2D
  const left = rect('left', 0)
  const right = rect('right', 200)
  const pair = group('pair', [left, right])

  it('finds the visible shapes drawn under a point, those of the groups, from the foreground', () => {
    const ctx = createContext(true)
    expect(findShapesAt(ctx, [pair], [50, 25], hitSettings)).toEqual([left])
    expect(findShapeAt(ctx, [pair], [250, 25], hitSettings)).toBe(right)
    expect(
      findLeavesAtPoints(
        ctx,
        indexShapeTree([pair]).leaves,
        [
          [50, 25],
          [250, 25]
        ],
        hitSettings
      ).map(({ leaf }) => leaf)
    ).toEqual([left, right])
    // the shapes of a hidden group are hidden too
    expect(findShapesAt(ctx, [{ ...pair, visible: false }], [50, 25], hitSettings)).toEqual([])
  })

  it('is under a point when one of its shapes is under it', () => {
    expect(checkPositionIntersection(createContext(true), pair, [50, 25], hitSettings)).toEqual({ mode: 'translate' })
    expect(checkPositionIntersection(createContext(false), pair, [50, 25], hitSettings)).toBe(false)
  })

  it('is crossed by the selection frame which crosses one of its shapes', () => {
    const ctx = createContext(false)
    expect(
      checkSelectionFrameCollision(ctx, pair, [
        [-10, -10],
        [110, 60]
      ])
    ).toBe(true)
    expect(
      checkSelectionFrameCollision(ctx, pair, [
        [500, 500],
        [600, 600]
      ])
    ).toBe(false)
  })
})

describe('selection in the groups', () => {
  const a = rect('a', 0)
  const b = rect('b', 200)
  const c = rect('c', 400)
  const d = rect('d', 600)
  const inner = group('inner', [a, b])
  const outer = group('outer', [inner, c])
  const shapes = [outer, d]

  /** A context finding the points inside the rects, by their paths */
  const rectsByPath = new Map([a, b, c, d].map(shape => [shape.path, shape as ShapeEntity<'rect'>]))
  const isInRect = (path: Path2D, x: number, y: number) => {
    const shape = rectsByPath.get(path)
    return !!shape && x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height
  }
  const ctx = { lineWidth: 1, isPointInPath: isInRect, isPointInStroke: isInRect } as unknown as CanvasRenderingContext2D

  /** The center of a rect */
  const at = (shape: ShapeEntity): Point => [(shape as ShapeEntity<'rect'>).x + 50, 25]

  const unitOf = (id: string, openedIds: string[] = [], tree = shapes) => resolveUnit(tree, id, new Set(openedIds))?.id

  it('gives the shape holding a shape in the groups opened by the selection, the drawing itself without them', () => {
    expect(unitOf('a')).toBe('outer')
    expect(unitOf('c')).toBe('outer')
    expect(unitOf('d')).toBe('d')
    expect(unitOf('unknown')).toBeUndefined()
    // a selected shape opens the groups holding it, at any depth
    expect(getOpenedGroupIds(shapes, [c])).toEqual(new Set(['outer']))
    expect(getOpenedGroupIds(shapes, [a, d])).toEqual(new Set(['inner', 'outer']))
    expect(getOpenedGroupIds(shapes, [outer])).toEqual(new Set())
    expect(unitOf('a', ['outer'])).toBe('inner')
    expect(unitOf('c', ['outer'])).toBe('c')
    expect(unitOf('d', ['outer'])).toBe('d')
    expect(unitOf('b', ['inner', 'outer'])).toBe('b')
  })

  it('gives a locked group as a whole, even opened, and a locked shape of an opened group', () => {
    const tree = [
      refreshGroup(
        {
          ...outer,
          shapes: [
            { ...inner, locked: true },
            { ...c, locked: true }
          ]
        },
        settings
      ),
      d
    ]
    expect(unitOf('a', ['outer'], tree)).toBe('inner')
    expect(unitOf('a', ['inner', 'outer'], tree)).toBe('inner')
    expect(unitOf('c', ['outer'], tree)).toBe('c')
    expect(unitOf('a', ['inner', 'outer'], [{ ...outer, locked: true }, d])).toBe('outer')
  })

  it('gives the deepest group holding all the shapes', () => {
    expect(getCommonGroup(shapes, [a, b])?.id).toBe('inner')
    expect(getCommonGroup(shapes, [a, c])?.id).toBe('outer')
    expect(getCommonGroup(shapes, [inner])?.id).toBe('outer')
    expect(getCommonGroup(shapes, [a, d])).toBeUndefined()
    expect(getCommonGroup(shapes, [outer])).toBeUndefined()
    expect(getCommonGroup(shapes, [])).toBeUndefined()
  })

  const click = (point: Point, selection?: SelectionType, behavior: 'add' | 'toggle' | 'replace' = 'replace') =>
    selectShape(ctx, shapes, point, hitSettings, selection, false, false, behavior)

  it('selects by a click the shape holding the shape under the cursor, in the groups opened by the selection', () => {
    expect(click(at(a))).toMatchObject({ shape: outer, mode: { mode: 'translate' } })
    expect(click(at(d)).shape).toBe(d)
    expect(click([350, 25]).shape).toBeUndefined()
    // a selected group is kept on its shapes
    expect(click(at(a), outer).shape).toBe(outer)
    // the other shapes of the groups of a selected shape are selected
    expect(click(at(a), c).shape).toBe(inner)
    expect(click(at(c), a).shape).toBe(c)
    expect(click(at(b), a).shape).toBe(b)
    expect(click(at(d), c).shape).toBe(d)
    // and added to the selection, at another level
    expect(getIds(getSelectedShapes(click(at(a), c, 'add').shape))).toEqual(['c', 'inner'])
    expect(getIds(getSelectedShapes(click(at(d), a, 'toggle').shape))).toEqual(['a', 'd'])
  })

  it('hovers the shape which a click would select, out of the locked ones', () => {
    expect(findHoveredShape(ctx, shapes, at(a), hitSettings, undefined)).toBe(outer)
    expect(findHoveredShape(ctx, shapes, at(a), hitSettings, c)).toBe(inner)
    expect(findHoveredShape(ctx, shapes, at(d), hitSettings, c)).toBe(d)
    expect(findHoveredShape(ctx, [{ ...outer, locked: true }, d], at(a), hitSettings, undefined)).toBeUndefined()
  })

  it('opens a group by a double click: the shape of the group under the cursor is selected', () => {
    expect(findShapeInGroup(ctx, shapes, outer, at(a), hitSettings)).toBe(inner)
    expect(findShapeInGroup(ctx, shapes, outer, at(c), hitSettings)).toBe(c)
    expect(findShapeInGroup(ctx, shapes, inner, at(b), hitSettings)).toBe(b)
    expect(findShapeInGroup(ctx, shapes, inner, at(c), hitSettings)).toBeUndefined()
    expect(findShapeInGroup(ctx, shapes, outer, [350, 25], hitSettings)).toBeUndefined()
  })
})

describe('drawing of a group', () => {
  const drawSettings = createPaintStore().getSettings()

  /** A context recording the strokes and the copies of the layers, and the opacity they are drawn with */
  const createRecordingContext = () => {
    const strokes: unknown[] = []
    const alphas: number[] = []
    const copies: { alpha: number; source: unknown }[] = []
    const ctx = {
      canvas: { width: 1000, height: 600 },
      globalAlpha: 1,
      lineWidth: 1,
      reset() {},
      save() {},
      restore() {},
      scale() {},
      translate() {},
      rotate() {},
      setTransform() {},
      clearRect() {},
      setLineDash() {},
      fill() {},
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      stroke(path: unknown) {
        strokes.push(path)
        alphas.push(this.globalAlpha)
      },
      drawImage(source: unknown) {
        copies.push({ alpha: this.globalAlpha, source })
      }
    }
    return { ctx, strokes, alphas, copies }
  }

  const layers: ReturnType<typeof createRecordingContext>[] = []
  beforeEach(() => {
    layers.length = 0
    vi.stubGlobal('document', {
      createElement: () => {
        const layer = createRecordingContext()
        layers.push(layer)
        return { ...layer.ctx.canvas, getContext: () => layer.ctx }
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    stubPath2D()
    vi.stubGlobal('Image', FakeImage)
  })

  const draw = (shapes: ShapeEntity[], options?: DrawShapesOptions) => {
    const recording = createRecordingContext()
    drawShapes(recording.ctx as unknown as CanvasRenderingContext2D, shapes, drawSettings, options)
    return recording
  }

  const a = rect('a', 0)
  const b = rect('b', 200)

  it('draws the shapes of a group from the background, and nothing of a hidden group or of a group of opacity 0', () => {
    expect(draw([group('g', [a, b])]).strokes).toEqual([b.path, a.path])
    expect(draw([group('g', [a, b], { visible: false })]).strokes).toEqual([])
    expect(draw([group('g', [a, b], { style: { opacity: 0 } })]).strokes).toEqual([])
    expect(layers).toEqual([])
  })

  it('draws the shapes of a group with an opacity together on a layer, copied once with the opacity', () => {
    const { strokes, copies } = draw([group('g', [a, b], { style: { opacity: 50 } })])
    expect(strokes).toEqual([])
    expect(layers).toHaveLength(1)
    expect(layers[0]!.strokes).toEqual([b.path, a.path])
    // the layer is the smallest one holding the shapes
    expect(copies).toEqual([{ alpha: 0.5, source: layers[0]!.ctx.canvas }])
    expect(layers[0]!.ctx.canvas).toMatchObject({ width: 512, height: 64 })
  })

  it('draws a group with an opacity in a group with an opacity on the layer of the outer group', () => {
    const inner = group('inner', [a, b], { style: { opacity: 50 } })
    const { copies } = draw([group('outer', [inner, rect('c', 400)], { style: { opacity: 80 } })])
    expect(copies).toEqual([{ alpha: 0.8, source: expect.anything() }])
    expect(layers).toHaveLength(2)
    expect(layers[0]!.copies).toEqual([{ alpha: 0.5, source: expect.anything() }])
    expect(layers[1]!.strokes).toEqual([b.path, a.path])
  })

  it('leaves out the hidden shape at any depth, and draws the faded shapes with a part of their opacity', () => {
    const thick = (id: string, x: number) => rect(id, x, 0, { style: { lineWidth: 10 } })
    const e = thick('e', 0)
    const f = thick('f', 200)
    expect(draw([group('g', [e, f])], { hiddenId: 'e' }).strokes).toEqual([f.path])
    expect(draw([group('g', [e, f])], { fadedIds: new Set(['e']) }).alphas).toEqual([1, 0.3])
    expect(layers).toEqual([])
  })
})

describe('data of a group', () => {
  const buildOptions = () => ({ ctx: MEASURE_CONTEXT, settings, tools: [], usedIds: new Set<string>(), completeStyle: false })
  const RECT: ShapeInput = { type: 'rect', x: 0, y: 0, width: 100, height: 50 }

  it('builds a group with its shapes, whose ids are free in the whole drawing, turned like its shapes without rotation', () => {
    const options = { ...buildOptions(), usedIds: new Set(['a']) }
    const built = buildShapeEntity(
      {
        type: 'group',
        id: 'g',
        name: 'Logo',
        shapes: [
          { ...RECT, id: 'a', rotation: 0.5 },
          {
            type: 'group',
            shapes: [
              { ...RECT, id: 'g', rotation: 0.5 },
              { ...RECT, rotation: 0.5 }
            ]
          }
        ]
      },
      options
    ) as ShapeEntity<'group'>
    const ids = getIds(flattenShapes([built]))
    expect(new Set(ids).size).toBe(5)
    expect(ids[0]).toBe('g')
    expect(ids).not.toContain('a')
    expect(built).toMatchObject({ name: 'Logo', rotation: 0.5 })
    expect(buildShapeEntity({ type: 'group', rotation: 0.2, shapes: [RECT, RECT] }, buildOptions()).rotation).toBe(0.2)
  })

  it('exports a group with its shapes, without their computed data, as new objects', () => {
    const original = group('outer', [group('inner', [rect('a', 0), rect('b', 200)], { name: 'Inner' }), rect('c', 400)], {
      rotation: 0.5,
      style: { opacity: 40 }
    })
    const { shapes: [exported] = [] } = buildDataToExport([original], 1000, 600)
    expect(exported).toMatchObject({ id: 'outer', type: 'group', rotation: 0.5, style: { opacity: 40 } })
    expect(exported).not.toHaveProperty('computed')
    const [exportedInner] = (exported as ExportedShape & { type: 'group' }).shapes
    expect(exportedInner).toMatchObject({ id: 'inner', name: 'Inner', shapes: [{ id: 'a', x: 0 }, { id: 'b' }] })
    expect(exportedInner).not.toHaveProperty('path')
    expect(buildDataToExport([original], 1000, 600).shapes[0]).not.toBe(exported)
  })

  it('loads a group exported, with its shapes, its rotation and its name', async () => {
    const original = group('outer', [group('inner', [rect('a', 0), rect('b', 200)], { name: 'Inner' }), rect('c', 400)], { rotation: 0.5 })
    const { shapes } = await decodeImportedData(buildDataToExport([original], 1000, 600).shapes, { ...buildOptions(), resolvePictureSrc: undefined })
    expect(getIds(flattenShapes(shapes))).toEqual(['outer', 'inner', 'a', 'b', 'c'])
    expect(shapes[0]).toMatchObject({ rotation: 0.5, shapes: [{ name: 'Inner' }, { id: 'c' }] })
    expect(shapes[0]?.computed).toEqual(original.computed)
  })

  it('dissolves the loaded groups left with a single shape, and leaves out the empty ones', async () => {
    const { shapes } = await decodeImportedData(
      [
        { type: 'group', visible: false, shapes: [{ ...RECT, id: 'kept' }, { type: 'star' }] },
        { type: 'group', shapes: [] },
        { type: 'group' }
      ] as unknown as ShapeInput[],
      { ...buildOptions(), resolvePictureSrc: undefined }
    )
    expect(shapes).toHaveLength(1)
    expect(shapes[0]).toMatchObject({ id: 'kept', visible: false })
  })

  it('leaves out the pictures of the groups which cannot be loaded, and dissolves their groups', async () => {
    FakeImage.fails = src => src === 'broken.png'
    const { shapes, failedPictures } = await decodeImportedData(
      [
        {
          type: 'group',
          shapes: [
            { ...RECT, id: 'kept' },
            { type: 'picture', id: 'broken', x: 0, y: 0, width: 10, height: 10, src: 'broken.png' }
          ]
        }
      ],
      { ...buildOptions(), resolvePictureSrc: undefined }
    )
    FakeImage.fails = () => false
    expect(getIds(shapes)).toEqual(['kept'])
    expect(failedPictures.map(({ shape }) => shape.id)).toEqual(['broken'])
  })

  it('updates the flags, the data, the name and the opacity of a group, and refuses its other fields', () => {
    const original = group('g', [rect('a', 0), rect('b', 200)], { name: 'Old' })
    const shapesById = new Map([['g', original as ShapeEntity]])
    expect(() =>
      assertValidPatches([{ id: 'g', name: 'New', visible: false, locked: true, data: { a: 1 }, style: { opacity: 50 } }], shapesById)
    ).not.toThrow()
    expect(() => assertValidPatches([{ id: 'g', rotation: 1 }], shapesById)).toThrow('"rotation" of a group is changed by rotateShapes')
    expect(() => assertValidPatches([{ id: 'g', shapes: [] }], shapesById)).toThrow(
      '"shapes" of a group are changed by groupShapes and ungroupShapes'
    )
    expect(() => assertValidPatches([{ id: 'g', x: 1 }], shapesById)).toThrow('unknown field "x" for a group')
    expect(() => assertValidPatches([{ id: 'g', style: { strokeColor: 'red' } }], shapesById)).toThrow(
      'the style of a group only has an opacity, not "strokeColor"'
    )
    const patched = applyShapePatch(MEASURE_CONTEXT, original, { id: 'g', name: undefined, style: { opacity: 50 } }, settings)
    expect(patched).not.toHaveProperty('name')
    expect(patched).toMatchObject({ style: { opacity: 50 }, computed: original.computed, shapes: original.shapes })
  })

  describe('changes of the data', () => {
    const a = rect('a', 0)
    const b = rect('b', 200)
    const c = rect('c', 400)
    const changesBetween = (previous: ShapeEntity[], shapes: ShapeEntity[]) =>
      getDataChanges(previous, shapes, buildDataToExport(shapes, 1000, 600).shapes)

    it('gives a new group as added, and its shapes, moved into it, as reordered', () => {
      const changes = changesBetween([a, b, c], [group('g', [a, b]), c])
      expect(changes.added.map(shape => shape.id)).toEqual(['g'])
      expect(changes.updated).toEqual([])
      expect(changes.removed).toEqual([])
      expect(changes.reordered).toBe(true)
    })

    it('gives a shape changed in a group as updated, without its group', () => {
      const before = group('g', [a, b])
      const moved = translateShape(a, 10, 0, settings)
      const changes = changesBetween([before], replaceShapesInTree([before], new Map([['a', moved]]), settings))
      expect(changes.updated.map(({ shape, previous }) => [shape.id, (shape as { x: number }).x, (previous as { x: number }).x])).toEqual([
        ['a', 10, 0]
      ])
      expect(changes.reordered).toBe(false)
    })

    it('gives a group changed by its own fields as updated, and a removed group with its shapes as removed', () => {
      const before = group('g', [a, b])
      expect(changesBetween([before], [{ ...before, name: 'G' }]).updated.map(({ shape }) => shape.id)).toEqual(['g'])
      expect(changesBetween([before, c], [c]).removed.map(shape => shape.id)).toEqual(['g', 'a', 'b'])
    })
  })
})
