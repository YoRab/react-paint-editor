import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import {
  ReactPaintWrapper,
  getCurrentDataRef,
  assertNoInternalFields,
  setRangeSetting
} from './../helpers'

const meta = {
  title: 'Tests/Draw',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

// A small inline SVG used as a data-URI for the URL picture test.
// isSvg() checks for '.svg' in the string — this URL doesn't match, so the
// non-SVG fetch path is taken. The original URL is stored as shape.src, and
// since it contains '<svg', cleanShapesBeforeExport keeps it verbatim.
const SVG_DATA_URI =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='blue'/></svg>"

export const DrawPictureFromUrl: Story = {
  args: { options: { withUrlPicture: true } },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)

    // Open the menu
    await userEvent.click(await view.findByTitle('Menu'))

    // Click "Add picture from URL" — opens the URL modal
    await userEvent.click(await view.findByRole('button', { name: 'Add picture from URL' }))

    // Fill in the URL input and submit
    const urlInput = await view.findByRole('textbox')
    await userEvent.clear(urlInput)
    await userEvent.type(urlInput, SVG_DATA_URI)
    await userEvent.click(await view.findByRole('button', { name: 'Ajouter' }))

    // Wait for the image to load and the shape to be added (auto-selected)
    await new Promise(res => setTimeout(res, 500))

    // --- Change opacity on the selected picture ---
    await setRangeSetting(view, 'Opacité', 60)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(1)
    expect(data.shapes![0]).toMatchObject({ type: 'picture', style: { opacity: 60 } })
    assertNoInternalFields(data.shapes![0])
    const pic = data.shapes![0] as { width: number; height: number; src: string }
    expect(pic.width).toBeGreaterThan(0)
    expect(pic.height).toBeGreaterThan(0)
    expect(pic.src).toContain('<svg')
  }
}
