import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { assertNoInternalFields, getCurrentDataRef, ReactPaintWrapper, setRangeSetting } from './../helpers'

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

/** A JPEG made by a canvas: its image would be encoded in PNG if it was exported from the image */
const createPhotoFile = async () => {
  const canvas = new OffscreenCanvas(120, 80)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'tomato'
  ctx.fillRect(0, 0, 120, 80)
  ctx.fillStyle = 'navy'
  ctx.fillRect(30, 20, 60, 40)
  return new File([await canvas.convertToBlob({ type: 'image/jpeg' })], 'photo.jpg', { type: 'image/jpeg' })
}

export const DrawPhotoFromUpload: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const file = await createPhotoFile()

    await userEvent.click(await view.findByTitle('Menu'))
    await userEvent.upload(await view.findByTitle('Upload picture'), file)

    // Wait for the image to load and the shape to be added
    await waitFor(() => expect(getCurrentDataRef.current!().shapes).toHaveLength(1))

    const picture = getCurrentDataRef.current!().shapes![0]!
    expect(picture).toMatchObject({ type: 'picture' })
    assertNoInternalFields(picture)
    // the file is exported as it is
    const [header, content] = (picture as { src: string }).src.split(',')
    expect(header).toBe('data:image/jpeg;base64')
    const bytes = Uint8Array.from(atob(content!), char => char.charCodeAt(0))
    expect(bytes).toEqual(new Uint8Array(await file.arrayBuffer()))
  }
}
