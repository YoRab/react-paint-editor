import { assertValidShapes, getShapeInputError } from '@canvas/utils/shapeInput'
import { describe, expect, it } from 'vitest'

const POINTS = [
  [0, 0],
  [10, 10]
]

const RECT = { type: 'rect', x: 0, y: 0, width: 10, height: 10 }

describe('getShapeInputError', () => {
  it('accepts a minimal shape of each type', () => {
    const shapes = [
      RECT,
      { type: 'square', x: 0, y: 0, width: 10, height: 10 },
      { type: 'picture', x: 0, y: 0, width: 10, height: 10, src: 'image.png' },
      // the size of a text is computed from its content
      { type: 'text', x: 0, y: 0, value: ['Texte'] },
      { type: 'circle', x: 0, y: 0, radius: 10 },
      { type: 'ellipse', x: 0, y: 0, radiusX: 10, radiusY: 5 },
      { type: 'line', points: POINTS },
      { type: 'polygon', points: POINTS },
      { type: 'curve', points: POINTS },
      { type: 'brush', points: [[[0, 0]]] },
      { ...RECT, id: 'rect_1', rotation: 0.5, visible: false, locked: true, style: { strokeColor: 'red' }, data: { checked: true } }
    ]
    for (const shape of shapes) expect(getShapeInputError(shape)).toBeUndefined()
  })

  it.each([
    [null, 'a shape must be an object'],
    [[RECT], 'a shape must be an object'],
    [{ ...RECT, type: 'star' }, 'unknown shape type "star"'],
    [{ ...RECT, type: 'group' }, 'unknown field "x" for a group'],
    [{ ...RECT, id: '' }, '"id" must be a non empty string'],
    [{ ...RECT, id: 3 }, '"id" must be a non empty string'],
    [{ type: 'circle', x: 0, y: 0, radius: 10, points: POINTS }, 'unknown field "points" for a circle'],
    [{ ...RECT, rotation: Number.NaN }, '"rotation" must be a finite number'],
    [{ ...RECT, style: ['red'] }, '"style" must be an object'],
    [{ ...RECT, data: 'checked' }, '"data" must be an object'],
    [{ ...RECT, visible: 'oui' }, '"visible" must be a boolean'],
    [{ ...RECT, locked: 1 }, '"locked" must be a boolean']
  ])('checks the common fields: %j', (shape, error) => {
    expect(getShapeInputError(shape)).toBe(error)
  })

  it.each([
    [{ type: 'rect', x: 0, y: 0, width: 10 }, '"height" must be a finite number'],
    [{ ...RECT, x: Number.POSITIVE_INFINITY }, '"x" must be a finite number'],
    [{ type: 'picture', x: 0, y: 0, width: 10, height: 10, src: '' }, '"src" must be a non empty string'],
    [{ type: 'text', x: 0, y: 0, value: [] }, '"value" must be a non empty array of strings'],
    [{ type: 'text', x: 0, y: 0, value: [1] }, '"value" must be a non empty array of strings'],
    [{ type: 'text', x: 0, y: 0, value: 'Texte' }, '"value" must be a non empty array of strings'],
    [{ type: 'text', x: 0, y: 0, value: ['Texte'], fontSize: 'big' }, '"fontSize" must be a finite number'],
    [{ type: 'circle', x: 0, y: 0 }, '"radius" must be a finite number'],
    [{ type: 'ellipse', x: 0, y: 0, radiusX: 10, radiusY: Number.NaN }, '"radiusY" must be a finite number'],
    [{ type: 'line', points: [...POINTS, [20, 20]] }, '"points" must hold exactly 2 points'],
    [{ type: 'line', points: [[0, 0], [10]] }, '"points" must hold exactly 2 points'],
    [{ type: 'polygon', points: [[0, 0]] }, '"points" must hold at least 2 points'],
    [
      {
        type: 'curve',
        points: [
          [0, 0],
          [10, 'a']
        ]
      },
      '"points" must hold at least 2 points'
    ],
    [{ type: 'brush', points: [] }, '"points" must be a non empty array of non empty point lists'],
    [{ type: 'brush', points: [[]] }, '"points" must be a non empty array of non empty point lists']
  ])('checks the geometry of each type: %j', (shape, error) => {
    expect(getShapeInputError(shape)).toBe(error)
  })

  it('accepts a group of at least 2 shapes, groups included, with its name and its opacity', () => {
    const group = { type: 'group', shapes: [RECT, RECT] }
    expect(getShapeInputError(group)).toBeUndefined()
    expect(
      getShapeInputError({ ...group, id: 'g', name: 'Logo', rotation: 0.5, visible: false, style: { opacity: 50 }, data: { a: 1 } })
    ).toBeUndefined()
    expect(getShapeInputError({ type: 'group', shapes: [group, RECT] })).toBeUndefined()
  })

  it.each([
    [{ type: 'group', shapes: [RECT] }, '"shapes" must hold at least 2 shapes'],
    [{ type: 'group', shapes: RECT }, '"shapes" must hold at least 2 shapes'],
    [{ type: 'group' }, '"shapes" must hold at least 2 shapes'],
    [{ type: 'group', shapes: [RECT, RECT], toolId: 'rect' }, 'unknown field "toolId" for a group'],
    [{ type: 'group', shapes: [RECT, RECT], name: 3 }, '"name" must be a string'],
    [{ type: 'group', shapes: [RECT, RECT], style: { strokeColor: 'red' } }, 'the style of a group only has an opacity, not "strokeColor"'],
    [{ type: 'group', shapes: [RECT, RECT], locked: 'yes' }, '"locked" must be a boolean'],
    [{ type: 'group', shapes: [RECT, { type: 'circle', x: 0, y: 0 }] }, 'shapes[1], "radius" must be a finite number'],
    [{ type: 'group', shapes: [{ type: 'group', shapes: [RECT, { ...RECT, x: 'a' }] }, RECT] }, 'shapes[0], shapes[1], "x" must be a finite number']
  ])('checks a group and its shapes: %j', (shape, error) => {
    expect(getShapeInputError(shape)).toBe(error)
  })
})

describe('assertValidShapes', () => {
  it('names the action and the index of the first invalid shape', () => {
    expect(() => assertValidShapes([RECT, { type: 'circle', x: 0, y: 0 }], 'addShapes')).toThrow(
      'react-paint addShapes: invalid shape at index 1, "radius" must be a finite number'
    )
    expect(() => assertValidShapes([RECT], 'addShapes')).not.toThrow()
  })
})
