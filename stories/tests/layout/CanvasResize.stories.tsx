import type { Meta, StoryObj } from '@storybook/react-vite'
import type { CSSProperties } from 'react'
import { expect, waitFor, within } from 'storybook/test'
import { getPaint, ReactPaintWrapper } from './../helpers'

const RED_RECT = { type: 'rect', x: 100, y: 60, width: 200, height: 150, style: { fillColor: 'red', strokeColor: 'red' } } as const

const getElements = async (canvasElement: HTMLElement) => {
  const drawCanvas = (await within(canvasElement).findByTestId('draw-canvas')) as HTMLCanvasElement
  const wrapper = canvasElement.querySelector('[data-testid="resize-wrapper"]') as HTMLElement
  const root = drawCanvas.closest('.react-paint-app-row') as HTMLElement
  return { drawCanvas, wrapper, root }
}

const readPixel = (canvas: HTMLCanvasElement, x: number, y: number) =>
  Array.from(canvas.getContext('2d')!.getImageData(Math.round(x), Math.round(y), 1, 1).data)

const resizeWrapper = (wrapper: HTMLElement, width: number, height: number) => {
  wrapper.style.width = `${width}px`
  wrapper.style.height = `${height}px`
}

/** The canvas has the size of its root, in pixels of its bitmap and of the page: it is not stretched */
const expectCanvasFillingRoot = async (drawCanvas: HTMLCanvasElement, root: HTMLElement) => {
  await waitFor(() => {
    const rootRect = root.getBoundingClientRect()
    expect(drawCanvas.width).toBe(Math.round(rootRect.width))
    expect(drawCanvas.height).toBe(Math.round(rootRect.height))
    const canvasRect = drawCanvas.getBoundingClientRect()
    expect(canvasRect.width).toBe(drawCanvas.width)
    expect(canvasRect.height).toBe(drawCanvas.height)
  })
}

/**
 * Reads a pixel of the canvas once the root has the new width, after the ResizeObserver of the Canvas, created before:
 * at once, or in the next frame, after the one where the Canvas applies its size when it is scaled
 */
const readPixelAfterResize = (
  root: HTMLElement,
  drawCanvas: HTMLCanvasElement,
  width: number,
  readPoint: () => [number, number],
  nextFrame: boolean
) =>
  new Promise<number[]>(resolve => {
    const read = () => {
      const [x, y] = readPoint()
      resolve(readPixel(drawCanvas, x, y))
    }
    const observer = new ResizeObserver(([entry]) => {
      if (Math.round(entry!.contentRect.width) !== width) return
      observer.disconnect()
      if (nextFrame) requestAnimationFrame(read)
      else read()
    })
    observer.observe(root)
  })

const RED_PIXEL = [255, 0, 0, 255]

