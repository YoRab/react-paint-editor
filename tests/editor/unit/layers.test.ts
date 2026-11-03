import type { ReactPaint, ShapeEntity } from '@canvas/index'
import {
  buildLayers,
  getLayerAncestorIds,
  getLayerMoveMessage,
  getPaintShapeNames,
  getShapeNames,
  getShownLayers,
  getSiblingBlocks,
  type ShapeNumbers
} from '@editor/utils/layers'
import { describe, expect, it } from 'vitest'

/** The fields of the shapes read by the layers, the geometry left out */
type ShapeFields = {
  id: string
  type: string
  name?: string
  toolId?: string
  value?: string[]
  visible?: boolean
  locked?: boolean
  shapes?: ShapeFields[]
}

const rect = (id: string, fields: Partial<ShapeFields> = {}): ShapeFields => ({ id, type: 'rect', ...fields })
const group = (id: string, shapes: ShapeFields[], fields: Partial<ShapeFields> = {}): ShapeFields => ({ id, type: 'group', shapes, ...fields })

const asShapes = (shapes: ShapeFields[]) => shapes as unknown as ShapeEntity[]

/** outer holds a and inner, inner holds b and c, d is alone */
const TREE = asShapes([group('outer', [rect('a'), group('inner', [rect('b'), rect('c')])], { name: 'Outer', locked: true }), rect('d')])

const getIds = (layers: { id: string }[]) => layers.map(layer => layer.id)

