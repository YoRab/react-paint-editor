import { DEFAULT_CANVAS_LOCALE as LOCALE } from '@canvas/constants/locale'
import type { ShapeEntity } from '@canvas/types/Shapes'
import { createShapesDescriber, getShapeLabel } from '@canvas/utils/description'
import { describe, expect, it } from 'vitest'

/** The fields of the shapes read by the description */
type ShapeFields = { id: string; type: string; name?: string; value?: string[]; visible?: boolean; shapes?: ShapeFields[] }

const asShape = (shape: ShapeFields) => shape as unknown as ShapeEntity
const asShapes = (shapes: ShapeFields[]) => shapes.map(asShape)

const RECT = { id: 'r', type: 'rect' }
const TEXT = { id: 't', type: 'text', value: ['Hello', 'world'] }
const GROUP = { id: 'g', type: 'group', name: 'Logo', shapes: [{ id: 'p', type: 'picture', name: 'A cat' }, RECT] }

describe('canvas/utils/description', () => {
  it('reads the type of a shape, its name and the content of a text', () => {
    expect(getShapeLabel(asShape(RECT), LOCALE)).toBe('Rectangle')
    expect(getShapeLabel(asShape({ ...RECT, name: 'Frame' }), LOCALE)).toBe('Rectangle “Frame”')
    expect(getShapeLabel(asShape(TEXT), LOCALE)).toBe('Text: Hello world')
    expect(getShapeLabel(asShape({ id: 'p', type: 'picture', name: 'A cat' }), LOCALE)).toBe('Picture “A cat”')
  })

  it('describes the visible shapes from the foreground, a group with its shapes, the selected ones being told', () => {
    const describe = createShapesDescriber(LOCALE)
    expect(describe(asShapes([TEXT, { id: 'hidden', type: 'circle', visible: false }, GROUP]), ['t'])).toEqual([
      { id: 't', label: 'Text: Hello world, selected' },
      {
        id: 'g',
        label: 'Group “Logo”',
        shapes: [
          { id: 'p', label: 'Picture “A cat”' },
          { id: 'r', label: 'Rectangle' }
        ]
      }
    ])
  })

  it('keeps the descriptions while the shapes read the same, like when they are moved', () => {
    const describe = createShapesDescriber({ ...LOCALE, canvas: { ...LOCALE.canvas, shapeTypes: { ...LOCALE.canvas.shapeTypes, rect: 'Box' } } })
    const first = describe(asShapes([RECT, GROUP]), [])
    expect(first[0]).toEqual({ id: 'r', label: 'Box' })
    // the shapes moved are new objects
    expect(describe(asShapes([{ ...RECT }, { ...GROUP, shapes: [...GROUP.shapes] }]), [])).toBe(first)
    expect(describe(asShapes([RECT, GROUP]), ['r'])).not.toBe(first)
    expect(describe(asShapes([{ ...RECT, name: 'Frame' }, GROUP]), [])[0]).toEqual({ id: 'r', label: 'Box “Frame”' })
  })

  it('writes the descriptions with the templates of the locale', () => {
    const describe = createShapesDescriber({
      lang: 'fr',
      canvas: {
        ...LOCALE.canvas,
        namedShape: '{type} « {name} »',
        textShape: '{label} : {text}',
        selectedShape: '{label}, dans la sélection',
        shapeTypes: { ...LOCALE.canvas.shapeTypes, text: 'Texte', group: 'Groupe' }
      }
    })
    expect(describe(asShapes([{ ...TEXT, name: 'Titre' }, GROUP]), ['t'])[0]).toEqual({
      id: 't',
      label: 'Texte « Titre » : Hello world, dans la sélection'
    })
  })
})
