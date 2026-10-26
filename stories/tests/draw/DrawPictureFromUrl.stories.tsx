import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { addPictureFromUrl, assertNoInternalFields, getCurrentDataRef, ReactPaintWrapper, SVG_DATA_URI, setRangeSetting } from './../helpers'

const meta = {
  title: 'Tests/Draw',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

export const DrawPictureFromUrl: Story = {
  args: { editorOptions: { withUrlPicture: true } },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)

    // The picture is loaded and added, then auto-selected
    await addPictureFromUrl(view, SVG_DATA_URI)

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
