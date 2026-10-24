import { ZOOM_LEVELS } from '@canvas/constants/zoom'
import { createPaintStore } from '@canvas/store/paintStore'
import { getUnscaledCanvasSize } from '@canvas/utils/canvas'
import { getMaskRect, getNewOffset, hasMask, isCursorInsideMask, normalizeWheel, type ViewBounds } from '@canvas/utils/zoom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

describe('zoom steps', () => {
  it('unzooms to the previous step, and stops at the smallest one', () => {
    const store = createPaintStore({ options: { size: 'infinite' } })
    store.actions.setZoom('unzoom')
    expect(store.getEditorState().view.zoom).toBe(0.5)

    store.actions.zoomTo(0.7)
    store.actions.setZoom('unzoom')
    expect(store.getEditorState().view.zoom).toBe(0.5)

    store.actions.zoomTo(0.05)
    store.actions.setZoom('unzoom')
    expect(store.getEditorState().view.zoom).toBe(0.05)
  })

  it('zooms in level by level, and keeps every zoom between the first and the last levels', () => {
    const store = createPaintStore({ options: { size: 'infinite' } })
    store.actions.zoomTo(0)
    expect(store.getEditorState().view.zoom).toBe(ZOOM_LEVELS[0])
    for (const level of ZOOM_LEVELS.slice(1)) {
      store.actions.setZoom('zoom')
      expect(store.getEditorState().view.zoom).toBe(level)
    }
    store.actions.setZoom('zoom')
    expect(store.getEditorState().view.zoom).toBe(8)

    store.actions.zoomTo(100)
    expect(store.getEditorState().view.zoom).toBe(8)
  })
})

describe('wheel', () => {
  beforeEach(() => {
    vi.stubGlobal('WheelEvent', { DOM_DELTA_PIXEL: 0, DOM_DELTA_LINE: 1, DOM_DELTA_PAGE: 2 })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('zooms by a delta around a point, within the zoom limits', () => {
    const store = createPaintStore({ options: { size: 'infinite' } })
    store.zoomBy(-100, [0, 0])
    expect(store.getEditorState().view).toMatchObject({ offset: [0, 0] })
    expect(store.getEditorState().view.zoom).toBeCloseTo(1.1)

    store.zoomBy(100_000, [0, 0])
    expect(store.getEditorState().view.zoom).toBe(0.05)
  })

  it('scrolls an infinite drawing, and tells that a drawing filling the view cannot move', () => {
    const infinite = createPaintStore({ options: { size: 'infinite' } })
    expect(infinite.scrollBy([100, 50])).toBe(true)
    expect(infinite.getEditorState().view.offset).toEqual([-100, -50])

    const fixed = createPaintStore()
    expect(fixed.scrollBy([100, 50])).toBe(false)
    expect(fixed.getEditorState().view.offset).toEqual([0, 0])
  })

  it('converts the lines and the pages of a wheel to pixels', () => {
    vi.stubGlobal('window', { innerHeight: 800 })
    const wheel = (deltaMode: number) => ({ deltaX: 2, deltaY: 3, deltaMode, ctrlKey: false }) as WheelEvent
    expect(normalizeWheel(wheel(0), 1000)).toEqual({ deltaX: 2, deltaY: 3 })
    expect(normalizeWheel(wheel(1), 1000)).toEqual({ deltaX: 32, deltaY: 48 })
    expect(normalizeWheel(wheel(2), 1000)).toEqual({ deltaX: 1600, deltaY: 2400 })
  })

  it('amplifies the small and close deltas of a pinch on a trackpad of macOS', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' })
    const pinch = { deltaX: 0, deltaY: 3, deltaMode: 0, ctrlKey: true } as WheelEvent
    expect(normalizeWheel(pinch, 10)).toEqual({ deltaX: 0, deltaY: 15 })
    // a wheel event long after the previous one comes from a mouse
    expect(normalizeWheel(pinch, 100)).toEqual({ deltaX: 0, deltaY: 3 })
  })
})
