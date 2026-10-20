import { createPaintStore } from '@canvas/store/paintStore'
import { getUnscaledCanvasSize } from '@canvas/utils/canvas'
import { getMaskRect, getNewOffset, hasMask, isCursorInsideMask, type ViewBounds } from '@canvas/utils/zoom'
import { describe, expect, it } from 'vitest'
import { extendTo } from './helpers'

/** A view of the given size at the scale 1, showing a drawing of the given size */
const buildBounds = (view: [number, number], drawing: [number, number], size: ViewBounds['size'] = 'fixed'): ViewBounds => ({
  size,
  canvasSize: getUnscaledCanvasSize(view[0], view[1]),
  drawingSize: { width: drawing[0], height: drawing[1] }
})

describe('getNewOffset', () => {
  it('centers a fixed drawing smaller than the view, and keeps a larger one covering the view, on each axis', () => {
    const { offset } = getNewOffset({ ...buildBounds([800, 200], [400, 300]), zoom: 1, newOffset: [-50, -500] })
    expect(offset).toEqual([200, -100])
  })

  it('keeps the bounds of a drawing of the size of the view', () => {
    const bounds = buildBounds([1000, 600], [1000, 600])
    // smaller than the view: centered
    expect(getNewOffset({ ...bounds, zoom: 0.5, newOffset: [0, 0] }).offset).toEqual([500, 300])
    // larger: kept inside the drawing
    expect(getNewOffset({ ...bounds, zoom: 2, newOffset: [-800, 100] }).offset).toEqual([-500, 0])
    expect(getNewOffset({ ...bounds, zoom: 1, newOffset: [-20, 30] }).offset).toEqual([0, 0])
  })

  it('does not limit an infinite drawing', () => {
    const { offset } = getNewOffset({ ...buildBounds([300, 200], [400, 300], 'infinite'), zoom: 1, newOffset: [-5000, 800] })
    expect(offset).toEqual([-5000, 800])
  })
})

describe('mask of a fixed drawing', () => {
  const createFixedStore = (view: [number, number]) => {
    const store = createPaintStore({ width: 400, height: 300, options: { size: 'fixed', resize: 'extend' } })
    extendTo(store, view[0], view[1])
    return store
  }

  it('is drawn around a drawing smaller than the view', () => {
    const settings = createFixedStore([800, 600]).getSettings()
    expect(hasMask(settings)).toBe(true)
    expect(getMaskRect(settings)).toEqual({ x: 200, y: 150, width: 400, height: 300 })
    // the positions are in the drawing
    expect(isCursorInsideMask([350, 10], settings)).toBe(true)
    expect(isCursorInsideMask([450, 10], settings)).toBe(false)
  })

  it('is not drawn when the drawing covers the view', () => {
    expect(hasMask(createFixedStore([300, 200]).getSettings())).toBe(false)
  })

  it('follows the zoom when the view is the drawing', () => {
    const store = createPaintStore({ width: 400, height: 300, options: { size: 'fixed' } })
    expect(hasMask(store.getSettings())).toBe(false)
    store.actions.zoomTo(0.5)
    expect(hasMask(store.getSettings())).toBe(true)
    expect(getMaskRect(store.getSettings())).toEqual({ x: 100, y: 75, width: 200, height: 150 })
  })
})
