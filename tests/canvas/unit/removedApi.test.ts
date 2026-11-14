import { createReactPaint } from '@canvas/store/internal'
import { createPaintStore } from '@canvas/store/paintStore'
import { describe, expect, it } from 'vitest'

// the duplicates removed from the API before 1.0, each one replaced by another member
describe('removed duplicates', () => {
  it('has no updateShapesStyle: setShapesStyle sets a single field too', () => {
    expect(createPaintStore().actions).not.toHaveProperty('updateShapesStyle')
  })

  it('has no toggleShapesVisibility nor toggleShapesLock: setShapesVisibility and setShapesLocked take the value', () => {
    const { actions } = createPaintStore()
    expect(actions).not.toHaveProperty('toggleShapesVisibility')
    expect(actions).not.toHaveProperty('toggleShapesLock')
  })

  it('has no swapShapes: setShapeIndex moves a shape to the place of another one', () => {
    expect(createPaintStore().actions).not.toHaveProperty('swapShapes')
  })

  it('has no resetCanvas: actions.loadData loads the shapes written by the code', () => {
    expect(createReactPaint(createPaintStore())).not.toHaveProperty('resetCanvas')
  })

  it('has no unregisterEvent: registerEvent returns the function that unregisters the listener', () => {
    expect(createReactPaint(createPaintStore())).not.toHaveProperty('unregisterEvent')
  })

  it('has no updateToolSettings nor setToolStyle: setToolSettings sets one or several default values of a tool', () => {
    const { actions } = createPaintStore()
    expect(actions).not.toHaveProperty('updateToolSettings')
    expect(actions).not.toHaveProperty('setToolStyle')
  })
})
