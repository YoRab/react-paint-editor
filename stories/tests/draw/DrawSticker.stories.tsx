import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { type CustomToolInput, DEFAULT_TOOLS, type Point } from '../../../src/index'
import { assertNoInternalFields, getCurrentDataRef, getPixel, ReactPaintWrapper, selectTool, toClient, wait } from './../helpers'

const meta = {
  title: 'Tests/Draw',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

/** An image twice as wide as it is tall: the stickers of its tool keep these proportions */
const WIDE_SVG_DATA_URI =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'><rect width='200' height='100' fill='blue'/></svg>"

/** A sticker: a picture tool which gives its own source, drawn by a press like the other drawing tools */
const STICKER_TOOL: CustomToolInput = {
  id: 'sticker-wide',
  type: 'picture',
  label: 'Bandeau bleu',
  src: WIDE_SVG_DATA_URI,
  settings: {
    opacity: { min: 0, max: 100, step: 1, default: 100 }
  }
}

const ARGS = { options: { availableTools: [...DEFAULT_TOOLS, STICKER_TOOL] } }

/** Chooses the sticker tool, and waits for its image: it is loaded as soon as the tool is chosen */
const selectSticker = async (view: ReturnType<typeof within>) => {
  await selectTool(view, 'picture')
  await wait(200)
  return (await view.findByTestId('draw-canvas')) as HTMLCanvasElement
}

export const DrawSticker: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)

    // the picture tool which opens a file is not a sticker: it stays out of the toolbar
    expect(view.queryByRole('button', { name: 'Picture' })).toBeNull()

    const drawCanvas = await selectSticker(view)
    const user = userEvent.setup()
    const from: Point = [100, 100]
    const to: Point = [300, 300]
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: toClient(from) })
    await wait()
    await user.pointer({ target: drawCanvas, coords: toClient(to) })
    await wait()
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: toClient(to) })
    await wait(200)

    const [sticker] = getCurrentDataRef.current!().shapes!
    // the shape is a picture, which keeps the source of its tool: the square drag keeps the proportions of its image,
    // as a picture does, so the box is twice as wide as the gesture is tall
    expect(sticker).toMatchObject({ type: 'picture', toolId: 'sticker-wide', src: WIDE_SVG_DATA_URI, x: 100, y: 100, width: 400, height: 200 })
    assertNoInternalFields(sticker)
    expect(sticker).not.toHaveProperty('img')

    // the image is drawn in the whole box, which goes past the drag, and nowhere else
    expect(getPixel(drawCanvas, [200, 200])).toEqual([0, 0, 255, 255])
    expect(getPixel(drawCanvas, [450, 250])).toEqual([0, 0, 255, 255])
    expect(getPixel(drawCanvas, [200, 350])[3]).toBe(0)
  }
}

export const DrawStickerOnClick: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await selectSticker(view)
    const user = userEvent.setup()

    // a single click, without a drag: the sticker takes its default size, with the proportions of its image, centered on the click
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: toClient([400, 300]) })
    await wait(200)

    const [sticker] = getCurrentDataRef.current!().shapes!
    expect(sticker).toMatchObject({ type: 'picture', width: 300, height: 150, x: 250, y: 225 })
  }
}