const meta = {
  title: 'Tests/Layout',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

/** Wrapper whose size is changed by the stories */
const wrapperDecorators = (style?: CSSProperties): NonNullable<Story['decorators']> => [
  Story => (
    <div data-testid='resize-wrapper' style={style}>
      <Story />
    </div>
  )
]

/** The scaled canvas follows the width of a wrapper sized by its content */
const FREE_WRAPPER = wrapperDecorators()

/** The canvas filling its container needs a wrapper of a given size */
const SIZED_WRAPPER = wrapperDecorators({ width: 600, height: 400 })

/**
 * Width of the canvas on the page in its initial wrapper, in a wrapper of 2000px, in one of 260px, and in the initial
 * one again. The logical width of the drawing is 1000. The editor, with its toolbars, is always as wide as the canvas
 */
const playScaledResize =
  (expectWidths: (widths: { initial: number; wide: number; narrow: number; restored: number }) => void): NonNullable<Story['play']> =>
  async ({ canvasElement }) => {
    const { drawCanvas, wrapper } = await getElements(canvasElement)
    const editor = drawCanvas.closest('.react-paint-editor-app') as HTMLElement
    const measureWidth = () => {
      const canvasWidth = drawCanvas.getBoundingClientRect().width
      expect(editor.getBoundingClientRect().width).toBeCloseTo(canvasWidth, 0)
      return canvasWidth
    }
    const widthIn = async (width: string) => {
      wrapper.style.width = width
      await new Promise(res => setTimeout(res, 200))
      return measureWidth()
    }
    const initial = measureWidth()
    const wide = await widthIn('2000px')
    const narrow = await widthIn('260px')
    const restored = await widthIn('')
    expectWidths({ initial, wide, narrow, restored })
  }

export const CanvasResizeScaleDown: Story = {
  args: { options: { resize: 'scaleDown' } },
  decorators: FREE_WRAPPER,
  play: playScaledResize(({ initial, wide, narrow, restored }) => {
    expect(initial).toBeLessThanOrEqual(1000)
    expect(wide).toBeCloseTo(initial, 0)
    expect(narrow).toBeLessThan(280)
    expect(restored).toBeCloseTo(initial, 0)
  })
}

export const CanvasResizeScale: Story = {
  args: { options: { resize: 'scale' } },
  decorators: FREE_WRAPPER,
  play: playScaledResize(({ wide, narrow }) => {
    expect(wide).toBeGreaterThan(1500)
    expect(narrow).toBeLessThan(280)
  })
}

export const CanvasResizeScaleUp: Story = {
  args: { options: { resize: 'scaleUp' } },
  decorators: FREE_WRAPPER,
  play: playScaledResize(({ wide, narrow }) => {
    expect(wide).toBeGreaterThan(1500)
    expect(narrow).toBeCloseTo(1000, 0)
  })
}

export const CanvasResizeNone: Story = {
  args: { options: { resize: 'none' } },
  decorators: FREE_WRAPPER,
  play: playScaledResize(({ initial, wide, narrow }) => {
    expect(initial).toBeCloseTo(1000, 0)
    expect(wide).toBeCloseTo(1000, 0)
    expect(narrow).toBeCloseTo(1000, 0)
  })
}

export const CanvasResizeExtend: Story = {
  args: { options: { size: 'infinite', resize: 'extend', canZoom: 'always' } },
  decorators: SIZED_WRAPPER,
  play: async ({ canvasElement }) => {
    const { drawCanvas, wrapper, root } = await getElements(canvasElement)
    await expectCanvasFillingRoot(drawCanvas, root)
    getPaint().actions.addShapes([RED_RECT])
    getPaint().actions.setOffset([-20, 10])

    // =====================================================================
    // The canvas follows its container at the scale 1, the drawing stays still
    // =====================================================================
    for (const [width, height] of [
      [900, 500],
      [400, 300]
    ] as const) {
      resizeWrapper(wrapper, width, height)
      await expectCanvasFillingRoot(drawCanvas, root)
      expect(getPaint().getState().view).toMatchObject({
        scaleRatio: 1,
        offset: [-20, 10],
        displayWidth: drawCanvas.width,
        displayHeight: drawCanvas.height
      })
    }

    // =====================================================================
    // The canvas is drawn again before the frame showing its new size is painted
    // =====================================================================
    const pixel = readPixelAfterResize(root, drawCanvas, 700, () => [150, 100], false)
    resizeWrapper(wrapper, 700, 450)
    expect(await pixel).toEqual(RED_PIXEL)
  }
}

export const CanvasResizeScaleRedrawsInSameFrame: Story = {
  args: {},
  decorators: SIZED_WRAPPER,
  play: async ({ canvasElement }) => {
    const { drawCanvas, wrapper, root } = await getElements(canvasElement)
    getPaint().actions.addShapes([RED_RECT])
    await waitFor(() => expect(getPaint().getState().view.scaleRatio).toBeCloseTo(0.6))

    // the canvas is scaled in the frame after the resize: it is drawn again before this frame is painted
    const pixel = readPixelAfterResize(
      root,
      drawCanvas,
      500,
      () => {
        const { scaleRatio } = getPaint().getState().view
        return [200 * scaleRatio, 135 * scaleRatio]
      },
      true
    )
    resizeWrapper(wrapper, 500, 400)
    expect(await pixel).toEqual(RED_PIXEL)
    expect(getPaint().getState().view.scaleRatio).toBeCloseTo(0.5)
  }
}

export const CanvasResizeExtendFixed: Story = {
  args: { width: 400, height: 300, options: { size: 'fixed', resize: 'extend', canZoom: 'always' } },
  decorators: SIZED_WRAPPER,
  play: async ({ canvasElement }) => {
    const { drawCanvas, wrapper, root } = await getElements(canvasElement)
    await expectCanvasFillingRoot(drawCanvas, root)

    // =====================================================================
    // A container larger than the page: the page is centered, with a mask around it
    // =====================================================================
    await waitFor(() => {
      const { offset } = getPaint().getState().view
      expect(offset[0]).toBe((drawCanvas.width - 400) / 2)
      expect(offset[1]).toBe((drawCanvas.height - 300) / 2)
    })
    await waitFor(() => expect(readPixel(drawCanvas, 2, 2)).toEqual([245, 245, 245, 255]))

    // =====================================================================
    // A narrower container: the page covers the width and can only be moved inside it
    // =====================================================================
    resizeWrapper(wrapper, 300, 500)
    await expectCanvasFillingRoot(drawCanvas, root)
    await waitFor(() => expect(getPaint().getState().view.offset[0]).toBe(0))
    getPaint().actions.setOffset([-500, 0])
    expect(getPaint().getState().view.offset[0]).toBe(300 - 400)
  }
}
