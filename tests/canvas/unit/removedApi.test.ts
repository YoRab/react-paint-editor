import { createPaintStore } from '@canvas/store/paintStore'
import { describe, expect, it } from 'vitest'

// the duplicates removed from the API before 1.0, each one replaced by another member
describe('removed duplicates', () => {
  it('has no updateShapesStyle: setShapesStyle sets a single field too', () => {
    expect(createPaintStore().actions).not.toHaveProperty('updateShapesStyle')
  })
})
