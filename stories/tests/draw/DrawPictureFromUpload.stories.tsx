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

// SVG content used for the file-upload test.
const SVG_CONTENT = "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80'><rect width='120' height='80' fill='green'/></svg>"

export const DrawPictureFromUpload: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)

    const file = new File([SVG_CONTENT], 'test.svg', { type: 'image/svg+xml' })

    // Open the menu
    await userEvent.click(await view.findByTitle('Menu'))

    // Upload the file via the hidden file input inside the "Upload picture" label
    const uploadLabel = await view.findByTitle('Upload picture')
    await userEvent.upload(uploadLabel, file)

    // Wait for the image to load and the shape to be added (auto-selected)
    await new Promise(res => setTimeout(res, 500))

    // --- Change opacity on the selected picture ---
    await setRangeSetting(view, 'Opacité', 40)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(1)
    expect(data.shapes![0]).toMatchObject({ type: 'picture', style: { opacity: 40 } })
    assertNoInternalFields(data.shapes![0])
    const pic = data.shapes![0] as { width: number; height: number; src: string }
    expect(pic.width).toBeGreaterThan(0)
    expect(pic.height).toBeGreaterThan(0)
    expect(pic.src).toContain('<svg')
  }
}
