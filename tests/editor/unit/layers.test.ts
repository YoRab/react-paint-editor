import type { ShapeEntity } from '@canvas/index'
import { buildLayers, getLayerAncestorIds, getShownLayers } from '@editor/utils/layers'
import { describe, expect, it } from 'vitest'

/** The fields of the shapes read by the layers, the geometry left out */
type ShapeFields = { id: string; type: string; name?: string; visible?: boolean; locked?: boolean; shapes?: ShapeFields[] }

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
    expect(layers[0]).toEqual({ id: 'outer', type: 'group', name: 'Outer', visible: undefined, locked: true, depth: 0, parentId: undefined })
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
    expect(changedIds).toEqual(['b', 'a'])
  })

  it('leaves out the shapes of the collapsed groups, at any depth', () => {
    const layers = buildLayers(TREE)
    expect(getShownLayers(layers, new Set())).toBe(layers)
    expect(getIds(getShownLayers(layers, new Set(['inner'])))).toEqual(['outer', 'a', 'inner', 'd'])
    expect(getIds(getShownLayers(layers, new Set(['outer'])))).toEqual(['outer', 'd'])
    expect(getIds(getShownLayers(layers, new Set(['outer', 'inner'])))).toEqual(['outer', 'd'])
  })

  it('gives the groups holding shapes, to expand them', () => {
    const layers = buildLayers(TREE)
    expect([...getLayerAncestorIds(layers, ['b'])]).toEqual(['inner', 'outer'])
    expect([...getLayerAncestorIds(layers, ['a', 'c', 'd'])]).toEqual(['outer', 'inner'])
    expect(getLayerAncestorIds(layers, ['outer', 'unknown']).size).toBe(0)
  })
})
