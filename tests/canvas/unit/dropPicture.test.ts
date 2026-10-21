import { PICTURE_DROP_GAP } from '@canvas/constants/picture'
import useDropPicture from '@canvas/hooks/useDropPicture'
import type { PaintStore } from '@canvas/store/paintStore'
import type { UseReactPaintProps } from '@canvas/store/types'
import type { ShapeEntity } from '@canvas/types/Shapes'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLoadedStore, FakeImage, stubPath2D } from './helpers'

/**
 * @vitest-environment jsdom
 */

stubPath2D()
vi.stubGlobal('Image', FakeImage)
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:test/1'), revokeObjectURL: vi.fn() })

const png = (name = 'a.png') => new File(['image'], name, { type: 'image/png' })

let root: Root | undefined

/** The canvas is displayed at the half of its pixels, and the drawing is shown at the scale 0.5: a client position is doubled */
const mountCanvas = async (store: PaintStore) => {
  store.setCanvasSize({ realWidth: 1000, realHeight: 600, width: 500, height: 300, scaleRatio: 0.5 })
  const canvas = document.createElement('canvas')
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 500, height: 300 } as DOMRect)
  const Component = () => {
    useDropPicture(store, canvas)
    return null
  }
  root = createRoot(document.createElement('div'))
  await act(async () => root?.render(createElement(Component)))
  return canvas
}

const dragEvent = (type: 'dragover' | 'drop', files: File[], position = { clientX: 0, clientY: 0 }) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  const dataTransfer = { types: files.length ? ['Files'] : ['text/plain'], files, dropEffect: 'none' }
  Object.assign(event, { dataTransfer }, position)
  return event
}

const getPictures = (store: PaintStore) =>
  store.getState().document.shapes.filter((shape): shape is ShapeEntity<'picture'> => shape.type === 'picture')

/** Center of a picture, which is scaled up to the drawing */
const centerOf = ({ x, y, width, height }: ShapeEntity<'picture'>) => [x + width / 2, y + height / 2]

/** Waits for the pictures being loaded, one after the other */
const settle = () => act(() => vi.advanceTimersByTimeAsync(100))

beforeEach(() => {
  vi.useFakeTimers()
  FakeImage.fails = () => false
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('addPicture position', () => {
  it('centers the picture on the given position', async () => {
    const store = await createLoadedStore({}, [])
    const adding = store.actions.addPicture(png(), { position: [400, 250] })
    await vi.advanceTimersByTimeAsync(100)
    const shape = await adding
    expect(centerOf(shape as ShapeEntity<'picture'>)).toEqual([400, 250])
  })
})

describe('selectWithDropPicture', () => {
  it('needs the option, the edition and the picture tool', async () => {
    const isAllowed = async (props: UseReactPaintProps) => {
      const store = await createLoadedStore(props)
      return store.selectors.selectWithDropPicture(store.getState())
    }
    expect(await isAllowed({})).toBe(true)
    expect(await isAllowed({ options: { withDropPicture: false } })).toBe(false)
    expect(await isAllowed({ mode: 'viewer' })).toBe(false)
    expect(await isAllowed({ options: { availableTools: [{ type: 'rect' }] } })).toBe(false)
  })
})

describe('useDropPicture', () => {
  it('accepts a drag of files, and leaves the other drags alone', async () => {
    const canvas = await mountCanvas(await createLoadedStore())

    const files = dragEvent('dragover', [png()])
    canvas.dispatchEvent(files)
    expect(files.defaultPrevented).toBe(true)
    expect((files as unknown as { dataTransfer: { dropEffect: string } }).dataTransfer.dropEffect).toBe('copy')

    const text = dragEvent('dragover', [])
    canvas.dispatchEvent(text)
    expect(text.defaultPrevented).toBe(false)
  })

  it('adds the dropped images centered on the cursor, shifted from one another, and reports the other files', async () => {
    const store = await createLoadedStore({}, [])
    const canvas = await mountCanvas(store)
    const listener = vi.fn()
    store.registerEvent('pictureDropFailed', listener)

    const text = new File(['text'], 'a.txt', { type: 'text/plain' })
    const drop = dragEvent('drop', [png('a.png'), text, png('b.png')], { clientX: 250, clientY: 125 })
    canvas.dispatchEvent(drop)
    await settle()

    expect(drop.defaultPrevented).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(text, expect.any(Error))
    // 250 and 125 on the screen are 500 and 250 in the drawing
    const centers = getPictures(store).map(centerOf)
    expect(centers.map(([x]) => x).sort()).toEqual([500, 500 + PICTURE_DROP_GAP])
    expect(centers.map(([, y]) => y).sort()).toEqual([250, 250 + PICTURE_DROP_GAP])
  })

  it('does nothing, and does not prevent the browser, when the drop is not allowed', async () => {
    const store = await createLoadedStore({ options: { withDropPicture: false } }, [])
    const canvas = await mountCanvas(store)

    const over = dragEvent('dragover', [png()])
    const drop = dragEvent('drop', [png()])
    canvas.dispatchEvent(over)
    canvas.dispatchEvent(drop)
    await settle()

    expect(over.defaultPrevented).toBe(false)
    expect(drop.defaultPrevented).toBe(false)
    expect(getPictures(store)).toHaveLength(0)
  })

  it('emits pictureDropFailed for an image which cannot be loaded, and adds the others', async () => {
    const store = await createLoadedStore({}, [])
    const canvas = await mountCanvas(store)
    const listener = vi.fn()
    store.registerEvent('pictureDropFailed', listener)

    const bad = png('bad.png')
    FakeImage.fails = () => true
    canvas.dispatchEvent(dragEvent('drop', [bad], { clientX: 10, clientY: 10 }))
    await settle()
    FakeImage.fails = () => false
    canvas.dispatchEvent(dragEvent('drop', [png('good.png')], { clientX: 10, clientY: 10 }))
    await settle()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.lastCall?.[0]).toBe(bad)
    expect(getPictures(store)).toHaveLength(1)
  })
})