describe('editor/utils/layers', () => {
  it('lists the shapes from the foreground, each group followed by its shapes, with their depth and their group', () => {
    const layers = buildLayers(TREE)
    expect(layers.map(({ id, depth, parentId }) => [id, depth, parentId])).toEqual([
      ['outer', 0, undefined],
      ['a', 1, 'outer'],
      ['inner', 1, 'outer'],
      ['b', 2, 'inner'],
      ['c', 2, 'inner'],
      ['d', 0, undefined]
    ])
    expect(layers[0]).toEqual({
      id: 'outer',
      type: 'group',
      toolId: undefined,
      name: 'Outer',
      label: 'Outer',
      visible: undefined,
      locked: true,
      depth: 0,
      parentId: undefined,
      isFirst: true,
      isLast: false
    })
    // the bounds of each group, from the foreground
    expect(layers.map(({ id, isFirst, isLast }) => [id, isFirst, isLast])).toEqual([
      ['outer', true, false],
      ['a', true, false],
      ['inner', false, true],
      ['b', true, false],
      ['c', false, true],
      ['d', false, true]
    ])
  })

  it('names the shapes: their name, the content of a text, or else their type numbered from the background', () => {
    const text = (id: string, value: string[], fields: Partial<ShapeFields> = {}): ShapeFields => ({ id, type: 'text', value, ...fields })
    const names = getShapeNames(
      asShapes([
        rect('front'),
        text('long', ['', '  A title much longer than the thirty letters kept  ']),
        text('empty', ['', ' ']),
        group('g', [rect('inner', { name: 'Inside' }), rect('star', { toolId: 'star-tool' })]),
        rect('back')
      ]),
      [{ id: 'star-tool', type: 'rect', label: 'Étoile' } as never]
    )
    expect(Object.fromEntries(names)).toEqual({
      front: 'Rectangle 2',
      long: 'A title much longer than the …',
      empty: 'Texte 1',
      g: 'Groupe 1',
      inner: 'Inside',
      // the label of its tool, counted apart
      star: 'Étoile 1',
      back: 'Rectangle 1'
    })
    // the layers show these names: a named shape takes no number
    expect(buildLayers(asShapes([rect('a'), rect('b', { name: 'B' })])).map(layer => layer.label)).toEqual(['Rectangle 1', 'B'])
  })

  it('keeps the numbers of the shapes moved, the new shapes taking the next numbers', () => {
    const numbers: ShapeNumbers = new Map()
    const getNames = (shapes: ShapeFields[]) => Object.fromEntries(getShapeNames(asShapes(shapes), [], numbers))
    expect(getNames([rect('a'), rect('b'), rect('c')])).toEqual({ a: 'Rectangle 3', b: 'Rectangle 2', c: 'Rectangle 1' })
    // a goes to the background, b and c into a group: they keep their numbers
    expect(getNames([group('g', [rect('c'), rect('b')]), rect('a')])).toEqual({
      g: 'Groupe 1',
      a: 'Rectangle 3',
      b: 'Rectangle 2',
      c: 'Rectangle 1'
    })
    // the new shapes take the numbers following the ones shown, from the background
    expect(getNames([rect('d'), rect('a'), rect('e'), rect('b'), rect('c')])).toMatchObject({ e: 'Rectangle 4', d: 'Rectangle 5' })

    // a named shape keeps its number, to take it again without its name
    expect(getNames([rect('d'), rect('a', { name: 'A' }), rect('e')])).toEqual({ d: 'Rectangle 5', a: 'A', e: 'Rectangle 4' })
    expect(getNames([rect('d'), rect('a'), rect('e')])).toEqual({ d: 'Rectangle 5', a: 'Rectangle 3', e: 'Rectangle 4' })

    // b and c, removed, take their numbers again when put back
    expect(getNames([rect('c'), rect('d'), rect('b'), rect('a'), rect('e')])).toMatchObject({ b: 'Rectangle 2', c: 'Rectangle 1' })

    // the numbers of a drawing loaded start again
    expect(getNames([rect('x'), rect('y')])).toEqual({ x: 'Rectangle 2', y: 'Rectangle 1' })
    // c, put back behind y which took its number meanwhile, gets a new one: the shape shown keeps its name
    expect(getNames([rect('x'), rect('y'), rect('c')])).toEqual({ x: 'Rectangle 2', y: 'Rectangle 1', c: 'Rectangle 3' })

    // a shape drawn with another tool takes a number of its label
    const star = { id: 'star-tool', type: 'rect', label: 'Étoile' } as never
    expect(Object.fromEntries(getShapeNames(asShapes([rect('x', { toolId: 'star-tool' }), rect('y')]), [star], numbers))).toEqual({
      x: 'Étoile 1',
      y: 'Rectangle 1'
    })
  })

  it('names the shapes of a canvas once while they only move', () => {
    const paint = {} as ReactPaint
    const shapes = asShapes([rect('a'), group('g', [rect('b')])])
    const tools: never[] = []
    const names = getPaintShapeNames(paint, shapes, tools)
    expect(Object.fromEntries(names)).toEqual({ a: 'Rectangle 2', g: 'Groupe 1', b: 'Rectangle 1' })
    // new objects with the same fields, like shapes hidden or locked: the names are the same ones
    expect(getPaintShapeNames(paint, asShapes([{ ...rect('a'), visible: false }, group('g', [{ ...rect('b'), locked: true }])]), tools)).toBe(names)
    // a name given, or a shape added, names the shapes again
    expect(getPaintShapeNames(paint, asShapes([rect('a', { name: 'A' }), group('g', [rect('b')])]), tools).get('a')).toBe('A')
    expect(getPaintShapeNames(paint, asShapes([rect('c'), rect('a'), group('g', [rect('b')])]), tools).get('c')).toBe('Rectangle 3')
  })

  it('keeps the layers which have not changed', () => {
    const layers = buildLayers(TREE)
    const previous = new Map(layers.map(layer => [layer.id, layer]))
    // b is hidden, and a leaves outer
    const nextLayers = buildLayers(
      asShapes([group('outer', [group('inner', [rect('b', { visible: false }), rect('c')])], { name: 'Outer', locked: true }), rect('a'), rect('d')]),
      previous
    )
    const changedIds = nextLayers.filter(layer => layer !== previous.get(layer.id)).map(layer => layer.id)
    // inner is now the first shape of outer. Without numbers kept, c is numbered again: a, in front of it, is now behind it
    expect(changedIds).toEqual(['inner', 'b', 'c', 'a'])
    const numbers: ShapeNumbers = new Map()
    const numberedLayers = buildLayers(TREE, undefined, getShapeNames(TREE, [], numbers))
    const numberedPrevious = new Map(numberedLayers.map(layer => [layer.id, layer]))
    const nextShapes = asShapes([
      group('outer', [group('inner', [rect('b', { visible: false }), rect('c')])], { name: 'Outer', locked: true }),
      rect('a'),
      rect('d')
    ])
    const nextNumberedLayers = buildLayers(nextShapes, numberedPrevious, getShapeNames(nextShapes, [], numbers))
    expect(nextNumberedLayers.filter(layer => layer !== numberedPrevious.get(layer.id)).map(layer => layer.id)).toEqual(['inner', 'b', 'a'])

    // a shape moved inside its group changes the layers of the bounds only
    const swapped = buildLayers(asShapes([rect('x'), rect('y', { name: 'Y' }), rect('z', { name: 'Z' })]))
    const swappedPrevious = new Map(swapped.map(layer => [layer.id, layer]))
    const moved = buildLayers(asShapes([rect('x'), rect('z', { name: 'Z' }), rect('y', { name: 'Y' })]), swappedPrevious)
    expect(moved.filter(layer => layer !== swappedPrevious.get(layer.id)).map(layer => layer.id)).toEqual(['z', 'y'])
  })

  it('leaves out the shapes of the collapsed groups, at any depth', () => {
    const layers = buildLayers(TREE)
    expect(getShownLayers(layers, new Set())).toBe(layers)
    expect(getIds(getShownLayers(layers, new Set(['inner'])))).toEqual(['outer', 'a', 'inner', 'd'])
    expect(getIds(getShownLayers(layers, new Set(['outer'])))).toEqual(['outer', 'd'])
    expect(getIds(getShownLayers(layers, new Set(['outer', 'inner'])))).toEqual(['outer', 'd'])
  })

  it('gives the blocks of the shapes of the group of a layer, a group with its shapes shown', () => {
    const layers = buildLayers(TREE)
    // outer, with its 4 shapes, and d
    expect(getSiblingBlocks(layers, 'd')).toEqual({
      blocks: [
        { first: 0, last: 4 },
        { first: 5, last: 5 }
      ],
      index: 1
    })
    // a and inner with its 2 shapes, inside outer
    expect(getSiblingBlocks(layers, 'a')).toEqual({
      blocks: [
        { first: 1, last: 1 },
        { first: 2, last: 4 }
      ],
      index: 0
    })
    expect(getSiblingBlocks(layers, 'c')).toEqual({
      blocks: [
        { first: 3, last: 3 },
        { first: 4, last: 4 }
      ],
      index: 1
    })
    // a collapsed group is a single row
    const shown = getShownLayers(layers, new Set(['inner']))
    expect(getSiblingBlocks(shown, 'inner')).toEqual({
      blocks: [
        { first: 1, last: 1 },
        { first: 2, last: 2 }
      ],
      index: 1
    })
    // a layer which is not shown has no place to be dropped
    expect(getSiblingBlocks(shown, 'b')).toBeUndefined()
  })

  it('tells the place of a shape among the shapes of its group, from the foreground', () => {
    expect(getLayerMoveMessage(TREE, 'd')).toBe('Rectangle 1 : position 2 sur 2')
    expect(getLayerMoveMessage(TREE, 'outer')).toBe('Outer : position 1 sur 2')
    expect(getLayerMoveMessage(TREE, 'c')).toBe('Rectangle 2 : position 2 sur 2 dans Groupe 1')
    expect(getLayerMoveMessage(TREE, 'unknown')).toBe('')
  })

  it('gives the groups holding shapes, to expand them', () => {
    const layers = buildLayers(TREE)
    expect([...getLayerAncestorIds(layers, ['b'])]).toEqual(['inner', 'outer'])
    expect([...getLayerAncestorIds(layers, ['a', 'c', 'd'])]).toEqual(['outer', 'inner'])
    expect(getLayerAncestorIds(layers, ['outer', 'unknown']).size).toBe(0)
  })
})
