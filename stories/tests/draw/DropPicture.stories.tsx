import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor, within } from 'storybook/test'
import { assertNoInternalFields, getCurrentDataRef, makeCoordConverters, ReactPaintWrapper } from './../helpers'

const meta = {
  title: 'Tests/Draw',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

const SVG_CONTENT = "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80'><rect width='120' height='80' fill='green'/></svg>"

const createSvgFile = (name: string) => new File([SVG_CONTENT], name, { type: 'image/svg+xml' })

/** Drops the files on the canvas, like the user does from the file explorer */
const dropFiles = (canvas: HTMLElement, files: File[], canvasPosition: { x: number; y: number }) => {
  const rect = canvas.getBoundingClientRect()
  const { toClientX, toClientY } = makeCoordConverters(rect)
  const dataTransfer = new DataTransfer()
  for (const file of files) dataTransfer.items.add(file)
  const init = { dataTransfer, bubbles: true, cancelable: true, clientX: toClientX(canvasPosition.x), clientY: toClientY(canvasPosition.y) }
  const dragOver = new DragEvent('dragover', init)
  canvas.dispatchEvent(dragOver)
  const drop = new DragEvent('drop', init)
  canvas.dispatchEvent(drop)
  return { dragOver, drop }
}

const getPictureCenter = (shape: unknown) => {
  const { x, y, width, height } = shape as { x: number; y: number; width: number; height: number }
  return { x: x + width / 2, y: y + height / 2 }
}

export const DropPictureOnCanvas: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = await within(canvasElement).findByTestId('draw-canvas')

    const { dragOver, drop } = dropFiles(canvas, [createSvgFile('first.svg'), createSvgFile('second.svg')], { x: 250, y: 150 })

    // the browser does not open the file
    expect(dragOver.defaultPrevented).toBe(true)
    expect(drop.defaultPrevented).toBe(true)

    await waitFor(() => expect(getCurrentDataRef.current!().shapes).toHaveLength(2))
    // the last added is at the foreground, which comes first
    const [second, first] = getCurrentDataRef.current!().shapes!
    assertNoInternalFields(first)
    expect(first).toMatchObject({ type: 'picture' })
    expect(second).toMatchObject({ type: 'picture' })
    // centered on the drop position, the second one is shifted from the first one
    expect(getPictureCenter(first).x).toBeCloseTo(250, 0)
    expect(getPictureCenter(first).y).toBeCloseTo(150, 0)
    expect(getPictureCenter(second).x).toBeGreaterThan(getPictureCenter(first).x)
  }
}

export const DropPictureDisabledByTheEditor: Story = {
  args: { editorOptions: { withUploadPicture: false } },
  play: async ({ canvasElement }) => {
    const canvas = await within(canvasElement).findByTestId('draw-canvas')

    const { dragOver, drop } = dropFiles(canvas, [createSvgFile('picture.svg')], { x: 250, y: 150 })
    await new Promise(res => setTimeout(res, 500))

    expect(dragOver.defaultPrevented).toBe(false)
    expect(drop.defaultPrevented).toBe(false)
    expect(getCurrentDataRef.current!().shapes ?? []).toHaveLength(0)
  }
}
