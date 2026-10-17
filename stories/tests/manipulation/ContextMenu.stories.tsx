import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { DrawableShape } from '../../../src/index'
import { getCurrentDataRef, makeCoordConverters, ReactPaintWrapper, selectTool } from './../helpers'

const meta = {
  title: 'Tests/Manipulation',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

// 100×100 filled square, center at canvas (300, 300).
const SQUARE: DrawableShape = {
  type: 'square',
  x: 250,
  y: 250,
  width: 100,
  height: 100,
  rotation: 0,
  style: { fillColor: 'red', strokeColor: 'black', lineWidth: 1, opacity: 100, lineDash: 0, lineArrow: 0, closedPoints: 0 }
}

export const ContextMenuAfterToolbarSelection: Story = {
  args: {
    shapes: [SQUARE]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    await new Promise(res => setTimeout(res, 100))

    // --- Go back to the selection tool from the toolbar ---
    await selectTool(view, 'rect')
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(700), y: toClientY(500) } })
    await new Promise(res => setTimeout(res, 100))

    // --- A single right click on the square opens the context menu ---
    await user.pointer({ target: drawCanvas, keys: '[MouseRight]', coords: { x: toClientX(300), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))
    const duplicateButton = view.queryByRole('button', { name: 'Duplicate' })
    expect(duplicateButton).not.toBeNull()

    await userEvent.click(duplicateButton!)
    await new Promise(res => setTimeout(res, 100))
    expect(getCurrentDataRef.current!().shapes).toHaveLength(2)
  }
}
