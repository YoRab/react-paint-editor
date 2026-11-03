import { DEFAULT_CANVAS_LABELS } from '@canvas/constants/app'
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
    expect(getShapeLabel(asShape(RECT), DEFAULT_CANVAS_LABELS)).toBe('Rectangle')
    expect(getShapeLabel(asShape({ ...RECT, name: 'Frame' }), DEFAULT_CANVAS_LABELS)).toBe('Rectangle « Frame »')
    expect(getShapeLabel(asShape(TEXT), DEFAULT_CANVAS_LABELS)).toBe('Texte : Hello world')
    expect(getShapeLabel(asShape({ id: 'p', type: 'picture', name: 'A cat' }), DEFAULT_CANVAS_LABELS)).toBe('Image « A cat »')
  })

  it('describes the visible shapes from the foreground, a group with its shapes, the selected ones being told', () => {
    const describe = createShapesDescriber(DEFAULT_CANVAS_LABELS)
    expect(describe(asShapes([TEXT, { id: 'hidden', type: 'circle', visible: false }, GROUP]), ['t'])).toEqual([
      { id: 't', label: 'Texte : Hello world, sélectionnée' },
      {
        id: 'g',
        label: 'Groupe « Logo »',
        shapes: [
          { id: 'p', label: 'Image « A cat »' },
          { id: 'r', label: 'Rectangle' }
        ]
      }
    ])
  })

  it('keeps the descriptions while the shapes read the same, like when they are moved', () => {
    const describe = createShapesDescriber({ ...DEFAULT_CANVAS_LABELS, shapeTypes: { ...DEFAULT_CANVAS_LABELS.shapeTypes, rect: 'Box' } })
    const first = describe(asShapes([RECT, GROUP]), [])
    expect(first[0]).toEqual({ id: 'r', label: 'Box' })
    // the shapes moved are new objects
    expect(describe(asShapes([{ ...RECT }, { ...GROUP, shapes: [...GROUP.shapes] }]), [])).toBe(first)
    expect(describe(asShapes([RECT, GROUP]), ['r'])).not.toBe(first)
    expect(describe(asShapes([{ ...RECT, name: 'Frame' }, GROUP]), [])[0]).toEqual({ id: 'r', label: 'Box « Frame »' })
  })
})
