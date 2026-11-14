import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import type { Point } from '../../../src/index'
import { getImageSize, getPaint, getPixel, getRootIds, getSelectedIds, ReactPaintWrapper, toClient } from './../helpers'

const RED_RECT = { type: 'rect', x: 100, y: 60, width: 200, height: 150, style: { fillColor: 'red', strokeColor: 'red' } } as const
const RED_PIXEL = [255, 0, 0, 255]
const CENTER: Point = [200, 135]

/** Replaces a property of the window, until the returned function gives it back */
const overrideWindow = (key: string, descriptor: PropertyDescriptor) => {
  const original = Object.getOwnPropertyDescriptor(window, key)
  Object.defineProperty(window, key, { configurable: true, ...descriptor })
  return () => {
    if (original) Object.defineProperty(window, key, original)
    else delete (window as unknown as Record<string, unknown>)[key]
  }
}

/**
 * Emulates the density of the screen: devicePixelRatio, and the queries of matchMedia on the resolution, which tell their
 * listeners when it changes, like the browser does when its window goes to another screen or when it is zoomed
 */
const emulatePixelRatio = (initialRatio: number) => {
  let ratio = initialRatio
  const queries: { list: EventTarget; resolution: number }[] = []
  const realMatchMedia = window.matchMedia.bind(window)
  const matchMedia = (query: string): MediaQueryList => {
    const resolution = /^\(resolution: ([\d.]+)dppx\)$/.exec(query)
    if (!resolution) return realMatchMedia(query)
    const list = Object.defineProperties(new EventTarget(), {
      media: { value: query },
      matches: { get: () => ratio === Number(resolution[1]) }
    })
    queries.push({ list, resolution: Number(resolution[1]) })
    return list as MediaQueryList
  }
  const restoreRatio = overrideWindow('devicePixelRatio', { get: () => ratio })
  const restoreMatchMedia = overrideWindow('matchMedia', { value: matchMedia, writable: true })
  return {
    setRatio: (newRatio: number) => {
      const changed = queries.filter(({ resolution }) => (resolution === ratio) !== (resolution === newRatio))
      ratio = newRatio
      for (const { list } of changed) list.dispatchEvent(new Event('change'))
    },
    restore: () => {
      restoreRatio()
      restoreMatchMedia()
    }
  }
}

/** The canvas has the given number of pixels in a pixel of the screen, the fraction of a pixel being left out */
const expectPixelRatio = (canvas: HTMLCanvasElement, ratio: number) => {
  const rect = canvas.getBoundingClientRect()
  expect(Math.abs(canvas.width - rect.width * ratio)).toBeLessThan(1)
  expect(Math.abs(canvas.height - rect.height * ratio)).toBeLessThan(1)
}

const getCanvases = async (canvasElement: HTMLElement) => {
  const drawCanvas = (await within(canvasElement).findByTestId('draw-canvas')) as HTMLCanvasElement
  const selectionCanvas = canvasElement.querySelector('.react-paint-canvas-selectioncanvas') as HTMLCanvasElement
  return { drawCanvas, selectionCanvas }
}

const meta = {
  title: 'Tests/Layout/PixelRatio',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

/**
 * On a screen of density 2, the canvases have twice its pixels on each side: the drawing is sharp. The shape is drawn,
 * found under the pointer and selected at its place, and the exported image keeps the size of the drawing
 */
export const HiDPI: Story = {
  args: { shapes: [RED_RECT] },
  beforeEach: () => emulatePixelRatio(2).restore,
  play: async ({ canvasElement }) => {
    const { drawCanvas, selectionCanvas } = await getCanvases(canvasElement)
    expectPixelRatio(drawCanvas, 2)
    expectPixelRatio(selectionCanvas, 2)
    await waitFor(() => expect(getPixel(drawCanvas, CENTER)).toEqual(RED_PIXEL))
    expect(getPixel(drawCanvas, [90, 135])).not.toEqual(RED_PIXEL)
    expect(getPixel(drawCanvas, [310, 135])).not.toEqual(RED_PIXEL)
    expect(getPixel(drawCanvas, [200, 220])).not.toEqual(RED_PIXEL)

    const user = userEvent.setup()
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: toClient(CENTER) })
    expect(getSelectedIds()).toEqual(getRootIds())
    // the outline of the selection is drawn on the border of the shape
    await waitFor(() => expect(getPixel(selectionCanvas, [100, 135])[3]).toBeGreaterThan(0))
    expect(getPixel(selectionCanvas, CENTER)[3]).toBe(0)
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: toClient([350, 135]) })
    expect(getSelectedIds()).toEqual([])

    expect(await getImageSize(getPaint().getCurrentImage())).toEqual([1000, 600])
  }
}

/** Filling its container, the canvas keeps the size of the container on the screen, with twice its pixels on each side */
export const HiDPIExtend: Story = {
  args: { shapes: [RED_RECT], options: { resize: 'extend' } },
  decorators: [
    Story => (
      <div style={{ width: 600, height: 400 }}>
        <Story />
      </div>
    )
  ],
  beforeEach: () => emulatePixelRatio(2).restore,
  play: async ({ canvasElement }) => {
    const { drawCanvas, selectionCanvas } = await getCanvases(canvasElement)
    const root = drawCanvas.closest('.react-paint-app-row') as HTMLElement
    await waitFor(() => {
      const rootRect = root.getBoundingClientRect()
      const canvasRect = drawCanvas.getBoundingClientRect()
      expect(canvasRect.width).toBe(Math.round(rootRect.width))
      expect(canvasRect.height).toBe(Math.round(rootRect.height))
      expect(drawCanvas.width).toBe(2 * canvasRect.width)
      expect(drawCanvas.height).toBe(2 * canvasRect.height)
    })
    expect(selectionCanvas.getBoundingClientRect()).toEqual(drawCanvas.getBoundingClientRect())
    expectPixelRatio(selectionCanvas, 2)
    await waitFor(() => expect(getPixel(drawCanvas, CENTER)).toEqual(RED_PIXEL))
    expect(getPixel(drawCanvas, [90, 135])).not.toEqual(RED_PIXEL)
    expect(getPixel(drawCanvas, [310, 135])).not.toEqual(RED_PIXEL)
  }
}

let emulatedScreen: ReturnType<typeof emulatePixelRatio> | undefined

/**
 * The canvases follow the density of the screen when it changes, like when the window goes to another screen or when the
 * browser is zoomed: they keep their size on the screen, and are drawn again at once. A density of 3 gives 2
 */
export const PixelRatioChange: Story = {
  args: { shapes: [RED_RECT] },
  beforeEach: () => {
    emulatedScreen = emulatePixelRatio(1)
    return emulatedScreen.restore
  },
  play: async ({ canvasElement }) => {
    const { drawCanvas, selectionCanvas } = await getCanvases(canvasElement)
    const rect = drawCanvas.getBoundingClientRect()
    expectPixelRatio(drawCanvas, 1)
    await waitFor(() => expect(getPixel(drawCanvas, CENTER)).toEqual(RED_PIXEL))

    /** The density of the screen becomes the given one, and the canvases the expected one, drawn before the next paint */
    const changeDensity = async (density: number, expected: number) => {
      emulatedScreen!.setRatio(density)
      await waitFor(() => expectPixelRatio(drawCanvas, expected))
      expectPixelRatio(selectionCanvas, expected)
      expect(drawCanvas.getBoundingClientRect()).toEqual(rect)
      expect(getPixel(drawCanvas, CENTER)).toEqual(RED_PIXEL)
      expect(getPixel(drawCanvas, [90, 135])).not.toEqual(RED_PIXEL)
    }
    await changeDensity(2, 2)
    await changeDensity(1.5, 1.5)
    await changeDensity(3, 2)
    await changeDensity(1, 1)
  }
}
